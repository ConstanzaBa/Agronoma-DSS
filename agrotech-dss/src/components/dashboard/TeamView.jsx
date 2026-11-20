import { useCallback, useEffect, useState } from "react";
import { Ban, Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2, UserCog, Users } from "lucide-react";
import { createCodigo, deleteEmpleado, getEmpleado, listCodigos, listEmpleados, revokeCodigo } from "../../api/campo.js";
import { ROLE_LABELS } from "../../auth.js";
import { useDialog } from "../dialog/DialogProvider.jsx";
import { Card, monoLabel } from "./ui.jsx";

/**
 * Pestaña "Equipo" (solo administrador): códigos de registro y empleados de la cuenta.
 * Endpoints (vía Gateway): /campo/establecimientos/{id}/codigos, /campo/codigos, /campo/empleados.
 * Los cupos y límites del plan los aplica el backend; aquí solo se muestran sus mensajes.
 */

const fullName = (e) => [e?.nombre, e?.apellido].filter(Boolean).join(" ") || e?.correo || `Empleado ${e?.id ?? ""}`;

// El contrato no fija la forma exacta de la estancia en cada respuesta: se acepta objeto anidado, nombre plano o id.
const estanciaDe = (x, zones) =>
  x?.establecimiento?.nombre ??
  x?.estancia?.nombre ??
  x?.establecimiento_nombre ??
  x?.estancia_nombre ??
  zones.find((z) => String(z.id) === String(x?.establecimiento_id ?? x?.estancia_id))?.name ??
  "—";

