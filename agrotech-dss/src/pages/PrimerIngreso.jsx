import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Briefcase, Loader2, Lock, Phone, User } from "lucide-react";
import AuthLayout, { primaryBtn } from "../components/auth/AuthLayout.jsx";
import { Field, PasswordField, PasswordStrength } from "../components/auth/Field.jsx";
import { getMe, logout as apiLogout, primerIngreso } from "../api/auth.js";
import { getSession, isFirstLoginPending, setPendingFirstLogin, signOut, syncFromMe } from "../auth.js";

/**
 * Primer ingreso obligatorio: completa datos personales y reemplaza la contraseña temporal.
 * Al terminar se habilita el acceso normal SIN pedir un login nuevo (la sesión sigue vigente).
 * Durante este estado el Gateway solo deja pasar /auth/me, /auth/primer-ingreso y /auth/logout.
 */
export default function PrimerIngreso({ dark, onToggle }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", profesion: "", actual: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Precarga lo que ya se conoce (GET /auth/me está permitido en este estado).
  useEffect(() => {
    const u = getSession()?.usuario;
    if (u) setForm((f) => ({ ...f, nombre: u.nombre ?? "", apellido: u.apellido ?? "", telefono: u.telefono ?? "", profesion: u.profesion ?? "" }));
    getMe()
      .then((me) => {
        if (!me) return;
        const u = syncFromMe(me);
        // Si el backend informa que ya no está pendiente, no corresponde estar aquí.
        if (!isFirstLoginPending()) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setForm((f) => ({ ...f, nombre: f.nombre || u?.nombre || "", apellido: f.apellido || u?.apellido || "", telefono: f.telefono || u?.telefono || "", profesion: f.profesion || u?.profesion || "" }));
      })
      .catch(() => {
        /* 401 → http.js cierra la sesión; otros errores no impiden completar el formulario */
      });
  }, [navigate]);

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido.";
    if (!form.apellido.trim()) e.apellido = "Requerido.";
    if (!form.actual) e.actual = "Ingresá la contraseña temporal.";
    if (form.password.length < 8) e.password = "Mínimo 8 caracteres.";
    else if (!/\d/.test(form.password) || !/[A-Za-z]/.test(form.password)) e.password = "Combiná letras y números.";
    else if (form.password === form.actual) e.password = "Debe ser distinta de la temporal.";
    if (form.confirm !== form.password) e.confirm = "Las contraseñas no coinciden.";
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await primerIngreso({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        profesion: form.profesion.trim(),
        contrasena_actual: form.actual,
        contrasena: form.password,
      });
      // Se habilita el acceso normal conservando la sesión vigente. Se refresca el usuario desde el backend.
      try {
        const me = await getMe();
        if (me) syncFromMe(me);
      } catch {
        /* se conserva el usuario de la sesión */
      }
      setPendingFirstLogin(false); // el POST fue exitoso: acceso normal sin nuevo login
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const f = err.fields ?? {};
      const next = {};
      if (f.nombre) next.nombre = f.nombre;
      if (f.apellido) next.apellido = f.apellido;
      if (f.telefono) next.telefono = f.telefono;
      if (f.profesion) next.profesion = f.profesion;
      if (f.contrasena_actual) next.actual = f.contrasena_actual;
      if (f.contrasena) next.password = f.contrasena;
      if (!Object.keys(next).length) next.form = err.message || "No se pudo completar el primer ingreso.";
      setErrors(next);
      setLoading(false);
    }
  };

  const salir = async () => {
    try {
      await apiLogout(); // permitido durante el primer ingreso pendiente
    } catch {
      /* igual se limpia la sesión local */
    }
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout
      dark={dark}
      onToggle={onToggle}
      title="Primer ingreso"
      subtitle="Completá tus datos y cambiá la contraseña temporal para empezar a usar el panel."
      footer={
        <button type="button" onClick={salir} className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">
          Cerrar sesión
        </button>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {errors.form && (
          <div role="alert" className="flex items-center gap-2.5 rounded-md border border-red-500/40 bg-red-500/10 p-3.5 font-mono text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" /> {errors.form}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="nombre" label="Nombre" autoComplete="given-name" icon={User} value={form.nombre} onChange={set("nombre")} error={errors.nombre} />
          <Field id="apellido" label="Apellido" autoComplete="family-name" value={form.apellido} onChange={set("apellido")} error={errors.apellido} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="telefono" label="Teléfono (opcional)" type="tel" autoComplete="tel" icon={Phone} value={form.telefono} onChange={set("telefono")} error={errors.telefono} />
          <Field id="profesion" label="Profesión (opcional)" icon={Briefcase} value={form.profesion} onChange={set("profesion")} error={errors.profesion} />
        </div>

        <PasswordField id="actual" label="Contraseña temporal" autoComplete="current-password" icon={Lock} value={form.actual} onChange={set("actual")} error={errors.actual} />
        <div>
          <PasswordField id="password" label="Contraseña nueva" autoComplete="new-password" icon={Lock} placeholder="Mínimo 8 caracteres" value={form.password} onChange={set("password")} error={errors.password} />
          <PasswordStrength value={form.password} />
        </div>
        <PasswordField id="confirm" label="Confirmar contraseña nueva" autoComplete="new-password" icon={Lock} value={form.confirm} onChange={set("confirm")} error={errors.confirm} />

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Guardando...
            </>
          ) : (
            "Completar y entrar"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
