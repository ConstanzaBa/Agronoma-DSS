import { useCallback, useEffect, useState } from "react";

/** Carga un listado filtrado con loading/error/reload. `fetcher(params, signal)` devuelve un arreglo. */
export function useListado(fetcher, params, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetcher(params, ctrl.signal)
      .then((r) => {
        setItems(r);
        setError("");
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setItems([]);
        setError(e.message || "No se pudieron cargar los datos.");
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { items, loading, error, reload };
}

/** Carga un recurso único; un 404 se informa como `notFound` (código del backend) en lugar de error. */
export function useRecurso(fetcher, id, tick = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetcher(id, ctrl.signal)
      .then((r) => {
        setData(r);
        setError("");
        setNotFound(null);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setData(null);
        if (e.status === 404) {
          setNotFound(e.code || "sin_datos");
          setError("");
        } else {
          setNotFound(null);
          setError(e.message || "No se pudieron cargar los datos.");
        }
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tick]);

  return { data, loading, error, notFound };
}
