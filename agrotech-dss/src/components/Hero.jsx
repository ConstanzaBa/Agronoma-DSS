import { Link } from "react-router-dom";
import { ArrowUp, FileCode2, SignalHigh, Terminal } from "lucide-react";
import DashboardMock from "./DashboardMock.jsx";

const stats = [
  { label: "Silos activos", value: "142", unit: "bolsas", note: "CO2 óptimo", icon: "up" },
  { label: "Monitoreo", value: "38,500", unit: "ha", note: "85 lotes de grupo" },
  { label: "Sensores IoT", value: "1,248", unit: "on", note: "SLA 99.8%", icon: "signal" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-canopy-200 dark:border-gold-400/10">
      {/* Resplandor de fondo (solo oscuro) */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute -top-40 right-0 h-[500px] w-[700px] rounded-full bg-canopy-700/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-canopy-300 bg-canopy-100 px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-canopy-600 dark:border-canopy-600/50 dark:bg-transparent dark:text-canopy-400">
            <span className="h-2 w-2 rounded-full bg-canopy-600 dark:bg-canopy-400" />
            Agronomía de precisión y escala
          </span>

          <h1 className="display-title mt-6 text-5xl text-canopy-900 sm:text-6xl lg:text-7xl dark:text-white">
            El compañero que todo
            <span className="block text-canopy-500 dark:text-gold-400">agrónomo necesita</span>
          </h1>

          <p className="mt-6 max-w-xl border-canopy-500 bg-canopy-100 px-4 py-2.5 font-mono text-[15px] text-canopy-800 dark:border-l-2 dark:border-gold-400/40 dark:bg-transparent dark:py-0 dark:text-canopy-200">
            Un software DSS para la administración interna de tus lotes.
          </p>

          {/* Métricas */}
          <div className="mt-8 grid max-w-xl grid-cols-3 divide-x divide-canopy-300 rounded-xl border border-canopy-300 bg-canopy-100/70 py-4 dark:divide-gold-400/10 dark:border-gold-400/15 dark:bg-canopy-900/40">
            {stats.map((s) => (
              <div key={s.label} className="px-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-canopy-600/80 dark:text-canopy-300">
                  {s.label}
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-canopy-800 dark:text-white">
                  {s.value}{" "}
                  <span className="text-xs font-normal text-canopy-500 dark:text-canopy-200">{s.unit}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                  {s.icon === "up" && <ArrowUp size={11} />}
                  {s.icon === "signal" && <SignalHigh size={11} />}
                  {s.note}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#precios"
              className="inline-flex items-center gap-2 rounded-md bg-canopy-800 px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-white transition hover:bg-canopy-700 dark:bg-gold-400 dark:text-canopy-950 dark:hover:bg-gold-300"
            >
              <Terminal size={15} /> Deploy data stack
            </a>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-md border border-canopy-400 px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-canopy-700 transition hover:bg-canopy-100 dark:border-gold-400/30 dark:text-canopy-100 dark:hover:bg-canopy-900"
            >
              <FileCode2 size={15} /> Ver API docs
            </Link>
          </div>
        </div>

        <DashboardMock />
      </div>
    </section>
  );
}
