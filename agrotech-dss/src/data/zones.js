// Zonas y lotes de ejemplo, con coordenadas reales [lat, lng].
// Los polígonos se generan alrededor del centro de cada zona (son ilustrativos:
// no corresponden a parcelas reales). Reemplazar por los datos de tu backend.
import { centroid, polygonAreaHa, toLatLng } from "./geo.js";

function rng(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPE = [
  [-1, -0.9],
  [0.2, -1.05],
  [1, -0.6],
  [0.92, 0.9],
  [-0.9, 1],
];

function build(zoneId, center, def) {
  const rand = rng(def.seed);
  const rot = (def.rot * Math.PI) / 180;
  const coords = SHAPE.map(([sx, sy]) => {
    const x = (sx + (rand() - 0.5) * 0.22) * (def.w / 2);
    const y = (sy + (rand() - 0.5) * 0.22) * (def.h / 2);
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    return toLatLng(center, def.dx + rx, def.dy + ry);
  });
  const c = centroid(coords);
  return {
    id: def.id,
    zoneId,
    name: def.name,
    crop: def.crop,
    status: def.status,
    moisture: def.moisture,
    shift: def.shift,
    coords,
    area: Math.round(polygonAreaHa(coords) * 10) / 10,
    sensor: { pos: [c[0] + 0.0004, c[1] + 0.0005] },
  };
}

function zone(id, name, center, zoom, defs) {
  return { id, name, center, zoom, lots: defs.map((d) => build(id, center, d)) };
}

export const baseZones = [
  zone("iowa", "Iowa, United States", [41.733, -93.602], 13, [
    { id: "s7", name: "Sector 7 Alpha", crop: "Maíz / Dekalb", status: "warning", moisture: 12, shift: 0, dx: 0, dy: 0, w: 560, h: 620, rot: 12, seed: 7 },
    { id: "s3", name: "Sector 3 Beta", crop: "Soja / Asgrow", status: "optimal", moisture: 45, shift: 28, dx: -700, dy: 180, w: 460, h: 580, rot: -8, seed: 3 },
    { id: "s5", name: "Sector 5 Gamma", crop: "Maíz / Pioneer", status: "optimal", moisture: 52, shift: 36, dx: 420, dy: 700, w: 640, h: 440, rot: 6, seed: 5 },
    { id: "s9", name: "Sector 9 Delta", crop: "Soja", status: "optimal", moisture: 41, shift: 22, dx: 780, dy: -280, w: 480, h: 540, rot: -14, seed: 9 },
    { id: "s2", name: "Sector 2 Epsilon", crop: "Trigo", status: "critical", moisture: 9, shift: -10, dx: -320, dy: -760, w: 620, h: 440, rot: 10, seed: 2 },
  ]),

  zone("riverside", "Riverside, California", [33.92, -117.36], 14, [
    { id: "r1", name: "Ponte Winery", crop: "Almond / Nonpareil", status: "optimal", moisture: 44, shift: 24, dx: 0, dy: 0, w: 380, h: 340, rot: 8, seed: 11 },
    { id: "r2", name: "Cedar Block", crop: "Almond / Monterey", status: "optimal", moisture: 39, shift: 18, dx: -520, dy: 310, w: 340, h: 420, rot: -10, seed: 12 },
    { id: "r3", name: "Mesa Orchard", crop: "Citrus / Navel", status: "warning", moisture: 28, shift: 4, dx: 560, dy: 360, w: 400, h: 330, rot: 14, seed: 13 },
    { id: "r4", name: "Arroyo North", crop: "Almond / Carmel", status: "optimal", moisture: 47, shift: 30, dx: -300, dy: -470, w: 420, h: 300, rot: 4, seed: 14 },
    { id: "r5", name: "Sunset Grove", crop: "Citrus / Valencia", status: "optimal", moisture: 42, shift: 20, dx: 470, dy: -430, w: 360, h: 360, rot: -6, seed: 15 },
    { id: "r6", name: "Eastside Block", crop: "Pistachio / Kerman", status: "critical", moisture: 15, shift: -6, dx: 960, dy: -40, w: 330, h: 400, rot: 18, seed: 16 },
    { id: "r7", name: "Valley Row", crop: "Grape / Cabernet", status: "optimal", moisture: 50, shift: 32, dx: -940, dy: -90, w: 340, h: 380, rot: -4, seed: 17 },
    { id: "r8", name: "Hilltop", crop: "Almond / Nonpareil", status: "optimal", moisture: 37, shift: 16, dx: 90, dy: 640, w: 420, h: 310, rot: 9, seed: 18 },
  ]),

  zone("cordoba", "Córdoba, Argentina", [-31.025, -64.065], 13, [
    { id: "c1", name: "Lote La Cañada", crop: "Soja / DM 46", status: "optimal", moisture: 46, shift: 26, dx: 0, dy: 0, w: 780, h: 560, rot: 10, seed: 21 },
    { id: "c2", name: "El Algarrobo", crop: "Maíz / Syngenta", status: "warning", moisture: 27, shift: 6, dx: -980, dy: 240, w: 640, h: 700, rot: -7, seed: 22 },
    { id: "c3", name: "Los Chañares", crop: "Maní / Granoleico", status: "optimal", moisture: 40, shift: 19, dx: 940, dy: 320, w: 700, h: 520, rot: 5, seed: 23 },
    { id: "c4", name: "San Jorge", crop: "Trigo / Baguette", status: "optimal", moisture: 43, shift: 23, dx: -300, dy: -820, w: 720, h: 460, rot: -12, seed: 24 },
    { id: "c5", name: "La Esperanza", crop: "Soja / Don Mario", status: "critical", moisture: 11, shift: -8, dx: 760, dy: -760, w: 600, h: 520, rot: 15, seed: 25 },
    { id: "c6", name: "Don Mateo", crop: "Maíz / Dekalb", status: "optimal", moisture: 48, shift: 29, dx: 80, dy: 860, w: 760, h: 440, rot: 3, seed: 26 },
  ]),
];
