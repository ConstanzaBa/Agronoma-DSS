import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getPerfil, updatePerfil } from "../../api/auth.js";
import { ROLE_LABELS, getUser, setUser } from "../../auth.js";
import { Field } from "../auth/Field.jsx";
import { Card, monoLabel } from "./ui.jsx";

/** Pestaña "Perfil" (todos los roles): GET/PUT /v1/auth/perfil. El correo y el rol no se editan aquí. */
export default function ProfileView() {
  const user = getUser();
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", profesion: "" });
  const [meta, setMeta] = useState({ correo: user?.correo ?? "", rol: user?.rol ?? "" });
  const [state, setState] = useState("loading"); // loading | ready | error
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // El plan pertenece a la cuenta: solo se muestra si el backend lo informa en el usuario (sin inventar límites).
  const rawPlan = user?.cuenta?.plan ?? user?.plan;
  const planName = typeof rawPlan === "string" ? rawPlan : (rawPlan?.nombre ?? rawPlan?.codigo ?? null);

  useEffect(() => {
    const ctrl = new AbortController();
    getPerfil(ctrl.signal)
      .then((p) => {
        const d = p?.data ?? p ?? {};
        setForm({ nombre: d.nombre ?? "", apellido: d.apellido ?? "", telefono: d.telefono ?? "", profesion: d.profesion ?? "" });
        setMeta((m) => ({ correo: d.correo ?? m.correo, rol: d.rol ?? m.rol }));
        setState("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setErrors({ form: err.message || "No se pudo cargar el perfil." });
        setState("error");
      });
    return () => ctrl.abort();
  }, []);

  const set = (k) => (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido.";
    if (!form.apellido.trim()) e.apellido = "Requerido.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setSaved(false);
    try {
      const r = await updatePerfil({ nombre: form.nombre.trim(), apellido: form.apellido.trim(), telefono: form.telefono.trim(), profesion: form.profesion.trim() });
      const d = r?.data ?? r;
      setUser({ ...(getUser() ?? {}), ...(d && typeof d === "object" && d.id != null ? d : form) });
      setSaved(true);
    } catch (err) {
      const f = err.fields ?? {};
      const next = { ...f };
      if (!Object.keys(next).length) next.form = err.message || "No se pudo guardar el perfil.";
      setErrors(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="p-5 sm:p-6">
        <h3 className={`${monoLabel} !text-xs`}>Mi perfil</h3>
        <p className="mt-2 text-sm text-canopy-600 dark:text-canopy-300">
          {meta.correo || "—"} · <span className="font-semibold">{ROLE_LABELS[meta.rol] ?? meta.rol ?? "—"}</span>
          {planName && (
            <>
              {" "}· Plan <span className="font-semibold uppercase">{planName}</span>
            </>
          )}
        </p>

        {state === "loading" && <p className="mt-5 flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300"><Loader2 size={15} className="animate-spin" /> Cargando perfil...</p>}

        {errors.form && (
          <div role="alert" className="mt-5 flex items-center gap-2.5 rounded-md border border-red-500/40 bg-red-500/10 p-3.5 font-mono text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" /> {errors.form}
          </div>
        )}

        {state === "ready" && (
          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="p-nombre" label="Nombre" value={form.nombre} onChange={set("nombre")} error={errors.nombre} autoComplete="given-name" />
              <Field id="p-apellido" label="Apellido" value={form.apellido} onChange={set("apellido")} error={errors.apellido} autoComplete="family-name" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="p-telefono" label="Teléfono" type="tel" value={form.telefono} onChange={set("telefono")} error={errors.telefono} autoComplete="tel" />
              <Field id="p-profesion" label="Profesión" value={form.profesion} onChange={set("profesion")} error={errors.profesion} />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-canopy-600 px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white transition hover:bg-canopy-700 disabled:opacity-60 dark:bg-gold-400 dark:text-canopy-950 dark:hover:bg-gold-300"
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : "Guardar cambios"}
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} /> Perfil actualizado
                </span>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
