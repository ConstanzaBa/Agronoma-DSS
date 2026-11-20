import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import AuthLayout, { primaryBtn } from "../components/auth/AuthLayout.jsx";
import { Field, PasswordField } from "../components/auth/Field.jsx";
import { readPendingFlag, signIn } from "../auth.js";
import { login } from "../api/auth.js";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ dark, onToggle }) {
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const validate = () => {
    const e = {};
    if (!emailRe.test(form.email)) e.email = "Ingresá un correo válido.";
    if (!form.password) e.password = "Ingresá tu contraseña."; // la temporal puede tener otra longitud que las normales
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const data = await login(form.email.trim(), form.password);
      if (!data?.token) throw new Error("El servidor no devolvió un token de sesión.");
      signIn(data, form.remember);
      // primer_ingreso_pendiente = true → el primer ingreso es obligatorio antes de usar el panel.
      navigate(readPendingFlag(data) ? "/primer-ingreso" : "/dashboard", { replace: true });
    } catch (err) {
      const next = {};
      if (err.fields?.correo) next.email = err.fields.correo;
      if (err.fields?.contrasena) next.password = err.fields.contrasena;
      if (!Object.keys(next).length) next.form = err.message || "No se pudo iniciar sesión.";
      setErrors(next);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      dark={dark}
      onToggle={onToggle}
      title="Iniciar sesión"
      subtitle="Accedé al panel de gestión de tus lotes."
      footer={
        <>
          ¿Querés usar Agronoma?{" "}
          <Link to="/contratacion" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
            Contratá un plan
          </Link>
          <br />
          ¿Sos empleado?{" "}
          <Link to="/registro" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
            Registrate con tu código
          </Link>
        </>
      }
    >
      {errors.form && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-md border border-red-500/40 bg-red-500/10 p-3.5 font-mono text-xs text-red-600 dark:text-red-400"
        >
          <AlertCircle size={16} className="shrink-0" /> {errors.form}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="agronomo@campo.com"
          icon={Mail}
          value={form.email}
          onChange={set("email")}
          error={errors.email}
        />
        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={Lock}
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />

        <div className="flex items-center font-mono text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-canopy-700 dark:text-canopy-200">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={set("remember")}
              className="h-4 w-4 rounded border-canopy-400 accent-canopy-600 dark:accent-gold-400"
            />
            Recordarme
          </label>
        </div>

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Verificando...
            </>
          ) : (
            "Ingresar"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
