import { Link } from "react-router-dom";
import { Github, Radio } from "lucide-react";
import HashLink from "./HashLink.jsx";

const REPO_URL = "https://github.com/ConstanzaBa/Agronoma-DSS";

// Solo enlaces que existen: secciones de la landing y rutas de la app.
const columns = [
  {
    title: "Producto",
    links: [
      { label: "Módulos", to: "/#modulos", hash: true },
      { label: "Sectores", to: "/#sectores", hash: true },
      { label: "Precios", to: "/#precios", hash: true },
    ],
  },
  {
    title: "Desarrolladores",
    links: [
      { label: "API Docs", to: "/docs" },
      { label: "Repositorio GitHub", href: REPO_URL },
      { label: "Informe de amenazas", href: "/informe-de-amenazas.pdf" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { label: "Iniciar sesión", to: "/login" },
      { label: "Contratar", to: "/contratacion" },
    ],
  },
];

const linkCls = "transition hover:text-gold-400";

export default function Footer() {
  return (
    <footer
      id="contacto"
      className="bg-canopy-900 text-canopy-100 dark:border-t dark:border-gold-400/10 dark:bg-canopy-950"
    >
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex items-center justify-center gap-3">
          <Radio className="text-gold-400" size={24} />
          <span className="font-mono text-xl font-bold uppercase tracking-[0.15em] text-white">
            Agronoma <span className="text-gold-400">DSS</span>
          </span>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-gold-400">
                <span className="hidden dark:inline">// </span>
                {c.title}
              </h4>
              <ul className="mt-6 space-y-3 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                        {l.label}
                      </a>
                    ) : l.hash ? (
                      <HashLink to={l.to} className={linkCls}>{l.label}</HashLink>
                    ) : (
                      <Link to={l.to} className={linkCls}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="font-mono text-xs leading-relaxed text-canopy-300">
              Software DSS para la administración interna de tus lotes: campo, sensores IoT, silos,
              mercado y alertas en un solo lugar.
            </p>
            <div className="mt-6 flex gap-4 text-gold-400">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-center font-mono text-[11px] uppercase tracking-wider text-canopy-300/70">
          System_Copyright © {new Date().getFullYear()} Agronoma. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
