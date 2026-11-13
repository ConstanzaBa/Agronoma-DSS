import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-canopy-300 bg-white px-3 py-2.5 text-sm text-canopy-900 outline-none transition placeholder:text-canopy-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/15 dark:bg-[#0b1522] dark:text-white dark:placeholder:text-canopy-600";
const labelCls = "mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-widest text-canopy-700 dark:text-canopy-200";
const Err = ({ children }) => (children ? <p className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">{children}</p> : null);

const num = (v) => parseFloat(String(v).replace(",", "."));
const inRange = (v, min, max) => String(v ?? "").trim() !== "" && Number.isFinite(num(v)) && num(v) >= min && num(v) <= max;
const optNum = (v) => (String(v ?? "").trim() === "" ? null : num(v));
const s = (v) => (v == null ? "" : String(v));
const today = () => new Date().toLocaleDateString("en-CA");
export const INSUMOS = [{ v: "urea", l: "Urea" }, { v: "pda", l: "PDA" }, { v: "gasoil", l: "Gasoil" }];

/**
 * Esquemas de formulario. Cada uno define: título, campos, valores iniciales, validación/armado del body
 * y el mapa campo-de-API → campo-de-formulario (para mostrar errores 422 en su campo).
 *  zone     POST/PUT /campo/establecimientos[/{id}]
 *  silo     POST /silos/silos · PUT /silos/silos/{id}
 *  lot      PUT /campo/lotes/{id}
 *  device   POST /campo/lotes/{id}/dispositivos
 *  medicion PUT /silos/silos/{id}/mediciones
 *  cotizacion POST /mercado/cotizaciones · divisa POST /mercado/divisas · insumo POST /mercado/insumos
 *  supuestos PUT /mercado/supuestos-margen/{tipo_cultivo_id}
 */
export const TIPOS_REGLA = [
  { v: "moisture", l: "Humedad de suelo" },
  { v: "silo_temp", l: "Temperatura de silo" },
  { v: "no_rain", l: "Sin lluvia" },
  { v: "market", l: "Mercado" },
  { v: "price_target", l: "Objetivo de precio" },
];
export const SEVERIDADES = [
  { v: "critical", l: "Crítica" },
  { v: "warning", l: "Advertencia" },
  { v: "info", l: "Info" },
];
const SI_NO = [{ v: "1", l: "Sí" }, { v: "0", l: "No" }];

const SCHEMAS = {
  cotizacion: {
    title: () => "Cargar cotización",
    hint: "Precio de referencia en US$/t para un cultivo y una fecha.",
    api: { tipo_cultivo_id: "cultivo", fecha_cotizacion: "fecha", precio_usd_tn: "precio", mercado_referencia: "mercado" },
    init: ({ initial, tipos }) => ({ cultivo: s(initial?.tipo_cultivo_id ?? tipos[0]?.id), fecha: today(), precio: "", mercado: "ROSARIO" }),
    fields: ({ tipos }) => [
      { k: "cultivo", label: "Cultivo", el: "select", options: tipos.length ? tipos.map((t) => ({ v: String(t.id), l: t.nombre })) : [{ v: "", l: "Sin cultivos disponibles" }] },
      { k: "fecha", label: "Fecha", half: true, type: "date" },
      { k: "mercado", label: "Mercado", half: true, el: "select", options: [{ v: "ROSARIO", l: "Rosario" }, { v: "CBOT", l: "CBOT" }] },
      { k: "precio", label: "Precio (US$/t)", mode: "decimal", placeholder: "Ej: 320" },
    ],
    build: (f) => {
      const e = {};
      if (!f.cultivo) e.cultivo = "Elegí un cultivo.";
      if (!f.fecha || f.fecha > today()) e.fecha = "Elegí una fecha válida (no futura).";
      if (!inRange(f.precio, 0.000001, 99999999)) e.precio = "Ingresá un precio mayor a 0.";
      return { e, body: { tipo_cultivo_id: Number(f.cultivo), fecha_cotizacion: f.fecha, precio_usd_tn: num(f.precio), mercado_referencia: f.mercado } };
    },
  },

  divisa: {
    title: () => "Cargar tipo de cambio",
    hint: "Valor en ARS por US$ para una fecha.",
    api: { valor_ars_usd: "valor" },
    init: () => ({ tipo: "oficial_bna", fecha: today(), valor: "" }),
    fields: () => [
      { k: "tipo", label: "Tipo", el: "select", options: [{ v: "oficial_bna", l: "Oficial BNA" }, { v: "exportador", l: "Exportador" }] },
      { k: "fecha", label: "Fecha", half: true, type: "date" },
      { k: "valor", label: "Valor (ARS/US$)", half: true, mode: "decimal", placeholder: "Ej: 1050" },
    ],
    build: (f) => {
      const e = {};
      if (!f.fecha || f.fecha > today()) e.fecha = "Elegí una fecha válida (no futura).";
      if (!inRange(f.valor, 0.000001, 99999999)) e.valor = "Ingresá un valor mayor a 0.";
      return { e, body: { tipo: f.tipo, fecha: f.fecha, valor_ars_usd: num(f.valor) } };
    },
  },

  insumo: {
    title: () => "Cargar precio de insumo",
    api: { precio_usd: "precio" },
    init: () => ({ insumo: "urea", fecha: today(), precio: "" }),
    fields: () => [
      { k: "insumo", label: "Insumo", el: "select", options: INSUMOS },
      { k: "fecha", label: "Fecha", half: true, type: "date" },
      { k: "precio", label: "Precio (US$)", half: true, mode: "decimal", placeholder: "Ej: 640" },
    ],
    build: (f) => {
      const e = {};
      if (!f.fecha || f.fecha > today()) e.fecha = "Elegí una fecha válida (no futura).";
      if (!inRange(f.precio, 0.000001, 99999999)) e.precio = "Ingresá un precio mayor a 0.";
      return { e, body: { insumo: f.insumo, fecha: f.fecha, precio_usd: num(f.precio) } };
    },
  },

  supuestos: {
    title: () => "Supuestos de margen",
    hint: "Se usan para calcular el margen neto por ha del cultivo.",
    api: {},
    init: ({ initial, tipos }) => ({
      cultivo: s(initial?.tipo_cultivo_id ?? tipos[0]?.id),
      rinde: s(initial?.rinde_tn_ha),
      directo: s(initial?.costo_directo_usd_ha),
      fertilizante: s(initial?.costo_fertilizante_usd_ha),
      comercial: s(initial?.costo_comercial_pct),
      retencion: s(initial?.retencion_pct),
    }),
    fields: ({ tipos, initial }) => [
      { k: "cultivo", label: "Cultivo", el: "select", disabled: !!initial?.tipo_cultivo_id, options: tipos.length ? tipos.map((t) => ({ v: String(t.id), l: t.nombre })) : [{ v: "", l: "Sin cultivos disponibles" }] },
      { k: "rinde", label: "Rinde (t/ha)", half: true, mode: "decimal", placeholder: "Ej: 3.2" },
      { k: "directo", label: "Costo directo (US$/ha)", half: true, mode: "decimal", placeholder: "Ej: 420" },
      { k: "fertilizante", label: "Fertilizante US$/ha (opc.)", half: true, mode: "decimal" },
      { k: "comercial", label: "Costo comercial % (opc.)", half: true, mode: "decimal" },
      { k: "retencion", label: "Retención % (opc.)", half: true, mode: "decimal" },
    ],
    build: (f) => {
      const e = {};
      if (!f.cultivo) e.cultivo = "Elegí un cultivo.";
      if (!inRange(f.rinde, 0.000001, 9999)) e.rinde = "Ingresá un rinde entre 0 y 9999.";
      if (!inRange(f.directo, 0, 99999999)) e.directo = "Ingresá un costo mayor o igual a 0.";
      if (f.fertilizante.trim() !== "" && !inRange(f.fertilizante, 0, 99999999)) e.fertilizante = "Debe ser mayor o igual a 0.";
      if (f.comercial.trim() !== "" && !inRange(f.comercial, 0, 100)) e.comercial = "Entre 0 y 100 %.";
      if (f.retencion.trim() !== "" && !inRange(f.retencion, 0, 100)) e.retencion = "Entre 0 y 100 %.";
      return {
        e,
        body: {
          _tipo: Number(f.cultivo),
          rinde_tn_ha: num(f.rinde),
          costo_directo_usd_ha: num(f.directo),
          costo_fertilizante_usd_ha: optNum(f.fertilizante),
          costo_comercial_pct: optNum(f.comercial),
          retencion_pct: optNum(f.retencion),
        },
      };
    },
  },

  regla: {
    title: (edit) => (edit ? "Editar regla" : "Nueva regla"),
    hint: "Parámetros: uno o más valores separados por coma.",
    api: {},
    init: ({ initial }) =>
      initial
        ? { severidad: initial.severidad, parametros: (initial.parametros ?? []).join(", "), activa: initial.activa ? "1" : "0" }
        : { tipo: "moisture", severidad: "warning", parametros: "", activa: "1" },
    fields: ({ edit }) => [
      ...(edit ? [] : [{ k: "tipo", label: "Tipo", el: "select", options: TIPOS_REGLA }]),
      { k: "severidad", label: "Severidad", half: true, el: "select", options: SEVERIDADES },
      { k: "activa", label: "Activa", half: true, el: "select", options: SI_NO },
      { k: "parametros", label: "Parámetros", placeholder: "Ej: 20, 35" },
    ],
    build: (f, { edit }) => {
      const e = {};
      const parametros = f.parametros.split(",").map((x) => x.trim()).filter(Boolean);
      if (!parametros.length) e.parametros = "Ingresá al menos un parámetro.";
      const body = { severidad: f.severidad, parametros, activa: f.activa === "1" };
      if (!edit) body.tipo = f.tipo;
      return { e, body };
    },
  },

  objetivo: {
    title: (edit) => (edit ? "Editar objetivo de precio" : "Nuevo objetivo de precio"),
    api: { tipo_cultivo_id: "cultivo" },
    init: ({ initial, tipos }) =>
      initial
        ? { cultivo: s(initial.tipo_cultivo_id), moneda: initial.moneda, direccion: initial.direccion, umbral: s(initial.umbral), activo: initial.activo ? "1" : "0" }
        : { cultivo: s(tipos[0]?.id), moneda: "USD", direccion: "sube", umbral: "", activo: "1" },
    fields: ({ edit, tipos }) => [
      { k: "cultivo", label: "Cultivo", el: "select", options: tipos.length ? tipos.map((t) => ({ v: String(t.id), l: t.nombre })) : [{ v: "", l: "Sin cultivos disponibles" }] },
      { k: "direccion", label: "Dirección", half: true, el: "select", options: [{ v: "sube", l: "Sube" }, { v: "baja", l: "Baja" }] },
      { k: "moneda", label: "Moneda", half: true, el: "select", options: [{ v: "USD", l: "USD" }, { v: "ARS", l: "ARS" }] },
      { k: "umbral", label: "Umbral", mode: "decimal", placeholder: "Ej: 320" },
      ...(edit ? [{ k: "activo", label: "Activo", el: "select", options: SI_NO }] : []),
    ],
    build: (f, { edit }) => {
      const e = {};
      if (!f.cultivo) e.cultivo = "Elegí un cultivo.";
      if (!inRange(f.umbral, -9999999999, 9999999999)) e.umbral = "Ingresá un umbral numérico válido.";
      const body = { tipo_cultivo_id: Number(f.cultivo), moneda: f.moneda, direccion: f.direccion, umbral: num(f.umbral) };
      if (edit) body.activo = f.activo === "1";
      return { e, body };
    },
  },

  zone: {
    title: (edit) => (edit ? "Editar establecimiento" : "Nuevo establecimiento"),
    api: { zona_administrativa: "zona", latitud_centro: "lat", longitud_centro: "lng" },
    init: ({ initial, defaults }) =>
      initial
        ? { nombre: s(initial.name), zona: s(initial.admin), lat: s(initial.center?.[0]), lng: s(initial.center?.[1]), zoom: s(initial.zoom) }
        : { nombre: "", zona: "", lat: s(defaults.lat), lng: s(defaults.lng), zoom: "13" },
    fields: () => [
      { k: "nombre", label: "Nombre", max: 120, placeholder: "Ej: Campo La Esperanza" },
      { k: "zona", label: "Zona administrativa (opcional)", max: 150, placeholder: "Ej: Córdoba, Argentina" },
      { k: "lat", label: "Latitud centro", half: true, mode: "decimal", placeholder: "-31.4201" },
      { k: "lng", label: "Longitud centro", half: true, mode: "decimal", placeholder: "-64.1888" },
      { k: "zoom", label: "Zoom (opcional)", mode: "numeric", placeholder: "13" },
    ],
    build: (f) => {
      const e = {};
      const nombre = f.nombre.trim();
      if (!nombre) e.nombre = "Ingresá un nombre.";
      else if (nombre.length > 120) e.nombre = "Máximo 120 caracteres.";
      if (f.zona.length > 150) e.zona = "Máximo 150 caracteres.";
      if (!inRange(f.lat, -90, 90)) e.lat = "Latitud entre -90 y 90.";
      if (!inRange(f.lng, -180, 180)) e.lng = "Longitud entre -180 y 180.";
      const zoom = f.zoom.trim() === "" ? null : parseInt(f.zoom, 10);
      if (zoom != null && !(zoom >= 1 && zoom <= 22)) e.zoom = "Zoom entre 1 y 22.";
      return {
        e,
        body: { nombre, zona_administrativa: f.zona.trim() || null, latitud_centro: num(f.lat), longitud_centro: num(f.lng), zoom },
      };
    },
  },

  silo: {
    title: (edit) => (edit ? "Editar silo" : "Agregar silo"),
    api: { capacidad_tn: "capacidad", tipo_cultivo_id: "cultivo", temperatura_limite_c: "temp", establecimiento_id: "est" },
    init: ({ initial, zones, defaultZoneId }) =>
      initial
        ? { nombre: s(initial.nombre), tipo: initial.tipo || "silo", capacidad: s(initial.capacidad_tn), cultivo: s(initial.tipo_cultivo_id), temp: s(initial.temperatura_limite_c) }
        : { nombre: "", tipo: "silo", capacidad: "", cultivo: "", temp: "", est: s(defaultZoneId || zones[0]?.id) },
    fields: ({ edit, zones, tipos }) => [
      { k: "nombre", label: "Nombre", max: 80, placeholder: "Ej: Silo 1" },
      { k: "tipo", label: "Tipo", half: true, el: "select", options: [{ v: "silo", l: "Silo" }, { v: "silobolsa", l: "Silobolsa" }] },
      { k: "capacidad", label: "Capacidad (t)", half: true, mode: "decimal", placeholder: "Ej: 500" },
      ...(edit ? [] : [{ k: "est", label: "Establecimiento", el: "select", options: zones.length ? zones.map((z) => ({ v: String(z.id), l: z.name })) : [{ v: "", l: "Sin establecimientos" }] }]),
      { k: "cultivo", label: "Cultivo (opcional)", el: "select", options: [{ v: "", l: "Sin cultivo" }, ...tipos.map((t) => ({ v: String(t.id), l: t.nombre }))] },
      { k: "temp", label: "Temperatura límite °C (opcional)", mode: "decimal", placeholder: "25" },
    ],
    build: (f, { edit }) => {
      const e = {};
      const nombre = f.nombre.trim();
      if (!nombre) e.nombre = "Ingresá un nombre.";
      else if (nombre.length > 80) e.nombre = "Máximo 80 caracteres.";
      if (!inRange(f.capacidad, 0.000001, 99999999)) e.capacidad = "Ingresá una capacidad mayor a 0.";
      if (f.temp.trim() !== "" && !inRange(f.temp, -50, 99.9)) e.temp = "Entre -50 y 99,9 °C.";
      if (!edit && !f.est) e.est = "Elegí un establecimiento.";
      const body = {
        nombre,
        tipo: f.tipo,
        capacidad_tn: num(f.capacidad),
        tipo_cultivo_id: f.cultivo ? Number(f.cultivo) : null,
        temperatura_limite_c: optNum(f.temp),
      };
      if (!edit) body.establecimiento_id = Number(f.est);
      return { e, body };
    },
  },

  lot: {
    title: () => "Editar lote",
    api: { superficie_ha: "superficie", tipo_cultivo_id: "cultivo" },
    init: ({ initial }) => ({
      nombre: s(initial?.name),
      cultivo: s(initial?.raw?.tipo_cultivo_id),
      variedad: s(initial?.raw?.variedad),
      superficie: s(initial?.raw?.superficie_ha),
    }),
    fields: ({ tipos }) => [
      { k: "nombre", label: "Nombre", max: 120 },
      { k: "cultivo", label: "Cultivo", el: "select", options: [{ v: "", l: "Sin cultivo" }, ...tipos.map((t) => ({ v: String(t.id), l: t.nombre }))] },
      { k: "variedad", label: "Variedad (opcional)", max: 80 },
      { k: "superficie", label: "Superficie (ha)", mode: "decimal" },
    ],
    build: (f, { initial }) => {
      const e = {};
      const nombre = f.nombre.trim();
      if (!nombre) e.nombre = "Ingresá un nombre.";
      else if (nombre.length > 120) e.nombre = "Máximo 120 caracteres.";
      if (f.variedad.length > 80) e.variedad = "Máximo 80 caracteres.";
      if (!inRange(f.superficie, 0.01, 99999999)) e.superficie = "Ingresá una superficie mayor a 0.";
      return {
        e,
        body: {
          nombre,
          coordenadas: initial?.raw?.coordenadas ?? initial?.coords,
          superficie_ha: num(f.superficie),
          tipo_cultivo_id: f.cultivo ? Number(f.cultivo) : null,
          variedad: f.variedad.trim() || null,
        },
      };
    },
  },

  device: {
    title: () => "Nuevo sensor",
    hint: "Se asocia al lote seleccionado. El token se muestra una única vez al crearlo.",
    api: {},
    init: () => ({ nombre: "", latitud: "", longitud: "" }),
    fields: () => [
      { k: "nombre", label: "Nombre del sensor", max: 80, placeholder: "Ej: Sensor norte" },
      { k: "latitud", label: "Latitud (opcional)", half: true, mode: "decimal" },
      { k: "longitud", label: "Longitud (opcional)", half: true, mode: "decimal" },
    ],
    build: (f) => {
      const e = {};
      const nombre = f.nombre.trim();
      if (!nombre) e.nombre = "Ingresá un nombre.";
      else if (nombre.length > 80) e.nombre = "Máximo 80 caracteres.";
      if (f.latitud.trim() !== "" && !inRange(f.latitud, -90, 90)) e.latitud = "Entre -90 y 90.";
      if (f.longitud.trim() !== "" && !inRange(f.longitud, -180, 180)) e.longitud = "Entre -180 y 180.";
      return { e, body: { nombre, latitud: optNum(f.latitud), longitud: optNum(f.longitud) } };
    },
  },

  medicion: {
    title: () => "Registrar medición",
    api: { humedad_grano_pct: "humedad", temperatura_nucleo_c: "temp" },
    init: ({ initial }) => ({ humedad: s(initial?.humedad_grano_pct), temp: s(initial?.temperatura_nucleo_c) }),
    fields: () => [
      { k: "humedad", label: "Humedad del grano (%)", half: true, mode: "decimal", placeholder: "Ej: 13.5" },
      { k: "temp", label: "Temp. del núcleo (°C)", half: true, mode: "decimal", placeholder: "Ej: 22" },
    ],
    build: (f) => {
      const e = {};
      if (!inRange(f.humedad, 0, 99.99)) e.humedad = "Entre 0 y 99,99 %.";
      if (!inRange(f.temp, -50, 99.9)) e.temp = "Entre -50 y 99,9 °C.";
      return { e, body: { humedad_grano_pct: num(f.humedad), temperatura_nucleo_c: num(f.temp) } };
    },
  },
};

/**
 * Modal de alta/edición reutilizable (mismo estilo que ManualEntryModal).
 * `onSave(body)` lanza el error de la API: se muestra dentro del formulario y se conservan los datos.
 */
export default function EntityFormModal({ kind, open, onClose, onSave, zones = [], tipos = [], defaultZoneId = "", defaults = {}, initial = null }) {
  const schema = SCHEMAS[kind] ?? SCHEMAS.zone;
  const edit = !!initial;
  const ctx = { zones, tipos, initial, defaultZoneId, defaults, edit };
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const savingRef = useRef(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(schema.init(ctx));
    setErrors({});
    setSubmitError("");
    setSaving(false);
    savingRef.current = false;
    const t = setTimeout(() => firstRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !savingRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fields = schema.fields(ctx);

  const submit = async (ev) => {
    ev.preventDefault();
    if (savingRef.current) return;
    const { e, body } = schema.build(form, ctx);
    setErrors(e);
    if (Object.keys(e).length) return;

    savingRef.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(body); // si resuelve, el padre cierra el modal
    } catch (err) {
      if (err?.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [schema.api[k] ?? k, v])));
      }
      const first = err?.fields ? Object.values(err.fields)[0] : null;
      setSubmitError(first || err?.message || "No se pudo guardar. Intentá de nuevo.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-canopy-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1b2c] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="entity-title" className="text-xl font-bold text-canopy-900 dark:text-white">{schema.title(edit)}</h2>
            {schema.hint && <p className="mt-1 font-mono text-xs text-canopy-600 dark:text-canopy-300">{schema.hint}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="rounded-lg p-1.5 text-canopy-600 hover:bg-canopy-100 disabled:opacity-40 dark:text-canopy-300 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <fieldset disabled={saving} className="m-0 mt-5 grid min-w-0 grid-cols-2 gap-4 border-0 p-0">
          {fields.map((fd, i) => (
            <div key={fd.k} className={fd.half ? "col-span-1" : "col-span-2"}>
              <label htmlFor={`e-${fd.k}`} className={labelCls}>{fd.label}</label>
              {fd.el === "select" ? (
                <select id={`e-${fd.k}`} disabled={fd.disabled} ref={i === 0 ? firstRef : null} value={form[fd.k] ?? ""} onChange={set(fd.k)} className={inputCls}>
                  {fd.options.map((o) => (
                    <option key={o.v} value={o.v}>{o.l}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`e-${fd.k}`}
                  ref={i === 0 ? firstRef : null}
                  value={form[fd.k] ?? ""}
                  onChange={set(fd.k)}
                  maxLength={fd.max}
                  inputMode={fd.mode}
                  type={fd.type}
                  max={fd.type === "date" ? today() : undefined}
                  placeholder={fd.placeholder}
                  aria-invalid={!!errors[fd.k]}
                  className={inputCls}
                />
              )}
              <Err>{errors[fd.k]}</Err>
            </div>
          ))}
        </fieldset>

        {submitError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {submitError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-canopy-300 px-4 py-2.5 text-sm font-semibold text-canopy-800 hover:bg-canopy-100 disabled:opacity-50 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5">
            Cancelar
          </button>
          <button type="submit" disabled={saving} aria-busy={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70">
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
