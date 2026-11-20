import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, X } from "lucide-react";
import { getSilo, getSiloStock, listMovimientos } from "../../api/silos.js";

const nf = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });
const dash = (v, u = "") => (v == null || v === "" ? "—" : `${v}${u}`);

// GET /silos/{id} está documentado sin esquema de objeto: se acepta el silo directo, { data } o un arreglo de un elemento.
const unwrap = (r) => (Array.isArray(r) ? r[0] : r?.id == null && r?.data && !Array.isArray(r.data) ? r.data : r);

/**
 * Detalle de un silo: GET /silos/{id}, GET /silos/{id}/stock y GET /silos/{id}/movimientos.
 * `refreshKey` recarga tras editar o registrar una medición.
 */
export default function SiloDetailModal({ siloId, zones = [], tipos = [], refreshKey = 0, onClose, onEdit, onMedicion, onMovimiento }) {
  const [st, setSt] = useState({ state: "loading" });

  useEffect(() => {
    if (siloId == null) return;
    const ctrl = new AbortController();
    setSt((s) => (s.silo ? { ...s, state: "loading" } : { state: "loading" }));
    Promise.all([getSilo(siloId, ctrl.signal), getSiloStock(siloId, ctrl.signal), listMovimientos(siloId, ctrl.signal)])
      .then(([silo, stock, movs]) => setSt({ state: "done", silo: unwrap(silo), stock, movs }))
      .catch((e) => e.name !== "AbortError" && setSt({ state: "error", msg: e.message }));
    return () => ctrl.abort();
  }, [siloId, refreshKey]);

  useEffect(() => {
    if (siloId == null) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siloId, onClose]);

  if (siloId == null) return null;
  const { silo, stock, movs = [] } = st;
  const tipo = tipos.find((t) => t.id === silo?.tipo_cultivo_id)?.nombre;
  const zone = zones.find((z) => z.id === silo?.establecimiento_id)?.name;

  const rows = silo
    ? [
        ["Tipo", silo.tipo],
        ["Establecimiento", zone ?? `#${silo.establecimiento_id}`],
        ["Cultivo", tipo ?? "Sin cultivo"],
        ["Capacidad", `${nf(silo.capacidad_tn)} t`],
        ["Stock", stock ? `${nf(stock.stock_tn)} t (${dash(stock.ocupacion_pct, "%")})` : "—"],
        ["Entradas / salidas", stock ? `${nf(stock.entradas_tn)} t / ${nf(stock.salidas_tn)} t` : "—"],
        ["Humedad del grano", dash(silo.humedad_grano_pct, "%")],
        ["Temp. del núcleo", dash(silo.temperatura_nucleo_c, "°C")],
        ["Temp. límite", dash(silo.temperatura_limite_c, "°C")],
        ["Almacenado desde", dash(silo.almacenado_desde)],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="silo-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-canopy-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1b2c] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="silo-title" className="text-xl font-bold text-canopy-900 dark:text-white">{silo?.nombre ?? "Detalle del silo"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {st.state === "loading" && !silo && (
          <p className="mt-6 flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300">
            <Loader2 size={15} className="animate-spin" /> Cargando…
          </p>
        )}
        {st.state === "error" && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{st.msg || "No se pudo cargar el silo."}</p>}

        {silo && (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-canopy-600 dark:text-canopy-300">{k}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-canopy-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {onEdit && <button onClick={() => onEdit(silo)} className="rounded-lg border border-canopy-300 px-3.5 py-2 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">Editar silo</button>}
              <button onClick={() => onMedicion(silo)} className="rounded-lg border border-canopy-300 px-3.5 py-2 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">Registrar medición</button>
              <button onClick={() => onMovimiento(silo)} className="rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-bold text-white shadow-md hover:bg-orange-600">Registrar movimiento</button>
            </div>

            <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-canopy-600/80 dark:text-canopy-300">Movimientos recientes</h3>
            {movs.length === 0 ? (
              <p className="mt-2 text-sm text-canopy-600 dark:text-canopy-300">Sin movimientos.</p>
            ) : (
              <ul className="mt-2 divide-y divide-canopy-100 dark:divide-white/10">
                {movs.map((m) => {
                  const Icon = m.direccion === "out" ? ArrowUpFromLine : ArrowDownToLine;
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-2.5">
                      <Icon size={16} className="shrink-0 text-canopy-600 dark:text-gold-300" />
                      <span className="min-w-0 flex-1 truncate text-sm text-canopy-900 dark:text-white">
                        {m.direccion === "out" ? "Despacho" : "Ingreso"} {nf(m.toneladas)} t
                        <span className="ml-2 font-mono text-xs text-canopy-600 dark:text-canopy-300">{String(m.fecha_movimiento).slice(0, 10)}{m.observacion ? ` · ${m.observacion}` : ""}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
