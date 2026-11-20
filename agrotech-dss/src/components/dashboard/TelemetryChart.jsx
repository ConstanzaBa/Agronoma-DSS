import { useEffect, useMemo, useState } from "react";
import { listLecturas } from "../../api/campo.js";
import { Card } from "./ui.jsx";

const W = 940;
const H = 230;
const DAYS = 30;
const DAY_MS = 86400000;
const clamp = (v) => Math.max(3, Math.min(97, v));
const y = (v) => H - 12 - (clamp(v) * (H - 30)) / 100;
const toPath = (pts, key) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

/** Agrupa las lecturas por día (promedio) sobre los últimos 30 días. */
function toSeries(lecturas, now) {
  const start = now - DAYS * DAY_MS;
  const byDay = new Map();
  for (const l of lecturas) {
    const t = Date.parse(l.medido_en);
    if (!Number.isFinite(t) || t < start || t > now) continue;
    const d = Math.floor((t - start) / DAY_MS);
    const a = byDay.get(d) ?? { n: 0, h: 0, t: 0, ts: 0 };
    a.n++;
    a.h += Number(l.humedad_suelo_pct);
    a.t += Number(l.temperatura_c);
    a.ts = Math.max(a.ts, t);
    byDay.set(d, a);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, a]) => ({
      x: ((a.ts - start) / (DAYS * DAY_MS)) * W,
      ts: a.ts,
      moisture: a.h / a.n,
      tempC: a.t / a.n,
      temp: (a.t / a.n) * 2, // escala del eje: 0–50 °C ↔ 0–100
    }));
}

export default function TelemetryChart({ lot: lotProp }) {
  const lot = lotProp ?? { name: "—" };
  const [hover, setHover] = useState(null);
  const [lecturas, setLecturas] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [now, setNow] = useState(() => Date.now());

  // GET /v1/campo/lotes/{id}/lecturas?desde&hasta (últimos 30 días)
  useEffect(() => {
    if (lotProp?.id == null) {
      setLecturas([]);
      setState("idle");
      return;
    }
    const ctrl = new AbortController();
    const hasta = Date.now();
    setNow(hasta);
    setHover(null);
    setLecturas([]); // no mostrar lecturas del lote anterior mientras carga el nuevo
    setState("loading");
    listLecturas(lotProp.id, { desde: new Date(hasta - DAYS * DAY_MS).toISOString(), hasta: new Date(hasta).toISOString() }, ctrl.signal)
      .then((r) => {
        setLecturas(r);
        setState("done");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setLecturas([]);
          setState("error");
        }
      });
    return () => ctrl.abort();
  }, [lotProp?.id]);

  const pts = useMemo(() => toSeries(lecturas, now), [lecturas, now]);
  const hp = hover === null ? null : pts[hover];
  const area = pts.length ? `${toPath(pts, "moisture")} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z` : "";

  const onMove = (e) => {
    if (!pts.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - px) < Math.abs(pts[best].x - px)) best = i;
    });
    setHover(best);
  };

  const fmtDay = (ts) => new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

  return (
    <Card id="telemetry-chart" className="p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold uppercase tracking-wide text-canopy-900 dark:text-white">
        Telemetry: Moisture vs Temp
      </h3>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        <p className="uppercase tracking-wider text-canopy-600/80 dark:text-canopy-300">
          {hp
            ? `${fmtDay(hp.ts)} · Moisture ${Math.round(hp.moisture)}% · Temp ${Math.round(hp.tempC)}°C`
            : `T-30 days trend analysis · ${lot.name}`}
        </p>
        <div className="flex gap-5 text-canopy-700 dark:text-canopy-200">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 dark:bg-gold-300" /> Moisture (%)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-lime-500" /> Temp (°C)
          </span>
        </div>
      </div>

      {state === "loading" && <p className="mt-5 text-sm text-canopy-600 dark:text-canopy-300">Cargando lecturas...</p>}
      {state === "error" && <p className="mt-5 text-sm text-red-500">No se pudieron cargar las lecturas del lote.</p>}
      {state === "done" && pts.length === 0 && (
        <p className="mt-5 text-sm text-canopy-600 dark:text-canopy-300">Este lote no tiene lecturas en los últimos 30 días.</p>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-5 h-[220px] w-full cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Gráfico de humedad y temperatura de los últimos 30 días"
      >
        {[30, 85, 140, 195].map((gy) => (
          <line
            key={gy}
            x1="0"
            x2={W}
            y1={gy}
            y2={gy}
            vectorEffect="non-scaling-stroke"
            className="stroke-canopy-200 dark:stroke-white/10"
          />
        ))}

        <g className="text-sky-500 dark:text-gold-300">
          <defs>
            <linearGradient id="area-m" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#area-m)" />}
          <path
            d={toPath(pts, "moisture")}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        <path
          d={toPath(pts, "temp")}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray="7 6"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-amber-500 dark:stroke-lime-500"
        />

        {hp && (
          <line
            x1={hp.x}
            x2={hp.x}
            y1="0"
            y2={H}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            className="stroke-canopy-500/60 dark:stroke-white/40"
          />
        )}
      </svg>

      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-canopy-500 dark:text-canopy-400">
        <span>T-30d</span>
        <span>T-15d</span>
        <span>Hoy</span>
      </div>
    </Card>
  );
}
