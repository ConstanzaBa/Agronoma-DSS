import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { getAlerta } from "../../api/alertas.js";
import { SEVERIDADES, TIPOS_REGLA } from "./EntityFormModal.jsx";

const lab = (list, v) => list.find((x) => x.v === v)?.l ?? v;
const ESTADOS = { active: "Activa", attended: "Atendida", resolved: "Resuelta" };
const fmt = (v) => {
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }) : "—";
};

/** Detalle de una alerta (GET /v1/alertas/alertas/{id}) con acciones atender / resolver. `version` recarga tras una acción. */
export default function AlertDetailModal({ alertId, version = "", busy = null, onClose, onAttend, onResolve }) {
  const [st, setSt] = useState({ state: "loading" });

  useEffect(() => {
    if (alertId == null) return;
    const ctrl = new AbortController();
    setSt((s) => (s.alerta?.id === alertId ? { ...s, state: "loading" } : { state: "loading" }));
    getAlerta(alertId, ctrl.signal)
      .then((alerta) => setSt({ state: "done", alerta }))
      .catch((e) => e.name !== "AbortError" && setSt({ state: "error", msg: e.message }));
    return () => ctrl.abort();
  }, [alertId, version]);

  useEffect(() => {
    if (alertId == null) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alertId, onClose]);

  if (alertId == null) return null;
  const a = st.alerta;
  const rows = a
    ? [
        ["Tipo", lab(TIPOS_REGLA, a.tipo)],
        ["Severidad", lab(SEVERIDADES, a.severidad)],
        ["Estado", ESTADOS[a.estado] ?? a.estado],
        ["Activada", fmt(a.activada_en)],
        ["Atendida", a.atendida_en ? fmt(a.atendida_en) : "—"],
        ["Resuelta", a.resuelta_en ? fmt(a.resuelta_en) : "—"],
        ...(a.lote_id != null ? [["Lote", `#${a.lote_id}`]] : []),
        ...(a.silo_id != null ? [["Silo", `#${a.silo_id}`]] : []),
      ]
    : [];
  const resolved = a?.estado === "resolved" || !!a?.resuelta_en;
  const attended = a?.estado === "attended" || !!a?.atendida_en;
  const anyBusy = !!busy;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="alert-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-canopy-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1b2c] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="alert-title" className="text-xl font-bold text-canopy-900 dark:text-white">{a?.titulo ?? "Detalle de la alerta"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10"><X size={20} /></button>
        </div>

        {st.state === "loading" && !a && (
          <p className="mt-6 flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
        )}
        {st.state === "error" && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{st.msg || "No se pudo cargar la alerta."}</p>}

        {a && (
          <>
            <p className="mt-3 text-sm leading-relaxed text-canopy-700 dark:text-canopy-200">{a.mensaje}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{k}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-canopy-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            {Array.isArray(a.datos) && a.datos.length > 0 && (
              <>
                <h3 className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-canopy-600/80 dark:text-canopy-300">Datos</h3>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-canopy-50 p-3 font-mono text-xs text-canopy-800 dark:bg-white/[0.04] dark:text-canopy-100">{JSON.stringify(a.datos, null, 2)}</pre>
              </>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {!resolved && !attended && (
                <button onClick={() => onAttend(a)} disabled={anyBusy} className="rounded-lg border border-canopy-300 px-4 py-2.5 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 disabled:opacity-50 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">
                  {busy?.op === "attend" ? "Atendiendo…" : "Marcar como atendida"}
                </button>
              )}
              {!resolved && (
                <button onClick={() => onResolve(a)} disabled={anyBusy} className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-orange-600 disabled:opacity-60">
                  {busy?.op === "resolve" ? "Resolviendo…" : "Resolver"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
