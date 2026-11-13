import { Sprout } from "lucide-react";

/** Ring gauge simple en SVG */
function Gauge({ value, label }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-white/10" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="stroke-lime-400"
        />
      </svg>
      <span className="-mt-[38px] mb-[18px] font-mono text-[11px] font-bold text-white">{value}%</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-canopy-300">{label}</span>
    </div>
  );
}

/** Mapa de lotes (celdas con distintos niveles de NDVI) */
const cells = [
  "bg-lime-500", "bg-lime-400", "bg-yellow-300", "bg-lime-500", "bg-lime-600",
  "bg-lime-400", "bg-lime-500", "bg-lime-400", "bg-yellow-400", "bg-lime-500",
  "bg-yellow-300", "bg-lime-600", "bg-lime-500", "bg-lime-400", "bg-lime-600",
  "bg-lime-500", "bg-yellow-400", "bg-lime-500", "bg-lime-600", "bg-lime-400",
];

const bars = [40, 62, 48, 80, 66, 92];

export default function DashboardMock() {
  return (
    <div className="rounded-2xl border-[6px] border-canopy-800 bg-canopy-900 p-2 shadow-soft dark:border-gold-400/15 dark:bg-canopy-950 dark:shadow-glow">
      <div className="mb-2 flex items-center justify-between rounded-md bg-canopy-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-canopy-200">
        <span className="flex items-center gap-2">
          <Sprout size={14} className="text-lime-400" />
          field_node_47 // canopy active
        </span>
        <span className="flex items-center gap-1.5 text-lime-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
          sync 99.8%
        </span>
      </div>

      <div className="grid gap-2 rounded-lg bg-canopy-800/90 p-3 sm:grid-cols-5 dark:bg-canopy-900/70">
        {/* Mapa */}
        <div className="sm:col-span-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-canopy-300">
            Lote 7A · Rendimiento trigo
          </p>
          <div className="grid grid-cols-5 gap-1 rounded-md bg-canopy-950/60 p-1.5">
            {cells.map((c, i) => (
              <div key={i} className={`aspect-[4/3] rounded-sm ${c} opacity-90`} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["42 L", "Consumo"],
              ["12,500", "Agua L"],
              ["6.8", "pH suelo"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-md bg-canopy-950/50 p-2 text-center">
                <p className="font-mono text-sm font-bold text-white">{v}</p>
                <p className="font-mono text-[9px] uppercase text-canopy-300">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <div className="rounded-md bg-canopy-950/50 p-2">
            <p className="mb-1 text-center font-mono text-[10px] uppercase tracking-wider text-canopy-300">
              Salud del cultivo
            </p>
            <div className="flex justify-around">
              <Gauge value={78} label="Crec." />
              <Gauge value={64} label="Humed." />
            </div>
          </div>
          <div className="flex flex-1 items-end gap-1.5 rounded-md bg-canopy-950/50 p-2">
            {bars.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%`, minHeight: 12 }}
                className="flex-1 rounded-sm bg-gradient-to-t from-lime-600 to-yellow-300"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
