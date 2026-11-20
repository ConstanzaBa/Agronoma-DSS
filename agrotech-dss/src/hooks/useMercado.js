import { useCallback, useEffect, useMemo, useState } from "react";
import { getIndiceVenta, getQuotes, mapIndice, registrarCotizacion } from "../api/mercado.js";

/** Cotizaciones e índice de venta reales (Gateway /v1/mercado/...). `silos` viene de useSilos. */
export function useMercado(silos, { conIndice = true } = {}) {
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState("");
  const [siloId, setSiloId] = useState(null);
  const [indice, setIndice] = useState(null);
  const [oppLoading, setOppLoading] = useState(false);
  const [oppError, setOppError] = useState("");
  const [version, setVersion] = useState(0); // se incrementa al cambiar datos que afectan margen/índice (supuestos, divisas, insumos…)
  const refresh = useCallback(() => setVersion((n) => n + 1), []);

  const reloadQuotes = useCallback(async () => {
    setQuotesLoading(true);
    try {
      setQuotes(await getQuotes());
      setQuotesError("");
    } catch (err) {
      setQuotesError(err.message || "No se pudieron cargar las cotizaciones.");
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadQuotes();
  }, [reloadQuotes]);

  const oppSiloId = silos.some((s) => s.id === siloId) ? siloId : silos[0]?.id ?? null;

  // GET /v1/mercado/silos/{id}/indice-venta (se recalcula al cambiar de silo, de stock o de cotización)
  useEffect(() => {
    if (!conIndice || !oppSiloId) {
      setIndice(null); // el índice de venta es solo del admin: el empleado no lo pide
      return;
    }
    const ctrl = new AbortController();
    setOppLoading(true);
    getIndiceVenta(oppSiloId, ctrl.signal)
      .then((r) => {
        setIndice(mapIndice(r));
        setOppError("");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setIndice(null);
        setOppError(err.message || "No se pudo calcular el índice de venta.");
      })
      .finally(() => !ctrl.signal.aborted && setOppLoading(false));
    return () => ctrl.abort();
  }, [conIndice, oppSiloId, silos, quotes, version]);

  /** POST /mercado/cotizaciones y recarga la tabla. */
  const setPrice = useCallback(
    async (tipoCultivoId, price) => {
      await registrarCotizacion(tipoCultivoId, price);
      await reloadQuotes();
      refresh();
    },
    [reloadQuotes, refresh]
  );

  const opportunity = useMemo(() => {
    const silo = silos.find((s) => s.id === oppSiloId);
    if (!silo || !indice) return null;
    const quote = quotes.find((q) => q.crop === silo.crop) ?? { crop: silo.crop, price: null };
    return { ...indice, silo, quote };
  }, [silos, oppSiloId, indice, quotes]);

  return {
    quotes,
    quotesLoading,
    quotesError,
    opportunity,
    oppLoading,
    oppError,
    oppSiloId,
    setOppSilo: setSiloId,
    setPrice,
    reload: reloadQuotes,
    version,
    refresh,
  };
}
