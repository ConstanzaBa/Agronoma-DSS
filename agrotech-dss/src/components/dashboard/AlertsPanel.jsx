import { ArrowRight, CheckCircle2, CloudRain, Droplet, Loader2, RotateCcw, TrendingUp, Warehouse } from "lucide-react";
import { Card, monoLabel } from "./ui.jsx";

const tones = {
  critical: {
    border: "border-l-red-500",
    box: "border-red-200 bg-red-50 text-red-500 dark:border-red-500/40 dark:bg-transparent",
    action: "text-red-500",
    hl: "text-red-500",
    label: "Crítica",
  },
  warning: {
    border: "border-l-amber-500",
    box: "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-500/40 dark:bg-transparent",
    action: "text-amber-500",
    hl: "text-amber-500",
    label: "Advertencia",
  },
  info: {
    border: "border-l-sky-500",
    box: "border-sky-200 bg-sky-50 text-sky-500 dark:border-sky-500/40 dark:bg-transparent",
    action: "text-sky-500",
    hl: "text-sky-500",
    label: "Info",
  },
};

const icons = { moisture: Droplet, silo: Warehouse, market: TrendingUp, weather: CloudRain };

function Body({ text, hl, cls }) {
  if (!hl || !text.includes(hl)) return text;
  const [a, ...rest] = text.split(hl);
  return (
    <>
      {a}
      <b className={`font-semibold ${cls}`}>{hl}</b>
      {rest.join(hl)}
    </>
  );
}

/** Tarjeta de alerta (se usa en el panel del dashboard y en Alert Feed). */
export function AlertCard({ alert, attended = false, onAction, onReopen, onResolve, onDetail, showLabel = false, busy = null }) {
  const anyBusy = !!busy;
  const op = busy && busy.id === alert.id ? busy.op : null;
  const t = tones[alert.severity];
  const Icon = icons[alert.kind] ?? Droplet;
  return (
    <Card className={`flex gap-4 border-l-4 p-5 ${t.border} ${attended ? "opacity-70" : ""}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${t.box}`}>
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-canopy-900 dark:text-white">
          {alert.title}
          <sup className="ml-1 font-mono text-[10px] font-normal text-canopy-500 dark:text-canopy-400">{alert.ago}</sup>
          {showLabel && (
            <span className="ml-2 rounded-full border border-canopy-200 px-2 py-0.5 align-middle font-mono text-[10px] font-normal uppercase tracking-wider text-canopy-600 dark:border-white/15 dark:text-canopy-300">
              {t.label}
            </span>
          )}
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed text-canopy-700 dark:text-canopy-200">
          <Body text={alert.text} hl={alert.hl} cls={t.hl} />
        </p>
        {alert.resolved ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 size={16} /> Resuelta
          </p>
        ) : attended ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-green-600 dark:text-green-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} /> {alert.done ?? "Atendida"}
            </span>
            {onResolve && (
              <button onClick={onResolve} disabled={anyBusy} className="text-xs font-medium text-canopy-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline dark:text-canopy-300">
                {op === "resolve" ? "Resolviendo…" : "Resolver"}
              </button>
            )}
            {onReopen && (
              <button onClick={onReopen} className="flex items-center gap-1 text-xs font-medium text-canopy-600 hover:underline dark:text-canopy-300">
                <RotateCcw size={12} /> Reabrir
              </button>
            )}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              onClick={onAction}
              disabled={anyBusy}
              aria-busy={op === "attend"}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline ${t.action}`}
            >
              {op === "attend" ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Atendiendo…
                </>
              ) : (
                <>
                  {alert.action} <ArrowRight size={15} />
                </>
              )}
            </button>
            {onResolve && (
              <button onClick={onResolve} disabled={anyBusy} className="text-xs font-medium text-canopy-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline dark:text-canopy-300">
                {op === "resolve" ? "Resolviendo…" : "Resolver"}
              </button>
            )}
          </div>
        )}
        {onDetail && (
          <button onClick={onDetail} className="mt-2 text-xs font-medium text-canopy-600 hover:underline dark:text-gold-300">
            Ver detalle
          </button>
        )}
      </div>
    </Card>
  );
}

/** Panel "Active Alerts": muestra solo las pendientes. */
export default function AlertsPanel({ alerts, attended, onAction, onSeeAll, busy = null, limit = 2 }) {
  const pending = alerts.filter((a) => !attended[a.id]);
  const shown = pending.slice(0, limit);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className={`${monoLabel} !text-xs !tracking-[0.25em]`}>Active Alerts</h3>
        {pending.some((a) => a.severity === "critical") && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
      </div>

      <div className="space-y-4">
        {shown.length === 0 && (
          <Card className="flex items-center gap-3 p-5 text-sm text-canopy-700 dark:text-canopy-200">
            <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" /> Sin alertas pendientes.
          </Card>
        )}
        {shown.map((a) => (
          <AlertCard key={a.id} alert={a} busy={busy} onAction={() => onAction(a)} />
        ))}
      </div>

      {pending.length > shown.length && (
        <button
          onClick={onSeeAll}
          className="mt-4 inline-flex items-center gap-1.5 px-1 font-mono text-xs font-semibold uppercase tracking-wider text-canopy-600 hover:underline dark:text-gold-300"
        >
          Ver {pending.length - shown.length} más <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
