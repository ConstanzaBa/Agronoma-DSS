import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { atenderAlerta, listAlertas, mapAlerta, resolverAlerta, streamAlertas } from "../api/alertas.js";

// Con el feed SSE conectado solo llegan alertas NUEVAS (no los cambios de estado atendida/resuelta),
// por eso se mantiene un refresco lento de reconciliación. Sin SSE se conserva el polling de 60 s de siempre.
const POLL_MS = 60000;
const POLL_LIVE_MS = 300000;
const DEFAULT_RETRY_MS = 3000; // el servidor lo anuncia con `retry: 3000`
const MAX_BACKOFF_MS = 60000;
const LIVE_FIRST_BYTE_MS = 8000; // el servidor envía `retry:` al abrir; si tarda más, el hosting hace buffering
const MAX_BUFFERED_CYCLES = 2;
const RECOVER_MS = 30000;

const byIdDesc = (a, b) => b.id - a.id;

/**
 * Alertas reales del Gateway (/v1/alertas/...).
 * Carga inicial por REST + feed SSE (GET /v1/alertas/alertas/feed, con fetch + Bearer + Last-Event-ID).
 * Si el SSE no está disponible (error, buffering, 404) cae al polling de 60 s.
 */
export function useAlertas() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false); // true mientras el feed SSE está fluyendo
  const lastIdRef = useRef(0); // mayor id de alerta conocido → Last-Event-ID
  const loadedRef = useRef(false);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const list = await listAlertas();
      const mapped = list.map(mapAlerta).sort(byIdDesc);
      for (const a of mapped) if (a.id > lastIdRef.current) lastIdRef.current = a.id;
      loadedRef.current = true;
      setAlerts(mapped);
      setError("");
    } catch (err) {
      if (!silent) setError(err.message || "No se pudieron cargar las alertas.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /** Alerta recibida por SSE: se agrega solo si su id no existe (sin duplicar). */
  const pushAlerta = useCallback((raw) => {
    const m = mapAlerta(raw);
    if (m.id == null) return;
    setAlerts((prev) => (prev.some((a) => a.id === m.id) ? prev : [m, ...prev].sort(byIdDesc)));
  }, []);

  // Carga inicial + feed SSE (una sola conexión; se cierra al desmontar).
  useEffect(() => {
    let stopped = false;
    let ctrl = null;
    let timer = null;
    let wake = null; // despierta la espera cuando la pestaña vuelve a ser visible

    const sleep = (ms) =>
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
        wake = resolve;
      });

    const onVisibility = () => {
      if (document.hidden) ctrl?.abort(); // pestaña oculta: no se mantiene el flujo abierto
      else wake?.();
    };

    async function run() {
      await reload();
      let failures = 0;
      let buffered = 0;
      let retryMs = DEFAULT_RETRY_MS;
      let lastRecover = 0;

      while (!stopped) {
        if (document.hidden) {
          setLive(false);
          await new Promise((resolve) => {
            wake = resolve;
          });
          if (stopped) break;
          await reload({ silent: true }); // se pudo perder estado mientras estaba oculta
          continue;
        }

        ctrl = new AbortController();
        const t0 = Date.now();
        let firstByteMs = null;
        let sseSeen = false; // llegó contenido SSE real (no un error devuelto con 200 text/event-stream)
        let serverError = false;
        let delay = retryMs;

        try {
          await streamAlertas({
            lastId: lastIdRef.current,
            signal: ctrl.signal,
            onChunk: () => {
              if (firstByteMs === null) firstByteMs = Date.now() - t0;
            },
            onSse: () => {
              sseSeen = true;
              if (firstByteMs !== null && firstByteMs <= LIVE_FIRST_BYTE_MS) setLive(true);
              // Si la carga inicial falló no hay punto de partida: se recupera por REST, como máximo una vez cada 30 s.
              if (!loadedRef.current && Date.now() - lastRecover > RECOVER_MS) {
                lastRecover = Date.now();
                reload({ silent: true });
              }
            },
            onRetry: (ms) => {
              retryMs = ms;
            },
            onAlerta: (raw, id) => {
              const n = id ?? Number(raw?.id);
              if (Number.isFinite(n) && n > lastIdRef.current) lastIdRef.current = n;
              pushAlerta(raw);
            },
            onServerError: () => {
              serverError = true;
            },
          });
          if (stopped) break;
          delay = retryMs;
          if (serverError || !sseSeen) {
            // Error del Gateway (`event: error`) o respuesta que no es SSE: se reintenta con espera creciente.
            failures++;
            setLive(false);
            delay = Math.min(MAX_BACKOFF_MS, retryMs * 2 ** Math.min(failures, 5));
          } else if (firstByteMs !== null && firstByteMs > LIVE_FIRST_BYTE_MS) {
            // El flujo llegó de golpe al cortar (~25 s): buffering del hosting → plan B: polling.
            setLive(false);
            if (++buffered >= MAX_BUFFERED_CYCLES) {
              console.warn("[alertas] El feed SSE llega con buffering; se usa polling.");
              return;
            }
          } else {
            failures = 0;
            buffered = 0;
          }
        } catch (err) {
          if (stopped) break;
          if (err?.name === "AbortError") {
            continue; // abort por pestaña oculta: el bucle espera a que vuelva a ser visible
          }
          setLive(false);
          // Sin sesión / sin permiso / ruta inexistente: reintentar no sirve → polling.
          if ([401, 403, 404, 405, 410].includes(err?.status)) return;
          failures++;
          delay = Math.min(MAX_BACKOFF_MS, retryMs * 2 ** Math.min(failures, 5));
          if (err?.status === 429 && err.retryAfter) delay = Math.max(delay, err.retryAfter * 1000);
        }

        await sleep(delay);
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    run().finally(() => {
      if (!stopped) setLive(false);
    });

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timer);
      ctrl?.abort();
      wake?.();
    };
  }, [reload, pushAlerta]);

  // Polling: 60 s sin SSE; reconciliación lenta con SSE activo.
  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), live ? POLL_LIVE_MS : POLL_MS);
    return () => clearInterval(t);
  }, [reload, live]);

  /** PATCH /alertas/{id}/atender */
  const attend = useCallback(async (id) => {
    try {
      await atenderAlerta(id);
    } catch (err) {
      if (err.status !== 409) throw err; // 409: ya estaba resuelta → igual se refleja como atendida
    }
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, attended: true, estado: a.resolved ? a.estado : "attended" } : a)));
  }, []);

  /** PATCH /alertas/{id}/resolver (estado final: no se puede reabrir ni volver a atender). */
  const resolve = useCallback(async (id) => {
    await resolverAlerta(id);
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, attended: true, resolved: true, estado: "resolved" } : a)));
  }, []);

  const attended = useMemo(() => Object.fromEntries(alerts.filter((a) => a.attended).map((a) => [a.id, true])), [alerts]);
  const activeCount = useMemo(() => alerts.filter((a) => a.severity !== "info" && !a.attended).length, [alerts]);

  return { alerts, attended, activeCount, loading, error, reload, attend, resolve, live };
}
