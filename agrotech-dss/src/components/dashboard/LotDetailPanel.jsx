import { useCallback, useEffect, useState } from "react";
import { CloudRain, Copy, Cpu, KeyRound, Loader2, MapPin, Plus, Power, RefreshCw } from "lucide-react";
import { Card, monoLabel } from "./ui.jsx";
import { getClima, getLote, listLecturas, regenerarTokenDispositivo, setDispositivoActivo } from "../../api/campo.js";
import { useDialog } from "../dialog/DialogProvider.jsx";

const DAY_MS = 86400000;
const show = (v, unit) => (v == null || v === "" ? "—" : `${v}${unit}`);
const fmtDate = (v) => {
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
};

function Sub({ title, action, children }) {
  return (
    <div className="rounded-xl bg-canopy-50 p-4 dark:bg-white/[0.04]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className={monoLabel}>{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

const Muted = ({ children }) => <p className="text-sm text-canopy-600 dark:text-canopy-300">{children}</p>;
const Spin = () => (
  <p className="flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300">
    <Loader2 size={14} className="animate-spin" /> Cargando…
  </p>
);

/**
 * Muestra el token nuevo de un sensor una sola vez. Vive solo en el estado de React: no se escribe en
 * localStorage, sessionStorage ni en ningún almacenamiento persistente. Se cierra solo con el botón
 * (ni Esc ni clic fuera), para no perder por accidente un token que no se vuelve a mostrar.
 */
function TokenModal({ info, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.token);
    } catch {
      const t = document.createElement("textarea"); // respaldo para contextos sin Clipboard API
      t.value = info.token;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" aria-labelledby="tok-t" className="w-full max-w-md rounded-2xl border border-canopy-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1b2c]">
        <h2 id="tok-t" className="text-lg font-bold text-canopy-900 dark:text-white">Token nuevo · {info.nombre}</h2>
        <p className="mt-1.5 text-sm text-canopy-700 dark:text-canopy-200">
          Guardalo ahora: no se vuelve a mostrar. El token anterior deja de servir (puede seguir aceptándose hasta 5 s por la caché del gateway).
        </p>
        <code className="mt-4 block break-all rounded-lg bg-canopy-50 p-3 font-mono text-xs text-canopy-900 dark:bg-white/[0.06] dark:text-white">{info.token}</code>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-canopy-300 px-5 py-2.5 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">
            <Copy size={14} /> {copied ? "Copiado" : "Copiar"}
          </button>
          <button type="button" autoFocus onClick={onClose} className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-orange-600">
            Ya lo guardé
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Detalle del lote seleccionado y de su establecimiento:
 *  clima (GET /campo/establecimientos/{id}/clima), sensores (GET /campo/lotes/{id} → dispositivos),
 *  lecturas (GET /campo/lotes/{id}/lecturas) y lluvia (los registros ya cargados por useLluvia).
 * `refreshKey` fuerza la recarga tras crear un sensor.
 */
export default function LotDetailPanel({ lot, zone, onSelectLot, rain = [], refreshKey = 0, onAddDevice, onRain, canManage = true }) {
  const [clima, setClima] = useState({ state: "idle" }); // idle | loading | done | error
  const [dev, setDev] = useState({ state: "idle", items: [] });
  const [lect, setLect] = useState({ state: "idle", items: [] });
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState(null); // sensor con una operación en curso
  const [newToken, setNewToken] = useState(null); // { nombre, token } — solo en memoria
  const dialog = useDialog();

  const zoneId = zone?.id;
  const lotId = lot?.id;

  useEffect(() => {
    if (zoneId == null) return setClima({ state: "idle" });
    const ctrl = new AbortController();
    setClima({ state: "loading" });
    getClima(zoneId, ctrl.signal)
      .then((data) => setClima({ state: "done", data }))
      .catch((e) => e.name !== "AbortError" && setClima({ state: "error", msg: e.message }));
    return () => ctrl.abort();
  }, [zoneId, tick]);

  useEffect(() => {
    if (lotId == null) {
      setDev({ state: "idle", items: [] });
      setLect({ state: "idle", items: [] });
      return;
    }
    const ctrl = new AbortController();
    // Al cambiar de lote se vacía todo: nunca se muestran sensores ni lecturas del lote anterior.
    setDev({ state: "loading", items: [] });
    setLect({ state: "loading", items: [] });
    getLote(lotId, ctrl.signal)
      .then((l) => !ctrl.signal.aborted && setDev({ state: "done", items: (l?.dispositivos ?? []).filter((d) => d.lote_id == null || String(d.lote_id) === String(lotId)) }))
      .catch((e) => e.name !== "AbortError" && setDev({ state: "error", items: [], msg: e.message }));
    const hasta = Date.now();
    listLecturas(lotId, { desde: new Date(hasta - 30 * DAY_MS).toISOString(), hasta: new Date(hasta).toISOString() }, ctrl.signal)
      .then((r) => !ctrl.signal.aborted && setLect({ state: "done", items: [...r].filter((x) => x.lote_id == null || String(x.lote_id) === String(lotId)).sort((a, b) => Date.parse(b.medido_en) - Date.parse(a.medido_en)).slice(0, 6) }))
      .catch((e) => e.name !== "AbortError" && setLect({ state: "error", items: [], msg: e.message }));
    return () => ctrl.abort();
  }, [lotId, refreshKey, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Al cambiar de lote se descarta cualquier token que siguiera visible.
  useEffect(() => setNewToken(null), [lotId]);

  const fail = (title, err) => dialog.alert({ variant: "error", title, message: err?.message ?? "Error inesperado." });

  const toggleActivo = async (d) => {
    const activar = d.activo === false;
    const ok = await dialog.confirm({
      variant: "warning",
      title: activar ? "Activar sensor" : "Desactivar sensor",
      message: activar
        ? `“${d.nombre}” volverá a aceptar lecturas con su mismo token.`
        : `“${d.nombre}” dejará de aceptar lecturas. Su token no se elimina: al reactivarlo sigue sirviendo.`,
      confirmText: activar ? "Activar" : "Desactivar",
    });
    if (!ok) return;
    setBusyId(d.id);
    try {
      const r = await setDispositivoActivo(d.id, activar); // PATCH /v1/campo/dispositivos/{id}
      setDev((cur) => ({ ...cur, items: cur.items.map((x) => (x.id === d.id ? { ...x, activo: r?.activo ?? activar } : x)) }));
    } catch (e) {
      await fail(activar ? "No se pudo activar el sensor" : "No se pudo desactivar el sensor", e);
    } finally {
      setBusyId(null);
    }
  };

  const regenerar = async (d) => {
    const ok = await dialog.confirm({
      variant: "warning",
      danger: true,
      title: "Regenerar token",
      message: `Se emitirá un token nuevo para “${d.nombre}” y el actual dejará de servir. Tendrás que configurarlo en el dispositivo.`,
      confirmText: "Regenerar",
    });
    if (!ok) return;
    setBusyId(d.id);
    try {
      const r = await regenerarTokenDispositivo(d.id); // POST /v1/campo/dispositivos/{id}/token (Campo → Auth)
      if (typeof r?.token === "string" && r.token) setNewToken({ nombre: d.nombre, token: r.token });
      else await fail("No se pudo regenerar el token", new Error("La respuesta no incluyó el token."));
    } catch (e) {
      await fail("No se pudo regenerar el token", e);
    } finally {
      setBusyId(null);
    }
  };

  if (!zone) return null;

  const sensorName = (id) => dev.items.find((d) => String(d.id) === String(id))?.nombre ?? `Sensor #${id}`;
  const rainRows = rain
    .filter((r) => String(r.lotId) === String(lot?.id))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);
  const c = clima.data;

  return (
    <Card className="p-5">
      {/* Datos de la estancia + sus lotes */}
      <div className="mb-4 rounded-xl border border-canopy-200 p-4 dark:border-white/10">
        <p className={monoLabel}>Estancia</p>
        <h3 className="mt-1 flex items-center gap-2 truncate text-lg font-bold text-canopy-900 dark:text-white">
          <MapPin size={16} className="shrink-0 text-orange-500" /> {zone.name}
        </h3>
        <p className="font-mono text-xs text-canopy-600 dark:text-canopy-300">
          {zone.lots.length} {zone.lots.length === 1 ? "lote" : "lotes"}
          {zone.admin ? ` · ${zone.admin}` : ""}
        </p>
        {zone.lots.length === 0 ? (
          <p className="mt-3 text-sm text-canopy-600 dark:text-canopy-300">
            Esta estancia no tiene lotes. Creá el primero con “Nuevo lote” en el panel del mapa o con el botón “+”.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Lotes de la estancia">
            {zone.lots.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={l.id === lot?.id}
                onClick={() => onSelectLot?.(l.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  l.id === lot?.id
                    ? "border-orange-400 bg-orange-50 text-canopy-900 dark:border-gold-400/60 dark:bg-white/10 dark:text-white"
                    : "border-canopy-200 text-canopy-700 hover:bg-canopy-100 dark:border-white/10 dark:text-canopy-200 dark:hover:bg-white/5"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!lot ? null : (<>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={monoLabel}>Lote seleccionado</p>
          <h3 className="truncate text-lg font-bold text-canopy-900 dark:text-white">{lot.name}</h3>
          <p className="truncate font-mono text-xs text-canopy-600 dark:text-canopy-300">
            {lot.crop} · {lot.area} ha
          </p>
        </div>
        <button onClick={refresh} aria-label="Actualizar detalle" className="grid h-9 w-9 place-items-center rounded-lg text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Sub title="Clima del establecimiento">
          {clima.state === "loading" && <Spin />}
          {clima.state === "error" && <Muted>{clima.msg || "No hay datos de clima disponibles."}</Muted>}
          {clima.state === "done" && c?.actual && (
            <>
              <dl className="grid grid-cols-4 gap-2 text-center">
                {[
                  ["Temp.", show(c.actual.temperatura_c, "°C")],
                  ["Humedad", show(c.actual.humedad_pct, "%")],
                  ["Precip.", show(c.actual.precipitacion_mm, " mm")],
                  ["Viento", show(c.actual.viento_kmh, " km/h")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{k}</dt>
                    <dd className="mt-1 text-base font-bold text-canopy-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 font-mono text-[11px] text-canopy-500 dark:text-canopy-400">
                {c.fuente ? `Fuente: ${c.fuente} · ` : ""}
                {fmtDate(c.consultado_en)}
                {c.desactualizada ? " · datos desactualizados" : ""}
              </p>
            </>
          )}
          {clima.state === "done" && !c?.actual && <Muted>No hay datos de clima disponibles.</Muted>}
        </Sub>

        <Sub
          title={`Sensores del lote · ${lot.name}`}
          action={canManage &&
            <button onClick={onAddDevice} className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-600 hover:underline dark:text-gold-300">
              <Plus size={13} /> Nuevo sensor
            </button>
          }
        >
          {dev.state === "loading" && dev.items.length === 0 && <Spin />}
          {dev.state === "error" && <Muted>{dev.msg || "No se pudieron cargar los sensores."}</Muted>}
          {dev.state === "done" && dev.items.length === 0 && <Muted>Este lote no tiene sensores.</Muted>}
          <ul className="space-y-2">
            {dev.items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Cpu size={15} className="shrink-0 text-canopy-500 dark:text-canopy-300" />
                <span className="min-w-0 flex-1 truncate font-semibold text-canopy-900 dark:text-white">{d.nombre}</span>
                <span className={`font-mono text-[11px] ${d.activo === false ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{d.activo === false ? "inactivo" : "activo"}</span>
                <span className="hidden font-mono text-[11px] text-canopy-500 sm:inline dark:text-canopy-400">{d.ultima_conexion_en ? fmtDate(d.ultima_conexion_en) : "sin conexión"}</span>
                {canManage && <span className="flex w-full items-center gap-3 pl-[23px]">
                  <button disabled={busyId === d.id} onClick={() => toggleActivo(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-600 hover:underline disabled:opacity-50 dark:text-gold-300">
                    {busyId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />} {d.activo === false ? "Activar" : "Desactivar"}
                  </button>
                  <button disabled={busyId === d.id} onClick={() => regenerar(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-600 hover:underline disabled:opacity-50 dark:text-gold-300">
                    <KeyRound size={12} /> Regenerar token
                  </button>
                </span>}
              </li>
            ))}
          </ul>
        </Sub>

        <Sub title={`Lecturas recientes · ${lot.name}`}>
          {lect.state === "loading" && lect.items.length === 0 && <Spin />}
          {lect.state === "error" && <Muted>{lect.msg || "No se pudieron cargar las lecturas."}</Muted>}
          {lect.state === "done" && lect.items.length === 0 && <Muted>Sin lecturas en los últimos 30 días.</Muted>}
          {lect.items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">
                  <th className="pb-1 font-medium">Fecha</th>
                  <th className="pb-1 font-medium">Sensor</th>
                  <th className="pb-1 font-medium">Humedad suelo</th>
                  <th className="pb-1 font-medium">Temp.</th>
                </tr>
              </thead>
              <tbody className="text-canopy-900 dark:text-white">
                {lect.items.map((r, i) => (
                  <tr key={r.id ?? i}>
                    <td className="py-0.5 font-mono text-xs">{fmtDate(r.medido_en)}</td>
                    <td className="max-w-[110px] truncate py-0.5 text-xs">{sensorName(r.dispositivo_id)}</td>
                    <td className="py-0.5">{show(r.humedad_suelo_pct, "%")}</td>
                    <td className="py-0.5">{show(r.temperatura_c, "°C")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sub>

        <Sub
          title="Lluvia (30 días)"
          action={
            <button onClick={onRain} className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-600 hover:underline dark:text-gold-300">
              <CloudRain size={13} /> Registrar lluvia
            </button>
          }
        >
          {rainRows.length === 0 ? (
            <Muted>Sin registros de lluvia.</Muted>
          ) : (
            <ul className="space-y-1.5 text-sm text-canopy-900 dark:text-white">
              {rainRows.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span className="font-mono text-xs">{r.date}{r.note ? ` · ${r.note}` : ""}</span>
                  <span className="font-semibold">{r.mm} mm</span>
                </li>
              ))}
            </ul>
          )}
        </Sub>
      </div>
      </>)}
      {newToken && <TokenModal info={newToken} onClose={() => setNewToken(null)} />}
    </Card>
  );
}
