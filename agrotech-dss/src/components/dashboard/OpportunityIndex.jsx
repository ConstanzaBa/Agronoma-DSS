import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, Loader2, ShieldCheck, Thermometer, Timer, TrendingUp } from "lucide-react";
import { Card } from "./ui.jsx";
import ScoreRing from "./ScoreRing.jsx";

/** Widget "Oportunidad de venta": se alimenta del silo y la cotización elegidos en Market Predict. */
export default function OpportunityIndex({ opp, loading = false, hasSilos = true, silosLoading = false, error = "", onOpenMarket, onAddSilo, onRefresh }) {
  const [state, setState] = useState("idle"); // idle | running | done
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    if (state === "running") return;
    setState("running");
    onRefresh?.(); // recalcula el índice con los datos actuales
    timers.current.push(
      setTimeout(() => {
        setState("done");
        timers.current.push(
          setTimeout(() => {
            setState("idle");
            onOpenMarket?.();
          }, 700)
        );
      }, 1100)
    );
  };

  if (!opp)
    return (
      <Card gradient className="p-6">
        <h3 className="text-2xl font-bold text-canopy-900 dark:text-gold-300">Opportunity Index</h3>
        {!hasSilos && !silosLoading ? (
          <>
            <p className="mt-3 text-sm text-canopy-700 dark:text-canopy-200">Todavía no hay silos para evaluar.</p>
            <button onClick={onAddSilo} className="mt-4 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600">
              Agregar silo
            </button>
          </>
        ) : (
          <p role={error ? "alert" : undefined} className={`mt-3 font-mono text-sm ${error ? "text-red-600 dark:text-red-400" : "text-canopy-600 dark:text-canopy-300"}`}>
            {error || (loading || silosLoading ? "Calculando índice…" : "Sin datos del índice.")}
          </p>
        )}
      </Card>
    );

  const { silo, quote, rules, score, verdict } = opp;
  const price = rules.find((r) => r.id === "tendencia_precio");
  const noTemp = silo.temp == null;
  const tempOver = noTemp ? 0 : +(silo.temp - silo.tempLimit).toFixed(1);

  return (
    <Card gradient className="p-6">
      <h3 className="text-2xl font-bold text-canopy-900 dark:text-gold-300">Opportunity Index</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-canopy-700 dark:text-canopy-200">
        Market viability based on current silo stock and forecasted demand.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-5">
        <ScoreRing value={score} verdict={verdict.key} />
        <div className="flex min-w-[150px] flex-1 flex-col gap-3">
          <div className="rounded-lg border border-canopy-200 bg-canopy-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="flex items-center gap-2 text-sm font-semibold text-canopy-900 dark:text-white">
              <TrendingUp size={16} className="text-green-600 dark:text-green-400" /> Price Trend
            </p>
            <p className="mt-1 font-mono text-xs text-canopy-600 dark:text-canopy-300">
              {price ? price.detail : "Sin datos"} · {quote.crop}
            </p>
          </div>
          <div className="rounded-lg border border-canopy-200 bg-canopy-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="flex items-start gap-2 text-sm font-semibold leading-snug text-canopy-900 dark:text-white">
              <Timer size={16} className="mt-0.5 shrink-0 text-sky-500" /> Storage Duration
            </p>
            <p className="mt-1 font-mono text-xs text-canopy-600 dark:text-canopy-300">
              {silo.days}{silo.maxDays != null ? ` / ${silo.maxDays}` : ""} Days
            </p>
          </div>
        </div>
      </div>

      {tempOver > 0 ? (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-red-500 dark:border-red-500/30 dark:bg-red-900/20">
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <Thermometer size={17} /> {silo.name} Temp Risk
          </span>
          <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-[11px] font-medium text-red-500 dark:bg-red-900/50">
            WARN
          </span>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-300">
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <ShieldCheck size={17} /> {noTemp ? `${silo.name} sin medición térmica` : `${silo.name} sin riesgo térmico`}
          </span>
          <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-medium dark:bg-emerald-900/50">
            {noTemp ? "N/D" : "OK"}
          </span>
        </div>
      )}

      <button
        onClick={run}
        disabled={state === "running"}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg bg-canopy-800 py-3.5 text-[15px] font-semibold text-white shadow-md transition hover:bg-canopy-700 disabled:opacity-80 dark:border dark:border-canopy-500/60 dark:bg-canopy-800/60 dark:text-gold-300 dark:shadow-none dark:hover:bg-canopy-700/60"
      >
        {state === "running" ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Analizando mercado...
          </>
        ) : state === "done" ? (
          <>
            <Check size={18} /> Veredicto: {verdict.label}
          </>
        ) : (
          <>
            <BarChart3 size={18} /> Run Market Analysis
          </>
        )}
      </button>
    </Card>
  );
}
