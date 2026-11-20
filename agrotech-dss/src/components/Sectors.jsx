import { Archive, BellRing, MapPinned, Radio, TrendingUp, Users } from "lucide-react";

// Áreas de aplicación de Agrónoma DSS, según los servicios documentados (Campo, Silos, Mercado, Alertas, Auth).
const sectors = [
  {
    icon: MapPinned,
    title: "Campo y lotes",
    desc: "Gestión de establecimientos y lotes, con registro de lluvia y clima por establecimiento.",
  },
  {
    icon: Radio,
    title: "Telemetría IoT",
    desc: "Sensores asignados a cada lote que envían sus lecturas al sistema.",
  },
  {
    icon: Archive,
    title: "Silos y stock",
    desc: "Stock, humedad y temperatura de silos y silobolsas, con ingresos y despachos.",
  },
  {
    icon: TrendingUp,
    title: "Mercado y comercialización",
    desc: "Cotizaciones por cultivo, dólar, insumos, margen e índice de venta para decidir cuándo vender.",
  },
  {
    icon: BellRing,
    title: "Alertas y objetivos de precio",
    desc: "Reglas de alerta y objetivos de precio, con avisos en tiempo real en el panel.",
  },
  {
    icon: Users,
    title: "Equipos y roles",
    desc: "Acceso del productor y su equipo a la información del establecimiento según su rol.",
  },
];

export default function Sectors() {
  return (
    <section
      id="sectores"
      className="border-b border-canopy-200 bg-white dark:border-gold-400/10 dark:bg-canopy-950"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="section-label">// Áreas de aplicación</p>
          <h2 className="display-title mt-3 text-4xl text-canopy-800 sm:text-5xl dark:text-white">
            Sectores
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-mono text-sm text-canopy-600/70 dark:text-canopy-300">
            Las áreas de la gestión agropecuaria que cubre Agronoma DSS.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="rounded-lg border border-canopy-200 bg-canopy-50 p-6 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-gold-400/15 dark:bg-canopy-900/40 dark:hover:shadow-glow"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-canopy-100 text-canopy-600 dark:border dark:border-gold-400/30 dark:bg-transparent dark:text-gold-400">
                <Icon size={20} />
              </span>
              <h3 className="mt-6 font-mono text-sm font-bold uppercase tracking-wide text-canopy-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-2 font-mono text-xs leading-relaxed text-canopy-600/80 dark:text-canopy-300">
                {desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
