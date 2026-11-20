import { ApiError, request as http } from "./http.js";

// Mensajes entendibles para los 403 del backend (el cuerpo trae `codigo`; el texto original es técnico).
const MENSAJES = {
  sin_permiso: "No tenés permiso para ver esta información: es solo para administradores.",
  dato_global: "Los datos de mercado son globales y no se cargan desde una cuenta.",
  rol_invalido: "Tu rol no está habilitado para usar esta función. Consultá al administrador de tu cuenta.",
  sin_estancia: "Todavía no tenés una estancia asignada, por eso no se puede mostrar esta información. Consultá al administrador de tu cuenta.",
};
async function request(path, opts) {
  try {
    return await http(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403 && MENSAJES[err.code]) err.message = MENSAJES[err.code];
    throw err;
  }
}
import { listTiposCultivo } from "./campo.js";
import { pctChange } from "../lib/opportunity.js";

// Mercado vía Gateway: /v1/mercado/<ruta>  (interno: /api/v1/<ruta>).
const rows = (res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
const isoDay = (d) => d.toLocaleDateString("en-CA");
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

export const listCotizaciones = async (tipoCultivoId, { desde, hasta } = {}, signal) => {
  // por_pagina: máx. 100 (def. 20). Hay hasta 3 fuentes por día (manual, webhook, api).
  const q = new URLSearchParams({ tipo_cultivo_id: String(tipoCultivoId), por_pagina: "100" });
  if (desde) q.set("desde", desde);
  if (hasta) q.set("hasta", hasta);
  return rows(await request(`/mercado/cotizaciones?${q}`, { signal }));
};
/** GET /cotizaciones/ultima → cotización vigente (prioridad manual > webhook > api) con precio_usd_tn y precio_ars_tn.
 *  También dispara la actualización perezosa de precios y dólar del backend (el listado no lo hace). */
export const getCotizacionUltima = (tipoCultivoId, signal) =>
  request(`/mercado/cotizaciones/ultima?tipo_cultivo_id=${tipoCultivoId}`, { signal });
export const createCotizacion = (body) => request("/mercado/cotizaciones", { method: "POST", body });
export const getIndiceVenta = (siloId, signal) => request(`/mercado/silos/${siloId}/indice-venta`, { signal });

const opt = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
const PRIORIDAD = { manual: 0, webhook: 1, api: 2 }; // misma prioridad de fuentes que el backend

/**
 * Cultivo + cotización vigente (/ultima) + historial → fila de la tabla.
 * `price` = precio_usd_tn (US$/t) y `priceArs` = precio_ars_tn (ARS/t): ambos los entrega el backend,
 * el ARS lo calcula él con el dólar oficial BNA (null si todavía no hay dólar cargado). No se convierte nada acá.
 * `avg7`: promedio de US$/t de los últimos 7 días con dato (un valor por día, fuente de mayor prioridad).
 */
export function mapQuote(tipo, ultima, cotizaciones) {
  const byDay = new Map();
  for (const c of cotizaciones) {
    const day = String(c.fecha_cotizacion ?? "").slice(0, 10);
    const v = opt(c.precio_usd_tn);
    if (!day || v == null) continue;
    const rank = PRIORIDAD[c.fuente] ?? 9;
    if (!byDay.has(day) || rank < byDay.get(day).rank) byDay.set(day, { rank, price: v });
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([, d]) => d.price);
  const price = opt(ultima?.precio_usd_tn) ?? days[0] ?? null;
  const last7 = days.slice(0, 7);
  const avg7 = last7.length ? last7.reduce((a, v) => a + v, 0) / last7.length : null;
  return {
    id: tipo.id,
    crop: tipo.nombre,
    price,
    priceArs: opt(ultima?.precio_ars_tn),
    date: ultima?.fecha_cotizacion ? String(ultima.fecha_cotizacion).slice(0, 10) : null,
    stale: !!ultima?.desactualizada,
    avg7,
    change: price != null && avg7 ? pctChange(price, avg7) : null,
  };
}

/** Cultivos del catálogo (Campo) con su cotización más reciente (US$/t y ARS/t). */
export async function getQuotes(signal) {
  const tipos = await listTiposCultivo(signal);
  const ultima = (t) =>
    getCotizacionUltima(t.id, signal).catch((e) => {
      if (e.status === 404) return null; // sin_datos: todavía no hay cotización de ese cultivo
      throw e;
    });
  // La primera consulta va sola: dispara una única vez la actualización perezosa (granos.ar + dólar).
  const first = tipos.length ? await ultima(tipos[0]) : null;
  const [rest, lists] = await Promise.all([
    Promise.all(tipos.slice(1).map(ultima)),
    Promise.all(tipos.map((t) => listCotizaciones(t.id, { desde: daysAgo(14) }, signal).catch(() => []))),
  ]);
  const ultimas = [first, ...rest];
  return tipos.map((t, i) => mapQuote(t, ultimas[i], lists[i]));
}

/** Carga/actualiza el precio de hoy (USD/t) de un cultivo. */
export const registrarCotizacion = (tipoCultivoId, precioUsdTn) =>
  createCotizacion({
    tipo_cultivo_id: tipoCultivoId,
    fecha_cotizacion: isoDay(new Date()),
    precio_usd_tn: precioUsdTn,
    mercado_referencia: "ROSARIO",
  });

const VERDICTS = {
  sell: { key: "sell", label: "Vender", text: "Las condiciones son favorables para concretar la venta." },
  review: { key: "review", label: "Evaluar", text: "Hay condiciones mixtas: revisá las reglas pendientes antes de vender." },
  wait: { key: "wait", label: "Esperar", text: "Todavía no conviene vender: el mercado y el stock no acompañan." },
};

/** Respuesta de indice-venta → modelo { score, rules, passed, verdict } que consume la UI. */
export function mapIndice(r) {
  const rules = (r.reglas_aplicadas ?? []).map((x) => ({
    id: x.id,
    label: x.label,
    weight: Number(x.weight),
    // El backend devuelve `sub` como categoría (mercado/calidad/...), no como fracción: se usa cumple/no cumple.
    sub: x.pass ? 1 : 0,
    pass: !!x.pass,
    detail: x.detail ?? "",
    hint: x.hint ?? "",
  }));
  return {
    score: Number(r.puntaje) || 0,
    rules,
    passed: rules.filter((x) => x.pass).length,
    verdict: VERDICTS[r.veredicto] ?? VERDICTS.wait,
  };
}

// ---- Mercado ampliado: divisas, insumos, margen, supuestos e historial del índice ----
const listAll = async (path, params, signal) => {
  const q = new URLSearchParams({ por_pagina: "100" });
  for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, String(v));
  return rows(await request(`${path}?${q}`, { signal }));
};

