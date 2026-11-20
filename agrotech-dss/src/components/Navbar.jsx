import { useState } from "react";
import { Link } from "react-router-dom";
import HashLink from "./HashLink.jsx";
import { Menu, Moon, Radio, Sun, X } from "lucide-react";

const links = [
  { href: "/#modulos", label: "Módulos" },
  { href: "/#sectores", label: "Sectores" },
  { href: "/#precios", label: "Precios" },
  { href: "/docs", label: "API Docs" },
  { href: "/#contacto", label: "Contacto" },
];

export default function Navbar({ dark, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-canopy-200 bg-canopy-50/90 backdrop-blur dark:border-gold-400/10 dark:bg-canopy-950/85">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-canopy-500 dark:border dark:border-gold-400/30 dark:bg-canopy-900/60 dark:text-gold-400">
            <Radio size={20} />
          </span>
          <span className="font-mono text-lg font-bold uppercase tracking-[0.12em] text-canopy-800 dark:text-white">
            Agronoma <span className="dark:text-gold-400">DSS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <HashLink
              key={l.href}
              to={l.href}
              className="text-[15px] font-medium text-canopy-800 transition hover:text-canopy-500 dark:font-mono dark:text-xs dark:uppercase dark:tracking-widest dark:text-canopy-200 dark:hover:text-gold-400"
            >
              {l.label}
            </HashLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-canopy-200 text-canopy-700 transition hover:bg-canopy-100 dark:border-gold-400/25 dark:text-gold-400 dark:hover:bg-canopy-900"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/login"
            className="hidden px-2 text-[15px] font-medium text-canopy-800 hover:text-canopy-500 dark:font-mono dark:text-xs dark:uppercase dark:tracking-widest dark:text-gold-400 lg:block"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/contratacion"
            className="hidden rounded-md bg-canopy-600 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-canopy-700 dark:bg-gold-400 dark:font-mono dark:text-xs dark:uppercase dark:tracking-widest dark:text-canopy-950 dark:hover:bg-gold-300 sm:block"
          >
            Contratar
          </Link>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-canopy-200 md:hidden dark:border-gold-400/25 dark:text-gold-400"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menú"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-canopy-200 px-5 py-4 md:hidden dark:border-gold-400/10">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <HashLink
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className="py-1 font-medium text-canopy-800 dark:text-canopy-100"
              >
                {l.label}
              </HashLink>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="py-1 font-medium text-canopy-800 dark:text-canopy-100"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/contratacion"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-canopy-600 px-5 py-2.5 text-center font-semibold text-white dark:bg-gold-400 dark:text-canopy-950"
            >
              Contratar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
