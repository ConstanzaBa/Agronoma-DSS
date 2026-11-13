// Serie base (30 días) del gráfico de telemetría. Cada lote la desplaza según su "shift".
// Los lotes y zonas viven en data/zones.js.
export const baseSeries = {
  days: [30, 26, 22, 19, 15, 11, 8, 4, 0],
  moisture: [13, 27, 53, 33, 73, 87, 60, 40, 27],
  temp: [53, 47, 27, 40, 13, 7, 33, 44, 60],
};
