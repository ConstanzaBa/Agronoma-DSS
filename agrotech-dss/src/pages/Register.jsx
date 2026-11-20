import { useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../api/auth.js";
import { AlertCircle, Briefcase, CheckCircle2, Loader2, Lock, Mail, User, KeyRound } from "lucide-react";
import AuthLayout, { primaryBtn } from "../components/auth/AuthLayout.jsx";
import { Field, PasswordField, PasswordStrength, SelectField } from "../components/auth/Field.jsx";
import { EMPLOYEE_ROLES, ROLE_LABELS } from "../auth.js";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Solo roles de empleado: /registro nunca permite admin.
const roles = EMPLOYEE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

const initial = {
  nombre: "",
  apellido: "",
  email: "",
  codigo: "",
  profesion: "",
  rol: "",
  password: "",
  confirm: "",
  terms: false,
};

export default function Register({ dark, onToggle }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.codigo.trim()) e.codigo = "Ingresá el código de estancia que te dio tu administrador.";
    if (!form.nombre.trim()) e.nombre = "Requerido.";
    if (!form.apellido.trim()) e.apellido = "Requerido.";
    if (!emailRe.test(form.email)) e.email = "Ingresá un correo válido.";
    if (!form.rol) e.rol = "Elegí tu rol.";
    if (form.password.length < 8) e.password = "Mínimo 8 caracteres.";
    else if (!/\d/.test(form.password) || !/[A-Za-z]/.test(form.password))
      e.password = "Combiná letras y números.";
    if (form.confirm !== form.password) e.confirm = "Las contraseñas no coinciden.";
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
      // Sin cuenta_id / usuario_id / empleado_id / estancia: el backend resuelve la pertenencia por el código.
      await register({
        codigo_estancia: form.codigo.trim(),
        rol: form.rol,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.email.trim(),
        contrasena: form.password,
        profesion: form.profesion.trim(),
      });
      setDone(true);
    } catch (err) {
      const f = err.fields ?? {};
      const next = {};
      if (f.nombre) next.nombre = f.nombre;
      if (f.apellido) next.apellido = f.apellido;
      if (f.correo) next.email = f.correo;
      if (f.contrasena) next.password = f.contrasena;
      if (f.rol) next.rol = f.rol;
      if (f.profesion) next.profesion = f.profesion;
      if (f.codigo_estancia) next.codigo = f.codigo_estancia;
      if (!Object.keys(next).length) next.form = err.message || "No se pudo completar el registro.";
      setErrors(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      dark={dark}
      onToggle={onToggle}
      title="Registro de empleado"
      subtitle="Unite a la cuenta de tu empresa con el código de estancia que te dio tu administrador."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
            Iniciá sesión
          </Link>
          <br />
          ¿Querés contratar Agronoma?{" "}
          <Link to="/contratacion" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
            Ver planes
          </Link>
        </>
      }
    >
      {done ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-5 font-mono text-sm text-emerald-700 dark:text-emerald-300">
          <p className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={18} /> ¡Registro completado!
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            Ya podés iniciar sesión con tu correo y contraseña.
          </p>
          <Link to="/login" className={`${primaryBtn} mt-5`}>
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {errors.form && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-md border border-red-500/40 bg-red-500/10 p-3.5 font-mono text-xs text-red-600 dark:text-red-400"
            >
              <AlertCircle size={16} className="shrink-0" /> {errors.form}
            </div>
          )}
          <Field
            id="codigo"
            label="Código de estancia"
            icon={KeyRound}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Código que te dio tu administrador"
            value={form.codigo}
            onChange={set("codigo")}
            error={errors.codigo}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="nombre"
              label="Nombre"
              autoComplete="given-name"
              icon={User}
              value={form.nombre}
              onChange={set("nombre")}
              error={errors.nombre}
            />
            <Field
              id="apellido"
              label="Apellido"
              autoComplete="family-name"
              value={form.apellido}
              onChange={set("apellido")}
              error={errors.apellido}
            />
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="profesion"
              label="Profesión (opcional)"
              icon={Briefcase}
              value={form.profesion}
              onChange={set("profesion")}
              error={errors.profesion}
            />
            <SelectField
              id="rol"
              label="Rol"
              options={roles}
              value={form.rol}
              onChange={set("rol")}
              error={errors.rol}
            />
          </div>

          <div>
            <PasswordField
              id="password"
              label="Contraseña"
              autoComplete="new-password"
              icon={Lock}
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={set("password")}
              error={errors.password}
            />
            <PasswordStrength value={form.password} />
          </div>

          <PasswordField
            id="confirm"
            label="Confirmar contraseña"
            autoComplete="new-password"
            icon={Lock}
            value={form.confirm}
            onChange={set("confirm")}
            error={errors.confirm}
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
                Acepto los{" "}
                <span className="font-semibold text-canopy-600 dark:text-gold-400">términos de servicio</span>{" "}
                y la{" "}
                <span className="font-semibold text-canopy-600 dark:text-gold-400">política de privacidad</span>
                .
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{errors.terms}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Registrando...
              </>
            ) : (
              "Registrarme"
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
