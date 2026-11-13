import { useEffect, useRef, useState } from "react";
import { CloudRain, Loader2, Warehouse, X } from "lucide-react";

const today = () => new Date().toLocaleDateString("en-CA");

const inputCls =
  "w-full rounded-lg border border-canopy-300 bg-white px-3 py-2.5 text-sm text-canopy-900 outline-none transition placeholder:text-canopy-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/15 dark:bg-[#0b1522] dark:text-white dark:placeholder:text-canopy-600";
const labelCls =
  "mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-widest text-canopy-700 dark:text-canopy-200";

function Err({ children }) {
  return children ? <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{children}</p> : null;
}

/** Modal del botón flotante: carga manual de lluvia (mm) y movimientos de silo (t). */
export default function ManualEntryModal({ open, initial, lots, silos, onClose, onSave }) {
  const [kind, setKind] = useState("rain");
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const savingRef = useRef(false); // evita doble envío aunque el segundo clic llegue antes del re-render
  const keyRef = useRef(null); // clave de idempotencia: se reutiliza al reintentar un envío fallido
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setKind(initial?.kind ?? "rain");
    setForm({
      lotId: initial?.lotId ?? lots[0]?.id ?? "",
      siloId: initial?.siloId ?? silos[0]?.id ?? "",
      direction: "in",
      value: "",
      date: today(),
      note: "",
    });
    setErrors({});
    setSubmitError("");
    setSaving(false);
    savingRef.current = false;
    keyRef.current = crypto.randomUUID();
    const t = setTimeout(() => firstRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !savingRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const silo = silos.find((s) => s.id === form.siloId);

  const submit = async (ev) => {
    ev.preventDefault();
    if (savingRef.current) return;
    const v = parseFloat(String(form.value).replace(",", "."));
    const e = {};
    if (!(v > 0)) e.value = "Ingresá un valor mayor a 0.";
    else if (kind === "rain" && v > 500) e.value = "Valor fuera de rango (máx. 500 mm).";
    if (kind === "rain" && !form.lotId) e.lotId = "Elegí un lote.";
    if (kind === "silo" && silo && v > 0) {
      if (form.direction === "out" && v > silo.tons) e.value = `El ${silo.name} solo tiene ${silo.tons} t.`;
      if (form.direction === "in" && silo.tons + v > silo.capacity)
        e.value = `Supera la capacidad: quedan ${(silo.capacity - silo.tons).toFixed(0)} t libres.`;
    }
    if (!form.date || form.date > today()) e.date = "Elegí una fecha válida (no futura).";
    setErrors(e);
    if (Object.keys(e).length) return;

    const key = keyRef.current;
    let payload;
    if (kind === "rain") {
      const lot = lots.find((l) => l.id === form.lotId);
      payload = { kind, key, lotId: form.lotId, lotName: lot?.name ?? "—", mm: v, date: form.date, note: form.note.trim() };
    } else {
      payload = { kind, key, siloId: form.siloId, siloName: silo.name, direction: form.direction, tons: v, date: form.date, note: form.note.trim() };
    }

    savingRef.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(payload); // si resuelve, el padre cierra el modal
    } catch (err) {
      const first = err?.fields ? Object.values(err.fields)[0] : null;
      setSubmitError(first || err?.message || "No se pudo guardar el registro. Intentá de nuevo.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-title"
        className="w-full max-w-md rounded-t-3xl border border-canopy-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1b2c] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="manual-title" className="text-xl font-bold text-canopy-900 dark:text-white">
              Carga manual
            </h2>
            <p className="mt-1 font-mono text-xs text-canopy-600 dark:text-canopy-300">Registrá datos de campo en segundos.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="rounded-lg p-1.5 disabled:opacity-40 text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-canopy-100 p-1 dark:bg-white/5" role="tablist">
          {[
            { id: "rain", label: "Lluvia (mm)", icon: CloudRain },
            { id: "silo", label: "Silo (toneladas)", icon: Warehouse },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              disabled={saving}
              onClick={() => {
                setKind(id);
                setErrors({});
                setSubmitError("");
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                kind === id
                  ? "bg-white text-canopy-900 shadow dark:bg-canopy-700 dark:text-white"
                  : "text-canopy-700 hover:text-canopy-900 dark:text-canopy-300 dark:hover:text-white"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <fieldset disabled={saving} className="m-0 mt-5 min-w-0 space-y-4 border-0 p-0">
          {kind === "rain" ? (
            <div>
              <label htmlFor="m-lot" className={labelCls}>Lote</label>
              <select id="m-lot" ref={firstRef} value={form.lotId} onChange={set("lotId")} className={inputCls}>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <Err>{errors.lotId}</Err>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="m-silo" className={labelCls}>Silo</label>
                <select id="m-silo" ref={firstRef} value={form.siloId} onChange={set("siloId")} className={inputCls}>
                  {silos.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.crop}</option>
                  ))}
                </select>
                {silo && (
                  <p className="mt-1.5 font-mono text-xs text-canopy-600 dark:text-canopy-300">
                    Stock actual: {silo.tons} t de {silo.capacity} t
                  </p>
                )}
              </div>
              <div>
                <span className={labelCls}>Movimiento</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["in", "Ingreso"],
                    ["out", "Despacho"],
                  ].map(([v, l]) => (
                    <label
                      key={v}
                      className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${
                        form.direction === v
                          ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                          : "border-canopy-300 text-canopy-800 dark:border-white/15 dark:text-canopy-100"
                      }`}
                    >
                      <input type="radio" name="dir" value={v} checked={form.direction === v} onChange={set("direction")} className="sr-only" />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-value" className={labelCls}>{kind === "rain" ? "Milímetros" : "Toneladas"}</label>
              <input
                id="m-value"
                inputMode="decimal"
                placeholder={kind === "rain" ? "Ej: 18" : "Ej: 32"}
                value={form.value}
                onChange={set("value")}
                aria-invalid={!!errors.value}
                className={inputCls}
              />
              <Err>{errors.value}</Err>
            </div>
            <div>
              <label htmlFor="m-date" className={labelCls}>Fecha</label>
              <input id="m-date" type="date" max={today()} value={form.date} onChange={set("date")} className={inputCls} />
              <Err>{errors.date}</Err>
            </div>
          </div>

          <div>
            <label htmlFor="m-note" className={labelCls}>Nota (opcional)</label>
            <input id="m-note" maxLength={80} value={form.note} onChange={set("note")} placeholder="Ej: cosecha lote 3" className={inputCls} />
          </div>
        </fieldset>

        {submitError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {submitError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-canopy-300 px-4 py-2.5 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5 disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Guardando…
              </>
            ) : (
              "Guardar registro"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
