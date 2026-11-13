import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Card } from "./ui.jsx";
import EntityFormModal, { SEVERIDADES, TIPOS_REGLA } from "./EntityFormModal.jsx";
import { useDialog } from "../dialog/DialogProvider.jsx";
import { useFlash, useReglas } from "../../hooks/useAlertConfig.js";

const label = (list, v) => list.find((x) => x.v === v)?.l ?? v;
const SEV_CLS = {
  critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};

/** Reglas de alerta: listar, crear, editar y activar/desactivar (PUT con `activa`). */
export default function RulesView() {
  const dialog = useDialog();
  const { items, loading, error, reload, create, update } = useReglas();
  const [modal, setModal] = useState(null); // null | { initial }
  const [busyId, setBusyId] = useState(null);
  const [msg, flash] = useFlash();

  const save = async (body) => {
    if (modal.initial) {
      await update(modal.initial.id, body); // PUT /v1/alertas/reglas/{id}
      flash("Regla actualizada");
    } else {
      await create(body); // POST /v1/alertas/reglas
      flash("Regla creada");
    }
    setModal(null);
  };

  const toggle = async (r) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      // PUT exige `parametros`: se reenvían los actuales; solo cambia `activa`.
      await update(r.id, { severidad: r.severidad, parametros: (r.parametros ?? []).map(String), activa: !r.activa });
      flash(r.activa ? "Regla desactivada" : "Regla activada");
    } catch (err) {
      await dialog.alert({ variant: "error", title: "No se pudo actualizar la regla", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm text-canopy-600 dark:text-canopy-300">Condiciones que generan alertas.</p>
        <button onClick={() => setModal({ initial: null })} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600">
          <Plus size={16} /> Nueva regla
        </button>
      </div>

      {msg && <p role="status" className="mt-4 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300">{msg}</p>}

      <div className="mt-5 space-y-3">
        {loading && items.length === 0 && (
          <p className="flex items-center gap-2 font-mono text-sm text-canopy-600 dark:text-canopy-300"><Loader2 size={15} className="animate-spin" /> Cargando reglas…</p>
        )}
        {error && (
          <Card className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
            <button onClick={reload} className="ml-3 font-semibold text-canopy-600 hover:underline dark:text-gold-300">Reintentar</button>
          </Card>
        )}
        {!loading && !error && items.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-canopy-700 dark:text-canopy-200">Todavía no tenés reglas de alerta.</p>
            <button onClick={() => setModal({ initial: null })} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-orange-600">
              <Plus size={16} /> Crear la primera regla
            </button>
          </Card>
        )}
        {items.map((r) => (
          <Card key={r.id} className={`flex flex-wrap items-center gap-3 p-4 ${r.activa ? "" : "opacity-70"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-canopy-900 dark:text-white">
                {label(TIPOS_REGLA, r.tipo)}
                <span className={`ml-2 rounded-full px-2 py-0.5 align-middle font-mono text-[10px] font-semibold uppercase ${SEV_CLS[r.severidad] ?? SEV_CLS.info}`}>{label(SEVERIDADES, r.severidad)}</span>
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-canopy-600 dark:text-canopy-300">Parámetros: {(r.parametros ?? []).join(", ") || "—"}</p>
            </div>
            <button
              role="switch"
              aria-checked={r.activa}
              aria-label={r.activa ? "Desactivar regla" : "Activar regla"}
              disabled={busyId === r.id}
              onClick={() => toggle(r)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${r.activa ? "bg-green-500" : "bg-canopy-300 dark:bg-white/20"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.activa ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <button onClick={() => setModal({ initial: r })} aria-label="Editar regla" className="grid h-9 w-9 place-items-center rounded-lg text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10">
              <Pencil size={16} />
            </button>
          </Card>
        ))}
      </div>

      <EntityFormModal kind="regla" open={!!modal} initial={modal?.initial ?? null} onClose={() => setModal(null)} onSave={save} />
    </div>
  );
}
