import { ApiError, request } from "./http.js";
import { listTiposCultivo } from "./campo.js";

// Silos vía Gateway: /v1/silos/<ruta>  (interno: /api/v1/<ruta>).
// Contrato (Agronoma - Silos.md): listados → { data: [...], meta }, `por_pagina` por defecto 20 y máximo 100.
const MAX_PAGES = 20;
const RECENT = 8; // "Registros recientes" muestra 8: alcanza con los 8 movimientos más nuevos de cada silo (vienen ordenados por fecha desc).

/** GET /silos/silos?por_pagina=100 siguiendo meta.ultima_pagina (paginación estándar de Laravel: `page`). */
export async function listSilos(signal) {
  const out = [];
  let page = 1;
  let last = 1;
  do {
    const q = new URLSearchParams({ por_pagina: "100" });
    if (page > 1) q.set("page", String(page));
    const res = await request(`/silos/silos?${q}`, { signal });
    out.push(...(Array.isArray(res?.data) ? res.data : []));
    last = Number(res?.meta?.ultima_pagina) || 1;
    page++;
  } while (page <= last && page <= MAX_PAGES);
  return out;
}

/** GET /silos/{id}/stock → { silo_id, capacidad_tn, ocupacion_pct, entradas_tn, salidas_tn, stock_tn } (toneladas). */
export const getSiloStock = (id, signal) => request(`/silos/silos/${id}/stock`, { signal });

/** GET /silos/{id}/movimientos → { data: [Movimiento], meta }, orden fecha_movimiento desc, id desc. */
export const listMovimientos = async (id, signal) => {
  const res = await request(`/silos/silos/${id}/movimientos?por_pagina=${RECENT}`, { signal });
  return Array.isArray(res?.data) ? res.data : [];
};

/** POST /silos/{id}/movimientos → 201 (nuevo) o 200 (misma clave de idempotencia: devuelve el ya registrado). */
export const createMovimiento = (id, body) => conMensajes(request(`/silos/silos/${id}/movimientos`, { method: "POST", body }));

// Medición ausente = null en el backend (humedad_grano_pct, temperatura_nucleo_c): se conserva null.
const opt = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));

const daysSince = (d) => {
  if (!d) return 0; // almacenado_desde = null cuando el silo está vacío
  const ms = Date.now() - new Date(`${String(d).slice(0, 10)}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

/** Silo (+ respuesta de /stock) → modelo que consume SilosView / ManualEntryModal. */
export function mapSilo(s, stock, tipos = []) {
  const tons = Number(stock?.stock_tn);
  if (!Number.isFinite(tons)) throw new Error(`Respuesta de stock inesperada para el silo ${s.nombre ?? s.id}.`);
  const tipo = tipos.find((t) => t.id === s.tipo_cultivo_id);
  return {
    id: String(s.id),
    name: s.nombre,
    crop: tipo?.nombre ?? "Sin cultivo",
    capacity: Number(s.capacidad_tn),
    tons,
    grainMoisture: opt(s.humedad_grano_pct),
    temp: opt(s.temperatura_nucleo_c),
    moistureLimit: opt(tipo?.limite_humedad_pct), // GET /campo/tipos-cultivo
    tempLimit: Number(s.temperatura_limite_c), // no nulo: el backend lo completa con 25
    days: daysSince(s.almacenado_desde),
    maxDays: opt(tipo?.dias_almacenamiento_seguro), // GET /campo/tipos-cultivo
  };
}

/** Movimiento { id, silo_id, direccion: "in"|"out", toneladas, fecha_movimiento: "Y-m-d", observacion|null }. */
export function mapMovimiento(m, siloName) {
  return {
    id: `mov-${m.id}`,
    kind: "silo",
    siloId: String(m.silo_id),
    siloName,
    direction: m.direccion,
    tons: Number(m.toneladas),
    date: String(m.fecha_movimiento).slice(0, 10),
    note: m.observacion ?? "",
  };
}

/** Silos + stock + movimientos recientes del usuario autenticado. */
export async function getSilosData(signal) {
  const [silos, tipos] = await Promise.all([listSilos(signal), listTiposCultivo(signal).catch(() => [])]);
  const [stocks, movs] = await Promise.all([
    Promise.all(silos.map((s) => getSiloStock(s.id, signal))),
    Promise.all(silos.map((s) => listMovimientos(s.id, signal))),
  ]);
  return {
    silos: silos.map((s, i) => mapSilo(s, stocks[i], tipos)),
    movements: silos.flatMap((s, i) => movs[i].map((m) => mapMovimiento(m, s.nombre))),
  };
}

// Mensajes entendibles para los errores de Silos/Gateway (el cuerpo trae `codigo`; el texto del backend es técnico).
const MENSAJES = {
  sin_permiso: "No tenés permiso para esta acción. Solo el administrador puede crear o editar silos.",
  establecimiento_invalido: "El establecimiento elegido no pertenece a tu cuenta. Elegí otro e intentá de nuevo.",
  servicio_no_disponible: "El servicio no está disponible en este momento y no se guardó nada. Intentá de nuevo en unos minutos.",
};

async function conMensajes(promesa) {
  try {
    return await promesa;
  } catch (err) {
    const msg = err instanceof ApiError ? MENSAJES[err.code] : null;
    if (msg) {
      err.message = msg;
      // Marca el campo del formulario cuando el error es del establecimiento elegido.
      if (err.code === "establecimiento_invalido") err.fields = { establecimiento_id: msg };
    }
    throw err;
  }
}

/** GET /silos/{id} */
export const getSilo = (id, signal) => request(`/silos/silos/${id}`, { signal });
/** PUT /silos/{id} */
export const updateSilo = (id, body) => conMensajes(request(`/silos/silos/${id}`, { method: "PUT", body }));
/** PUT /silos/{id}/mediciones { humedad_grano_pct, temperatura_nucleo_c } */
export const updateMediciones = (id, body) => conMensajes(request(`/silos/silos/${id}/mediciones`, { method: "PUT", body }));

/** POST /silos/silos → 201 con el silo creado. */
export const createSilo = (body) => conMensajes(request("/silos/silos", { method: "POST", body }));

export const registrarMovimiento = (siloId, { direction, tons, date, note, key }) =>
  createMovimiento(siloId, {
    direccion: direction,
    toneladas: tons,
    fecha_movimiento: date,
    observacion: note ? note.slice(0, 255) : null,
    clave_idempotencia: key ?? crypto.randomUUID(),
  });
