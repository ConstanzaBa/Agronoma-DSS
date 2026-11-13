import { useMemo, useState } from "react";
import { Calculator, Loader2, Plus, RefreshCw } from "lucide-react";
import { Card, monoLabel } from "./ui.jsx";
import SeriesChart from "./SeriesChart.jsx";
import { INSUMOS } from "./EntityFormModal.jsx";
import { useListado, useRecurso } from "../../hooks/useMercadoDatos.js";
import { getIndiceHistorial, getMargen, getSupuestos, listCotizaciones, listDivisas, listInsumos, getCotizacionUltima, getDivisaUltima } from "../../api/mercado.js";

const nf = (n, d = 2) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: d });
const day = (v) => String(v ?? "").slice(0, 10);
const inputCls =
  "rounded-lg border border-canopy-300 bg-white px-3 py-2 text-sm text-canopy-900 outline-none focus:border-orange-400 dark:border-white/15 dark:bg-[#0b1522] dark:text-white";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center gap-2 rounded-lg border border-canopy-300 px-3 py-2 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-widest text-canopy-700 dark:text-canopy-200">
      {label}
      {children}
    </label>
  );
}

export function EmptyAction({ text, action, onAction, icon: Icon = Plus }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-canopy-300 p-5 text-center dark:border-white/15">
      <p className="text-sm text-canopy-700 dark:text-canopy-200">{text}</p>
      {onAction && (
        <button onClick={onAction} className={`${btnPrimary} mt-3`}>
          <Icon size={16} /> {action}
        </button>
      )}
    </div>
  );
}

const Status = ({ loading, error, onRetry }) =>
  loading ? (
    <p className="mt-4 flex items-center gap-2 font-mono text-sm text-canopy-600 dark:text-canopy-300">
      <Loader2 size={15} className="animate-spin" /> Cargando…
    </p>
  ) : error ? (
    <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
      {error}{" "}
      <button onClick={onRetry} className="font-semibold underline">Reintentar</button>
    </p>
  ) : null;

/** Última cotización/divisa vigente (endpoint /ultima). 404 sin_datos → null. */
function Ultima({ fetcher, id, tick, children, empty }) {
  const { data, loading, error, notFound } = useRecurso(fetcher, id ?? "all", tick);
  if (loading) return <p className="mt-3 font-mono text-xs text-canopy-600 dark:text-canopy-300">Consultando vigente…</p>;
  if (error) return <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>;
  if (notFound || !data) return <p className="mt-3 font-mono text-xs text-canopy-600 dark:text-canopy-300">{empty}</p>;
  return children(Array.isArray(data) ? data : [data]);
}

function Chip({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-canopy-200 bg-canopy-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{label}</p>
      <p className="mt-1 text-lg font-bold text-canopy-900 dark:text-white">{value}</p>
      {sub && <p className="font-mono text-[10px] text-canopy-500 dark:text-canopy-400">{sub}</p>}
    </div>
  );
}

