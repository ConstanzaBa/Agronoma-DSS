import { Link } from "react-router-dom";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Core Data",
    tier: "Tier 01",
    price: "240",
    cta: "Init(Core)",
    features: ["Gestión Lotes Base", "Inventario", "Reportes Standard"],
  },
  {
    name: "IoT & Analytics",
    tier: "Tier 02 Pro",
    price: "580",
    note: "Facturación anual · DSS completo",
    cta: "Init(Pro)",
    featured: true,
    features: [
      "Telemetría Sensor API",
      "Módulo DSS Riego",
      "Análisis NDVI Satelital",
      "Alertas Predictivas",
    ],
  },
  {
    name: "Enterprise Cluster",
    tier: "Tier 03",
    price: "1,250",
    cta: "Contact(Sales)",
    features: ["API Rest Access", "Roles IAM", "Data Lake Export", "Soporte SLA 99.9%"],
  },
];

function Plan({ p }) {
  return (
    <div
      className={[
        "relative flex flex-col rounded-2xl p-8 transition",
        p.featured
          ? "bg-canopy-800 text-white shadow-soft ring-1 ring-gold-400/60 lg:-my-3 dark:bg-canopy-900 dark:shadow-glow"
          : "bg-canopy-700/95 text-white dark:border dark:border-gold-400/10 dark:bg-canopy-900/60",
      ].join(" ")}
    >
      {p.featured && (
        <span className="absolute -top-3 right-8 rounded bg-gold-400 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-canopy-900">
          Recomendado
        </span>
      )}

      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest">
        <span className={`flex items-center gap-1.5 ${p.featured ? "text-gold-400" : "text-canopy-100"}`}>
          {p.featured && <Zap size={13} />}
          {p.name}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] ${
            p.featured ? "bg-gold-400 font-bold text-canopy-900" : "bg-canopy-950/70 text-lime-400"
          }`}
        >
          {p.tier}
        </span>
      </div>

      <p className="mt-6 flex items-baseline gap-1">
        <span className={`font-display text-5xl font-bold ${p.featured ? "text-gold-400" : "text-white"}`}>
          ${p.price}
        </span>
        <span className="font-mono text-sm text-canopy-300">/mes</span>
      </p>
      <p className="mt-1 font-mono text-xs text-canopy-300">{p.note ?? "Facturación anual"}</p>

      <hr className="my-6 border-white/10" />

      <ul className="flex-1 space-y-3.5">
        {p.features.map((f) => (
          <li key={f} className="flex items-center gap-3 font-mono text-sm text-canopy-100">
            <Check size={15} className="shrink-0 text-lime-400" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/registro"
        className={[
          "mt-8 block w-full rounded-md border py-3 text-center font-mono text-sm font-medium transition",
          p.featured
            ? "border-gold-400/70 bg-canopy-950 text-gold-400 hover:bg-canopy-950/70"
            : "border-white/25 text-white hover:bg-white/10",
        ].join(" ")}
      >
        {p.cta}
      </Link>
    </div>
  );
}

export default function Pricing() {
  return (
    <section id="precios" className="relative overflow-hidden bg-canopy-50 dark:bg-canopy-950">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <p className="section-label">// Planes y capacidad</p>
          <h2 className="display-title mt-3 text-4xl text-canopy-800 sm:text-5xl dark:text-white">
            Planes de despliegue
          </h2>
          <p className="mt-3 font-mono text-sm text-canopy-600/70 dark:text-canopy-300">
            Escala la analítica y telemetría de tus campos con precisión algorítmica.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl items-start gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <Plan key={p.name} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