const ESTADO = {
  activo: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  usado: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  revocado: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

function Badge({ estado }) {
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${ESTADO[estado] ?? "bg-canopy-100 text-canopy-700 dark:bg-white/10 dark:text-canopy-200"}`}>
      {estado ?? "—"}
    </span>
  );
}

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-canopy-300 px-3 py-1.5 text-xs font-semibold text-canopy-800 transition hover:bg-canopy-100 disabled:opacity-50 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5";

function useList(loader) {
  const [state, setState] = useState({ status: "loading", items: [], msg: "" });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      setState({ status: "done", items: await loader(), msg: "" });
    } catch (err) {
      setState({ status: "error", items: [], msg: err.message || "No se pudo cargar el listado." });
    }
  }, [loader]);
  useEffect(() => {
    load();
  }, [load]);
  return [state, load];
}

const loadCodigos = () => listCodigos();
const loadEmpleados = () => listEmpleados();

export default function TeamView({ zones = [], flash }) {
  const dialog = useDialog();
  const [codes, reloadCodes] = useList(loadCodigos);
  const [staff, reloadStaff] = useList(loadEmpleados);
  const [zoneId, setZoneId] = useState("");
  const [busy, setBusy] = useState(null); // clave de la operación en curso
  const [detail, setDetail] = useState(null); // { id, status, data, msg }

  const selectedZone = zoneId || (zones[0] ? String(zones[0].id) : "");

  const fail = (title, err) => dialog.alert({ variant: "error", title, message: err?.message || "Intentá de nuevo en unos minutos." });

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      flash?.("Código copiado");
    } catch {
      /* portapapeles no disponible */
    }
  };

  const generar = async () => {
    if (!selectedZone || busy) return;
    setBusy("new-code");
    try {
      const r = await createCodigo(selectedZone); // POST /v1/campo/establecimientos/{id}/codigos
      const code = r?.codigo ?? r?.data?.codigo ?? null;
      await reloadCodes();
      await dialog.alert({
        variant: "success",
        title: "Código generado",
        message: code ? `Compartilo con el empleado para que se registre en “Registro de empleado”:\n\n${code}` : "El código fue generado. Lo ves en el listado.",
      });
    } catch (err) {
      await fail("No se pudo generar el código", err); // incluye mensajes de cupo del plan
    } finally {
      setBusy(null);
    }
  };

  const revocar = async (c) => {
    const ok = await dialog.confirm({
      variant: "warning",
      danger: true,
      title: "¿Revocar el código?",
      message: "Nadie podrá registrarse con este código. Esta acción no se puede deshacer.",
      confirmText: "Revocar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    setBusy(`code-${c.id}`);
    try {
      await revokeCodigo(c.id); // DELETE /v1/campo/codigos/{id}
      await reloadCodes();
      flash?.("Código revocado");
    } catch (err) {
      await fail("No se pudo revocar el código", err);
    } finally {
      setBusy(null);
    }
  };

  const verDetalle = async (e) => {
    if (detail?.id === e.id) return setDetail(null);
    setDetail({ id: e.id, status: "loading" });
    try {
      const data = await getEmpleado(e.id); // GET /v1/campo/empleados/{id}
      setDetail({ id: e.id, status: "done", data: data?.data ?? data });
    } catch (err) {
      setDetail({ id: e.id, status: "error", msg: err.message });
    }
  };

  const baja = async (e) => {
    const ok = await dialog.confirm({
      variant: "warning",
      danger: true,
      title: "¿Dar de baja al empleado?",
      message: `${fullName(e)} perderá el acceso y se liberará su cupo. No hay reactivación desde esta pantalla.`,
      confirmText: "Dar de baja",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    setBusy(`emp-${e.id}`);
    try {
      await deleteEmpleado(e.id); // DELETE /v1/campo/empleados/{id}
      if (detail?.id === e.id) setDetail(null);
      await reloadStaff();
      flash?.("Empleado dado de baja");
    } catch (err) {
      await fail("No se pudo dar de baja al empleado", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Códigos de registro ── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={`flex items-center gap-2 ${monoLabel} !text-xs`}>
            <KeyRound size={14} /> Códigos de registro
          </h3>
          <button onClick={reloadCodes} className={btn} aria-label="Actualizar códigos">
            <RefreshCw size={13} className={codes.status === "loading" ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className={`mb-1 block ${monoLabel}`}>Estancia</span>
            <select
              value={selectedZone}
              onChange={(e) => setZoneId(e.target.value)}
              disabled={zones.length === 0}
              className="w-full rounded-lg border border-canopy-300 bg-white px-3 py-2.5 text-sm text-canopy-900 dark:border-white/15 dark:bg-[#0b1522] dark:text-white"
            >
              {zones.length === 0 && <option value="">Primero creá un establecimiento</option>}
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={generar}
            disabled={!selectedZone || busy === "new-code"}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-60"
          >
            {busy === "new-code" ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Generar código
          </button>
        </div>

        <div className="mt-4">
          {codes.status === "loading" && codes.items.length === 0 && <p className="flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300"><Loader2 size={14} className="animate-spin" /> Cargando códigos...</p>}
          {codes.status === "error" && <p className="text-sm text-red-500">{codes.msg}</p>}
          {codes.status === "done" && codes.items.length === 0 && <p className="text-sm text-canopy-600 dark:text-canopy-300">Todavía no generaste códigos.</p>}
          <ul className="divide-y divide-canopy-100 dark:divide-white/10">
            {codes.items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="font-mono font-bold text-canopy-900 dark:text-white">{c.codigo ?? `#${c.id}`}</span>
                <Badge estado={c.estado} />
                <span className="min-w-0 flex-1 truncate text-canopy-600 dark:text-canopy-300">{estanciaDe(c, zones)}</span>
                {c.codigo && (
                  <button onClick={() => copy(c.codigo)} className={btn} aria-label="Copiar código">
                    <Copy size={13} /> Copiar
                  </button>
                )}
                {c.estado === "activo" && (
                  <button onClick={() => revocar(c)} disabled={busy === `code-${c.id}`} className={`${btn} !text-red-600 dark:!text-red-400`}>
                    {busy === `code-${c.id}` ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Revocar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* ── Empleados ── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={`flex items-center gap-2 ${monoLabel} !text-xs`}>
            <Users size={14} /> Empleados
          </h3>
          <button onClick={reloadStaff} className={btn} aria-label="Actualizar empleados">
            <RefreshCw size={13} className={staff.status === "loading" ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>

        <div className="mt-4">
          {staff.status === "loading" && staff.items.length === 0 && <p className="flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300"><Loader2 size={14} className="animate-spin" /> Cargando empleados...</p>}
          {staff.status === "error" && <p className="text-sm text-red-500">{staff.msg}</p>}
          {staff.status === "done" && staff.items.length === 0 && <p className="text-sm text-canopy-600 dark:text-canopy-300">Todavía no hay empleados. Generá un código y compartilo para que se registren.</p>}
          <ul className="divide-y divide-canopy-100 dark:divide-white/10">
            {staff.items.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <UserCog size={16} className="shrink-0 text-canopy-500 dark:text-canopy-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-canopy-900 dark:text-white">{fullName(e)}</span>
                    <span className="block truncate font-mono text-[11px] text-canopy-500 dark:text-canopy-400">
                      {ROLE_LABELS[e.rol] ?? e.rol ?? "—"} · {estanciaDe(e, zones)}
                    </span>
                  </span>
                  <button onClick={() => verDetalle(e)} className={btn}>
                    {detail?.id === e.id ? "Ocultar" : "Ver detalle"}
                  </button>
                  <button onClick={() => baja(e)} disabled={busy === `emp-${e.id}`} className={`${btn} !text-red-600 dark:!text-red-400`}>
                    {busy === `emp-${e.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Dar de baja
                  </button>
                </div>
                {detail?.id === e.id && (
                  <div className="mt-3 rounded-lg bg-canopy-50 p-3 text-sm dark:bg-white/5">
                    {detail.status === "loading" && <Loader2 size={14} className="animate-spin" />}
                    {detail.status === "error" && <p className="text-red-500">{detail.msg || "No se pudo cargar el detalle."}</p>}
                    {detail.status === "done" && <EmpleadoDetalle data={detail.data} zones={zones} />}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function EmpleadoDetalle({ data, zones }) {
  const rows = [
    ["Nombre", fullName(data)],
    ["Correo", data?.correo],
    ["Rol", ROLE_LABELS[data?.rol] ?? data?.rol],
    ["Teléfono", data?.telefono],
    ["Profesión", data?.profesion],
    ["Estancia asignada", estanciaDe(data, zones)],
  ].filter(([, v]) => v != null && v !== "" && v !== "—");
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className={monoLabel}>{k}</dt>
          <dd className="text-canopy-900 dark:text-white">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