/** GET /divisas?tipo&desde&hasta */
export const listDivisas = (params, signal) => listAll("/mercado/divisas", params, signal);
/** GET /divisas/ultima?tipo → vigente (404 sin_datos si no hay). */
export const getDivisaUltima = (tipo, signal) => request(`/mercado/divisas/ultima${tipo ? `?tipo=${tipo}` : ""}`, { signal });
/** POST /divisas { tipo, fecha, valor_ars_usd } */
export const createDivisa = (body) => request("/mercado/divisas", { method: "POST", body });

/** GET /insumos?insumo&desde&hasta */
export const listInsumos = (params, signal) => listAll("/mercado/insumos", params, signal);
/** POST /insumos { insumo, fecha, precio_usd } */
export const createInsumo = (body) => request("/mercado/insumos", { method: "POST", body });

/** GET /margen/{tipo_cultivo_id} (404: sin_datos | supuestos_no_cargados) */
export const getMargen = (tipoCultivoId, signal) => request(`/mercado/margen/${tipoCultivoId}`, { signal });
/** GET /supuestos-margen/{tipo_cultivo_id} */
export const getSupuestos = (tipoCultivoId, signal) => request(`/mercado/supuestos-margen/${tipoCultivoId}`, { signal });
/** PUT /supuestos-margen/{tipo_cultivo_id} */
export const putSupuestos = (tipoCultivoId, body) => request(`/mercado/supuestos-margen/${tipoCultivoId}`, { method: "PUT", body });

/** GET /silos/{id}/indice-venta/historial */
export const getIndiceHistorial = (siloId, signal) => listAll(`/mercado/silos/${siloId}/indice-venta/historial`, {}, signal);

/** Carga manual de cotización con fecha y mercado elegidos. */
export const cargarCotizacion = ({ tipoCultivoId, fecha, precio, mercado }) =>
  createCotizacion({ tipo_cultivo_id: tipoCultivoId, fecha_cotizacion: fecha, precio_usd_tn: precio, mercado_referencia: mercado });
