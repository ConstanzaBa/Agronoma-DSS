import { useCallback, useEffect, useState } from "react";
import { CloudRain, Cpu, Loader2, Plus, RefreshCw } from "lucide-react";
import { Card, monoLabel } from "./ui.jsx";
import { getClima, getLote, listLecturas } from "../../api/campo.js";

const DAY_MS = 86400000;
const show = (v, unit) => (v == null || v === "" ? "—" : `${v}${unit}`);
const fmtDate = (v) => {
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
};

function Sub({ title, action, children }) {
  return (
    <div className="rounded-xl bg-canopy-50 p-4 dark:bg-white/[0.04]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className={monoLabel}>{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

const Muted = ({ children }) => <p className="text-sm text-canopy-600 dark:text-canopy-300">{children}</p>;
const Spin = () => (
  <p className="flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300">
    <Loader2 size={14} className="animate-spin" /> Cargando…
  </p>
);

/**
 * Detalle del lote seleccionado y de su establecimiento:
 *  clima (GET /campo/establecimientos/{id}/clima), sensores (GET /campo/lotes/{id} → dispositivos),
 *  lecturas (GET /campo/lotes/{id}/lecturas) y lluvia (los registros ya cargados por useLluvia).
 * `refreshKey` fuerza la recarga tras crear un sensor.
 */
export default function LotDetailPanel({ lot, zone, rain = [], refreshKey = 0, onAddDevice, onRain }) {
  const [clima, setClima] = useState({ state: "idle" }); // idle | loading | done | error
  const [dev, setDev] = useState({ state: "idle", items: [] });
  const [lect, setLect] = useState({ state: "idle", items: [] });
  const [tick, setTick] = useState(0);

  const zoneId = zone?.id;
  const lotId = lot?.id;

  useEffect(() => {
    if (zoneId == null) return setClima({ state: "idle" });
    const ctrl = new AbortController();
    setClima({ state: "loading" });
    getClima(zoneId, ctrl.signal)
      .then((data) => setClima({ state: "done", data }))
      .catch((e) => e.name !== "AbortError" && setClima({ state: "error", msg: e.message }));
    return () => ctrl.abort();
  }, [zoneId, tick]);

  useEffect(() => {
    if (lotId == null) {
      setDev({ state: "idle", items: [] });
      setLect({ state: "idle", items: [] });
      return;
    }
    const ctrl = new AbortController();
    setDev((d) => ({ ...d, state: "loading" }));
    setLect((d) => ({ ...d, state: "loading" }));
    getLote(lotId, ctrl.signal)
      .then((l) => setDev({ state: "done", items: l?.dispositivos ?? [] }))
      .catch((e) => e.name !== "AbortError" && setDev({ state: "error", items: [], msg: e.message }));
    const hasta = Date.now();
    listLecturas(lotId, { desde: new Date(hasta - 30 * DAY_MS).toISOString(), hasta: new Date(hasta).toISOString() }, ctrl.signal)
      .then((r) => setLect({ state: "done", items: [...r].sort((a, b) => Date.parse(b.medido_en) - Date.parse(a.medido_en)).slice(0, 6) }))
      .catch((e) => e.name !== "AbortError" && setLect({ state: "error", items: [], msg: e.message }));
    return () => ctrl.abort();
  }, [lotId, refreshKey, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  if (!lot || !zone) return null;

  const rainRows = rain
    .filter((r) => String(r.lotId) === String(lot.id))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);
  const c = clima.data;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-canopy-900 dark:text-white">{lot.name}</h3>
          <p className="truncate font-mono text-xs text-canopy-600 dark:text-canopy-300">
            {zone.name} · {lot.crop} · {lot.area} ha
          </p>
        </div>
        <button onClick={refresh} aria-label="Actualizar detalle" className="grid h-9 w-9 place-items-center rounded-lg text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Sub title="Clima del establecimiento">
          {clima.state === "loading" && <Spin />}
          {clima.state === "error" && <Muted>{clima.msg || "No hay datos de clima disponibles."}</Muted>}
          {clima.state === "done" && c?.actual && (
            <>
              <dl className="grid grid-cols-4 gap-2 text-center">
                {[
                  ["Temp.", show(c.actual.temperatura_c, "°C")],
                  ["Humedad", show(c.actual.humedad_pct, "%")],
                  ["Precip.", show(c.actual.precipitacion_mm, " mm")],
                  ["Viento", show(c.actual.viento_kmh, " km/h")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{k}</dt>
                    <dd className="mt-1 text-base font-bold text-canopy-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 font-mono text-[11px] text-canopy-500 dark:text-canopy-400">
                {c.fuente ? `Fuente: ${c.fuente} · ` : ""}
                {fmtDate(c.consultado_en)}
                {c.desactualizada ? " · datos desactualizados" : ""}
              </p>
            </>
          )}
          {clima.state === "done" && !c?.actual && <Muted>No hay datos de clima disponibles.</Muted>}
        </Sub>

        <Sub
          title="Sensores del lote"
          action={
            <button onClick={onAddDevice} className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-600 hover:underline dark:text-gold-300">
              <Plus size={13} /> Nuevo sensor
            </button>
          }
        >
          {dev.state === "loading" && dev.items.length === 0 && <Spin />}
          {dev.state === "error" && <Muted>{dev.msg || "No se pudieron cargar los sensores."}</Muted>}
          {dev.state === "done" && dev.items.length === 0 && <Muted>Este lote no tiene sensores.</Muted>}
          <ul className="space-y-2">
            {dev.items.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <Cpu size={15} className="shrink-0 text-canopy-500 dark:text-canopy-300" />
                <span className="min-w-0 flex-1 truncate font-semibold text-canopy-900 dark:text-white">{d.nombre}</span>
                <span className={`font-mono text-[11px] ${d.activo === false ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{d.activo === false ? "inactivo" : "activo"}</span>
                <span className="hidden font-mono text-[11px] text-canopy-500 sm:inline dark:text-canopy-400">{d.ultima_conexion_en ? fmtDate(d.ultima_conexion_en) : "sin conexión"}</span>
              </li>
            ))}
          </ul>
        </Sub>

        <Sub title="Lecturas recientes">
          {lect.state === "loading" && lect.items.length === 0 && <Spin />}
          {lect.state === "error" && <Muted>{lect.msg || "No se pudieron cargar las lecturas."}</Muted>}
          {lect.state === "done" && lect.items.length === 0 && <Muted>Sin lecturas en los últimos 30 días.</Muted>}
          {lect.items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">
                  <th className="pb-1 font-medium">Fecha</th>
                  <th className="pb-1 font-medium">Humedad suelo</th>
                  <th className="pb-1 font-medium">Temp.</th>
                </tr>
              </thead>
              <tbody className="text-canopy-900 dark:text-white">
                {lect.items.map((r, i) => (
                  <tr key={r.id ?? i}>
                    <td className="py-0.5 font-mono text-xs">{fmtDate(r.medido_en)}</td>
                    <td className="py-0.5">{show(r.humedad_suelo_pct, "%")}</td>
                    <td className="py-0.5">{show(r.temperatura_c, "°C")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sub>

        <Sub
          title="Lluvia (30 días)"
          action={
            <button onClick={onRain} className="inline-flex items-center gap-1 text-xs font-semibold text-canopy-600 hover:underline dark:text-gold-300">
              <CloudRain size={13} /> Registrar lluvia
            </button>
          }
        >
          {rainRows.length === 0 ? (
            <Muted>Sin registros de lluvia.</Muted>
          ) : (
            <ul className="space-y-1.5 text-sm text-canopy-900 dark:text-white">
              {rainRows.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span className="font-mono text-xs">{r.date}{r.note ? ` · ${r.note}` : ""}</span>
                  <span className="font-semibold">{r.mm} mm</span>
                </li>
              ))}
            </ul>
          )}
        </Sub>
      </div>
    </Card>
  );
}
