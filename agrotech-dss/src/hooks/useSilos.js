import { useCallback, useEffect, useState } from "react";
import { createSilo, getSilosData, registrarMovimiento, updateMediciones, updateSilo } from "../api/silos.js";

/** Silos, stock y movimientos reales desde el Gateway (/v1/silos/...). */
export function useSilos() {
  const [silos, setSilos] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getSilosData();
      setSilos(r.silos);
      setMovements(r.movements);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar los silos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** POST /silos/{id}/movimientos y recarga stock/movimientos. */
  const addMovement = useCallback(
    async (m) => {
      await registrarMovimiento(m.siloId, m);
      await reload();
    },
    [reload]
  );

  /** POST /silos/silos y recarga la lista. */
  const addSilo = useCallback(
    async (body) => {
      const s = await createSilo(body);
      await reload();
      return s;
    },
    [reload]
  );

  /** PUT /silos/{id} y recarga. */
  const editSilo = useCallback(
    async (id, body) => {
      await updateSilo(id, body);
      await reload();
    },
    [reload]
  );

  /** PUT /silos/{id}/mediciones y recarga. */
  const saveMediciones = useCallback(
    async (id, body) => {
      await updateMediciones(id, body);
      await reload();
    },
    [reload]
  );

  return { silos, movements, loading, error, reload, addMovement, addSilo, editSilo, saveMediciones };
}
