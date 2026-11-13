import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../map.css";
import {
  BarChart3,
  Crosshair,
  Layers,
  Loader2,
  Menu,
  Minus,
  Plus,
  RefreshCw,
  Undo2,
  X,
} from "lucide-react";
import { Card } from "./ui.jsx";
import FieldsSheet from "./FieldsSheet.jsx";
import { centroid, formatLat, formatLng, polygonAreaHa } from "../../data/geo.js";

const COLORS = { optimal: "#facc15", warning: "#fb923c", critical: "#ef4444" };

const BASEMAPS = {
  sat: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19,
    subdomains: "abcd",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19,
    subdomains: "abcd",
  },
};

const CHIP_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/></svg>';

const errMsg = (err, fallback) => {
  const first = err?.fields ? Object.values(err.fields)[0] : null;
  return first || err?.message || fallback;
};

const levelOf = (m) => (m < 20 ? "critical" : m < 35 ? "warning" : "optimal");

function sensorIcon(lot, selected) {
  return L.divIcon({
    className: "",
    html: `<div class="ag-sensor ag-${levelOf(lot.moisture)}${selected ? " ag-sel" : ""}"><div class="ag-chip">${CHIP_SVG}</div><span class="ag-pill">${lot.moisture}%</span></div>`,
    iconSize: [40, 62],
    iconAnchor: [20, 20],
  });
}

const glass =
  "bg-white/95 text-canopy-900 shadow-lg backdrop-blur border border-white/60 dark:bg-[#0f1b2c]/95 dark:text-white dark:border-white/10";

