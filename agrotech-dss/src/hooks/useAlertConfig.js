import { useCallback, useEffect, useRef, useState } from "react";
import { createObjetivo, createRegla, deleteObjetivo, listObjetivos, listReglas, updateObjetivo, updateRegla } from "../api/alertas.js";

/** Aviso de éxito que se borra solo. */
export function useFlash(ms = 3200) {
  const [msg, setMsg] = useState("");
  const t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  const flash = useCallback(
    (m) => {
      setMsg(m);
      clearTimeout(t.current);
      t.current = setTimeout(() => setMsg(""), ms);
    },
    [ms]
  );
  return [msg, flash];
}

/** Reglas de alerta: GET/POST /v1/alertas/reglas, PUT /v1/alertas/reglas/{id}; recarga tras cada cambio. */
export function useReglas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listReglas());
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar las reglas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(async (body) => {
    await createRegla(body);
    await reload();
  }, [reload]);
  const update = useCallback(async (id, body) => {
    await updateRegla(id, body);
    await reload();
  }, [reload]);

  return { items, loading, error, reload, create, update };
}

/** Objetivos de precio: GET (?activo=true) / POST / PUT / DELETE /v1/alertas/objetivos-precio. */
export function useObjetivos(onlyActive = false) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listObjetivos({ activo: onlyActive }));
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar los objetivos.");
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(async (body) => {
    await createObjetivo(body);
    await reload();
  }, [reload]);
  const update = useCallback(async (id, body) => {
    await updateObjetivo(id, body);
    await reload();
  }, [reload]);
  const remove = useCallback(async (id) => {
    await deleteObjetivo(id);
    await reload();
  }, [reload]);

  return { items, loading, error, reload, create, update, remove };
}
