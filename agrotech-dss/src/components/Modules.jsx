import { CloudSun, Droplet, LineChart, Map, Satellite, Thermometer } from "lucide-react";

const modules = [
  { icon: Map, title: "Mapeo GIS", desc: "Capas espaciales" },
  { icon: Thermometer, title: "Sensores IoT", desc: "Telemetría de campo" },
  { icon: Droplet, title: "Irrigación DSS", desc: "Balance hídrico", featured: true },
  { icon: LineChart, title: "Predictivos", desc: "Modelos de rinde" },
  { icon: CloudSun, title: "Clima API", desc: "Datos meteorológicos" },
  { icon: Satellite, title: "Índices NDVI", desc: "Imágenes satelitales" },
];

export default function Modules() {
  return (
    <section id="modulos" className="border-b border-canopy-200 bg-canopy-50 dark:border-gold-400/10 dark:bg-canopy-950">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1fr_2fr] lg:px-8 lg:py-24">
        <div>
          <span className="inline-block border border-canopy-300 bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-canopy-700 dark:border-0 dark:bg-transparent dark:px-0 dark:text-xs dark:font-medium dark:text-gold-400">
            <span className="hidden dark:inline">// </span>
            <span className="dark:hidden">Módulos de campo</span>
            <span className="hidden dark:inline">Telemetría avanzada</span>
          </span>
          <h2 className="display-title mt-4 text-4xl text-canopy-800 sm:text-5xl dark:text-white">
            Infraestructura
            <span className="block dark:text-gold-400">Telemetría</span>
            Análisis
          </h2>
          <p className="mt-5 max-w-sm font-mono text-sm leading-relaxed text-canopy-700/80 dark:text-canopy-200">
            Módulos GIS y procesamiento de datos en tiempo real para optimización de recursos
            hídricos y monitoreo solar in situ.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, title, desc, featured }) => (
            <article
              key={title}
              className={[
                "group rounded-lg border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-soft",
                "dark:bg-canopy-900/40 dark:hover:shadow-glow",
                featured
                  ? "border-2 border-canopy-600 dark:border-gold-400/50"
                  : "border-canopy-200 dark:border-gold-400/15",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-11 w-11 place-items-center rounded-lg",
                  featured
                    ? "bg-canopy-600 text-white dark:border dark:border-gold-400/40 dark:bg-transparent dark:text-gold-400"
                    : "bg-canopy-100 text-canopy-600 dark:border dark:border-gold-400/30 dark:bg-transparent dark:text-gold-400",
                ].join(" ")}
              >
                <Icon size={20} />
              </span>
              <h3 className="mt-8 font-mono text-sm font-bold uppercase tracking-wide text-canopy-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 font-mono text-xs text-canopy-600/80 dark:text-canopy-300">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