function ListTable({ cols, rows, items }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="font-mono text-[11px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">
            {cols.map((c, i) => (
              <th key={c} className={`py-2 pr-3 font-medium ${i >= cols.length - 1 && cols.length > 2 ? "text-right" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-canopy-100 dark:divide-white/10">
          {items.map((it, i) => (
            <tr key={it.id ?? i} className="text-canopy-900 dark:text-white">
              {rows(it).map((c, j) => (
                <td key={j} className={`py-2.5 pr-3 ${j >= cols.length - 1 && cols.length > 2 ? "text-right font-mono" : j === 0 ? "font-mono text-xs" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const rangeKey = (f) => ({ desde: f.desde || undefined, hasta: f.hasta || undefined });

/** Filtros desde/hasta + extras */
function Filters({ f, setF, children, onApply }) {
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      {children}
      <Field label="Desde">
        <input type="date" value={f.desde} max={f.hasta || undefined} onChange={(e) => setF({ ...f, desde: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Hasta">
        <input type="date" value={f.hasta} min={f.desde || undefined} onChange={(e) => setF({ ...f, hasta: e.target.value })} className={inputCls} />
      </Field>
      {(f.desde || f.hasta) && (
        <button onClick={() => setF({ ...f, desde: "", hasta: "" })} className={btnGhost}>Limpiar fechas</button>
      )}
      {onApply}
    </div>
  );
}

const Header = ({ title, sub, onNew, newLabel, onReload }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 className={monoLabel}>{title}</h3>
      {sub && <p className="mt-1 text-sm text-canopy-700 dark:text-canopy-200">{sub}</p>}
    </div>
    <div className="flex gap-2">
      <button onClick={onReload} aria-label="Actualizar" className={btnGhost}><RefreshCw size={15} /></button>
      <button onClick={onNew} className={btnPrimary}><Plus size={16} /> {newLabel}</button>
    </div>
  </div>
);

/* ---------- Cotizaciones ---------- */
export function CotizacionesPanel({ tipos, version, onNew }) {
  const [f, setF] = useState({ cultivo: "", desde: "", hasta: "" });
  const cultivo = f.cultivo || String(tipos[0]?.id ?? "");
  const { items, loading, error, reload } = useListado((p, s) => listCotizaciones(p.cultivo, rangeKey(p), s), { cultivo, ...rangeKey(f), version }, !!cultivo);
  const sorted = useMemo(() => [...items].sort((a, b) => (day(a.fecha_cotizacion) < day(b.fecha_cotizacion) ? 1 : -1)), [items]);
  const pts = useMemo(() => [...sorted].reverse().map((c) => ({ label: day(c.fecha_cotizacion), value: Number(c.precio_usd_tn) })).filter((p) => Number.isFinite(p.value)), [sorted]);

  return (
    <Card className="min-w-0 p-5">
      <Header title="Cotizaciones · historial" sub="Precio de referencia por cultivo (US$/t)." onNew={onNew} newLabel="Cargar cotización" onReload={reload} />
      {tipos.length === 0 ? (
        <EmptyAction text="No hay cultivos disponibles para cotizar." />
      ) : (
        <>
          <Filters f={f} setF={setF}>
            <Field label="Cultivo">
              <select value={cultivo} onChange={(e) => setF({ ...f, cultivo: e.target.value })} className={inputCls}>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Field>
          </Filters>
          <Ultima fetcher={getCotizacionUltima} id={cultivo} tick={`${version}-${items.length}`} empty="Todavía no hay cotización vigente para este cultivo.">
            {([u]) => (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Chip label="Última · US$/t" value={u.precio_usd_tn != null ? `US$ ${nf(u.precio_usd_tn)}` : "—"} sub={`${day(u.fecha_cotizacion)}${u.desactualizada ? " · desactualizada" : ""}`} />
                <Chip label="ARS/t" value={u.precio_ars_tn != null ? `$ ${nf(u.precio_ars_tn, 0)}` : "—"} />
                <Chip label="Fuente" value={u.fuente ?? "—"} />
                <Chip label="Mercado" value={u.mercado_referencia ?? "—"} />
              </div>
            )}
          </Ultima>
          <Status loading={loading} error={error} onRetry={reload} />
          {!loading && !error && pts.length > 1 && <div className="mt-4"><SeriesChart points={pts} format={(v) => `US$ ${nf(v)}/t`} ariaLabel="Evolución de cotizaciones" /></div>}
          {!loading && !error && sorted.length === 0 && (
            <EmptyAction text="No hay cotizaciones en el período para este cultivo." action="Cargar cotización" onAction={onNew} />
          )}
          {sorted.length > 0 && (
            <ListTable
              cols={["Fecha", "Fuente", "Mercado", "US$/t"]}
              items={sorted}
              rows={(c) => [day(c.fecha_cotizacion), c.fuente ?? "—", c.mercado_referencia ?? "—", `US$ ${nf(c.precio_usd_tn)}`]}
            />
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- Divisas ---------- */
const TIPOS_DIVISA = [{ v: "", l: "Todas" }, { v: "oficial_bna", l: "Oficial BNA" }, { v: "exportador", l: "Exportador" }];
const tipoLabel = (v) => TIPOS_DIVISA.find((t) => t.v === v)?.l ?? v ?? "—";

export function DivisasPanel({ version, onNew }) {
  const [f, setF] = useState({ tipo: "", desde: "", hasta: "" });
  const { items, loading, error, reload } = useListado((p, s) => listDivisas(p, s), { tipo: f.tipo || undefined, ...rangeKey(f), version });
  const sorted = useMemo(() => [...items].sort((a, b) => (day(a.fecha) < day(b.fecha) ? 1 : -1)), [items]);
  const pts = useMemo(() => [...sorted].filter((d) => !f.tipo || d.tipo === f.tipo).reverse().filter((d) => (f.tipo ? true : d.tipo === (sorted[0]?.tipo))).map((d) => ({ label: day(d.fecha), value: Number(d.valor_ars_usd) })).filter((p) => Number.isFinite(p.value)), [sorted, f.tipo]);

  return (
    <Card className="min-w-0 p-5">
      <Header title="Divisas · tipo de cambio" sub="ARS por US$ según tipo." onNew={onNew} newLabel="Cargar tipo de cambio" onReload={reload} />
      <Filters f={f} setF={setF}>
        <Field label="Tipo">
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={inputCls}>
            {TIPOS_DIVISA.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </Field>
      </Filters>
      <Ultima fetcher={(t, s) => getDivisaUltima(f.tipo || undefined, s)} id={f.tipo || "all"} tick={`${version}-${items.length}`} empty="Todavía no hay tipo de cambio cargado.">
        {(list) => (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {list.slice(0, 4).map((u, i) => (
              <Chip key={u.id ?? i} label={`Última · ${tipoLabel(u.tipo)}`} value={u.valor_ars_usd != null ? `$ ${nf(u.valor_ars_usd)}` : "—"} sub={`${day(u.fecha)}${u.fuente ? ` · ${u.fuente}` : ""}`} />
            ))}
          </div>
        )}
      </Ultima>
      <Status loading={loading} error={error} onRetry={reload} />
      {!loading && !error && pts.length > 1 && <div className="mt-4"><SeriesChart points={pts} format={(v) => `$ ${nf(v)}`} ariaLabel="Evolución del tipo de cambio" /></div>}
      {!loading && !error && sorted.length === 0 && <EmptyAction text="No hay tipos de cambio en el período." action="Cargar tipo de cambio" onAction={onNew} />}
      {sorted.length > 0 && (
        <ListTable cols={["Fecha", "Tipo", "Fuente", "ARS/US$"]} items={sorted} rows={(d) => [day(d.fecha), tipoLabel(d.tipo), d.fuente ?? "—", `$ ${nf(d.valor_ars_usd)}`]} />
      )}
    </Card>
  );
}

/* ---------- Insumos ---------- */
export function InsumosPanel({ version, onNew }) {
  const [f, setF] = useState({ insumo: "", desde: "", hasta: "" });
  const { items, loading, error, reload } = useListado((p, s) => listInsumos(p, s), { insumo: f.insumo || undefined, ...rangeKey(f), version });
  const sorted = useMemo(() => [...items].sort((a, b) => (day(a.fecha) < day(b.fecha) ? 1 : -1)), [items]);
  const pts = useMemo(() => {
    const k = f.insumo || sorted[0]?.insumo;
    return sorted.filter((i) => i.insumo === k).reverse().map((i) => ({ label: day(i.fecha), value: Number(i.precio_usd) })).filter((p) => Number.isFinite(p.value));
  }, [sorted, f.insumo]);
  const name = (v) => INSUMOS.find((i) => i.v === v)?.l ?? v ?? "—";

  return (
    <Card className="min-w-0 p-5">
      <Header title="Insumos · precios" sub="Urea, PDA y gasoil (US$)." onNew={onNew} newLabel="Cargar precio" onReload={reload} />
      <Filters f={f} setF={setF}>
        <Field label="Insumo">
          <select value={f.insumo} onChange={(e) => setF({ ...f, insumo: e.target.value })} className={inputCls}>
            <option value="">Todos</option>
            {INSUMOS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
          </select>
        </Field>
      </Filters>
      <Status loading={loading} error={error} onRetry={reload} />
      {!loading && !error && pts.length > 1 && <div className="mt-4"><SeriesChart points={pts} format={(v) => `US$ ${nf(v)}`} ariaLabel="Evolución del precio del insumo" /></div>}
      {!loading && !error && sorted.length === 0 && <EmptyAction text="No hay precios de insumos en el período." action="Cargar precio" onAction={onNew} />}
      {sorted.length > 0 && <ListTable cols={["Fecha", "Insumo", "Fuente", "US$"]} items={sorted} rows={(i) => [day(i.fecha), name(i.insumo), i.fuente ?? "—", `US$ ${nf(i.precio_usd)}`]} />}
    </Card>
  );
}

/* ---------- Margen ---------- */
const LABELS = {
  ingreso_bruto_usd_ha: "Ingreso bruto (US$/ha)",
  ingreso_neto_usd_ha: "Ingreso neto (US$/ha)",
  costo_total_usd_ha: "Costo total (US$/ha)",
  margen_neto_usd_ha: "Margen neto (US$/ha)",
  margen_usd_ha: "Margen (US$/ha)",
  margen_neto_pct: "Margen neto (%)",
  precio_usd_tn: "Precio (US$/t)",
  rinde_tn_ha: "Rinde (t/ha)",
  retencion_usd_ha: "Retenciones (US$/ha)",
  costo_comercial_usd_ha: "Costo comercial (US$/ha)",
  punto_equilibrio_tn_ha: "Rinde de equilibrio (t/ha)",
  punto_equilibrio_usd_tn: "Precio de equilibrio (US$/t)",
};
const humanize = (k) => LABELS[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const isMargin = (k) => /margen/.test(k);

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v == null || k === "id" || k.endsWith("_id")) continue;
    if (Array.isArray(v)) continue;
    if (typeof v === "object") out.push(...flatten(v, `${prefix}${k}_`));
    else out.push([`${prefix}${k}`, v]);
  }
  return out;
}

export function MargenPanel({ tipos, version, onSupuestos, cultivoId, setCultivoId }) {
  const cultivo = cultivoId || String(tipos[0]?.id ?? "");
  const margen = useRecurso(getMargen, cultivo, version);
  const sup = useRecurso(getSupuestos, cultivo, version);
  const tipo = tipos.find((t) => String(t.id) === cultivo);
  const supData = sup.data?.id != null ? sup.data : null;
  const noSupuestos = margen.notFound === "supuestos_no_cargados" || (!sup.loading && !sup.error && !supData);
  const entries = margen.data && typeof margen.data === "object" ? flatten(margen.data.data ?? margen.data) : [];

  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={monoLabel}>Margen por hectárea</h3>
          <p className="mt-1 text-sm text-canopy-700 dark:text-canopy-200">Resultado calculado con tus supuestos y la cotización vigente.</p>
        </div>
        <button onClick={() => onSupuestos({ tipo_cultivo_id: Number(cultivo), ...(supData ?? {}) })} disabled={!cultivo} className={btnPrimary}>
          <Calculator size={16} /> {supData ? "Editar supuestos" : "Cargar supuestos"}
        </button>
      </div>

      {tipos.length === 0 ? (
        <EmptyAction text="No hay cultivos disponibles." />
      ) : (
        <>
          <div className="mt-4">
            <Field label="Cultivo">
              <select value={cultivo} onChange={(e) => setCultivoId(e.target.value)} className={`${inputCls} max-w-xs`}>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Field>
          </div>

          <Status loading={margen.loading || sup.loading} error={margen.error || sup.error} onRetry={() => setCultivoId(cultivo)} />

          {noSupuestos && !margen.loading && !sup.loading && (
            <EmptyAction text={`Todavía no cargaste los supuestos de margen para ${tipo?.nombre ?? "este cultivo"}.`} action="Cargar supuestos" icon={Calculator} onAction={() => onSupuestos({ tipo_cultivo_id: Number(cultivo) })} />
          )}
          {margen.notFound === "sin_datos" && !margen.loading && (
            <EmptyAction text="No hay cotización de este cultivo: cargá una para calcular el margen." />
          )}

          {entries.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {entries.map(([k, v]) => {
                const num = typeof v === "number" || (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));
                const neg = num && isMargin(k) && Number(v) < 0;
                return (
                  <div key={k} className="rounded-xl border border-canopy-200 bg-canopy-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{humanize(k)}</p>
                    <p className={`mt-1 text-lg font-bold ${neg ? "text-red-500" : isMargin(k) && num ? "text-green-600 dark:text-green-400" : "text-canopy-900 dark:text-white"}`}>
                      {num ? nf(v) : String(v)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {supData && (
            <div className="mt-6">
              <p className={monoLabel}>Supuestos vigentes</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {[
                  ["Rinde (t/ha)", supData.rinde_tn_ha],
                  ["Costo directo (US$/ha)", supData.costo_directo_usd_ha],
                  ["Fertilizante (US$/ha)", supData.costo_fertilizante_usd_ha],
                  ["Costo comercial (%)", supData.costo_comercial_pct],
                  ["Retención (%)", supData.retencion_pct],
                ].map(([l, v]) => (
                  <div key={l}>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{l}</dt>
                    <dd className="font-semibold text-canopy-900 dark:text-white">{v == null ? "—" : nf(v)}</dd>
                  </div>
                ))}
              </dl>
              {supData.actualizado_en && <p className="mt-2 font-mono text-[10px] text-canopy-500 dark:text-canopy-400">Actualizado {day(supData.actualizado_en)}</p>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- Historial del índice ---------- */
const VERD = { sell: "Vender", review: "Evaluar", wait: "Esperar" };
export function IndiceHistorial({ siloId, version }) {
  const { items, loading, error, reload } = useListado((p, s) => getIndiceHistorial(p.siloId, s), { siloId, version }, !!siloId);
  const sorted = useMemo(() => [...items].sort((a, b) => ((a.calculado_en ?? a.creado_en ?? "") < (b.calculado_en ?? b.creado_en ?? "") ? 1 : -1)), [items]);
  const pts = useMemo(() => [...sorted].reverse().map((h) => ({ label: String(h.calculado_en ?? h.creado_en ?? "").replace("T", " ").slice(0, 16), value: Number(h.puntaje) })).filter((p) => Number.isFinite(p.value)), [sorted]);
  if (!siloId) return null;

  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className={monoLabel}>Historial del índice</h3>
        <button onClick={reload} aria-label="Actualizar historial" className={btnGhost}><RefreshCw size={15} /></button>
      </div>
      <Status loading={loading} error={error} onRetry={reload} />
      {!loading && !error && sorted.length === 0 && <p className="mt-4 text-sm text-canopy-700 dark:text-canopy-200">Todavía no hay cálculos previos de este silo.</p>}
      {pts.length > 1 && <div className="mt-3"><SeriesChart points={pts} min={0} max={100} format={(v) => `${v} pts`} ariaLabel="Evolución del puntaje del índice" /></div>}
      {sorted.length > 0 && (
        <ListTable
          cols={["Calculado", "Veredicto", "Puntaje"]}
          items={sorted.slice(0, 15)}
          rows={(h) => [String(h.calculado_en ?? h.creado_en ?? "—").replace("T", " ").slice(0, 16), VERD[h.veredicto] ?? h.veredicto ?? "—", `${h.puntaje ?? "—"}`]}
        />
      )}
    </Card>
  );
}
