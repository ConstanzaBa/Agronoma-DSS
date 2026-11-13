import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Radio, Sun } from "lucide-react";
import DashboardMock from "../DashboardMock.jsx";

const bullets = [
  "Mapas de lotes y NDVI satelital",
  "Telemetría IoT en tiempo real",
  "Balance hídrico y alertas predictivas",
];

export default function AuthLayout({ dark, onToggle, title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-canopy-800 p-12 text-white lg:flex lg:flex-col lg:justify-between dark:bg-canopy-900/60">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-canopy-500/20 blur-3xl dark:bg-gold-400/10" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <Radio className="text-gold-400" size={24} />
          <span className="font-mono text-lg font-bold uppercase tracking-[0.12em]">
            Agronoma <span className="text-gold-400">DSS</span>
          </span>
        </Link>

        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold-400">
            // Agronomía de precisión
          </p>
          <h2 className="display-title mt-3 text-5xl xl:text-6xl">
            Decisiones <span className="text-gold-400">basadas en datos</span> para cada lote
          </h2>
          <ul className="mt-6 space-y-2.5 font-mono text-sm text-canopy-100">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-10 max-w-md opacity-95">
            <DashboardMock />
          </div>
        </div>

        <p className="relative font-mono text-[11px] uppercase tracking-wider text-canopy-300/70">
          Agronoma Precision DSS v2.4
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex flex-col bg-canopy-50 dark:bg-canopy-950">
        <div className="flex items-center justify-between px-5 py-5 sm:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-canopy-700 hover:text-canopy-500 dark:text-canopy-200 dark:hover:text-gold-400"
          >
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
          <button
            onClick={onToggle}
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-canopy-200 text-canopy-700 transition hover:bg-canopy-100 dark:border-gold-400/25 dark:text-gold-400 dark:hover:bg-canopy-900"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <Radio className="text-canopy-500 dark:text-gold-400" size={22} />
              <span className="font-mono text-base font-bold uppercase tracking-[0.12em] text-canopy-800 dark:text-white">
                Agronoma <span className="dark:text-gold-400">DSS</span>
              </span>
            </div>

            <h1 className="display-title text-4xl text-canopy-800 sm:text-5xl dark:text-white">{title}</h1>
            <p className="mt-3 font-mono text-sm text-canopy-700/80 dark:text-canopy-300">{subtitle}</p>

            <div className="mt-8">{children}</div>

            <p className="mt-8 text-center font-mono text-sm text-canopy-700 dark:text-canopy-200">{footer}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-md bg-canopy-600 py-3.5 font-mono text-xs font-bold uppercase tracking-widest text-white transition " +
  "hover:bg-canopy-700 disabled:cursor-not-allowed disabled:opacity-60 " +
  "dark:bg-gold-400 dark:text-canopy-950 dark:hover:bg-gold-300";
