const M = 111320; // metros por grado de latitud

/** Convierte un desplazamiento en metros (x = este, y = norte) a [lat, lng]. */
export function toLatLng(center, x, y) {
  return [center[0] + y / M, center[1] + x / (M * Math.cos((center[0] * Math.PI) / 180))];
}

/** Área aproximada de un polígono [lat, lng][] en hectáreas. */
export function polygonAreaHa(coords) {
  if (coords.length < 3) return 0;
  const [lat0, lng0] = coords[0];
  const kx = M * Math.cos((lat0 * Math.PI) / 180);
  const pts = coords.map(([lat, lng]) => [(lng - lng0) * kx, (lat - lat0) * M]);
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2) / 10000;
}

/** Centro aproximado (promedio de vértices). */
export function centroid(coords) {
  const n = coords.length;
  return [coords.reduce((a, c) => a + c[0], 0) / n, coords.reduce((a, c) => a + c[1], 0) / n];
}

export function formatLat(lat) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
}
export function formatLng(lng) {
  return `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
}
