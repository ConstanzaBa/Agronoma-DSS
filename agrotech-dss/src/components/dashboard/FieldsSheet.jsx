import { useEffect, useMemo, useState } from "react";
import { ChevronUp, Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { searchPlaces } from "../../api/zones.js";

const STROKE = { optimal: "#facc15", warning: "#fb923c", critical: "#ef4444" };

/** Miniatura del lote: el polígono normalizado sobre un fondo de cultivo. */
function MiniShape({ coords, status }) {
  const lats = coords.map((c) => c[0]);
  const lngs = coords.map((c) => c[1]);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const span = Math.max(maxLat - minLat, maxLng - minLng) || 1;
  const pts = coords
    .map(([lat, lng]) => {
      const x = 8 + ((lng - minLng) / span) * 44 + (44 - ((maxLng - minLng) / span) * 44) / 2;
      const y = 52 - ((lat - minLat) / span) * 44 - (44 - ((maxLat - minLat) / span) * 44) / 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 60 60" className="h-14 w-14 shrink-0 rounded-lg bg-[#1f3a1a]" aria-hidden>
      <defs>
        <pattern id="mini-rows" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="4" height="2" fill="#2c5226" />
        </pattern>
      </defs>
      <rect width="60" height="60" fill="url(#mini-rows)" />
      <polygon points={pts} fill={STROKE[status]} fillOpacity="0.4" stroke={STROKE[status]} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function FieldsSheet({
  zones,
  loading,
  selectedId,
  activeZoneId,
  open,
  onToggle,
  onSelectLot,
  onSelectZone,
  onPickPlace,
  creatingZone = false,
  onNewZone,
  onEditZone,
  onDeleteZone,
  onEditLot,
  onDeleteLot,
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [places, setPlaces] = useState([]);
  const [placesState, setPlacesState] = useState("idle"); // idle | loading | done | error

  // La zona activa siempre queda desplegada
  useEffect(() => {
    if (activeZoneId) setExpanded((s) => new Set(s).add(activeZoneId));
  }, [activeZoneId]);

  // Búsqueda de zonas geográficas (API) con debounce
  const q = query.trim();
  useEffect(() => {
    if (q.length < 3) {
      setPlaces([]);
      setPlacesState("idle");
      return;
    }
    const ctrl = new AbortController();
    setPlacesState("loading");
    const t = setTimeout(async () => {
      try {
        setPlaces(await searchPlaces(q, ctrl.signal));
        setPlacesState("done");
      } catch (e) {
        if (e.name !== "AbortError") setPlacesState("error");
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Filtro local de lotes por nombre, cultivo o zona
  const groups = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return zones.map((z) => ({ zone: z, lots: z.lots }));
    return zones
      .map((z) => {
        const zoneHit = z.name.toLowerCase().includes(needle);
        const lots = z.lots.filter(
          (l) => zoneHit || l.name.toLowerCase().includes(needle) || l.crop.toLowerCase().includes(needle)
        );
        return { zone: z, lots, hit: zoneHit || lots.length > 0 };
      })
      .filter((g) => g.hit);
  }, [zones, q]);

  const toggleZone = (zone) => {
    const isOpen = expanded.has(zone.id);
    setExpanded((s) => {
      const n = new Set(s);
      isOpen ? n.delete(zone.id) : n.add(zone.id);
      return n;
    });
    if (!isOpen) onSelectZone(zone);
  };

  return (
    <div
      className={[
        "absolute inset-x-3 bottom-3 z-10 flex flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur",
        "dark:border-white/10 dark:bg-[#0f1b2c]/95 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-[390px]",
        open ? "max-h-[62%]" : "max-h-[44px]",
      ].join(" ")}
    >
      <button
        onClick={onToggle}
        aria-label={open ? "Ocultar panel de lotes" : "Mostrar panel de lotes"}
        className="grid h-[44px] shrink-0 place-items-center"
      >
        <span className="h-1 w-12 rounded-full bg-canopy-300 dark:bg-white/25" />
      </button>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="relative">
            <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-canopy-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lote, cultivo o zona del mundo"
              aria-label="Buscar lotes y zonas"
              className="w-full rounded-xl border border-canopy-200 bg-white py-3 pl-11 pr-10 text-[15px] text-canopy-900 outline-none placeholder:text-canopy-400 focus:border-canopy-500 focus:ring-2 focus:ring-canopy-500/20 dark:border-white/10 dark:bg-[#0b1522] dark:text-white dark:focus:border-gold-400 dark:focus:ring-gold-400/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-canopy-500 hover:text-canopy-800 dark:hover:text-white"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {onNewZone && (
            <button
              onClick={onNewZone}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600"
            >
              <Plus size={16} /> Nuevo establecimiento
            </button>
          )}

          <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {/* Resultados de la API de zonas geográficas */}
            {q.length >= 3 && (
              <div className="mb-2">
                <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-canopy-500 dark:text-canopy-300">
                  Zonas geográficas
                </p>
                {placesState === "loading" && (
                  <p className="flex items-center gap-2 px-1 py-2 text-sm text-canopy-600 dark:text-canopy-300">
                    <Loader2 size={15} className="animate-spin" /> Buscando...
                  </p>
                )}
                {placesState === "error" && (
                  <p className="px-1 py-2 text-sm text-red-500">No se pudo consultar el servicio de zonas.</p>
                )}
                {placesState === "done" && places.length === 0 && (
                  <p className="px-1 py-2 text-sm text-canopy-600 dark:text-canopy-300">Sin zonas para “{q}”.</p>
                )}
                {places.map((p) => (
                  <button
                    key={p.id}
                    disabled={creatingZone}
                    onClick={async () => {
                      if (await onPickPlace(p)) setQuery(""); // si falla, se conserva la búsqueda
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-canopy-100 disabled:opacity-50 dark:hover:bg-white/5"
                  >
                    {creatingZone ? <Loader2 size={17} className="shrink-0 animate-spin text-orange-500" /> : <MapPin size={17} className="shrink-0 text-orange-500" />}
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-semibold text-canopy-900 dark:text-white">{p.name}</span>
                      <span className="block truncate text-xs text-canopy-600 dark:text-canopy-300">{p.admin}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {loading && zones.length === 0 && (
              <p className="flex items-center gap-2 px-1 py-4 text-sm text-canopy-600 dark:text-canopy-300">
                <Loader2 size={15} className="animate-spin" /> Cargando zonas...
              </p>
            )}

            {!loading && zones.length === 0 && q.length === 0 && (
              <p className="px-1 py-3 text-sm leading-relaxed text-canopy-600 dark:text-canopy-300">
                Todavía no tenés establecimientos. Usá “Nuevo establecimiento” o buscá tu zona arriba y elegila para crear el primero.
              </p>
            )}

            {groups.map(({ zone, lots }) => {
              const isOpen = expanded.has(zone.id) || q.length > 0;
              return (
                <div key={zone.id}>
                  <div className="flex items-center">
                  <button
                    onClick={() => toggleZone(zone)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-left"
                  >
                    <ChevronUp
                      size={17}
                      className={`shrink-0 text-canopy-700 transition-transform dark:text-canopy-200 ${isOpen ? "" : "rotate-180"}`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate font-mono text-xs font-semibold uppercase tracking-[0.12em] ${
                        zone.id === activeZoneId ? "text-canopy-900 dark:text-gold-300" : "text-canopy-700 dark:text-canopy-200"
                      }`}
                    >
                      {zone.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold uppercase tracking-wider text-orange-500">
                      {zone.lots.length} {zone.lots.length === 1 ? "field" : "fields"}
                    </span>
                  </button>
                  {onEditZone && (
                    <button
                      onClick={() => onEditZone(zone)}
                      aria-label={`Editar ${zone.name}`}
                      title="Editar establecimiento"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {onDeleteZone && (
                    <button
                      onClick={() => onDeleteZone(zone)}
                      aria-label={`Eliminar ${zone.name}`}
                      title="Eliminar establecimiento"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  </div>

                  {isOpen && lots.length === 0 && (
                    <p className="px-3 pb-2 text-xs leading-relaxed text-canopy-600 dark:text-canopy-300">
                      Sin lotes en esta zona. Usá el botón naranja “+” del mapa para dibujar el primero.
                    </p>
                  )}

                  {isOpen &&
                    lots.map((l) => {
                      const sel = l.id === selectedId;
                      return (
                        <div
                          key={l.id}
                          className={`mb-2 flex items-center gap-3 rounded-2xl border p-2.5 transition ${
                            sel
                              ? "border-orange-400 bg-orange-50/60 dark:border-gold-400/60 dark:bg-white/[0.04]"
                              : "border-canopy-200 bg-white hover:border-canopy-300 dark:border-white/10 dark:bg-[#0b1522] dark:hover:border-white/20"
                          }`}
                        >
                          <button onClick={() => onSelectLot(l.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <MiniShape coords={l.coords} status={l.status} />
                            <span className="min-w-0">
                              <span className="block truncate text-lg font-bold leading-tight text-canopy-900 dark:text-white">
                                {l.name}
                              </span>
                              <span className="block truncate text-sm text-canopy-700 dark:text-canopy-200">{l.crop}</span>
                              <span className="block font-mono text-[11px] text-canopy-500 dark:text-canopy-400">
                                {l.area} ha · {l.moisture == null ? "sin sensor" : `humedad ${l.moisture}%`}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => onEditLot(l)}
                            aria-label={`Editar ${l.name}`}
                            title="Editar lote"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-canopy-600 hover:bg-canopy-100 dark:text-canopy-300 dark:hover:bg-white/10"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            onClick={() => onDeleteLot(l)}
                            aria-label={`Eliminar ${l.name}`}
                            title="Eliminar lote"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {q.length > 0 && groups.length === 0 && placesState !== "loading" && places.length === 0 && (
              <p className="px-1 py-3 text-sm text-canopy-600 dark:text-canopy-300">Sin resultados para “{q}”.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
