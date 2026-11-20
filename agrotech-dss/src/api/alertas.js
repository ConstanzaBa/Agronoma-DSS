import { getToken, isAdmin } from "../auth.js";
import { ApiError, apiUrl, endSession, request } from "./http.js";

// Alertas vía Gateway: /v1/alertas/<ruta>  (interno: /api/v1/<ruta>).

// Mensajes entendibles para los 403 del backend (el cuerpo trae `codigo`; el texto original es técnico).
const MENSAJES = {
  sin_permiso: "No tenés permiso para esta acción: esta sección es solo para administradores.",
  reglas_globales: "Las reglas de alerta son globales del sistema y no se pueden modificar desde tu cuenta.",
  rol_invalido: "Tu rol no está habilitado para usar esta función. Consultá al administrador de tu cuenta.",
  sin_estancia: "Todavía no tenés una estancia asignada, por eso no se pueden mostrar alertas. Consultá al administrador de tu cuenta.",
};
async function req(path, opts) {
  try {
    return await request(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403 && MENSAJES[err.code]) err.message = MENSAJES[err.code];
    throw err;
  }
}
const rows = (res) => {
  // Si el backend informa más páginas de las que se pidieron, hay alertas que este cliente no lee.
  if (Number(res?.meta?.ultima_pagina) > 1) {
    console.warn(
      `[alertas] Listado paginado incompleto: se leyeron ${res.data?.length ?? 0} de ${res.meta.total} alertas.`,
    );
  }
  return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
};

// Paginación (Agronoma - Alertas.md, Respuesta::porPagina): `por_pagina` por defecto 20, máximo 100, orden id desc.
// Se piden las 100 alertas más recientes. No se usa ningún parámetro de página: la guía no lo documenta.
export const listAlertas = async (signal) =>
  rows(await req("/alertas/alertas?por_pagina=100", { signal }));
/** GET /alertas?estado=&tipo= (filtros del backend). estado: active|attended|resolved · tipo: moisture|silo_temp|no_rain|market|price_target. */
export const listAlertasFiltradas = async ({ estado, tipo } = {}, signal) => {
  const q = new URLSearchParams({ por_pagina: "100" });
  if (estado) q.set("estado", estado);
  if (tipo) q.set("tipo", tipo);
  return rows(await req(`/alertas/alertas?${q}`, { signal }));
};
/** GET /alertas/{id} → Alerta (incluye `datos`). */
export const getAlerta = (id, signal) =>
  req(`/alertas/alertas/${id}`, { signal });
export const atenderAlerta = (id) =>
  req(`/alertas/alertas/${id}/atender`, { method: "PATCH" });
/** PATCH /alertas/{id}/resolver → 200 con la alerta. Idempotente; válido desde active o attended; no hay reapertura. */
export const resolverAlerta = (id) =>
  req(`/alertas/alertas/${id}/resolver`, { method: "PATCH" });

// ─── Reglas: GET /reglas → { data: [Regla] } · POST /reglas · PUT /reglas/{id} ───────────────────────────
// `parametros` es un objeto clave-valor según el tipo de regla (ver ReglasAlertaSeeder / GeneradorAlertas):
//   moisture → { umbral_menor_pct } · no_rain → { dias_minimos } · silo_temp → { margen_c }
//   market → { veredictos: ["sell"] } · price_target → { enfriamiento_horas }
// Se normaliza siempre a objeto plano para que la UI nunca reciba un string/array inesperado.
export const normParametros = (p) => {
  if (typeof p === "string") {
    try {
      p = JSON.parse(p);
    } catch {
      return {};
    }
  }
  return p && typeof p === "object" && !Array.isArray(p) ? p : {};
};
/** Texto legible: "umbral_menor_pct: 15 · veredictos: sell, review". */
export const parametrosTexto = (p) =>
  Object.entries(normParametros(p))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join(" · ");
const normRegla = (r) => ({ ...r, parametros: normParametros(r?.parametros) });

export const listReglas = async (signal) =>
  rows(await req("/alertas/reglas", { signal })).map(normRegla);
export const createRegla = (body) =>
  req("/alertas/reglas", { method: "POST", body });
export const updateRegla = (id, body) =>
  req(`/alertas/reglas/${id}`, { method: "PUT", body });

// ─── Objetivos de precio: GET (?activo=true) · POST · PUT /{id} · DELETE /{id} ──────────────────────────
export const listObjetivos = async ({ activo = false } = {}, signal) =>
  rows(
    await req(`/alertas/objetivos-precio${activo ? "?activo=true" : ""}`, {
      signal,
    }),
  );
export const createObjetivo = (body) =>
  req("/alertas/objetivos-precio", { method: "POST", body });
export const updateObjetivo = (id, body) =>
  req(`/alertas/objetivos-precio/${id}`, { method: "PUT", body });
export const deleteObjetivo = (id) =>
  req(`/alertas/objetivos-precio/${id}`, { method: "DELETE" });

// Tipo de regla del backend → icono de la UI y acción disponible (mismo comportamiento que antes).
const KIND = {
  moisture: "moisture",
  silo_temp: "silo",
  no_rain: "weather",
  market: "market",
  price_target: "market",
};
const ACTIONS = {
  moisture: { action: "Marcar como atendida", done: "Atendida" },
  silo: { action: "Marcar como atendida", done: "Atendida" },
  weather: { action: "Registrar lluvia", go: "manual-rain" },
  market: { action: "Ver oportunidad", go: "market" },
};

