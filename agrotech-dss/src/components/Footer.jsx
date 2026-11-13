import { Github, Linkedin, Radio, Terminal } from "lucide-react";

const columns = [
  { title: "Network", links: ["API Docs", "System Status", "Dev Forum"] },
  { title: "Servicios", links: ["Cloud Hosting", "Technical Support", "Custom Integrations", "Data Migration"] },
  { title: "Empresa", links: ["Sobre Nosotros", "Carreras", "Tech Blog", "Seguridad"] },
];

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
                  <li key={l}>
                    <a href="#" className="transition hover:text-gold-400">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>

              {c.title === "Network" && (
                <>
                  <h4 className="mt-10 font-mono text-xs font-bold uppercase tracking-widest text-gold-400">
                    <span className="hidden dark:inline">// </span>Open Source
                  </h4>
                  <ul className="mt-6 space-y-3 text-sm">
                    <li><a href="#" className="transition hover:text-gold-400">Packages</a></li>
                    <li><a href="#" className="transition hover:text-gold-400">GitHub Repo</a></li>
                  </ul>
                </>
              )}
            </div>
          ))}

          <div>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-gold-400">
              <Terminal size={14} /> Lang: ES-LA
            </p>
            <p className="mt-4 font-mono text-xs leading-relaxed text-canopy-300">
              Agronoma Precision DSS v2.4. Soluciones agronómicas basadas en datos para gestión
              agrícola inteligente e IoT.
            </p>
            <div className="mt-6 flex gap-4 text-gold-400">
              <a href="#" aria-label="GitHub"><Github size={20} /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin size={20} /></a>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-center font-mono text-[11px] uppercase tracking-wider text-canopy-300/70">
          System_Copyright © 2025 Agronoma. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
