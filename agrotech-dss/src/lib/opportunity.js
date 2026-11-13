// Índice de oportunidad de venta: 3 reglas simples y ponderadas (0–100).
//   Precio (35%)           → sube cuando el precio supera su promedio de 7 días (tope en +10%)
//   Días en silo (35%)     → sube cuanto más cerca está del plazo seguro de almacenaje
//   Humedad del grano (30%) → máxima si está por debajo del límite de recibo
// Al conectar el backend, esta misma función puede ejecutarse en el servidor.

const clamp = (v) => Math.min(1, Math.max(0, v));

export const pctChange = (price, avg) => (avg ? (price / avg - 1) * 100 : 0);

export function evaluate({ trendPct, days, maxDays, grainMoisture, moistureLimit }) {
  const sign = trendPct > 0 ? "+" : "";
  const rules = [
    {
      id: "price",
      label: "Precio",
      weight: 35,
      sub: clamp(trendPct / 10),
      pass: trendPct >= 5,
      detail: `${sign}${trendPct.toFixed(1)}% vs promedio 7d`,
      hint: "Favorable si sube 5% o más",
    },
    {
      id: "days",
      label: "Días en silo",
      weight: 35,
      sub: clamp(days / maxDays),
      pass: days / maxDays >= 0.7,
      detail: `${days} de ${maxDays} días`,
      hint: "Conviene vender al superar el 70% del plazo seguro",
    },
    {
      id: "moisture",
      label: "Humedad del grano",
      weight: 30,
      sub: clamp(1 - (grainMoisture - (moistureLimit - 1)) / 2),
      pass: grainMoisture <= moistureLimit,
      detail: `${grainMoisture.toFixed(1)}% (límite ${moistureLimit}%)`,
      hint: "Debe estar dentro del límite de recibo",
    },
  ];

  const score = Math.round(rules.reduce((s, r) => s + r.weight * r.sub, 0));
  const passed = rules.filter((r) => r.pass).length;

  const verdict =
    score >= 75
      ? { key: "sell", label: "Vender", text: "Las condiciones son favorables para concretar la venta." }
      : score >= 50
        ? { key: "review", label: "Evaluar", text: "Hay condiciones mixtas: revisá las reglas pendientes antes de vender." }
        : { key: "wait", label: "Esperar", text: "Todavía no conviene vender: el mercado y el stock no acompañan." };

  return { score, rules, passed, verdict };
}