function IconBtn({ icon: Icon, label, onClick, active = false, spin = false, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-xl transition hover:brightness-95 ${glass} ${
        active ? "!text-orange-500" : "text-canopy-800 dark:text-gold-300"
      } ${className}`}
    >
      <Icon size={20} className={spin ? "animate-spin" : ""} />
    </button>
  );
}

function DrawLayer({ active, onPoint }) {
  useMapEvents({
    click(e) {
      if (active) onPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

const fitOpts = () => {
  const wide = window.innerWidth >= 1024;
  return {
    paddingTopLeft: [wide ? 420 : 24, 110],
    paddingBottomRight: [84, wide ? 24 : 320],
    maxZoom: 17,
  };
};

export default function SectorMap({
  zones,
  loading,
  lot,
  onSelect,
  dark,
  onRefresh,
  onAddZone,
  onAddLot,
  error,
  tipos = [],
  onNewZone,
  onEditZone,
  onDeleteZone,
  onEditLot,
  onDeleteLot,
}) {
  const [map, setMap] = useState(null);
  const [basemap, setBasemap] = useState("sat"); // sat | street
  const [sheetOpen, setSheetOpen] = useState(true);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [notice, setNotice] = useState("");
  const [draw, setDraw] = useState({ on: false, pts: [], name: "", crop: "", variedad: "" });
  const [saving, setSaving] = useState(false); // guardando el lote dibujado
  const [saveError, setSaveError] = useState("");
  const [creatingZone, setCreatingZone] = useState(false); // creando un establecimiento
  const [locating, setLocating] = useState(false);
  const busy = useRef({ save: false, zone: false, locate: false }); // guardas síncronas contra doble clic
  const inited = useRef(false);
  const noticeTimer = useRef();

  const flash = (msg) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const lotCenter = useMemo(() => (lot ? centroid(lot.coords) : null), [lot]);

  /* ---- Navegación del mapa ---- */
  const focusZone = (zone, animate = true) => {
    if (!map) return;
    if (zone.lots.length) {
      const b = L.latLngBounds(zone.lots.flatMap((l) => l.coords));
      animate ? map.flyToBounds(b, { ...fitOpts(), duration: 1.1 }) : map.fitBounds(b, { ...fitOpts(), animate: false });
    } else {
      map.flyTo(zone.center, zone.zoom ?? 12, { duration: 1.2 });
    }
  };

  const focusLot = (l) => {
    if (!map) return;
    map.flyToBounds(L.latLngBounds(l.coords), { ...fitOpts(), maxZoom: 16, duration: 1 });
  };

  // Si la zona activa fue eliminada, se vuelve a elegir una existente
  useEffect(() => {
    if (activeZoneId && zones.length && !zones.some((z) => z.id === activeZoneId)) setActiveZoneId(null);
  }, [zones, activeZoneId]);

  // Zona activa inicial = la del lote seleccionado
  useEffect(() => {
    if (activeZoneId || !zones.length) return;
    const z = zones.find((z) => z.lots.some((l) => l.id === lot?.id)) ?? zones[0];
    setActiveZoneId(z.id);
  }, [zones, lot, activeZoneId]);

  // Encuadre inicial
  useEffect(() => {
    if (!map || inited.current || !activeZoneId) return;
    const z = zones.find((z) => z.id === activeZoneId);
    if (!z) return;
    inited.current = true;
    focusZone(z, false);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const selectZone = (zone) => {
    setActiveZoneId(zone.id);
    focusZone(zone);
  };

  const pickPlace = async (place) => {
    if (busy.current.zone) return false;
    busy.current.zone = true;
    setCreatingZone(true);
    try {
      const zone = await onAddZone(place); // POST /v1/campo/establecimientos
      setActiveZoneId(zone.id);
      map?.flyTo(zone.center, zone.zoom ?? 12, { duration: 1.3 });
      return true;
    } catch (err) {
      flash(errMsg(err, "No se pudo crear el establecimiento."));
      return false;
    } finally {
      busy.current.zone = false;
      setCreatingZone(false);
    }
  };

  // Única llamada a navigator.geolocation de la app: solo corre al hacer clic en "Mi ubicación".
  const locate = () => {
    if (busy.current.locate) return;
    if (!navigator.geolocation) return flash("Tu navegador no permite geolocalización.");
    busy.current.locate = true;
    setLocating(true);
    const done = () => {
      busy.current.locate = false;
      setLocating(false);
    };
    navigator.geolocation.getCurrentPosition(
      (p) => {
        done();
        const ll = [p.coords.latitude, p.coords.longitude];
        setUserPos(ll);
        map?.flyTo(ll, 15, { duration: 1.2 });
      },
      (err) => {
        done();
        // PERMISSION_DENIED (1) también es lo que devuelve el navegador cuando una Permissions-Policy
        // (cabecera del servidor o iframe sin allow="geolocation") bloquea la API.
        flash(
          err?.code === 1
            ? "La ubicación está bloqueada: revisá el permiso del sitio en el navegador (o la política del servidor)."
            : "No se pudo obtener tu ubicación."
        );
      },
      { timeout: 8000 }
    );
  };

  /* ---- Dibujo de lotes ---- */
  const startDraw = () => {
    if (!zones.length) {
      flash("Primero creá un establecimiento.");
      return onNewZone?.();
    }
    if (!activeZoneId) return flash("Esperá a que carguen las zonas.");
    setDraw({ on: true, pts: [], name: "", crop: "", variedad: "" });
  };
  const cancelDraw = () => {
    setDraw({ on: false, pts: [], name: "", crop: "", variedad: "" });
    setSaveError("");
  };
  const saveDraw = async () => {
    if (busy.current.save) return;
    if (draw.pts.length < 3) return flash("Marcá al menos 3 puntos.");
    busy.current.save = true;
    setSaving(true);
    setSaveError("");
    const zone = zones.find((z) => z.id === activeZoneId);
    const n = (zone?.lots.length ?? 0) + 1;
    try {
      const newLot = await onAddLot(activeZoneId, {
        name: draw.name.trim() || `Lote nuevo ${n}`,
        crop: [draw.crop, draw.variedad.trim()].filter(Boolean).join(" / "),
        coords: draw.pts,
        area: polygonAreaHa(draw.pts),
      }); // POST /v1/campo/establecimientos/{id}/lotes
      onSelect(newLot.id);
      cancelDraw();
      flash(`“${newLot.name}” guardado (${newLot.area} ha).`);
    } catch (err) {
      setSaveError(errMsg(err, "No se pudo guardar el lote.")); // el dibujo se conserva para reintentar
    } finally {
      busy.current.save = false;
      setSaving(false);
    }
  };

  /* ---- Render ---- */
  const base = basemap === "sat" ? BASEMAPS.sat : dark ? BASEMAPS.dark : BASEMAPS.light;
  const allLots = zones.flatMap((z) => z.lots);
  const ordered = [...allLots.filter((l) => l.id !== lot?.id), ...allLots.filter((l) => l.id === lot?.id)];

  return (
    <Card className="relative h-[680px] overflow-hidden lg:h-[740px]">
      <MapContainer
        ref={setMap}
        center={[41.733, -93.602]}
        zoom={13}
        minZoom={3}
        zoomControl={false}
        className={`absolute inset-0 z-0 ${draw.on ? "ag-drawing" : ""}`}
      >
        <TileLayer key={basemap + (dark ? "d" : "l")} url={base.url} attribution={base.attribution} maxZoom={base.maxZoom} subdomains={base.subdomains ?? "abc"} />
        <DrawLayer active={draw.on && !saving} onPoint={(p) => setDraw((d) => ({ ...d, pts: [...d.pts, p] }))} />

        {ordered.map((l) => {
          const sel = l.id === lot?.id;
          const color = COLORS[l.status];
          return (
            <Polygon
              key={l.id}
              positions={l.coords}
              pathOptions={{
                color,
                fillColor: color,
                weight: sel ? 4 : 2.5,
                fillOpacity: sel ? 0.4 : 0.22,
                dashArray: sel ? "10 7" : undefined,
                lineJoin: "round",
              }}
              eventHandlers={{ click: () => !draw.on && onSelect(l.id) }}
            >
              <Tooltip sticky>{l.name}</Tooltip>
            </Polygon>
          );
        })}

        {allLots
          .filter((l) => l.sensor && l.moisture != null)
          .map((l) => (
            <Marker
              key={`${l.id}-${l.id === lot?.id}`}
              position={l.sensor.pos}
              icon={sensorIcon(l, l.id === lot?.id)}
              eventHandlers={{ click: () => !draw.on && onSelect(l.id) }}
            >
              <Tooltip direction="top" offset={[0, -18]}>
                {l.name} · humedad {l.moisture}%
              </Tooltip>
            </Marker>
          ))}

        {userPos && <CircleMarker center={userPos} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} />}

        {draw.on && draw.pts.length >= 3 && (
          <Polygon positions={draw.pts} pathOptions={{ color: "#f97316", weight: 3, dashArray: "6 6", fillOpacity: 0.25 }} />
        )}
        {draw.on && draw.pts.length === 2 && (
          <Polyline positions={draw.pts} pathOptions={{ color: "#f97316", weight: 3, dashArray: "6 6" }} />
        )}
        {draw.on &&
          draw.pts.map((p, i) => (
            <CircleMarker key={i} center={p} radius={6} pathOptions={{ color: "#f97316", weight: 3, fillColor: "#fff", fillOpacity: 1 }} />
          ))}
      </MapContainer>

      {/* Arriba a la izquierda: menú + título del lote */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-start gap-2 sm:left-4 sm:top-4">
        <IconBtn
          icon={sheetOpen ? X : Menu}
          label={sheetOpen ? "Ocultar panel de lotes" : "Mostrar panel de lotes"}
          onClick={() => setSheetOpen((o) => !o)}
          className="pointer-events-auto"
        />
        {lot && lotCenter && (
          <div className={`pointer-events-auto max-w-[min(70vw,360px)] rounded-xl px-3.5 py-2 ${glass}`}>
            <h2 className="truncate text-lg font-bold leading-tight">{lot.name}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-canopy-700 dark:text-canopy-200">
              LAT {formatLat(lotCenter[0])} / LON {formatLng(lotCenter[1])} · {lot.area} ha
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-canopy-700 dark:text-canopy-200">
              {[
                ["optimal", "Optimal"],
                ["warning", "Warning"],
                ["critical", "Critical"],
              ].map(([k, label]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[k] }} /> {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arriba a la derecha: agregar lote + ir al gráfico */}
      <div className="absolute right-3 top-3 z-10 flex gap-2 sm:right-4 sm:top-4">
        <button
          onClick={draw.on ? cancelDraw : startDraw}
          disabled={saving}
          aria-label={draw.on ? "Cancelar dibujo" : "Dibujar un lote nuevo"}
          title={draw.on ? "Cancelar dibujo" : "Dibujar un lote nuevo"}
          className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-60"
        >
          {draw.on ? <X size={22} /> : <Plus size={24} />}
        </button>
        <IconBtn
          icon={BarChart3}
          label="Ver telemetría"
          onClick={() => document.getElementById("telemetry-chart")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />
      </div>

      {/* Columna derecha: zoom, sincronizar, capas, ubicación */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 sm:right-4">
        <IconBtn icon={Plus} label="Acercar" onClick={() => map?.zoomIn()} />
        <IconBtn icon={Minus} label="Alejar" onClick={() => map?.zoomOut()} />
        <IconBtn icon={RefreshCw} label="Actualizar zonas desde la API" onClick={onRefresh} spin={loading} />
        <IconBtn
          icon={Layers}
          label={basemap === "sat" ? "Cambiar a mapa de calles" : "Cambiar a vista satelital"}
          onClick={() => setBasemap((b) => (b === "sat" ? "street" : "sat"))}
          active={basemap !== "sat"}
        />
        <IconBtn icon={Crosshair} label="Mi ubicación" onClick={locate} spin={locating} disabled={locating} />
      </div>

      {/* Barra de dibujo */}
      {draw.on && (
        <div className={`absolute left-1/2 top-[88px] z-20 w-[min(92%,460px)] -translate-x-1/2 rounded-2xl p-3.5 ${glass}`}>
          <p className="text-sm font-semibold">
            Dibujando lote · {draw.pts.length} {draw.pts.length === 1 ? "punto" : "puntos"}
            {draw.pts.length >= 3 && (
              <span className="ml-2 font-mono text-xs font-normal text-canopy-600 dark:text-canopy-300">
                ≈ {polygonAreaHa(draw.pts).toFixed(1)} ha
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-canopy-600 dark:text-canopy-300">Hacé clic en el mapa para marcar los vértices.</p>
          <div className="mt-2.5">
            <select
              value={activeZoneId ?? ""}
              onChange={(e) => setActiveZoneId(Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
              disabled={saving}
              aria-label="Establecimiento del lote"
              className="w-full rounded-lg border border-canopy-200 bg-white px-3 py-2 text-sm text-canopy-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-[#0b1522] dark:text-white"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input
              value={draw.name}
              onChange={(e) => setDraw((d) => ({ ...d, name: e.target.value }))}
              disabled={saving}
              maxLength={120}
              placeholder="Nombre del lote"
              className="rounded-lg border border-canopy-200 bg-white px-3 py-2 text-sm text-canopy-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-[#0b1522] dark:text-white"
            />
            <select
              value={draw.crop}
              onChange={(e) => setDraw((d) => ({ ...d, crop: e.target.value }))}
              disabled={saving}
              aria-label="Cultivo"
              className="rounded-lg border border-canopy-200 bg-white px-2 py-2 text-sm text-canopy-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-[#0b1522] dark:text-white"
            >
              <option value="">Sin cultivo</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.nombre}>{t.nombre}</option>
              ))}
            </select>
            <input
              value={draw.variedad}
              onChange={(e) => setDraw((d) => ({ ...d, variedad: e.target.value }))}
              disabled={saving}
              maxLength={80}
              placeholder="Variedad"
              className="rounded-lg border border-canopy-200 bg-white px-3 py-2 text-sm text-canopy-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-[#0b1522] dark:text-white"
            />
          </div>
          {saveError && (
            <p role="alert" className="mt-2.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {saveError}
            </p>
          )}
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={() => setDraw((d) => ({ ...d, pts: d.pts.slice(0, -1) }))}
              disabled={!draw.pts.length || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-canopy-200 px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-white/15"
            >
              <Undo2 size={14} /> Deshacer
            </button>
            <button onClick={cancelDraw} disabled={saving} className="rounded-lg border border-canopy-200 px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-white/15">
              Cancelar
            </button>
            <button
              onClick={saveDraw}
              disabled={draw.pts.length < 3 || saving}
              aria-busy={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Guardando…
                </>
              ) : (
                "Guardar lote"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Aviso breve */}
      {notice && (
        <div role="status" className="absolute left-1/2 top-[88px] z-30 -translate-x-1/2 rounded-full bg-canopy-900/95 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {notice}
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="absolute right-20 top-5 z-10 max-w-[60%] rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && zones.length === 0 && (
        <div className="absolute right-20 top-5 z-10 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-canopy-700 shadow dark:bg-[#0f1b2c] dark:text-canopy-200">
          <Loader2 size={14} className="animate-spin" /> Cargando zonas...
        </div>
      )}

      <FieldsSheet
        zones={zones}
        loading={loading}
        selectedId={lot?.id}
        activeZoneId={activeZoneId}
        open={sheetOpen}
        onToggle={() => setSheetOpen((o) => !o)}
        onSelectLot={(id) => {
          const l = allLots.find((x) => x.id === id);
          onSelect(id);
          if (l) {
            setActiveZoneId(l.zoneId);
            focusLot(l);
          }
        }}
        onSelectZone={selectZone}
        onPickPlace={pickPlace}
        onNewZone={onNewZone}
        creatingZone={creatingZone}
        onEditZone={onEditZone}
        onDeleteZone={onDeleteZone}
        onEditLot={onEditLot}
        onDeleteLot={onDeleteLot}
      />
    </Card>
  );
}
