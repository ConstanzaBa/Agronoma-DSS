import { useMemo, useState } from "react";

const W = 940;
const H = 200;

/** Gráfico de línea simple (mismo estilo que TelemetryChart). points: [{ label, value }] en orden cronológico. */
export default function SeriesChart({ points, format = (v) => String(v), min, max, ariaLabel = "Serie histórica" }) {
  const [hover, setHover] = useState(null);
  const geo = useMemo(() => {
    if (!points.length) return null;
    const vals = points.map((p) => p.value);
    const lo = min ?? Math.min(...vals);
    const hi = max ?? Math.max(...vals);
    const span = hi - lo || Math.abs(hi) * 0.1 || 1;
    const pad = min == null ? span * 0.1 : 0;
    const y = (v) => H - 14 - ((v - (lo - pad)) / (span + (min == null ? pad * 2 : 0))) * (H - 28);
    const x = (i) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
    return { y, x, path: points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ") };
  }, [points, min, max]);

  if (!geo) return null;
  const hp = hover == null ? null : points[hover];
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * (points.length - 1);
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(px))));
  };

  return (
    <div>
      <p className="h-4 font-mono text-xs uppercase tracking-wider text-canopy-600/80 dark:text-canopy-300">
        {hp ? `${hp.label} · ${format(hp.value)}` : `${points[0].label} → ${points[points.length - 1].label}`}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-[170px] w-full cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={ariaLabel}>
        {[30, 90, 150].map((gy) => (
          <line key={gy} x1="0" x2={W} y1={gy} y2={gy} vectorEffect="non-scaling-stroke" className="stroke-canopy-200 dark:stroke-white/10" />
        ))}
        <path d={geo.path} fill="none" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-sky-500 dark:stroke-gold-300" />
        {hover != null && <line x1={geo.x(hover)} x2={geo.x(hover)} y1="0" y2={H} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="stroke-canopy-500/60 dark:stroke-white/40" />}
      </svg>
    </div>
  );
}
