import { useRef, useState } from "react";
import { Check, Info, Loader2, Pencil, X } from "lucide-react";
import { Card, monoLabel } from "./ui.jsx";
import ScoreRing from "./ScoreRing.jsx";
import { CotizacionesPanel, DivisasPanel, EmptyAction, IndiceHistorial, InsumosPanel, MargenPanel } from "./MercadoPanels.jsx";

const nf = (n) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const nfArs = (n) => n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const verdictCls = {
  sell: "border-green-300 bg-green-50 text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300",
  review: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  wait: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
};

function QuotesTable({ quotes, loading, loadError, onPrice }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const start = (q) => {
    setEditing(q.id);
    setDraft(q.price == null ? "" : String(q.price));
    setError("");
  };
  const save = async (q) => {
    if (savingRef.current) return;
    const v = parseFloat(draft.replace(",", "."));
    if (!(v > 0)) return setError("Ingresá un precio válido.");
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onPrice(q.id, v);
      setEditing(null);
    } catch (err) {
      const first = err.fields ? Object.values(err.fields)[0] : null;
      setError(first || err.message || "No se pudo guardar el precio.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Card className="min-w-0 p-5">
      <h3 className={monoLabel}>Cotizaciones · US$ y ARS / tonelada</h3>
      {loading && quotes.length === 0 && <p className="mt-3 font-mono text-sm text-canopy-600 dark:text-canopy-300">Cargando cotizaciones…</p>}
      {loadError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="font-mono text-[11px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">
              <th className="py-2 pr-3 font-medium">Cultivo</th>
              <th className="py-2 pr-3 text-right font-medium">US$/t</th>
              <th className="py-2 pr-3 text-right font-medium">ARS/t</th>
              <th className="py-2 pr-3 text-right font-medium">Prom. 7d US$/t</th>
              <th className="py-2 pr-3 text-right font-medium">Var.</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-canopy-100 dark:divide-white/10">
            {quotes.map((q) => (
              <tr key={q.id}>
                <td className="py-3 pr-3 font-semibold text-canopy-900 dark:text-white">
                  {q.crop}
                  {q.date && (
                    <span className="block font-mono text-[10px] font-normal text-canopy-500 dark:text-canopy-400">
                      {q.date}
                      {q.stale ? " · desactualizada" : ""}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right font-mono">
                  {editing === q.id ? (
                    <input
                      autoFocus
                      value={draft}
                      inputMode="decimal"
                      aria-label={`Precio de ${q.crop} en US$/t`}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={saving}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save(q);
                        if (e.key === "Escape" && !saving) setEditing(null);
                      }}
                      className="w-28 rounded border border-orange-400 bg-white px-2 py-1 text-right text-sm outline-none dark:bg-[#0b1522] dark:text-white"
                    />
                  ) : (
                    <span className="text-canopy-900 dark:text-white">{q.price == null ? "—" : `US$ ${nf(q.price)}`}</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right font-mono text-canopy-900 dark:text-white">{q.priceArs == null ? "—" : `$ ${nfArs(q.priceArs)}`}</td>
                <td className="py-3 pr-3 text-right font-mono text-canopy-600 dark:text-canopy-300">{q.avg7 == null ? "—" : `US$ ${nf(q.avg7)}`}</td>
                <td className={`py-3 pr-3 text-right font-mono font-semibold ${q.change == null ? "text-canopy-500" : q.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {q.change == null ? "—" : `${q.change >= 0 ? "+" : ""}${q.change.toFixed(1)}%`}
                </td>
                <td className="py-3 text-right">
                  {editing === q.id ? (
                    <span className="flex justify-end gap-1">
                      <button onClick={() => save(q)} disabled={saving} aria-busy={saving} aria-label={saving ? "Guardando precio…" : "Guardar precio"} title={saving ? "Guardando…" : "Guardar precio"} className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-60 dark:hover:bg-green-500/10">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button onClick={() => setEditing(null)} disabled={saving} aria-label="Cancelar" className="rounded p-1.5 text-canopy-500 hover:bg-canopy-100 disabled:opacity-60 dark:hover:bg-white/10">
                        <X size={16} />
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => start(q)} disabled={saving} aria-label={`Editar precio de ${q.crop}`} className="rounded p-1.5 text-canopy-500 hover:bg-canopy-100 hover:text-canopy-800 dark:hover:bg-white/10 dark:hover:text-white">
                      <Pencil size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="mt-2 font-mono text-xs text-red-600 dark:text-red-400">{error}</p>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-canopy-600 dark:text-canopy-300">
        <Info size={14} className="mt-0.5 shrink-0" />
        Precio de referencia en US$/t; el valor en ARS/t lo calcula el backend con el dólar oficial BNA (puede diferir de la pizarra en pesos). Fuentes: granos.ar (Cámara Arbitral de Rosario) y DolarAPI. Al editar se carga el precio de hoy en US$/t (mercado Rosario).
      </p>
    </Card>
  );
}

const SECTIONS = [
  { id: "resumen", label: "Resumen" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "divisas", label: "Divisas" },
  { id: "insumos", label: "Insumos" },
  { id: "margen", label: "Margen" },
];

/** Pestaña "Market Predict": resumen (cotizaciones + índice de venta) y secciones de Mercado. */
export default function MarketView({ quotes, quotesLoading, quotesError, silos, silosLoading, opp, oppLoading, oppError, oppSiloId, onPrice, onSilo, tipos = [], version = 0, actions = {} }) {
  const [section, setSection] = useState("resumen");
  const [margenCultivo, setMargenCultivo] = useState("");
  const silo = silos.find((s) => s.id === oppSiloId);
  const tipoDe = (s) => tipos.find((t) => t.nombre === s?.crop);
  const handlers = {
    supuestos: (s) => actions.onSupuestos?.({ tipo_cultivo_id: tipoDe(s)?.id }),
    cotizacion: (s) => actions.onNewCotizacion?.({ tipo_cultivo_id: tipoDe(s)?.id }),
    medicion: (s) => actions.onMedicion?.(s.id),
    movimiento: (s) => actions.onMovimiento?.(s.id),
    editSilo: (s) => actions.onEditSilo?.(s.id),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-canopy-900 dark:text-white">Market Predict</h2>
        <p className="mt-1 font-mono text-sm text-canopy-600 dark:text-canopy-300">Cotizaciones, divisas, insumos, margen y oportunidad de venta.</p>
      </div>

      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              section === s.id
                ? "border-green-300 bg-green-50 text-canopy-900 dark:border-canopy-500/60 dark:bg-canopy-700/30 dark:text-gold-300"
                : "border-transparent text-canopy-800 hover:bg-canopy-100 dark:text-canopy-200 dark:hover:bg-white/5"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "resumen" && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <QuotesTable quotes={quotes} loading={quotesLoading} loadError={quotesError} onPrice={onPrice} />

            <Card gradient className="min-w-0 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={monoLabel}>Oportunidad de venta</h3>
                {silos.length > 0 && (
                  <select
                    value={oppSiloId ?? ""}
                    onChange={(e) => onSilo(e.target.value)}
                    aria-label="Silo a evaluar"
                    className="rounded-lg border border-canopy-300 bg-white px-3 py-2 text-sm font-medium text-canopy-900 outline-none focus:border-orange-400 dark:border-white/15 dark:bg-[#0b1522] dark:text-white"
                  >
                    {silos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.crop}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {silos.length === 0 && !silosLoading && (
                <EmptyAction text="Todavía no hay silos: agregá uno para calcular el índice de venta." action="Agregar silo" onAction={actions.onAddSilo} />
              )}
              {silos.length === 0 && silosLoading && <p className="mt-5 font-mono text-sm text-canopy-600 dark:text-canopy-300">Cargando silos…</p>}
              {silos.length > 0 && !opp && (
                <p role={oppError ? "alert" : undefined} className={`mt-5 text-sm ${oppError ? "text-red-600 dark:text-red-400" : "font-mono text-canopy-600 dark:text-canopy-300"}`}>
                  {oppError || "Calculando índice de venta…"}
                </p>
              )}
              {opp && <OppBody opp={opp} handlers={handlers} loading={oppLoading} />}
            </Card>
          </div>
          {silo && <IndiceHistorial siloId={silo.id} version={`${version}-${opp?.score ?? ""}`} />}
        </>
      )}

      {section === "cotizaciones" && <CotizacionesPanel tipos={tipos} version={version} onNew={() => actions.onNewCotizacion?.()} />}
      {section === "divisas" && <DivisasPanel version={version} onNew={() => actions.onNewDivisa?.()} />}
      {section === "insumos" && <InsumosPanel version={version} onNew={() => actions.onNewInsumo?.()} />}
      {section === "margen" && <MargenPanel tipos={tipos} version={version} cultivoId={margenCultivo} setCultivoId={setMargenCultivo} onSupuestos={(i) => actions.onSupuestos?.(i)} />}
    </div>
  );
}

const ruleAction = (r, h) => {
  if (r.pass) return null;
  const d = r.detail ?? "";
  const hint = r.hint ?? "";
  if (r.id === "margen") {
    if (/supuestos/i.test(d) || /supuestos-margen/.test(hint)) return { label: "Cargar supuestos", run: h.supuestos };
    if (/cotizaci/i.test(d)) return { label: "Cargar cotización", run: h.cotizacion };
    if (/cultivo/i.test(d)) return { label: "Asignar cultivo", run: h.editSilo };
  }
  if (r.id === "tendencia_precio" && /3 d/.test(hint)) return { label: "Cargar cotización", run: h.cotizacion };
  if ((r.id === "humedad_grano" || r.id === "temperatura_nucleo") && /sin medici/i.test(d)) return { label: "Registrar mediciones", run: h.medicion };
  if (r.id === "stock_disponible") return { label: "Registrar movimiento", run: h.movimiento };
  return null;
};

function OppBody({ opp, handlers, loading }) {
  const { silo, score, rules, verdict, passed, quote } = opp;
  return (
    <>
          {loading && <p className="mt-3 font-mono text-xs text-canopy-600 dark:text-canopy-300">Actualizando…</p>}
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <ScoreRing value={score} verdict={verdict.key} />
            <div className="min-w-[200px] flex-1">
              <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${verdictCls[verdict.key]}`}>
                {verdict.label} · {passed}/{rules.length} reglas cumplidas
              </p>
              <p className="mt-2 text-sm leading-relaxed text-canopy-700 dark:text-canopy-200">{verdict.text}</p>
              <p className="mt-2 font-mono text-xs text-canopy-600 dark:text-canopy-300">
                {silo.name} · {silo.crop}{quote.price != null ? ` · cotización US$ ${nf(quote.price)}/t` : ""}{quote.priceArs != null ? ` · ARS ${nfArs(quote.priceArs)}/t` : ""}
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {rules.map((r) => (
              <li key={r.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-canopy-900 dark:text-white">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full text-white ${r.pass ? "bg-green-500" : "bg-canopy-300 dark:bg-white/20"}`}
                      aria-label={r.pass ? "Cumple" : "No cumple"}
                    >
                      {r.pass ? <Check size={12} /> : <X size={12} />}
                    </span>
                    {r.label}
                    <span className="font-mono text-[11px] font-normal text-canopy-500 dark:text-canopy-400">peso {r.weight}%</span>
                  </span>
                  <span className="font-mono text-xs text-canopy-700 dark:text-canopy-200">{Math.round(r.weight * r.sub)} / {r.weight} pts</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-canopy-100 dark:bg-white/10">
                  <div className={`h-full rounded-full ${r.pass ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${r.sub * 100}%` }} />
                </div>
                <p className="mt-1.5 font-mono text-xs text-canopy-600 dark:text-canopy-300">
                  {r.detail} — {r.hint}
                </p>
                {(() => {
                  const a = ruleAction(r, handlers);
                  return a ? (
                    <button onClick={() => a.run(silo)} className="mt-2 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600">
                      {a.label}
                    </button>
                  ) : null;
                })()}
              </li>
            ))}
          </ul>
    </>
  );
}
