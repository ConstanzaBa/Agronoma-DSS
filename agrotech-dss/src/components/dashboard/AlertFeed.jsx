import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui.jsx";
import { AlertCard } from "./AlertsPanel.jsx";
import AlertDetailModal from "./AlertDetailModal.jsx";
import RulesView from "./RulesView.jsx";
import PriceTargetsView from "./PriceTargetsView.jsx";
import { SEVERIDADES, TIPOS_REGLA } from "./EntityFormModal.jsx";
import { listAlertasFiltradas, mapAlerta } from "../../api/alertas.js";

const filters = [
  { id: "all", label: "Todas" },
  { id: "critical", label: "Críticas" },
  { id: "warning", label: "Advertencias" },
  { id: "info", label: "Info" },
  { id: "done", label: "Atendidas" },
];
const ESTADOS = [
  { v: "active", l: "Activas" },
  { v: "attended", l: "Atendidas" },
  { v: "resolved", l: "Resueltas" },
];
const SECTIONS = [
  { id: "alerts", label: "Alertas" },
  { id: "rules", label: "Reglas" },
  { id: "targets", label: "Objetivos de precio" },
];

const selectCls =
  "rounded-lg border border-canopy-200 bg-white px-3 py-2 text-sm text-canopy-900 outline-none focus:border-orange-400 dark:border-white/15 dark:bg-[#0b1522] dark:text-white";
const chip = (on) =>
  [
    "rounded-full border px-4 py-1.5 text-sm font-medium transition",
    on
      ? "border-canopy-600 bg-canopy-600 text-white dark:border-gold-300 dark:bg-gold-300 dark:text-canopy-950"
      : "border-canopy-200 bg-white text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:bg-transparent dark:text-canopy-100 dark:hover:bg-white/5",
  ].join(" ");

/** Pestaña "Alert Feed": alertas (filtros, detalle, atender/resolver), reglas y objetivos de precio. */
export default function AlertFeed({ alerts, loading = false, error = "", onRetry, onAction, busy = null, onResolve, onAttend, tipos = [] }) {
  const [section, setSection] = useState("alerts");
  const [filter, setFilter] = useState("all");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [remote, setRemote] = useState({ state: "idle", items: [], msg: "" });
  const [detailId, setDetailId] = useState(null);
  const [retry, setRetry] = useState(0);

  const serverFiltered = !!(estado || tipo);

  // Filtros por estado/tipo: GET /v1/alertas/alertas?estado=&tipo= (se repite al cambiar `alerts`: atender, resolver, SSE).
  useEffect(() => {
    if (!serverFiltered) return setRemote({ state: "idle", items: [], msg: "" });
    const ctrl = new AbortController();
    setRemote((r) => ({ ...r, state: "loading" }));
    listAlertasFiltradas({ estado, tipo }, ctrl.signal)
      .then((rows) => setRemote({ state: "done", items: rows.map(mapAlerta).sort((a, b) => b.id - a.id), msg: "" }))
      .catch((e) => e.name !== "AbortError" && setRemote({ state: "error", items: [], msg: e.message }));
    return () => ctrl.abort();
  }, [estado, tipo, serverFiltered, alerts, retry]);

  const base = serverFiltered ? remote.items : alerts;
  const match = (a, f) => (f === "all" ? true : f === "done" ? a.attended : a.severity === f);
  const count = (f) => base.filter((a) => match(a, f)).length;
  const list = useMemo(() => base.filter((a) => match(a, filter)), [base, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const detailVersion = `${alerts.find((a) => a.id === detailId)?.estado ?? ""}`;
  const listLoading = serverFiltered ? remote.state === "loading" && remote.items.length === 0 : loading && alerts.length === 0;
  const listError = serverFiltered ? remote.state === "error" && remote.msg : error && alerts.length === 0 && error;
  const empty = !listLoading && !listError && list.length === 0;
  const clear = () => {
    setEstado("");
    setTipo("");
    setFilter("all");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-bold text-canopy-900 dark:text-white">Alert Feed</h2>
      <p className="mt-1 font-mono text-sm text-canopy-600 dark:text-canopy-300">Alertas de lotes, silos y mercado.</p>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-canopy-200 pb-4 dark:border-white/10" role="tablist" aria-label="Secciones de alertas">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)} className={chip(section === s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "rules" && (
        <div className="mt-6">
          <RulesView />
        </div>
      )}
      {section === "targets" && (
        <div className="mt-6">
          <PriceTargetsView tipos={tipos} />
        </div>
      )}

      {section === "alerts" && (
        <>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar alertas por severidad">
            {filters.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
                {f.label} <span className="ml-1 font-mono text-xs opacity-80">{count(f.id)}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado" className={selectCls}>
              <option value="">Todos los estados</option>
              {ESTADOS.map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo" className={selectCls}>
              <option value="">Todos los tipos</option>
              {TIPOS_REGLA.map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
            {(serverFiltered || filter !== "all") && (
              <button onClick={clear} className="text-sm font-semibold text-canopy-600 hover:underline dark:text-gold-300">Limpiar filtros</button>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {listLoading && <Card className="p-8 text-center font-mono text-sm text-canopy-600 dark:text-canopy-300">Cargando alertas…</Card>}
            {listError && (
              <Card className="p-8 text-center text-sm text-red-600 dark:text-red-400">
                {listError}
                <button onClick={() => (serverFiltered ? setRetry((n) => n + 1) : onRetry?.())} className="ml-3 font-semibold text-canopy-600 hover:underline dark:text-gold-300">
                  Reintentar
                </button>
              </Card>
            )}
            {empty && (
              <Card className="p-8 text-center text-sm text-canopy-600 dark:text-canopy-300">
                <p className="font-mono">{serverFiltered || filter !== "all" ? "No hay alertas con estos filtros." : "Todavía no hay alertas."}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {serverFiltered || filter !== "all" ? (
                    <button onClick={clear} className="rounded-lg border border-canopy-300 px-4 py-2.5 font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">Limpiar filtros</button>
                  ) : (
                    <button onClick={() => setSection("rules")} className="rounded-lg bg-orange-500 px-4 py-2.5 font-bold text-white shadow-md hover:bg-orange-600">Configurar reglas de alerta</button>
                  )}
                </div>
              </Card>
            )}
            {list.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                showLabel
                busy={busy}
                attended={a.attended}
                onAction={() => onAction(a)}
                onResolve={onResolve ? () => onResolve(a) : undefined}
                onDetail={() => setDetailId(a.id)}
              />
            ))}
          </div>

          <AlertDetailModal
            alertId={detailId}
            version={detailVersion}
            busy={busy}
            onClose={() => setDetailId(null)}
            onAttend={onAttend}
            onResolve={onResolve}
          />
        </>
      )}
    </div>
  );
}
