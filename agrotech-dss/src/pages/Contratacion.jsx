import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Mail, MailOpen, User } from "lucide-react";
import AuthLayout, { primaryBtn } from "../components/auth/AuthLayout.jsx";
import { Field } from "../components/auth/Field.jsx";
import { contratar } from "../api/auth.js";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Los límites reales de cada plan los define el backend; aquí solo se identifica el plan que se contrata.
const PLANS = [
  { id: "core", name: "Core Data", tier: "Tier 01" },
  { id: "pro", name: "IoT & Analytics", tier: "Tier 02 Pro" },
  { id: "enterprise", name: "Enterprise Cluster", tier: "Tier 03" },
];

export default function Contratacion({ dark, onToggle }) {
  const [params] = useSearchParams();
  const initialPlan = PLANS.some((p) => p.id === params.get("plan")) ? params.get("plan") : "pro";
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", plan: initialPlan, terms: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // respuesta del backend

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido.";
    if (!form.apellido.trim()) e.apellido = "Requerido.";
    if (!emailRe.test(form.email)) e.email = "Ingresá un correo válido.";
    if (!form.plan) e.plan = "Elegí un plan.";
    if (!form.terms) e.terms = "Debés aceptar los términos para continuar.";
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const data = await contratar({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.email.trim(),
        plan: form.plan,
      });
      setDone(data ?? {});
    } catch (err) {
      const f = err.fields ?? {};
      const next = {};
      if (f.nombre) next.nombre = f.nombre;
      if (f.apellido) next.apellido = f.apellido;
      if (f.correo) next.email = f.correo;
      if (f.plan) next.plan = f.plan;
      if (!Object.keys(next).length) next.form = err.message || "No se pudo completar la contratación.";
      setErrors(next);
    } finally {
      setLoading(false);
    }
  };

  const demoToken = done?.correo_simulado?.token;
  const plan = PLANS.find((p) => p.id === form.plan);

  return (
    <AuthLayout
      dark={dark}
      onToggle={onToggle}
      title="Contratar plan"
      subtitle="Creá tu cuenta: vas a ser el administrador y recibirás una contraseña temporal por correo."
      footer={
        <>
          ¿Ya contrataste?{" "}
          <Link to="/login" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
            Iniciá sesión
          </Link>
          <br />
          ¿Sos empleado?{" "}
          <Link to="/registro" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
            Registrate con tu código de estancia
          </Link>
        </>
      }
    >
      {done ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-5 font-mono text-sm text-emerald-700 dark:text-emerald-300">
          <p className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={18} /> ¡Contratación realizada!
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            Plan {plan?.name}. Te enviamos una contraseña temporal a <b>{form.email.trim()}</b>. Ingresá con ella: en tu
            primer ingreso vas a completar tus datos y elegir una contraseña nueva.
          </p>
          {demoToken && (
            <Link to={`/correo-simulado/${encodeURIComponent(demoToken)}`} className={`${primaryBtn} mt-5`}>
              <MailOpen size={15} /> Ver correo simulado (demo)
            </Link>
          )}
          <Link to="/login" className={`${primaryBtn} mt-3`}>
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {errors.form && (
            <div role="alert" className="flex items-center gap-2.5 rounded-md border border-red-500/40 bg-red-500/10 p-3.5 font-mono text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0" /> {errors.form}
            </div>
          )}

          <fieldset>
            <legend className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-widest text-canopy-700 dark:text-canopy-200">
              Plan
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLANS.map((p) => (
                <label
                  key={p.id}
                  className={`cursor-pointer rounded-md border p-3 font-mono text-xs transition ${
                    form.plan === p.id
                      ? "border-canopy-600 bg-canopy-600/10 text-canopy-900 dark:border-gold-400 dark:bg-gold-400/10 dark:text-gold-300"
                      : "border-canopy-300 text-canopy-700 hover:bg-canopy-100 dark:border-gold-400/20 dark:text-canopy-200 dark:hover:bg-canopy-900"
                  }`}
                >
                  <input type="radio" name="plan" value={p.id} checked={form.plan === p.id} onChange={set("plan")} className="sr-only" />
                  <span className="block font-bold">{p.name}</span>
                  <span className="block text-[10px] uppercase tracking-wider opacity-70">{p.tier}</span>
                </label>
              ))}
            </div>
            {errors.plan && <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{errors.plan}</p>}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="nombre" label="Nombre" autoComplete="given-name" icon={User} value={form.nombre} onChange={set("nombre")} error={errors.nombre} />
            <Field id="apellido" label="Apellido" autoComplete="family-name" value={form.apellido} onChange={set("apellido")} error={errors.apellido} />
          </div>

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

          <div>
            <label className="flex cursor-pointer items-start gap-2.5 font-mono text-xs leading-relaxed text-canopy-700 dark:text-canopy-200">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={set("terms")}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-canopy-400 accent-canopy-600 dark:accent-gold-400"
              />
              <span>
                Acepto los <span className="font-semibold text-canopy-600 dark:text-gold-400">términos de servicio</span> y la{" "}
                <span className="font-semibold text-canopy-600 dark:text-gold-400">política de privacidad</span>.
              </span>
            </label>
            {errors.terms && <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{errors.terms}</p>}
          </div>

          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Contratando...
              </>
            ) : (
              "Contratar y crear cuenta"
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
