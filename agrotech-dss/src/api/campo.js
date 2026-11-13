import { request } from "./http.js";

// Campo vía Gateway: /v1/campo/<ruta>  (interno: /api/v1/<ruta>).
// Los listados llegan como { data: [...], meta } (o directamente un arreglo).
const rows = (res) => {
  // Si el backend informa más páginas de las que se pidieron, hay registros que este cliente no lee.
  if (Number(res?.meta?.ultima_pagina) > 1) {
    console.warn(`[campo] Listado paginado incompleto: se leyeron ${res.data?.length ?? 0} de ${res.meta.total} registros.`);
  }
  return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
};

// Paginación (Agronoma - campo.md, Respuesta::porPagina): `por_pagina` por defecto 20, mínimo 1, máximo 100.
// Se pide el máximo para no truncar los listados. No se usa ningún parámetro de página: la guía no lo documenta.
const PER_PAGE = 100;

export const listEstablecimientos = async (signal) => rows(await request(`/campo/establecimientos?por_pagina=${PER_PAGE}`, { signal }));
export const createEstablecimiento = (body) => request("/campo/establecimientos", { method: "POST", body });
export const listLotesDe = async (establecimientoId, signal) =>
  rows(await request(`/campo/establecimientos/${establecimientoId}/lotes?por_pagina=${PER_PAGE}`, { signal }));
/** GET /lotes/{id} → lote con `dispositivos: [{ id, nombre, latitud, longitud, activo, ultima_conexion_en, ... }]` (LoteController::show hace load('dispositivos')). */
export const getLote = (id, signal) => request(`/campo/lotes/${id}`, { signal });
export const createLote = (establecimientoId, body) =>
  request(`/campo/establecimientos/${establecimientoId}/lotes`, { method: "POST", body });
export const updateLote = (id, body) => request(`/campo/lotes/${id}`, { method: "PUT", body });
export const updateEstablecimiento = (id, body) => request(`/campo/establecimientos/${id}`, { method: "PUT", body });
export const deleteEstablecimiento = (id) => request(`/campo/establecimientos/${id}`, { method: "DELETE" });
export const deleteLote = (id) => request(`/campo/lotes/${id}`, { method: "DELETE" });
/** GET /establecimientos/{id}/clima → { actual: { temperatura_c, humedad_pct, precipitacion_mm, viento_kmh }, fuente, desactualizada, consultado_en, ... } (503 clima_no_disponible). */
export const getClima = (establecimientoId, signal) => request(`/campo/establecimientos/${establecimientoId}/clima`, { signal });
/** POST /lotes/{id}/dispositivos → { dispositivo, token, permisos, aviso } (el token se muestra una sola vez). */
export const createDispositivo = (loteId, body) => request(`/campo/lotes/${loteId}/dispositivos`, { method: "POST", body });
export const listTiposCultivo = async (signal) => rows(await request("/campo/tipos-cultivo", { signal }));
export const listLecturas = async (loteId, { desde, hasta } = {}, signal) => {
  const q = new URLSearchParams({ por_pagina: String(PER_PAGE) });
  if (desde) q.set("desde", desde);
  if (hasta) q.set("hasta", hasta);
  return rows(await request(`/campo/lotes/${loteId}/lecturas?${q}`, { signal }));
};
export const listLluvia = async (loteId, { desde, hasta } = {}, signal) => {
  const q = new URLSearchParams({ por_pagina: String(PER_PAGE) });
  if (desde) q.set("desde", desde); // formato date (YYYY-MM-DD)
  if (hasta) q.set("hasta", hasta);
  return rows(await request(`/campo/lotes/${loteId}/lluvia?${q}`, { signal }));
};
export const createLluvia = (loteId, body) => request(`/campo/lotes/${loteId}/lluvia`, { method: "POST", body });
