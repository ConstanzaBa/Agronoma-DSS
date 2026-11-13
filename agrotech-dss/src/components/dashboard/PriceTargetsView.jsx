import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "./ui.jsx";
import EntityFormModal from "./EntityFormModal.jsx";
import { useDialog } from "../dialog/DialogProvider.jsx";
import { useFlash, useObjetivos } from "../../hooks/useAlertConfig.js";

const fmtDate = (v) => {
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : null;
};

/** Objetivos de precio: listar (todos / solo activos), crear, editar, activar/desactivar y eliminar. */
export default function PriceTargetsView({ tipos = [] }) {
  const dialog = useDialog();
  const [onlyActive, setOnlyActive] = useState(false);
  const { items, loading, error, reload, create, update, remove } = useObjetivos(onlyActive);
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, flash] = useFlash();
  const cultivo = (id) => tipos.find((t) => t.id === id)?.nombre ?? `Cultivo #${id}`;

  const save = async (body) => {
    if (modal.initial) {
      await update(modal.initial.id, body); // PUT /v1/alertas/objetivos-precio/{id}
      flash("Objetivo actualizado");
    } else {
      await create(body); // POST /v1/alertas/objetivos-precio
      flash("Objetivo creado");
    }
    setModal(null);
  };

  const toggle = async (o) => {
    if (busyId) return;
    setBusyId(o.id);
    try {
      await update(o.id, { tipo_cultivo_id: o.tipo_cultivo_id, moneda: o.moneda, direccion: o.direccion, umbral: Number(o.umbral), activo: !o.activo });
      flash(o.activo ? "Objetivo desactivado" : "Objetivo activado");
    } catch (err) {
      await dialog.alert({ variant: "error", title: "No se pudo actualizar el objetivo", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const del = async (o) => {
    const ok = await dialog.confirm({
      variant: "warning",
      danger: true,
      title: "¿Eliminar el objetivo?",
      message: `Se eliminará el objetivo de ${cultivo(o.tipo_cultivo_id)} (${o.direccion === "sube" ? "sube" : "baja"} ${o.umbral} ${o.moneda}).`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    setBusyId(o.id);
    try {
      await remove(o.id); // DELETE /v1/alertas/objetivos-precio/{id}
      flash("Objetivo eliminado");
    } catch (err) {
      await dialog.alert({ variant: "error", title: "No se pudo eliminar el objetivo", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-canopy-800 dark:text-canopy-100">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="h-4 w-4 accent-orange-500" />
          Solo activos
        </label>
        <button onClick={() => setModal({ initial: null })} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600">
          <Plus size={16} /> Nuevo objetivo
        </button>
      </div>

      {msg && <p role="status" className="mt-4 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300">{msg}</p>}

      <div className="mt-5 space-y-3">
        {loading && items.length === 0 && (
          <p className="flex items-center gap-2 font-mono text-sm text-canopy-600 dark:text-canopy-300"><Loader2 size={15} className="animate-spin" /> Cargando objetivos…</p>
        )}
        {error && (
          <Card className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
            <button onClick={reload} className="ml-3 font-semibold text-canopy-600 hover:underline dark:text-gold-300">Reintentar</button>
          </Card>
        )}
        {!loading && !error && items.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-canopy-700 dark:text-canopy-200">{onlyActive ? "No hay objetivos activos." : "Todavía no tenés objetivos de precio."}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {onlyActive && (
                <button onClick={() => setOnlyActive(false)} className="rounded-lg border border-canopy-300 px-4 py-2.5 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">
                  Ver todos
                </button>
              )}
              <button onClick={() => setModal({ initial: null })} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-orange-600">
                <Plus size={16} /> Crear objetivo
              </button>
            </div>
          </Card>
        )}
        {items.map((o) => (
          <Card key={o.id} className={`flex flex-wrap items-center gap-3 p-4 ${o.activo ? "" : "opacity-70"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-canopy-900 dark:text-white">{cultivo(o.tipo_cultivo_id)}</p>
              <p className="mt-0.5 font-mono text-xs text-canopy-600 dark:text-canopy-300">
                {o.direccion === "sube" ? "Sube a" : "Baja a"} {o.umbral} {o.moneda}
                {fmtDate(o.ultimo_disparo_en) ? ` · último disparo ${fmtDate(o.ultimo_disparo_en)}` : ""}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={o.activo}
              aria-label={o.activo ? "Desactivar objetivo" : "Activar objetivo"}
              disabled={busyId === o.id}
              onClick={() => toggle(o)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${o.activo ? "bg-green-500" : "bg-canopy-300 dark:bg-white/20"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${o.activo ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <button onClick={() => setModal({ initial: o })} aria-label="Editar objetivo" className="grid h-9 w-9 place-items-center rounded-lg text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10">
              <Pencil size={16} />
            </button>
            <button onClick={() => del(o)} disabled={busyId === o.id} aria-label="Eliminar objetivo" className="grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10">
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
      </div>

      <EntityFormModal kind="objetivo" open={!!modal} initial={modal?.initial ?? null} tipos={tipos} onClose={() => setModal(null)} onSave={save} />
    </div>
  );
}
