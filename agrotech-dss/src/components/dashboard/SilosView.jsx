import { CloudRain, Droplets, PenLine, Plus, Thermometer, Warehouse, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, monoLabel } from "./ui.jsx";

const nf = (n) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

function Stat({ icon: Icon, label, value, sub, tone = "" }) {
  return (
    <Card className="p-5">
      <p className={`flex items-center gap-2 ${monoLabel}`}>
        <Icon size={14} /> {label}
      </p>
      <p className={`mt-2 text-3xl font-extrabold ${tone || "text-canopy-900 dark:text-white"}`}>{value}</p>
      <p className="mt-1 font-mono text-xs text-canopy-600 dark:text-canopy-300">{sub}</p>
    </Card>
  );
}

function Bar({ pct, cls }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-canopy-100 dark:bg-white/10">
      <div className={`h-full rounded-full transition-all ${cls}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function statusOf(s) {
  const limit = s.moistureLimit; // del catálogo de cultivos; null = sin límite definido
  const issues = [];
  if (s.temp != null && s.temp > s.tempLimit) issues.push(`Temp +${(s.temp - s.tempLimit).toFixed(1)}°C`);
  if (s.grainMoisture != null && limit != null && s.grainMoisture > limit) issues.push("Humedad alta");
  if (s.maxDays && s.days / s.maxDays >= 0.9) issues.push("Plazo por vencer");
  return { issues, warn: issues.length > 0, limit };
}

/** Pestaña "Silo Metrics": estado de cada silo + registros recientes de la carga manual. */
export default function SilosView({ silos, loads, rain30, loading = false, error = "", onRetry, onRegister, onAddSilo, onDetail }) {
  const stock = silos.reduce((a, s) => a + s.tons, 0);
  const capacity = silos.reduce((a, s) => a + s.capacity, 0);
  const measured = silos.filter((s) => s.grainMoisture != null);
  const avgMoist = measured.length ? measured.reduce((a, s) => a + s.grainMoisture, 0) / measured.length : null;
  const warns = silos.filter((s) => statusOf(s).warn).length;
  const recent = [...loads].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  if (loading && silos.length === 0)
    return <p className="font-mono text-sm text-canopy-600 dark:text-canopy-300">Cargando silos…</p>;
  if (error && silos.length === 0)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm font-semibold text-canopy-600 hover:underline dark:text-gold-300">
            Reintentar
          </button>
        )}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-canopy-900 dark:text-white">Silo Metrics</h2>
          <p className="mt-1 font-mono text-sm text-canopy-600 dark:text-canopy-300">Stock, temperatura y humedad por silo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onAddSilo && (
<button
            onClick={onAddSilo}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-500 px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-500/10"
          >
            <Plus size={16} /> Agregar silo
          </button>
)}
          {silos.length > 0 && (
            <button
              onClick={() => onRegister({ kind: "silo" })}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600"
            >
              <PenLine size={16} /> Registrar movimiento
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Warehouse} label="Stock total" value={`${nf(stock)} t`} sub={`${capacity ? Math.round((stock / capacity) * 100) : 0}% de ${nf(capacity)} t`} />
        <Stat icon={Droplets} label="Humedad prom." value={avgMoist == null ? "—" : `${avgMoist.toFixed(1)}%`} sub="Grano almacenado" />
        <Stat
          icon={Thermometer}
          label="Silos en alerta"
          value={warns}
          sub={warns ? "Revisá temperatura y plazos" : "Todo en orden"}
          tone={warns ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}
        />
        <Stat icon={CloudRain} label="Lluvia 30 días" value={`${nf(rain30)} mm`} sub="Registros de los lotes" />
      </div>

      {silos.length === 0 && (
        <Card className="p-8 text-center">
          <Warehouse size={28} className="mx-auto text-canopy-500 dark:text-canopy-300" />
          <p className="mt-3 text-sm text-canopy-700 dark:text-canopy-200">Todavía no tenés silos cargados.</p>
          {onAddSilo && (
<button
            onClick={onAddSilo}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600"
          >
            <Plus size={16} /> Agregar silo
          </button>
)}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {silos.map((s) => {
          const st = statusOf(s);
          const fill = s.capacity ? (s.tons / s.capacity) * 100 : 0;
          const dayPct = s.maxDays ? (s.days / s.maxDays) * 100 : 0;
          return (
            <Card key={s.id} className={`p-5 ${st.warn ? "border-amber-300 dark:border-amber-500/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-canopy-900 dark:text-white">{s.name}</h3>
                  <p className="font-mono text-xs text-canopy-600 dark:text-canopy-300">{s.crop}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold ${
                    st.warn
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                  }`}
                >
                  {st.warn ? "WARN" : "OK"}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-canopy-700 dark:text-canopy-200">Llenado</span>
                  <span className="font-mono text-xs text-canopy-700 dark:text-canopy-200">
                    {nf(s.tons)} / {s.capacity} t ({Math.round(fill)}%)
                  </span>
                </div>
                <Bar pct={fill} cls="bg-canopy-500 dark:bg-gold-300" />
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-canopy-50 p-3 dark:bg-white/[0.04]">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">Temp.</dt>
                  <dd className={`mt-1 text-lg font-bold ${s.temp != null && s.temp > s.tempLimit ? "text-red-500" : "text-canopy-900 dark:text-white"}`}>{s.temp == null ? "—" : `${s.temp}°C`}</dd>
                  <dd className="font-mono text-[10px] text-canopy-500 dark:text-canopy-400">máx {s.tempLimit}°C</dd>
                </div>
                <div className="rounded-lg bg-canopy-50 p-3 dark:bg-white/[0.04]">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">Humedad</dt>
                  <dd className={`mt-1 text-lg font-bold ${s.grainMoisture != null && st.limit != null && s.grainMoisture > st.limit ? "text-red-500" : "text-canopy-900 dark:text-white"}`}>{s.grainMoisture == null ? "—" : `${s.grainMoisture.toFixed(1)}%`}</dd>
                  <dd className="font-mono text-[10px] text-canopy-500 dark:text-canopy-400">{st.limit == null ? "sin límite" : `límite ${st.limit}%`}</dd>
                </div>
                <div className="rounded-lg bg-canopy-50 p-3 dark:bg-white/[0.04]">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">Días</dt>
                  <dd className="mt-1 text-lg font-bold text-canopy-900 dark:text-white">{s.days}</dd>
                  <dd className="font-mono text-[10px] text-canopy-500 dark:text-canopy-400">de {s.maxDays ?? "—"}</dd>
                </div>
              </dl>

              <div className="mt-3">
                <Bar pct={dayPct} cls={dayPct >= 90 ? "bg-red-500" : dayPct >= 70 ? "bg-amber-500" : "bg-green-500"} />
              </div>

              {st.warn && (
                <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">⚠ {st.issues.join(" · ")}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <button
                  onClick={() => onDetail(s.id)}
                  className="text-sm font-semibold text-canopy-600 hover:underline dark:text-gold-300"
                >
                  Ver detalle →
                </button>
                <button
                  onClick={() => onRegister({ kind: "silo", siloId: s.id })}
                  className="text-sm font-semibold text-canopy-600 hover:underline dark:text-gold-300"
                >
                  Registrar ingreso / despacho →
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h3 className={monoLabel}>Registros recientes</h3>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-canopy-600 dark:text-canopy-300">Todavía no hay registros. Usá el botón “Carga manual”.</p>
        ) : (
          <ul className="mt-3 divide-y divide-canopy-100 dark:divide-white/10">
            {recent.map((l) => {
              const Icon = l.kind === "rain" ? CloudRain : l.direction === "out" ? ArrowUpFromLine : ArrowDownToLine;
              const title =
                l.kind === "rain"
                  ? `Lluvia ${nf(l.mm)} mm · ${l.lotName}`
                  : `${l.direction === "out" ? "Despacho" : "Ingreso"} ${nf(l.tons)} t · ${l.siloName}`;
              return (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canopy-100 text-canopy-600 dark:bg-white/10 dark:text-gold-300">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-canopy-900 dark:text-white">{title}</p>
                    <p className="truncate font-mono text-xs text-canopy-600 dark:text-canopy-300">
                      {l.date}
                      {l.note ? ` · ${l.note}` : ""}
                    </p>
                  </div>

                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
