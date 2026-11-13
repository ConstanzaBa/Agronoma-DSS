import { createEstablecimiento, createLote, deleteEstablecimiento, deleteLote, getLote, listEstablecimientos, listLotesDe, listTiposCultivo, updateEstablecimiento, updateLote } from "./campo.js";
import { centroid } from "../data/geo.js";

// Modelo del frontend: "zona" = establecimiento del backend; "lote" = lote.
// Se mantiene la forma que consumen SectorMap / FieldsSheet / TelemetryChart.

const levelOf = (m) => (m < 20 ? "critical" : m < 35 ? "warning" : "optimal");

function statusOf(lote) {
  const e = String(lote.estado ?? "").toLowerCase();
  if (/(cr[ií]tic|critical)/.test(e)) return "critical";
  if (/(alert|advert|warning|precauci)/.test(e)) return "warning";
  if (/([oó]ptim|normal|optimal|ok)/.test(e)) return "optimal";
  return lote.ultima_humedad_suelo_pct != null ? levelOf(Number(lote.ultima_humedad_suelo_pct)) : "optimal";
}

function cropLabel(lote, tipos) {
  const tipo = tipos.find((t) => t.id === lote.tipo_cultivo_id)?.nombre;
  return [tipo, lote.variedad].filter(Boolean).join(" / ") || "Sin cultivo";
}

const coord = (v, max) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
};

/**
 * Posición del indicador de humedad en el mapa. Real cuando el lote trae `dispositivos` (GET /campo/lotes/{id}):
 * latitud/longitud del sensor activo con conexión más reciente. Si el sensor no tiene coordenadas
 * (son opcionales en el backend) se usa una posición aproximada junto al centro del lote (`approx: true`).
 */
function sensorOf(lote, c, moisture) {
  if (moisture == null) return null;
  const real = (lote.dispositivos ?? [])
    .filter((d) => d.activo !== false)
    .map((d) => ({ lat: coord(d.latitud, 90), lng: coord(d.longitud, 180), t: Date.parse(d.ultima_conexion_en) || 0 }))
    .filter((d) => d.lat != null && d.lng != null)
    .sort((a, b) => b.t - a.t)[0];
  if (real) return { pos: [real.lat, real.lng], approx: false };
  return c ? { pos: [c[0] + 0.0004, c[1] + 0.0005], approx: true } : null;
}

export function mapLote(lote, tipos = []) {
  const coords = (lote.coordenadas ?? []).map(([a, b]) => [Number(a), Number(b)]);
  const moisture = lote.ultima_humedad_suelo_pct == null ? null : Math.round(Number(lote.ultima_humedad_suelo_pct));
  const c = coords.length ? centroid(coords) : null;
  return {
    id: lote.id,
    zoneId: lote.establecimiento_id,
    name: lote.nombre,
    crop: cropLabel(lote, tipos),
    status: statusOf(lote),
    moisture,
    coords,
    area: Math.round(Number(lote.superficie_ha) * 10) / 10,
    sensor: sensorOf(lote, c, moisture),
    raw: lote,
  };
}

export const mapEstablecimiento = (e, lots = []) => ({
  id: e.id,
  name: e.nombre,
  admin: e.zona_administrativa ?? "",
  center: [Number(e.latitud_centro), Number(e.longitud_centro)],
  zoom: e.zoom ?? 13,
  lots,
});

/** Establecimientos + lotes + tipos de cultivo del usuario autenticado. */
export async function getZones() {
  const [ests, tipos] = await Promise.all([listEstablecimientos(), listTiposCultivo().catch(() => [])]);
  // El listado de lotes no incluye dispositivos: GET /lotes/{id} sí. Solo se consulta el detalle de los lotes
  // con humedad medida (los únicos que dibujan indicador); si falla, el lote conserva la posición aproximada.
  const withSensors = async (l) => {
    if (l.ultima_humedad_suelo_pct == null) return l;
    try {
      const d = await getLote(l.id);
      return { ...l, dispositivos: d?.dispositivos ?? [] };
    } catch {
      return l;
    }
  };
  const lotes = await Promise.all(ests.map(async (e) => Promise.all((await listLotesDe(e.id)).map(withSensors))));
  const zones = ests.map((e, i) => mapEstablecimiento(e, lotes[i].map((l) => mapLote(l, tipos))));
  return { zones, tipos };
}

export async function addZone(place) {
  const e = await createEstablecimiento({
    nombre: [place.name, place.admin].filter(Boolean).join(", ").slice(0, 120),
    zona_administrativa: place.admin ? place.admin.slice(0, 150) : null,
    latitud_centro: place.lat,
    longitud_centro: place.lng,
    zoom: 12,
  });
  return mapEstablecimiento(e);
}

/** POST /campo/establecimientos con los campos del formulario. */
export async function addZoneForm(body) {
  const e = await createEstablecimiento(body);
  return mapEstablecimiento(e);
}

/** PUT /campo/establecimientos/{id} */
export const editZoneApi = (id, body) => updateEstablecimiento(id, body);
export const removeZoneApi = (id) => deleteEstablecimiento(id);
export const removeLoteApi = (id) => deleteLote(id);

/** PUT /campo/lotes/{id} con los campos del formulario (coordenadas incluidas en el body). */
export const editLoteApi = (id, body) => updateLote(id, body);

/** "Soja / DM 46" → tipo "Soja" (si existe en el catálogo) + variedad "DM 46". */
function parseCrop(text, tipos) {
  const [head, ...rest] = text.split("/").map((s) => s.trim());
  const tipo = tipos.find((t) => t.nombre.toLowerCase() === (head ?? "").toLowerCase());
  if (tipo) return { tipo_cultivo_id: tipo.id, variedad: rest.join(" / ") || null };
  return { tipo_cultivo_id: null, variedad: text.trim() || null };
}

export async function addLote(zoneId, { name, crop, coords, area }, tipos) {
  const l = await createLote(zoneId, {
    nombre: name.slice(0, 120),
    coordenadas: coords,
    superficie_ha: Math.max(0.01, Math.round(area * 100) / 100),
    ...parseCrop(crop, tipos),
  });
  return mapLote(l, tipos);
}

export async function renameLote(lot, name, tipos) {
  const r = lot.raw;
  const l = await updateLote(lot.id, {
    nombre: name.slice(0, 120),
    coordenadas: r.coordenadas,
    superficie_ha: r.superficie_ha,
    tipo_cultivo_id: r.tipo_cultivo_id,
    variedad: r.variedad,
  });
  return mapLote({ ...l, dispositivos: r.dispositivos }, tipos); // la respuesta del PUT no trae dispositivos: se conservan los ya cargados
}

/**
 * Búsqueda de zonas geográficas (ciudades, regiones, localidades de todo el mundo).
 * API pública de geocodificación de Open-Meteo (no es del backend): sirve para obtener
 * las coordenadas con que se crea el establecimiento.
 */
export async function searchPlaces(query, signal) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(query)}&count=6&language=es&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    admin: [p.admin1, p.country].filter(Boolean).join(", "),
    lat: p.latitude,
    lng: p.longitude,
  }));
}
