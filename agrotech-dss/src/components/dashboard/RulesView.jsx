import { Loader2 } from "lucide-react";
import { parametrosTexto } from "../../api/alertas.js";
import { useReglas } from "../../hooks/useAlertConfig.js";
import { SEVERIDADES, TIPOS_REGLA } from "./EntityFormModal.jsx";
import { Card } from "./ui.jsx";

const label = (list, v) => list.find((x) => x.v === v)?.l ?? v;
const SEV_CLS = {
  critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};

/**
 * Reglas de alerta: SOLO LECTURA para admin y empleado.
 * Son reglas globales del sistema (el backend rechaza cualquier alta o cambio con 403 reglas_globales).
 */
export default function RulesView() {
  const { items, loading, error, reload } = useReglas();

  return (
    <div>
      <p className="font-mono text-sm text-canopy-600 dark:text-canopy-300">
        Condiciones que generan alertas. Son reglas globales del sistema y no se modifican desde tu cuenta.
      </p>

      <div className="mt-5 space-y-3">
        {loading && items.length === 0 && (
          <p className="flex items-center gap-2 font-mono text-sm text-canopy-600 dark:text-canopy-300">
            <Loader2 size={15} className="animate-spin" /> Cargando reglas…
          </p>
        )}
        {error && (
          <Card className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
            <button onClick={reload} className="ml-3 font-semibold text-canopy-600 hover:underline dark:text-gold-300">
              Reintentar
            </button>
          </Card>
        )}
        {!loading && !error && items.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-canopy-700 dark:text-canopy-200">No hay reglas de alerta configuradas.</p>
          </Card>
        )}
        {items.map((r) => (
          <Card key={r.id} className={`flex flex-wrap items-center gap-3 p-4 ${r.activa ? "" : "opacity-70"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-canopy-900 dark:text-white">
                {label(TIPOS_REGLA, r.tipo)}
                <span className={`ml-2 rounded-full px-2 py-0.5 align-middle font-mono text-[10px] font-semibold uppercase ${SEV_CLS[r.severidad] ?? SEV_CLS.info}`}>
                  {label(SEVERIDADES, r.severidad)}
                </span>
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-canopy-600 dark:text-canopy-300">
                Parámetros: {parametrosTexto(r.parametros) || "—"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase ${
                r.activa ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-canopy-100 text-canopy-600 dark:bg-white/10 dark:text-canopy-300"
              }`}
            >
              {r.activa ? "Activa" : "Inactiva"}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