const ago = (iso) => {
  const min = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (Number.isNaN(min) || min < 1) return "NOW";
  if (min < 60) return `-${min}m`;
  if (min < 1440) return `-${Math.floor(min / 60)}h`;
  return `-${Math.floor(min / 1440)}d`;
};

/** Alerta del backend → modelo de AlertCard. `attended`: ya atendida o resuelta. */
export function mapAlerta(a) {
  const kind = KIND[a.tipo] ?? "moisture";
  return {
    id: a.id,
    severity: ["critical", "warning", "info"].includes(a.severidad)
      ? a.severidad
      : "info",
    kind,
    tipo: a.tipo,
    estado: a.estado,
    title: a.titulo,
    ago: a.activada_en ? ago(a.activada_en) : "",
    text: a.mensaje ?? "",
    hl: null,
    ...(kind === "market" && !isAdmin() ? ACTIONS.silo : ACTIONS[kind]), // el índice de venta es solo del admin
    attended:
      !!a.atendida_en ||
      !!a.resuelta_en ||
      /atend|resuel|resolved/i.test(String(a.estado ?? "")), // resuelta cuenta como gestionada
    resolved: !!a.resuelta_en || a.estado === "resolved",
  };
}

// ─── Feed SSE ────────────────────────────────────────────────────────────────
// Ruta pública por el Gateway: GET https://api.agronoma.site/v1/alertas/alertas/feed
// (interno: GET /api/v1/alertas/feed). Se lee con fetch y no con EventSource porque el Gateway
// autentica SOLO con `Authorization: Bearer` y EventSource no permite enviar cabeceras.
// Formato del servidor:  `retry: 3000` · `: keep-alive` cada 2 s · bloques
//   id: <alerta.id> / event: alerta / data: <alerta JSON>
// El servidor corta cada ~25 s; el cliente debe reconectar enviando `Last-Event-ID`.
const FEED_PATH = "/alertas/alertas/feed";

/**
 * Abre UNA conexión al feed y resuelve cuando termina (corte normal del servidor o abort).
 * Rechaza con ApiError si el servidor responde con error o con algo que no es text/event-stream.
 *
 * Callbacks: onOpen(), onChunk() (llegaron bytes), onSse() (primer contenido SSE válido: `retry:`, `: keep-alive` o evento `alerta`;
 * NO se dispara con un cuerpo de error devuelto con 200 text/event-stream), onRetry(ms), onAlerta(alertaCruda, id), onServerError(payload).
 * Un 401 (o 403 usuario_inactivo) cierra la sesión igual que `request`.
 */
export async function streamAlertas({
  lastId = 0,
  signal,
  onOpen,
  onChunk,
  onSse,
  onRetry,
  onAlerta,
  onServerError,
} = {}) {
  const headers = { Accept: "text/event-stream" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // Cabecera permitida por el CORS del Gateway (Allow-Headers: Authorization, Content-Type, Accept, Last-Event-ID).
  if (lastId > 0) headers["Last-Event-ID"] = String(lastId);

  let res;
  try {
    res = await fetch(apiUrl(FEED_PATH), {
      method: "GET",
      headers,
      cache: "no-store",
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError(0, null, "No se pudo abrir el feed de alertas.");
  }

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* sin cuerpo JSON */
    }
    if (
      res.status === 401 ||
      (res.status === 403 && (body?.codigo === "usuario_inactivo" || body?.codigo === "sin_cuenta"))
    )
      endSession();
    const err = new ApiError(
      res.status,
      body,
      (res.status === 403 && MENSAJES[body?.codigo]) || body?.mensaje || `Error ${res.status}`,
    );
    err.retryAfter = Number(res.headers.get("Retry-After")) || 0;
    throw err;
  }
  if (
    !(res.headers.get("Content-Type") ?? "").includes("text/event-stream") ||
    !res.body
  ) {
    throw new ApiError(
      res.status,
      null,
      "El feed no respondió como text/event-stream.",
    );
  }

  onOpen?.();
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  let sse = false;
  const markSse = () => {
    if (!sse) {
      sse = true;
      onSse?.();
    }
  };

  const dispatch = (block) => {
    let id = null;
    let event = "message";
    const data = [];
    for (const line of block.split("\n")) {
      if (!line) continue;
      if (line.startsWith(":")) {
        markSse(); // comentario (`: keep-alive`)
        continue;
      }
      const i = line.indexOf(":");
      const field = i === -1 ? line : line.slice(0, i);
      const value = i === -1 ? "" : line.slice(i + 1).replace(/^ /, "");
      if (field === "id") id = value;
      else if (field === "event") event = value;
      else if (field === "data") data.push(value);
      else if (field === "retry" && /^\d+$/.test(value)) {
        markSse();
        onRetry?.(Number(value));
      }
    }
    if (!data.length) return;
    let payload;
    try {
      payload = JSON.parse(data.join("\n"));
    } catch {
      return; // data no JSON: se ignora
    }
    if (event === "alerta") {
      markSse();
      onAlerta?.(payload, id !== null && /^\d+$/.test(id) ? Number(id) : null);
    } else if (event === "error") onServerError?.(payload); // lo emite el Gateway si el servicio no responde
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk?.();
      buf += decoder.decode(value, { stream: true }).replace(/\r\n|\r/g, "\n");
      let cut;
      while ((cut = buf.indexOf("\n\n")) !== -1) {
        dispatch(buf.slice(0, cut));
        buf = buf.slice(cut + 2);
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ya cerrado */
    }
  }
}
