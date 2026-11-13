import { useCallback, useEffect, useMemo, useState } from "react";
import { addLote, addZone as apiAddZone, addZoneForm, editLoteApi, editZoneApi, removeLoteApi, removeZoneApi, getZones, renameLote } from "../api/zones.js";

try {
  localStorage.removeItem("agronoma-zones-extra"); // restos de la versión con datos locales
} catch {
  /* almacenamiento no disponible */
}

/** Establecimientos (zonas) y lotes reales desde el Gateway (/v1/campo/...). */
export function useZones() {
  const [zones, setZones] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getZones();
      setZones(r.zones);
      setTipos(r.tipos);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar los establecimientos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Crea el establecimiento (POST /campo/establecimientos); reutiliza uno existente con el mismo nombre. */
  const addZone = useCallback(
    async (place) => {
      const name = [place.name, place.admin].filter(Boolean).join(", ");
      const existing = zones.find((z) => z.name === name);
      if (existing) return existing;
      const z = await apiAddZone(place);
      setZones((zs) => [...zs, z]);
      return z;
    },
    [zones]
  );

  /** Formulario "Nuevo establecimiento": crea y refresca. */
  const createZone = useCallback(
    async (body) => {
      const z = await addZoneForm(body);
      await reload();
      return z;
    },
    [reload]
  );

  /** PUT /campo/establecimientos/{id} + refresco. */
  const editZone = useCallback(
    async (id, body) => {
      await editZoneApi(id, body);
      await reload();
    },
    [reload]
  );

  /** DELETE /campo/establecimientos/{id} + refresco. */
  const removeZone = useCallback(
    async (id) => {
      await removeZoneApi(id);
      await reload();
    },
    [reload]
  );

  /** PUT /campo/lotes/{id} + refresco. */
  const editLot = useCallback(
    async (id, body) => {
      await editLoteApi(id, body);
      await reload();
    },
    [reload]
  );

  /** DELETE /campo/lotes/{id} + refresco. */
  const removeLot = useCallback(
    async (id) => {
      await removeLoteApi(id);
      await reload();
    },
    [reload]
  );

  const addLot = useCallback(
    async (zoneId, data) => {
      const lot = await addLote(zoneId, data, tipos);
      setZones((zs) => zs.map((z) => (z.id === zoneId ? { ...z, lots: [...z.lots, lot] } : z)));
      return lot;
    },
    [tipos]
  );

  const allLots = useMemo(() => zones.flatMap((z) => z.lots), [zones]);

  const renameLot = useCallback(
    async (id, name) => {
      const current = allLots.find((l) => l.id === id);
      if (!current) return;
      const lot = await renameLote(current, name, tipos);
      setZones((zs) => zs.map((z) => ({ ...z, lots: z.lots.map((l) => (l.id === id ? lot : l)) })));
    },
    [allLots, tipos]
  );

  return { zones, tipos, loading, error, reload, addZone, createZone, addLot, renameLot, editZone, removeZone, editLot, removeLot };
}
