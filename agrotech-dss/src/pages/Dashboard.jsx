import { PenLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { logout as apiLogout, getMe } from "../api/auth.js";
import { createDispositivo, createLluvia } from "../api/campo.js";
import {
  createCotizacion,
  createDivisa,
  createInsumo,
  putSupuestos,
} from "../api/mercado.js";
import { getSilo } from "../api/silos.js";
import { getSession, getUser, isAdminUser, isFirstLoginPending, signOut, syncFromMe } from "../auth.js";
import AlertFeed from "../components/dashboard/AlertFeed.jsx";
import AlertsPanel from "../components/dashboard/AlertsPanel.jsx";
import EntityFormModal from "../components/dashboard/EntityFormModal.jsx";
import LotDetailPanel from "../components/dashboard/LotDetailPanel.jsx";
import ManualEntryModal from "../components/dashboard/ManualEntryModal.jsx";
import MarketView from "../components/dashboard/MarketView.jsx";
import OpportunityIndex from "../components/dashboard/OpportunityIndex.jsx";
import SectorMap from "../components/dashboard/SectorMap.jsx";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import SiloDetailModal from "../components/dashboard/SiloDetailModal.jsx";
import SilosView from "../components/dashboard/SilosView.jsx";
import ProfileView from "../components/dashboard/ProfileView.jsx";
import TeamView from "../components/dashboard/TeamView.jsx";
import TelemetryChart from "../components/dashboard/TelemetryChart.jsx";
import { useDialog } from "../components/dialog/DialogProvider.jsx";
import { useAlertas } from "../hooks/useAlertas.js";
import { useLluvia } from "../hooks/useLluvia.js";
import { useMercado } from "../hooks/useMercado.js";
import { useSilos } from "../hooks/useSilos.js";
import { useZones } from "../hooks/useZones.js";

export default function Dashboard({ dark, onToggle }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("map");
  const [me, setMe] = useState(() => getUser()); // usuario de la sesión; se refresca con GET /auth/me
  // El rol solo decide qué UI se muestra; la seguridad real (cuenta, estancia, permisos) se aplica en el backend.
  const admin = isAdminUser(me); // admin = rol "admin"; empleados y roles desconocidos quedan sin acciones administrativas
  const activeTab = tab === "team" && !admin ? "map" : tab; // protege la pestaña admin frente a cambios de rol/estado
  const [lotId, setLotId] = useState(null); // lote elegido explícitamente
  const [zoneId, setZoneId] = useState(null); // estancia activa (Estancia 1:N Lotes)
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | done
  const timers = useRef([]);
  const {
    zones,
    tipos,
    loading,
    error,
    reload,
    addZone,
    createZone,
    addLot,
    editZone,
    removeZone,
    editLot,
    removeLot,
  } = useZones();
  const [form, setForm] = useState(null); // null | "zone" | "silo" | "lot" | "device" | "medicion"
  const [formInitial, setFormInitial] = useState(null); // objeto a editar (null = alta)
  const [siloView, setSiloView] = useState(null); // id del silo en el modal de detalle
  const [siloRefresh, setSiloRefresh] = useState(0);
  const [deviceRefresh, setDeviceRefresh] = useState(0);
  const silosApi = useSilos();
  const mercado = useMercado(silosApi.silos, { conIndice: admin }); // el índice de venta es solo del admin
  const alertas = useAlertas();
  const [entry, setEntry] = useState(null); // null | { kind, siloId? }
  const dialog = useDialog();
  const [busyAlert, setBusyAlert] = useState(null); // { id, op: "attend" | "resolve" } mientras hay un PATCH en curso
  const busyRef = useRef(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef();

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };

  // Revalida la sesión con el backend (GET /v1/auth/me). 401/403 → http.js cierra la sesión.
  useEffect(() => {
    if (!getSession()) return;
    getMe()
      .then((u) => {
        if (!u) return;
        setMe(syncFromMe(u)); // usuario con rol + primer_ingreso_pendiente de /auth/me
        // Primer ingreso pendiente: el flujo es obligatorio antes del acceso normal.
        if (isFirstLoginPending()) navigate("/primer-ingreso", { replace: true });
      })
      .catch((err) => {
        // 403 en /me: el token no pertenece a una persona → sesión inválida para este panel.
        if (err.status === 403) {
          signOut();
          navigate("/login", { replace: true });
        }
      });
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  const allLots = useMemo(() => zones.flatMap((z) => z.lots), [zones]);
  // Estancia activa: la elegida; si no existe (o fue eliminada), la del lote elegido, o la primera.
  const zone =
    zones.find((z) => z.id === zoneId) ??
    zones.find((z) => z.lots.some((l) => l.id === lotId)) ??
    zones[0] ??
    null;
  // Lote seleccionado: solo puede ser un lote DE LA ESTANCIA ACTIVA. Nunca se cae a un lote de otra estancia.
  const lot = zone
    ? (zone.lots.find((l) => l.id === lotId) ?? zone.lots[0] ?? null)
    : null;
  const changeZone = (id) => {
    setZoneId(id);
    // al cambiar de estancia se descarta el lote elegido si no pertenece a la nueva
    setLotId((cur) =>
      zones.find((z) => z.id === id)?.lots.some((l) => l.id === cur)
        ? cur
        : null,
    );
  };
  const lluvia = useLluvia(allLots);

  // Sin sesión → pantalla de login
  if (!getSession()) return <Navigate to="/login" replace />;

  const sync = () => {
    if (syncState === "syncing") return;
    setSyncState("syncing");
    Promise.all([
      reload(),
      silosApi.reload(),
      mercado.reload(),
      alertas.reload(),
      lluvia.reload(),
    ]).finally(() => {
      setSyncState("done");
      timers.current.push(setTimeout(() => setSyncState("idle"), 1800));
    });
  };

  // Atender / resolver: un solo PATCH a la vez; los botones de esa alerta quedan deshabilitados mientras tanto.
  const runAlertOp = async (a, op, fn, okMsg, failTitle, held = false) => {
    if (!held) {
      if (busyRef.current) return;
      busyRef.current = true;
    }
    setBusyAlert({ id: a.id, op });
    try {
      await fn(a.id);
      flash(okMsg);
    } catch (err) {
      await dialog.alert({
        variant: "error",
        title: failTitle,
        message: err.message || "Intentá de nuevo en unos minutos.",
      });
    } finally {
      busyRef.current = false;
      setBusyAlert(null);
    }
  };

  const onAlertAction = async (a) => {
    if (a.go === "manual-rain") return setEntry({ kind: "rain" });
    if (a.go) return setTab(a.go);
    await runAlertOp(
      a,
      "attend",
      alertas.attend,
      a.done ?? "Alerta atendida",
      "No se pudo atender la alerta",
    ); // PATCH /v1/alertas/alertas/{id}/atender
  };

  const onAlertResolve = async (a) => {
    if (busyRef.current) return;
    busyRef.current = true; // evita abrir dos confirmaciones con un doble clic
    const ok = await dialog.confirm({
      variant: "warning",
      title: "¿Resolver la alerta?",
      message: "Resolver cierra la alerta y no se puede reabrir.",
      confirmText: "Resolver",
      cancelText: "Cancelar",
    });
    if (!ok) {
      busyRef.current = false;
      return;
    }
    await runAlertOp(
      a,
      "resolve",
      alertas.resolve,
      "Alerta resuelta",
      "No se pudo resolver la alerta",
      true,
    ); // PATCH /v1/alertas/alertas/{id}/resolver
  };

  // Lanza el error al modal de Carga manual, que lo muestra dentro del formulario y mantiene los datos.
  const saveEntry = async (load) => {
    if (load.kind === "rain") {
      // POST /v1/campo/lotes/{id}/lluvia (la clave de idempotencia evita duplicados al reintentar)
      await createLluvia(load.lotId, {
        milimetros: load.mm,
        fecha_registro: load.date,
        observacion: load.note ? load.note.slice(0, 255) : null,
        clave_idempotencia: load.key ?? crypto.randomUUID(),
      });
      lluvia.reload();
    } else {
      // POST /v1/silos/silos/{id}/movimientos (misma clave de idempotencia al reintentar)
      await silosApi.addMovement(load);
    }
    setEntry(null);
    alertas.reload({ silent: true }); // el backend puede haber generado alertas nuevas
    flash(
      load.kind === "rain"
        ? `Lluvia registrada: ${load.mm} mm`
        : `${load.direction === "out" ? "Despacho" : "Ingreso"} de ${load.tons} t en ${load.siloName}`,
    );
  };

  const ADMIN_FORMS = ["zone", "lot", "device", "silo", "supuestos"]; // estancias, lotes, sensores, alta/edición de silos y supuestos de margen: solo administrador
  const BLOCKED_FORMS = ["cotizacion", "divisa", "insumo"]; // datos globales de mercado: carga manual bloqueada para todos
  const openForm = (kind, initial = null) => {
    if (BLOCKED_FORMS.includes(kind) || (ADMIN_FORMS.includes(kind) && !admin)) return;
    setFormInitial(initial);
    setForm(kind);
  };
  // Abre el formulario de silo (edición / medición) con los datos crudos del backend.
  const openSiloForm = async (kind, id) => {
    try {
      openForm(kind, await getSilo(id)); // GET /v1/silos/silos/{id}
    } catch (err) {
      await failAlert("No se pudo abrir el silo", err);
    }
  };
  const closeForm = () => {
    setForm(null);
    setFormInitial(null);
  };

  const confirmDelete = (title, message) =>
    dialog.confirm({
      variant: "warning",
      danger: true,
      title,
      message,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

  const failAlert = (title, err) =>
    dialog.alert({
      variant: "error",
      title,
      message: err?.message || "Intentá de nuevo en unos minutos.",
    });

  const deleteZone = async (z) => {
    if (
      !(await confirmDelete(
        "¿Eliminar el establecimiento?",
        `Se eliminará “${z.name}”. Esta acción no se puede deshacer.`,
      ))
    )
      return;
    try {
      await removeZone(z.id); // DELETE /v1/campo/establecimientos/{id} + refresco
      silosApi.reload();
      flash("Establecimiento eliminado");
    } catch (err) {
      await failAlert("No se pudo eliminar el establecimiento", err);
    }
  };

  const deleteLot = async (l) => {
    if (
      !(await confirmDelete(
        "¿Eliminar el lote?",
        `Se eliminará “${l.name}”. Esta acción no se puede deshacer.`,
      ))
    )
      return;
    try {
      await removeLot(l.id); // DELETE /v1/campo/lotes/{id} + refresco
      if (l.id === lotId) setLotId(null);
      flash("Lote eliminado");
    } catch (err) {
      await failAlert("No se pudo eliminar el lote", err);
    }
  };

  // Lanza el error al EntityFormModal, que lo muestra dentro del formulario y conserva los datos.
  const saveForm = async (body) => {
    if (form === "zone") {
      if (formInitial) {
        await editZone(formInitial.id, body); // PUT /v1/campo/establecimientos/{id}
        flash("Establecimiento actualizado");
      } else {
        const z = await createZone(body); // POST /v1/campo/establecimientos
        flash(`Establecimiento “${z.name}” creado`);
      }
    } else if (form === "lot") {
      await editLot(formInitial.id, body); // PUT /v1/campo/lotes/{id}
      flash("Lote actualizado");
    } else if (form === "device") {
      // El lote se fija al abrir el formulario (formInitial): el sensor va al lote que se vio, no al que haya al enviar.
      if (!formInitial?.id)
        throw new Error("Seleccioná un lote antes de crear un sensor.");
      const r = await createDispositivo(formInitial.id, body); // POST /v1/campo/lotes/{id}/dispositivos
      setDeviceRefresh((n) => n + 1);
      reload();
      flash("Sensor creado");
      const token =
        r?.token == null
          ? ""
          : typeof r.token === "string"
            ? r.token
            : JSON.stringify(r.token);
      closeForm();
      await dialog.alert({
        variant: "success",
        title: "Sensor creado",
        message: token
          ? `${r?.aviso ?? "Guardalo ahora: no se vuelve a mostrar"}\n\n${token}`
          : "El sensor fue creado.",
      });
      return;
    } else if (form === "cotizacion") {
      await createCotizacion(body); // POST /v1/mercado/cotizaciones
      await mercado.reload();
      mercado.refresh();
      flash("Cotización registrada");
    } else if (form === "divisa") {
      await createDivisa(body); // POST /v1/mercado/divisas
      await mercado.reload(); // el ARS/t depende del dólar oficial
      mercado.refresh();
      flash("Tipo de cambio registrado");
    } else if (form === "insumo") {
      await createInsumo(body); // POST /v1/mercado/insumos
      mercado.refresh();
      flash("Precio de insumo registrado");
    } else if (form === "supuestos") {
      const { _tipo, ...rest } = body;
      await putSupuestos(_tipo, rest); // PUT /v1/mercado/supuestos-margen/{tipo_cultivo_id}
      mercado.refresh(); // recalcula margen e índice de venta
      flash("Supuestos de margen guardados");
    } else if (form === "medicion") {
      await silosApi.saveMediciones(formInitial.id, body); // PUT /v1/silos/silos/{id}/mediciones
      setSiloRefresh((n) => n + 1);
      alertas.reload({ silent: true });
      flash("Medición registrada");
    } else if (formInitial) {
      await silosApi.editSilo(formInitial.id, body); // PUT /v1/silos/silos/{id}
      setSiloRefresh((n) => n + 1);
      flash("Silo actualizado");
    } else {
      const sl = await silosApi.addSilo(body); // POST /v1/silos/silos
      flash(`Silo “${sl?.nombre ?? body.nombre}” creado`);
    }
    closeForm();
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      /* igual se limpia la sesión local */
    }
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f2f6ef] text-canopy-900 dark:bg-gradient-to-br dark:from-[#071d0c] dark:via-[#0b2910] dark:to-[#10361a] dark:text-white lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar
        tab={activeTab}
        onTab={setTab}
        dark={dark}
        onToggle={onToggle}
        syncState={syncState}
        onSync={sync}
        onLogout={logout}
        alertCount={alertas.activeCount}
        user={me}
        isAdmin={admin}
      />

      <main className="min-w-0 p-4 sm:p-6">
        {activeTab === "map" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              <SectorMap
                zones={zones}
                loading={loading}
                error={error}
                lot={lot}
                activeZoneId={zone?.id ?? null}
                onZoneChange={changeZone}
                onSelect={setLotId}
                dark={dark}
                onRefresh={reload}
                onAddZone={addZone}
                onAddLot={addLot}
                onEditZone={(z) => openForm("zone", z)}
                onDeleteZone={deleteZone}
                onEditLot={(l) => openForm("lot", l)}
                onDeleteLot={deleteLot}
                tipos={tipos}
                onNewZone={() => openForm("zone")}
                readOnly={!admin}
              />
              <LotDetailPanel
                lot={lot}
                zone={zone}
                onSelectLot={setLotId}
                rain={lluvia.items}
                refreshKey={deviceRefresh}
                canManage={admin}
                onAddDevice={() => lot && openForm("device", lot)}
                onRain={() =>
                  lot && setEntry({ kind: "rain", lotId: String(lot.id) })
                }
              />
              <TelemetryChart lot={lot} />
            </div>
            <div className="min-w-0 space-y-7">
              {admin && (

              <OpportunityIndex
                opp={mercado.opportunity}
                loading={mercado.oppLoading}
                error={mercado.oppError}
                hasSilos={silosApi.silos.length > 0}
                silosLoading={silosApi.loading}
                onAddSilo={() => openForm("silo")}
                onRefresh={mercado.refresh}
                onOpenMarket={() => setTab("market")}
              />

              )}
              <AlertsPanel
                alerts={alertas.alerts}
                attended={alertas.attended}
                busy={busyAlert}
                onAction={onAlertAction}
                onSeeAll={() => setTab("alerts")}
              />
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <AlertFeed
            alerts={alertas.alerts}
            attended={alertas.attended}
            loading={alertas.loading}
            error={alertas.error}
            onRetry={alertas.reload}
            busy={busyAlert}
            onAction={onAlertAction}
            onResolve={onAlertResolve}
            onAttend={(a) =>
              runAlertOp(
                a,
                "attend",
                alertas.attend,
                "Alerta atendida",
                "No se pudo atender la alerta",
              )
            }
            tipos={tipos}
          />
        )}

        {activeTab === "silos" && (
          <SilosView
            silos={silosApi.silos}
            loads={[...silosApi.movements, ...lluvia.items]}
            rain30={lluvia.rain30}
            loading={silosApi.loading}
            error={silosApi.error}
            onRetry={silosApi.reload}
            onRegister={setEntry}
            onAddSilo={admin ? () => openForm("silo") : undefined}
            onDetail={setSiloView}
          />
        )}

        {activeTab === "market" && (
          <MarketView
            quotes={mercado.quotes}
            quotesLoading={mercado.quotesLoading}
            quotesError={mercado.quotesError}
            silos={silosApi.silos}
            silosLoading={silosApi.loading}
            tipos={tipos}
            version={mercado.version}
            actions={{
              onAddSilo: admin ? () => openForm("silo") : undefined,
              onMedicion: (id) => openSiloForm("medicion", id),
              onEditSilo: admin ? (id) => openSiloForm("silo", id) : undefined,
              onMovimiento: (id) =>
                setEntry({ kind: "silo", siloId: String(id) }),
              onSupuestos: (init) =>
                openForm("supuestos", init?.tipo_cultivo_id ? init : null),
            }}
            opp={mercado.opportunity}
            oppLoading={mercado.oppLoading}
            oppError={mercado.oppError}
            oppSiloId={mercado.oppSiloId}
            onSilo={mercado.setOppSilo}
          />
        )}
        {activeTab === "team" && admin && <TeamView zones={zones} flash={flash} />}

        {activeTab === "profile" && <ProfileView />}
      </main>

      {!entry && (
        <button
          onClick={() => setEntry({ kind: "rain" })}
          aria-label="Carga manual"
          className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-2.5 rounded-full bg-orange-500 px-5 font-semibold text-white shadow-xl shadow-orange-500/30 transition hover:bg-orange-600 sm:bottom-6 sm:right-6"
        >
          <PenLine size={20} />
          <span className="hidden sm:inline">Carga manual</span>
        </button>
      )}

      <ManualEntryModal
        open={!!entry}
        initial={entry}
        lots={zones
          .flatMap((z) => z.lots)
          .map((l) => ({ id: String(l.id), name: l.name }))}
        silos={silosApi.silos}
        onClose={() => setEntry(null)}
        onSave={saveEntry}
      />

      <SiloDetailModal
        siloId={siloView}
        zones={zones}
        tipos={tipos}
        refreshKey={siloRefresh}
        onClose={() => setSiloView(null)}
        onEdit={admin ? (raw) => openForm("silo", raw) : undefined}
        onMedicion={(raw) => openForm("medicion", raw)}
        onMovimiento={(raw) => {
          setSiloView(null);
          setEntry({ kind: "silo", siloId: String(raw.id) });
        }}
      />

      <EntityFormModal
        kind={form ?? "zone"}
        open={!!form}
        zones={zones}
        tipos={tipos}
        defaultZoneId={zone?.id}
        initial={formInitial}
        onClose={closeForm}
        onSave={saveForm}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-canopy-900/95 px-5 py-2.5 text-sm font-medium text-white shadow-lg sm:bottom-8"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
