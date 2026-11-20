import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const base =
  "w-full rounded-md border bg-white px-3.5 py-3 text-[15px] text-canopy-900 outline-none transition placeholder:text-canopy-400 " +
  "focus:border-canopy-500 focus:ring-2 focus:ring-canopy-500/25 " +
  "dark:bg-canopy-900/60 dark:text-white dark:placeholder:text-canopy-600 dark:focus:border-gold-400 dark:focus:ring-gold-400/20";

export function Field({ label, id, error, icon: Icon, className = "", ...props }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-widest text-canopy-700 dark:text-canopy-200"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-canopy-400 dark:text-canopy-500"
          />
        )}
        <input
          id={id}
          aria-invalid={!!error}
          className={`${base} ${Icon ? "pl-10" : ""} ${
            error ? "border-red-500 dark:border-red-400" : "border-canopy-300 dark:border-gold-400/20"
          }`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function PasswordField({ label, id, error, icon: Icon, className = "", ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-widest text-canopy-700 dark:text-canopy-200"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-canopy-400 dark:text-canopy-500"
          />
        )}
        <input
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={!!error}
          className={`${base} pr-11 ${Icon ? "pl-10" : ""} ${
            error ? "border-red-500 dark:border-red-400" : "border-canopy-300 dark:border-gold-400/20"
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-canopy-500 hover:text-canopy-700 dark:text-canopy-400 dark:hover:text-gold-400"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function SelectField({ label, id, error, options, className = "", ...props }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-widest text-canopy-700 dark:text-canopy-200"
      >
        {label}
      </label>
      <select
        id={id}
        aria-invalid={!!error}
        className={`${base} ${
          error ? "border-red-500 dark:border-red-400" : "border-canopy-300 dark:border-gold-400/20"
        }`}
        {...props}
      >
        <option value="">Seleccioná una opción</option>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
      {error && <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** Medidor simple de fortaleza de contraseña (0-4) */
export function PasswordStrength({ value }) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];
  const colors = ["bg-red-500", "bg-red-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];
  if (!value) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < score ? colors[score] : "bg-canopy-200 dark:bg-canopy-800"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 font-mono text-[11px] text-canopy-600 dark:text-canopy-300">
        Seguridad: {labels[score]}
      </p>
    </div>
  );
}
