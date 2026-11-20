import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight, Bell, Check, Copy, Download, FileJson, Gauge, Layers, LayoutDashboard,
  Lock, RefreshCw, Search, Server, ShieldCheck, Terminal, Wifi, Zap,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

/* ───────────────────────── Datos ───────────────────────── */

const BASE_URL = "https://api.agronoma.site/v1";

/** Servicios detrás del gateway. Los hosts salen de Backend.md (sección 5.1). */
const SERVICES = [
  { key: "gateway", title: "Gateway", host: "api.agronoma.site", icon: Server, desc: "Entrada única: autentica, aplica CORS y rate limit, reenvía y arma la fachada /resumen." },
  { key: "auth", title: "Auth", host: "auth.agronoma.site", icon: ShieldCheck, desc: "Identidad de personas y dispositivos." },
  { key: "campo", title: "Campo", host: "campo.agronoma.site", icon: Wifi, desc: "Establecimientos, lotes, sensores, lluvia y clima." },
  { key: "silos", title: "Silos", host: "silos.agronoma.site", icon: Layers, desc: "Stock, humedad y temperatura de silos y silobolsas." },
  { key: "mercado", title: "Mercado", host: "mercado.agronoma.site", icon: Zap, desc: "DSS: cotizaciones, dólar, insumos, margen e índice de venta." },
  { key: "alertas", title: "Alertas", host: "alertas.agronoma.site", icon: Bell, desc: "Alertas, reglas, objetivos de precio y feed SSE." },
];

/** Rutas públicas tal como las ve el cliente: BASE_URL + ruta. */
const ROUTES = {
  gateway: [
    ["GET", "/resumen", "Tablero (fachada): lotes, silos y alertas activas en una sola llamada. Solo personas."],
    ["GET", "/estado", "Estado de cada servicio (`ok` / `degradado`). Solo rol admin."],
  ],
  auth: [
    ["POST", "/auth/registro", "Crea un usuario con rol productor. Pública."],
    ["POST", "/auth/login", "Valida credenciales y devuelve el token. Pública."],
    ["POST", "/auth/logout", "Revoca el token actual."],
    ["GET", "/auth/me", "Datos del usuario autenticado."],
  ],
  campo: [
    ["GET", "/campo/establecimientos", "Lista los establecimientos del usuario (paginado)."],
    ["POST", "/campo/establecimientos", "Crea un establecimiento."],
    ["GET", "/campo/establecimientos/{id}", "Detalle."],
    ["PUT", "/campo/establecimientos/{id}", "Edita."],
    ["DELETE", "/campo/establecimientos/{id}", "Borrado lógico."],
    ["GET", "/campo/establecimientos/{id}/clima", "Clima actual y pronóstico (Open-Meteo)."],
    ["GET", "/campo/establecimientos/{id}/lotes", "Lotes de un establecimiento."],
    ["POST", "/campo/establecimientos/{id}/lotes", "Crea un lote."],
    ["GET", "/campo/lotes", "Todos los lotes del usuario; filtro opcional `establecimiento_id`."],
    ["GET", "/campo/lotes/{id}", "Detalle del lote (estado y última humedad de suelo)."],
    ["PUT", "/campo/lotes/{id}", "Edita."],
    ["DELETE", "/campo/lotes/{id}", "Baja."],
    ["POST", "/campo/lotes/{id}/dispositivos", "Registra un sensor y emite su token (se muestra una sola vez)."],
    ["GET", "/campo/dispositivos/{id}", "Estado del sensor: `activo`, `ultima_conexion_en`, `ultima_secuencia`."],
    ["PATCH", "/campo/dispositivos/{id}", "Activa o desactiva el sensor (`activo`). No toca el token."],
    ["POST", "/campo/dispositivos/{id}/token", "Regenera el token del sensor (se muestra una sola vez; invalida el anterior)."],
    ["POST", "/campo/lecturas", "Sensor: envía una lectura. Solo token de dispositivo; un sensor inactivo recibe 403."],
    ["GET", "/campo/lotes/{id}/lecturas", "Historial paginado con `desde` / `hasta`."],
    ["GET", "/campo/lotes/{id}/lluvia", "Registros de lluvia con `desde` / `hasta`."],
    ["POST", "/campo/lotes/{id}/lluvia", "Registra lluvia (idempotente)."],
    ["GET", "/campo/tipos-cultivo", "Catálogo de cultivos con límite de humedad."],
  ],
  silos: [
    ["GET", "/silos/silos", "Lista los silos del usuario."],
    ["POST", "/silos/silos", "Crea un silo o silobolsa."],
    ["GET", "/silos/silos/{id}", "Detalle."],
    ["PUT", "/silos/silos/{id}", "Edita."],
    ["PUT", "/silos/silos/{id}/mediciones", "Humedad del grano y temperatura del núcleo."],
    ["GET", "/silos/silos/{id}/stock", "Stock actual (entradas − salidas)."],
    ["GET", "/silos/silos/{id}/movimientos", "Historial con `desde` / `hasta`."],
    ["POST", "/silos/silos/{id}/movimientos", "Entrada o salida (idempotente, con bloqueo)."],
  ],
  mercado: [
    ["GET", "/mercado/cotizaciones", "Historial por `tipo_cultivo_id`, `desde`, `hasta`."],
    ["POST", "/mercado/cotizaciones", "Carga manual de cotización. Solo admin."],
    ["GET", "/mercado/cotizaciones/ultima", "Última cotización; dispara la actualización perezosa."],
    ["GET", "/mercado/divisas", "Historial de tipo de cambio (`oficial_bna`, `exportador`)."],
    ["POST", "/mercado/divisas", "Carga manual de tipo de cambio."],
    ["GET", "/mercado/divisas/ultima", "Último tipo de cambio."],
    ["GET", "/mercado/insumos", "Precios de urea, PDA y gasoil."],
    ["POST", "/mercado/insumos", "Carga manual de insumo. Solo admin."],
    ["GET", "/mercado/supuestos-margen/{tipo_cultivo_id}", "Supuestos de rinde y costos del usuario."],
    ["PUT", "/mercado/supuestos-margen/{tipo_cultivo_id}", "Guarda los supuestos."],
    ["GET", "/mercado/margen/{tipo_cultivo_id}", "Margen neto por hectárea en USD y ARS."],
    ["GET", "/mercado/silos/{silo_id}/indice-venta", "Calcula, guarda y devuelve el índice de venta."],
    ["GET", "/mercado/silos/{silo_id}/indice-venta/historial", "Resultados anteriores del índice."],
  ],
  alertas: [
    ["GET", "/alertas/alertas", "Lista del usuario (`estado`, `tipo`, `desde_id`)."],
    ["GET", "/alertas/alertas/feed", "Feed SSE en tiempo real."],
    ["GET", "/alertas/alertas/{id}", "Detalle."],
    ["PATCH", "/alertas/alertas/{id}/atender", "Pasa a `attended`."],
    ["PATCH", "/alertas/alertas/{id}/resolver", "Pasa a `resolved`."],
    ["GET", "/alertas/reglas", "Reglas globales."],
    ["POST", "/alertas/reglas", "Crea una regla. Solo admin."],
    ["PUT", "/alertas/reglas/{id}", "Edita una regla. Solo admin."],
    ["GET", "/alertas/objetivos-precio", "Objetivos de precio del usuario (`activo`)."],
    ["POST", "/alertas/objetivos-precio", "Crea un objetivo (deduplicado por contenido)."],
    ["PUT", "/alertas/objetivos-precio/{id}", "Edita."],
    ["DELETE", "/alertas/objetivos-precio/{id}", "Elimina."],
  ],
};

const TOTAL_ROUTES = Object.values(ROUTES).reduce((n, r) => n + r.length, 0);

const NAV = [
  {
    title: "Convenciones",
    icon: ShieldCheck,
    items: [
      { id: "tokens", label: "Autenticación", meta: "Bearer" },
      { id: "idempotencia", label: "Idempotencia" },
      { id: "fallos", label: "Fallos y límites" },
      { id: "desactualizada", label: "Datos desactualizados" },
      { id: "errores", label: "Errores y paginación" },
      { id: "servicios", label: "Servicios y specs" },
    ],
  },
  {
    title: "Gateway",
    icon: Server,
    items: [
      { id: "gateway-rutas", label: "Rutas" },
      { id: "resumen", method: "GET", label: "/resumen" },
      { id: "estado", method: "GET", label: "/estado" },
    ],
  },
  {
    title: "Auth",
    icon: ShieldCheck,
    items: [
      { id: "auth-rutas", label: "Rutas" },
      { id: "auth-registro", method: "POST", label: "/auth/registro" },
      { id: "auth-login", method: "POST", label: "/auth/login" },
      { id: "auth-sesion", method: "GET", label: "/auth/me · logout" },
    ],
  },
  {
    title: "Campo & Telemetría IoT",
    icon: Wifi,
    items: [
      { id: "campo-rutas", label: "Rutas" },
      { id: "campo-establecimientos", method: "POST", label: "/campo/establecimientos" },
      { id: "campo-lotes", method: "POST", label: "/campo/establecimientos/{id}/lotes" },
      { id: "campo-dispositivos", method: "POST", label: "/campo/lotes/{id}/dispositivos" },
      { id: "campo-dispositivo-estado", method: "PATCH", label: "/campo/dispositivos/{id}" },
      { id: "campo-dispositivo-token", method: "POST", label: "/campo/dispositivos/{id}/token" },
      { id: "campo-lecturas", method: "POST", label: "/campo/lecturas" },
      { id: "campo-lluvia", method: "POST", label: "/campo/lotes/{id}/lluvia" },
      { id: "campo-clima", method: "GET", label: "/campo/establecimientos/{id}/clima" },
    ],
  },
  {
    title: "Silos & Stock",
    icon: Layers,
    items: [
      { id: "silos-rutas", label: "Rutas" },
      { id: "silos-crear", method: "POST", label: "/silos/silos" },
      { id: "silos-mediciones", method: "PUT", label: "/silos/silos/{id}/mediciones" },
      { id: "silos-movimientos", method: "POST", label: "/silos/silos/{id}/movimientos" },
    ],
  },
  {
    title: "Mercado & DSS",
    icon: Zap,
    items: [
      { id: "mercado-rutas", label: "Rutas" },
      { id: "cotizaciones", method: "GET", label: "/mercado/cotizaciones" },
      { id: "divisas-insumos", method: "GET", label: "/mercado/divisas · insumos" },
      { id: "supuestos", method: "PUT", label: "/mercado/supuestos-margen" },
      { id: "margen", method: "GET", label: "/mercado/margen/{id}" },
      { id: "indice-venta", method: "GET", label: "/mercado/silos/{id}/indice-venta" },
      { id: "webhook-cotizaciones", method: "POST", label: "Webhook de cotizaciones" },
    ],
  },
  {
    title: "Alertas & Streaming",
    icon: Bell,
    items: [
      { id: "alertas-rutas", label: "Rutas" },
      { id: "alertas-lista", method: "GET", label: "/alertas/alertas" },
      { id: "alertas-estado", method: "PATCH", label: "/alertas/alertas/{id}/atender" },
      { id: "alertas-feed", method: "SSE", label: "/alertas/alertas/feed" },
      { id: "reglas", method: "POST", label: "/alertas/reglas" },
      { id: "objetivos", method: "POST", label: "/alertas/objetivos-precio" },
    ],
  },
];

/* Ejemplos del panel de código */

const UUID_EJ = "7b89d421-4a30-4e8c-8f12-2c9f6a1d5e03";

const USUARIO_EJ = `{
  "id": 7,
  "nombre": "Lucía",
  "apellido": "Ferreyra",
  "correo": "lucia@campo.com",
  "rol": "productor",
  "profesion": "Productor",
  "telefono": null,
  "activo": true,
  "creado_en": "2026-10-02T11:20:00-03:00",
  "actualizado_en": "2026-10-02T11:20:00-03:00"
}`;

const LLUVIA_EJ = `{
  "id": 512,
  "lote_id": 15,
  "usuario_id": 7,
  "milimetros": 18.5,
  "fecha_registro": "2026-11-13",
  "observacion": "Pluviómetro del lote",
  "clave_idempotencia": "${UUID_EJ}",
  "creado_en": "2026-11-13T19:14:02-03:00"
}`;

const EXAMPLES = {
  movimiento: {
    label: "Salida de silo",
    method: "POST",
    path: "/silos/silos/402/movimientos",
    token: "TU_TOKEN",
    body: {
      direccion: "out",
      toneladas: 28.4,
      fecha_movimiento: "2026-11-13",
      observacion: "Camión AF-382-KZ a Puerto Rosario",
      clave_idempotencia: UUID_EJ,
    },
    responses: [
      {
        code: "200", label: "OK", tone: "ok", title: "Movimiento registrado",
        body: `{
  "id": 3141,
  "silo_id": 402,
  "usuario_id": 7,
  "direccion": "out",
  "toneladas": 28.4,
  "fecha_movimiento": "2026-11-13",
  "observacion": "Camión AF-382-KZ a Puerto Rosario",
  "clave_idempotencia": "${UUID_EJ}",
  "creado_en": "2026-11-13T19:14:02-03:00"
}`,
      },
      {
        code: "409", label: "Conflict", tone: "err", title: "Clave de idempotencia usada en otro silo",
        body: `{
  "codigo": "conflicto",
  "mensaje": "La clave de idempotencia ya se usó en otro silo",
  "detalles": "La clave pertenece al silo 118"
}`,
      },
      {
        code: "422", label: "Unprocessable", tone: "err", title: "La salida supera el stock",
        body: `{
  "codigo": "stock_insuficiente",
  "mensaje": "La salida supera el stock del silo",
  "detalles": { "stock_tn": 12.5 }
}`,
      },
    ],
  },
  lectura: {
    label: "Lectura de sensor",
    method: "POST",
    path: "/campo/lecturas",
    token: "TOKEN_DEL_DISPOSITIVO",
    body: {
      secuencia: 128,
      humedad_suelo_pct: 12.0,
      humedad_aire_pct: 55.4,
      temperatura_c: 24.1,
      precipitacion_mm: 0,
      medido_en: "2026-11-13T19:05:41-03:00",
    },
    responses: [
      {
        code: "201", label: "Created", tone: "ok", title: "Lectura guardada",
        body: `{
  "id": 90412,
  "duplicada": false,
  "actualiza_cache": true
}`,
      },
      {
        code: "200", label: "OK", tone: "ok", title: "Secuencia repetida: no se guarda de nuevo",
        body: `{
  "duplicada": true,
  "secuencia": 128
}`,
      },
      {
        code: "409", label: "Conflict", tone: "err", title: "Misma secuencia con otros datos",
        body: `{
  "codigo": "secuencia_conflicto",
  "mensaje": "Esa secuencia ya existe con otros datos"
}`,
      },
      {
        code: "403", label: "Forbidden", tone: "warn", title: "Sensor inactivo (o inexistente)",
        body: `{
  "codigo": "sin_permiso",
  "mensaje": "Dispositivo inexistente o inactivo"
}`,
      },
      {
        code: "401", label: "Unauthorized", tone: "warn", title: "Token ausente, inválido o regenerado",
        body: `{
  "codigo": "no_autenticado",
  "mensaje": "Token inválido o vencido"
}`,
      },
    ],
  },
  lluvia: {
    label: "Registro de lluvia",
    method: "POST",
    path: "/campo/lotes/15/lluvia",
    token: "TU_TOKEN",
    body: {
      milimetros: 18.5,
      fecha_registro: "2026-11-13",
      observacion: "Pluviómetro del lote",
      clave_idempotencia: UUID_EJ,
    },
    responses: [
      { code: "201", label: "Created", tone: "ok", title: "Lluvia registrada", body: LLUVIA_EJ },
      { code: "200", label: "OK", tone: "ok", title: "Reintento: devuelve el registro existente", body: LLUVIA_EJ },
      {
        code: "409", label: "Conflict", tone: "err", title: "Clave usada en otro lote",
        body: `{
  "codigo": "conflicto",
  "mensaje": "La clave de idempotencia ya se usó en otro lote",
  "detalles": "La clave pertenece al lote 9"
}`,
      },
      {
        code: "422", label: "Unprocessable", tone: "err", title: "Validación",
        body: `{
  "message": "The milimetros field must not be greater than 1000.",
  "errors": {
    "milimetros": ["The milimetros field must not be greater than 1000."]
  }
}`,
      },
    ],
  },
  login: {
    label: "Login",
    method: "POST",
    path: "/auth/login",
    token: null,
    body: { correo: "lucia@campo.com", contrasena: "una-contrasena-larga" },
    responses: [
      {
        code: "200", label: "OK", tone: "ok", title: "Sesión iniciada",
        body: `{
  "token": "9f1c2e…(64 caracteres)",
  "tipo": "Bearer",
  "expira_en": "2026-11-20T19:14:02-03:00",
  "usuario": ${USUARIO_EJ.replace(/\n/g, "\n  ")}
}`,
      },
      {
        code: "401", label: "Unauthorized", tone: "warn", title: "Credenciales inválidas",
        body: `{
  "codigo": "credenciales_invalidas",
  "mensaje": "Correo o contraseña incorrectos"
}`,
      },
      {
        code: "403", label: "Forbidden", tone: "warn", title: "Usuario desactivado",
        body: `{
  "codigo": "usuario_inactivo",
  "mensaje": "El usuario está desactivado"
}`,
      },
    ],
  },
};

/* Generador de ejemplos por lenguaje */

const LANGS = ["cURL", "PHP", "JS Fetch", "Python"];

const phpVal = (v, ind = 0) => {
  const pad = "    ".repeat(ind + 1);
  const end = "    ".repeat(ind);
  if (v === null) return "null";
  if (typeof v === "string") return `'${v.replace(/'/g, "\\'")}'`;
  if (typeof v !== "object") return String(v);
  const body = Object.entries(v).map(([k, x]) => `${pad}'${k}' => ${phpVal(x, ind + 1)},`).join("\n");
  return `[\n${body}\n${end}]`;
};

function buildSample(lang, ex) {
  const url = `${BASE_URL}${ex.path}`;
  const json = JSON.stringify(ex.body, null, 2);
  const tk = ex.token;

  if (lang === "cURL") {
    const headers = [...(tk ? [`Authorization: Bearer ${tk}`] : []), "Content-Type: application/json"];
    return [
      `curl -X ${ex.method} "${url}"`,
      ...headers.map((h) => `  -H "${h}"`),
      `  -d '${json.replace(/\n/g, "\n  ")}'`,
    ].join(" \\\n");
  }

  if (lang === "PHP") {
    return `<?php
$response = Http::${tk ? `withToken('${tk}')->` : ""}timeout(5)
    ->post('${url}', ${phpVal(ex.body, 1)});

$data = $response->json();`;
  }

  if (lang === "JS Fetch") {
    return `const res = await fetch("${url}", {
  method: "${ex.method}",
  headers: {
${tk ? `    Authorization: "Bearer ${tk}",\n` : ""}    "Content-Type": "application/json",
  },
  body: JSON.stringify(${json.replace(/\n/g, "\n  ")}),
  signal: AbortSignal.timeout(5000),
});
const data = await res.json();`;
  }

  const py = json
    .replace(/\bnull\b/g, "None")
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\n/g, "\n    ");
  return `import requests

res = requests.post(
    "${url}",
    headers={
${tk ? `        "Authorization": "Bearer ${tk}",\n` : ""}        "Content-Type": "application/json",
    },
    json=${py},
    timeout=5,
)
print(res.json())`;
}

/** OpenAPI resumido generado desde ROUTES. Las specs completas viven en /docs/api de cada servicio. */
function buildYaml() {
  const byPath = {};
  Object.values(ROUTES).forEach((rows) =>
    rows.forEach(([m, p, d]) => {
      (byPath[p] ||= {})[m.toLowerCase()] = d;
    })
  );
  const lines = [
    "# Resumen generado de las rutas públicas.",
    "# Las specs completas (dedoc/scramble) están en https://<servicio>.agronoma.site/docs/api",
    "openapi: 3.1.0",
    "info:",
    "  title: Agronoma API",
    '  version: "1"',
    "servers:",
    `  - url: ${BASE_URL}`,
    "paths:",
  ];
  Object.entries(byPath).forEach(([p, methods]) => {
    lines.push(`  ${JSON.stringify(p)}:`);
    Object.entries(methods).forEach(([m, d]) => {
      lines.push(`    ${m}:`, `      summary: ${JSON.stringify(d.replace(/`/g, ""))}`, "      responses:", '        "200": { description: OK }');
    });
  });
  return lines.join("\n") + "\n";
}

/* ───────────────────────── Helpers de UI ───────────────────────── */

const METHOD_STYLE = {
  GET: "bg-canopy-100 text-canopy-700 ring-1 ring-canopy-300 dark:bg-transparent dark:text-lime-400 dark:ring-lime-400/40",
  POST: "bg-canopy-700 text-white dark:bg-gold-400 dark:text-canopy-950",
  PUT: "bg-gold-400/30 text-canopy-900 ring-1 ring-gold-400 dark:bg-transparent dark:text-gold-300 dark:ring-gold-400/40",
  PATCH: "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-transparent dark:text-sky-300 dark:ring-sky-400/40",
  DELETE: "bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-transparent dark:text-red-400 dark:ring-red-400/40",
  SSE: "bg-orange-500 text-white",
};

function Method({ m, big }) {
  return (
    <span
      className={`inline-block shrink-0 rounded font-mono font-bold uppercase tracking-widest ${
        big ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[9px]"
      } ${METHOD_STYLE[m] ?? ""}`}
    >
      {m}
    </span>
  );
}

const Code = ({ children }) => (
  <code className="rounded bg-canopy-100 px-1.5 py-0.5 font-mono text-[0.8em] text-canopy-700 dark:border dark:border-gold-400/15 dark:bg-canopy-950/70 dark:text-gold-300">
    {children}
  </code>
);

/** Convierte `texto` entre backticks en <Code> */
const Md = ({ text }) => (
  <>
    {text.split(/(`[^`]+`)/g).map((s, i) =>
      s.startsWith("`") ? <Code key={i}>{s.slice(1, -1)}</Code> : s
    )}
  </>
);

const Label = ({ children }) => (
  <p className="section-label">
    <span className="hidden dark:inline">// </span>
    {children}
  </p>
);

/** Resaltado de sintaxis liviano (strings, claves, números, booleanos) */
const TOKEN = /("(?:[^"\\\n]|\\.)*")(\s*:)?|('[^'\n\\]*')|\b(\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g;
function Highlight({ code }) {
  const out = [];
  let last = 0;
  let k = 0;
  const re = new RegExp(TOKEN.source, "g");
  let m;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    if (m[1]) {
      out.push(<span key={k++} className={m[2] ? "text-gold-300" : "text-lime-300"}>{m[1]}</span>);
      if (m[2]) out.push(m[2]);
    } else if (m[3]) out.push(<span key={k++} className="text-lime-300">{m[3]}</span>);
    else if (m[4]) out.push(<span key={k++} className="text-orange-300">{m[4]}</span>);
    else if (m[5]) out.push(<span key={k++} className="text-sky-300">{m[5]}</span>);
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return <>{out}</>;
}

const Pre = ({ code }) => (
  <pre className="mt-3 overflow-x-auto no-scrollbar rounded-lg bg-canopy-900 p-4 font-mono text-[11.5px] leading-relaxed text-canopy-50 dark:bg-canopy-950">
    <Highlight code={code} />
  </pre>
);

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-canopy-300 transition hover:text-gold-400"
    >
      {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto no-scrollbar rounded-lg border border-canopy-200 dark:border-gold-400/15">
      <table className="w-full min-w-[460px] text-left text-sm">
        <thead>
          <tr className="bg-canopy-100 font-mono text-[10px] uppercase tracking-widest text-canopy-700 dark:bg-canopy-950/70 dark:text-gold-400">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-canopy-200 align-top transition-colors hover:bg-canopy-50 dark:hover:bg-canopy-900/60 dark:border-gold-400/10">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3.5 text-[13px] leading-relaxed text-canopy-800 dark:text-canopy-100">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Type = ({ children, req }) => (
  <span className={`font-mono text-[11px] ${req ? "font-bold text-red-600 dark:text-red-400" : "text-canopy-500 dark:text-canopy-300"}`}>
    {children}
  </span>
);

/** Fila de parámetro: nombre, tipo, descripción */
const R = (name, type, desc, req) => [
  <Code key="n">{name}</Code>,
  <Type key="t" req={req}>{type}{req ? " · req" : ""}</Type>,
  desc,
];

const PARAMS_HEAD = ["Campo", "Tipo / restricción", "Descripción"];

const SubTitle = ({ children }) => (
  <h4 className="mb-3 mt-8 font-mono text-xs font-bold uppercase tracking-widest text-canopy-600 dark:text-gold-400">
    <span className="hidden dark:inline">// </span>
    {children}
  </h4>
);

const P = ({ children }) => (
  <p className="mt-4 text-[15px] leading-relaxed text-canopy-800 dark:text-canopy-200">{children}</p>
);

function Note({ title, children }) {
  return (
    <div className="mt-8 flex gap-4 rounded-lg border border-canopy-300 bg-canopy-100/70 p-5 dark:border-gold-400/25 dark:bg-canopy-950/50">
      <ShieldCheck size={20} className="mt-0.5 shrink-0 text-canopy-600 dark:text-gold-400" />
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-canopy-700 dark:text-gold-400">{title}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-canopy-800 dark:text-canopy-100">{children}</p>
      </div>
    </div>
  );
}

function GroupTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 pt-6">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-canopy-100 text-canopy-600 dark:border dark:border-gold-400/30 dark:bg-transparent dark:text-gold-400">
        <Icon size={17} />
      </span>
      <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-canopy-900 dark:text-white">
        {children}
      </h2>
      <span className="h-px flex-1 bg-canopy-200 dark:bg-gold-400/10" />
    </div>
  );
}

const cardCls =
  "rounded-2xl border border-canopy-200 bg-white p-6 shadow-sm transition hover:shadow-soft sm:p-8 dark:border-gold-400/15 dark:bg-canopy-900/40 dark:hover:shadow-glow";

function Endpoint({ id, method, path, example, onExample, children }) {
  return (
    <section id={id} className={`scroll-mt-32 ${cardCls}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Method m={method} big />
        <h3 className="break-all font-mono text-base font-bold text-canopy-900 sm:text-lg dark:text-white">{path}</h3>
        {example && (
          <button
            onClick={() => onExample(example)}
            className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-canopy-600 transition hover:text-canopy-800 dark:text-gold-400 dark:hover:text-gold-300"
          >
            Ver ejemplo <ArrowRight size={12} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Concept({ id, icon: Icon, title, children }) {
  return (
    <article id={id} className="scroll-mt-32 rounded-lg border border-canopy-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-gold-400/15 dark:bg-canopy-900/40 dark:hover:shadow-glow">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-canopy-100 text-canopy-600 dark:border dark:border-gold-400/30 dark:bg-transparent dark:text-gold-400">
        <Icon size={20} />
      </span>
      <h3 className="mt-6 font-mono text-sm font-bold uppercase tracking-wide text-canopy-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-canopy-700 dark:text-canopy-200">{children}</p>
    </article>
  );
}

/** Tabla con todas las rutas de un servicio */
function RouteCard({ svc }) {
  const s = SERVICES.find((x) => x.key === svc);
  return (
    <section id={`${svc}-rutas`} className={`scroll-mt-32 ${cardCls}`}>
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-canopy-600 dark:text-gold-400">
        Rutas de {s.title} · {ROUTES[svc].length}
      </p>
      <P>{s.desc}</P>
      <div className="mt-5">
        <Table
          head={["Método", "Ruta", "Descripción"]}
          rows={ROUTES[svc].map(([m, p, d]) => [
            <Method key="m" m={m} />,
            <code key="p" className="break-all font-mono text-[12px] text-canopy-900 dark:text-white">{`/v1${p}`}</code>,
            <Md key="d" text={d} />,
          ])}
        />
      </div>
    </section>
  );
}

/** Ventana de código con el mismo marco que DashboardMock */
function CodeFrame({ title, right, children, footer }) {
  return (
    <div className="rounded-2xl border-[6px] border-canopy-800 bg-canopy-900 p-2 shadow-soft dark:border-gold-400/15 dark:bg-canopy-950 dark:shadow-glow">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-canopy-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-canopy-200">
        <span className="flex items-center gap-2">
          <Terminal size={14} className="text-lime-400" />
          {title}
        </span>
        {right}
      </div>
      <div className="rounded-lg bg-canopy-800/90 dark:bg-canopy-900/70">{children}</div>
      {footer && (
        <div className="mt-2 flex items-center justify-between rounded-md bg-canopy-950 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-canopy-300">
          {footer}
        </div>
      )}
    </div>
  );
}

const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
      active ? "bg-gold-400 text-canopy-950" : "text-canopy-300 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const TONE = {
  ok: "bg-lime-400 text-canopy-950",
  err: "bg-red-500 text-white",
  warn: "bg-gold-400 text-canopy-950",
};

/* ───────────────────────── Página ───────────────────────── */

export default function ApiDocs({ dark, onToggle }) {
  const { hash } = useLocation();
  const [lang, setLang] = useState("cURL");
  const [exKey, setExKey] = useState("movimiento");
  const [resp, setResp] = useState(0);
  const [active, setActive] = useState("movimiento");
  const [q, setQ] = useState("");

  // Scroll al llegar desde otra página (/docs#silos-movimientos) o al tope
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  // Resalta en el menú la sección visible
  useEffect(() => {
    const els = NAV.flatMap((g) => g.items.map((i) => document.getElementById(i.id))).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-15% 0px -70% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const nav = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return NAV;
    return NAV.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(t)),
    })).filter((g) => g.items.length);
  }, [q]);

  const go = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  const pickExample = (key) => {
    setExKey(key);
    setResp(0);
  };

  const downloadYaml = () => {
    const url = URL.createObjectURL(new Blob([buildYaml()], { type: "text/yaml" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "openapi.yaml" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Endpoints", value: String(TOTAL_ROUTES), unit: "rutas" },
    { label: "Servicios", value: String(SERVICES.length - 1), unit: "+ gateway" },
    { label: "Timeout", value: "3", unit: "s", note: "Mercado: 5 s" },
    { label: "Spec", value: "3.1", unit: "OpenAPI" },
  ];

  const ex = EXAMPLES[exKey];
  const r = ex.responses[resp] ?? ex.responses[0];
  const sample = buildSample(lang, ex);

  return (
    <>
      <Navbar dark={dark} onToggle={onToggle} />

      {/* ── Cabecera ── */}
      <section className="relative overflow-hidden border-b border-canopy-200 dark:border-gold-400/10">
        <div className="pointer-events-none absolute inset-0 hidden dark:block">
          <div className="absolute -top-40 right-0 h-[420px] w-[700px] rounded-full bg-canopy-700/20 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-[1500px] items-end gap-10 px-5 py-14 lg:grid-cols-[1.3fr_1fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-canopy-300 bg-canopy-100 px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-canopy-600 dark:border-canopy-600/50 dark:bg-transparent dark:text-canopy-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-canopy-600 dark:bg-lime-400" />
              Referencia para desarrolladores · v1
            </span>

            <h1 className="display-title mt-6 text-5xl text-canopy-900 sm:text-6xl dark:text-white">
              Especificación
              <span className="block text-canopy-500 dark:text-gold-400">OpenAPI &amp; Scramble</span>
            </h1>

            <p className="mt-6 max-w-2xl border-canopy-500 bg-canopy-100 px-4 py-2.5 font-mono text-[15px] leading-relaxed text-canopy-800 dark:border-l-2 dark:border-gold-400/40 dark:bg-transparent dark:py-0 dark:text-canopy-200">
              Establecimientos, lotes y sensores, stock de silos con concurrencia segura, precios de granos, dólar e
              insumos, margen por hectárea, índice de venta y alertas en tiempo real. Todo lo que necesitás para
              integrar Agronoma DSS.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={downloadYaml}
                className="inline-flex items-center gap-2 rounded-md bg-canopy-800 px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-white transition hover:bg-canopy-700 dark:bg-gold-400 dark:text-canopy-950 dark:hover:bg-gold-300"
              >
                <Download size={15} /> openapi.yaml
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-canopy-400 px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-canopy-700 transition hover:bg-canopy-100 dark:border-gold-400/30 dark:text-canopy-100 dark:hover:bg-canopy-900"
              >
                <LayoutDashboard size={15} /> Ir al panel
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 divide-x divide-canopy-300 rounded-xl border border-canopy-300 bg-canopy-100/70 py-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 dark:divide-gold-400/10 dark:border-gold-400/15 dark:bg-canopy-900/40">
              {stats.map((s) => (
                <div key={s.label} className="px-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-canopy-600/80 dark:text-canopy-300">
                    {s.label}
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-canopy-800 dark:text-white">
                    {s.value} <span className="text-xs font-normal text-canopy-500 dark:text-canopy-200">{s.unit}</span>
                  </p>
                  <p className="mt-1 flex h-3.5 items-center gap-1 font-mono text-[10px] text-canopy-600 dark:text-canopy-300">
                    {s.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-canopy-200 bg-white px-4 py-3 dark:border-gold-400/15 dark:bg-canopy-900/40">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-canopy-500 dark:text-gold-400">
                Base URL
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-canopy-800 dark:text-canopy-100">{BASE_URL}</code>
              <span className="[&_button]:text-canopy-500 [&_button:hover]:text-canopy-800 dark:[&_button]:text-canopy-300 dark:[&_button:hover]:text-gold-400">
                <CopyBtn text={BASE_URL} />
              </span>
            </div>
          </div>
        </div>

        {/* Entorno de ejecución */}
        <div className="relative border-t border-canopy-200 bg-canopy-100/60 dark:border-gold-400/10 dark:bg-canopy-900/30">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 font-mono text-[11px] text-canopy-700 lg:px-8 dark:text-canopy-200">
            <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-canopy-600 dark:text-gold-400">
              <Server size={13} /> Infraestructura
            </span>
            <span>Laravel · cPanel compartido</span>
            <span>
              Cola de alertas procesada por pedido vía <Code>afterResponse()</Code>
            </span>
            <span className="sm:ml-auto">Una base MySQL por servicio · API Gateway en api.agronoma.site</span>
          </div>
        </div>
      </section>

      {/* ── Navegación móvil ── */}
      <div className="sticky top-[68px] z-30 border-b border-canopy-200 bg-canopy-50/90 backdrop-blur lg:hidden dark:border-gold-400/10 dark:bg-canopy-950/85">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-2.5">
          {NAV.flatMap((g) => g.items).map((i) => (
            <button
              key={i.id}
              onClick={() => go(i.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition ${
                active === i.id
                  ? "border-canopy-600 bg-canopy-600 text-white dark:border-gold-400 dark:bg-gold-400 dark:text-canopy-950"
                  : "border-canopy-300 text-canopy-700 dark:border-gold-400/20 dark:text-canopy-200"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cuerpo: menú · contenido · código ── */}
      <div className="mx-auto grid max-w-[1500px] gap-x-8 px-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[250px_minmax(0,1fr)_430px]">
        {/* Menú lateral */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] max-h-[calc(100vh-108px)] overflow-y-auto no-scrollbar py-10 pr-2">
            <div className="relative mb-6">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-canopy-500 dark:text-canopy-300" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar endpoint..."
                className="w-full rounded-md border border-canopy-300 bg-white py-2.5 pl-9 pr-3 font-mono text-xs text-canopy-900 outline-none transition placeholder:text-canopy-400 focus:border-canopy-600 dark:border-gold-400/20 dark:bg-canopy-900/60 dark:text-white dark:focus:border-gold-400"
              />
            </div>

            <nav className="space-y-7">
              {nav.map((g) => (
                <div key={g.title}>
                  <p className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-canopy-500 dark:text-gold-400">
                    <span className="hidden dark:inline">// </span>
                    {g.title}
                  </p>
                  <ul className="space-y-0.5 border-l border-canopy-200 dark:border-gold-400/10">
                    {g.items.map((i) => (
                      <li key={i.id}>
                        <button
                          onClick={() => go(i.id)}
                          className={`-ml-px flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left font-mono text-[11px] transition ${
                            active === i.id
                              ? "border-canopy-600 bg-canopy-100 font-bold text-canopy-900 dark:border-gold-400 dark:bg-canopy-900 dark:text-gold-400"
                              : "border-transparent text-canopy-700 hover:border-canopy-400 hover:text-canopy-900 dark:text-canopy-200 dark:hover:border-gold-400/50 dark:hover:text-white"
                          }`}
                        >
                          {i.method && <Method m={i.method} />}
                          <span className="truncate">{i.label}</span>
                          {i.meta && (
                            <span className="ml-auto text-[9px] font-normal text-canopy-500 dark:text-canopy-300">{i.meta}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {!nav.length && <p className="font-mono text-xs text-canopy-500 dark:text-canopy-300">Sin resultados.</p>}
            </nav>
          </div>
        </aside>

        {/* Contenido */}
        <main className="min-w-0 space-y-6 py-10 lg:py-14">
          <Label>Convenciones & Gateway</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Concept id="tokens" icon={ShieldCheck} title="Tokens opacos">
              Enviá <Code>{"Authorization: Bearer <token>"}</Code> en todas las rutas, salvo <Code>POST /v1/auth/registro</Code> y{" "}
              <Code>POST /v1/auth/login</Code>. El gateway valida contra <b>auth</b> y cachea los tokens válidos 60 s,
              así que un token revocado con <Code>logout</Code> puede seguir aceptándose hasta 60 s. El token de un
              sensor solo sirve para <Code>POST /v1/campo/lecturas</Code>; en cualquier otra ruta recibe{" "}
              <Code>403 sin_permiso</Code>. Los tokens de sensor se cachean solo 5 s: al regenerarlo, el anterior puede
              seguir aceptándose hasta 5 s y después recibe <Code>401 no_autenticado</Code>.
            </Concept>
            <Concept id="idempotencia" icon={Lock} title="Idempotencia">
              Las altas desde formularios (movimientos de silo, lluvia) llevan <Code>clave_idempotencia</Code>, un UUID
              que genera el cliente: reenviarla devuelve el registro original. Los sensores numeran sus lecturas con{" "}
              <Code>secuencia</Code>. Los objetivos de precio se deduplican por contenido. El gateway nunca reintenta
              un <Code>POST</Code>.
            </Concept>
            <Concept id="fallos" icon={Gauge} title="Fallos y límites">
              El gateway aplica rate limit (<Code>429</Code>), timeout de 3 s por servicio (5 s en mercado) y un circuit
              breaker: tras 5 fallos seguidos rechaza con <Code>503</Code> durante 30 s. Los <Code>GET</Code> se
              reintentan una vez. Las rutas <Code>/interno/*</Code> no se exponen por el gateway.
            </Concept>
            <Concept id="desactualizada" icon={RefreshCw} title="Datos desactualizados">
              Si un proveedor externo falla (Open-Meteo, granos.ar, DolarAPI) se devuelve el último dato guardado con{" "}
              <Code>desactualizada: true</Code>. Las cotizaciones desactualizadas no disparan objetivos de precio. Se
              puede cargar el dato a mano como respaldo.
            </Concept>
          </div>

          <section id="errores" className={`scroll-mt-32 ${cardCls}`}>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-canopy-600 dark:text-gold-400">
              Errores, paginación y fechas
            </p>
            <P>
              Todos los errores de negocio comparten un mismo formato. Los errores de validación (<Code>422</Code>) usan
              el formato estándar de Laravel con <Code>message</Code> y <Code>errors</Code>.
            </P>
            <Pre
              code={`{
  "codigo": "stock_insuficiente",
  "mensaje": "La salida supera el stock del silo",
  "detalles": { "stock_tn": 12.5 }
}`}
            />
            <div className="mt-5">
              <Table
                head={["Estado", "Cuándo"]}
                rows={[
                  [<Code key="a">200 / 201</Code>, "OK / creado."],
                  [<Code key="a">401</Code>, "Falta el token, o es inválido o está vencido."],
                  [<Code key="a">403</Code>, "Sin permiso: rol insuficiente, token de sensor fuera de su ruta o acceso directo a un servicio."],
                  [<Code key="a">404</Code>, "Recurso inexistente o de otro usuario."],
                  [<Code key="a">409</Code>, "Conflicto: clave de idempotencia ajena, secuencia repetida con otros datos, transición de alerta inválida."],
                  [<Code key="a">422</Code>, "Validación o regla de negocio (por ejemplo, stock insuficiente)."],
                  [<Code key="a">429</Code>, "Rate limit del gateway."],
                  [<Code key="a">503</Code>, "Servicio destino caído, sin responder en 3 s o con el circuit breaker abierto."],
                ]}
              />
            </div>
            <SubTitle>Paginación y filtros</SubTitle>
            <P>
              Los listados aceptan <Code>?page=</Code> y <Code>?por_pagina=</Code> y responden{" "}
              <Code>{`{ "data": [...], "meta": { "pagina", "por_pagina", "total", "ultima_pagina" } }`}</Code>. Los
              históricos admiten <Code>?desde=</Code> y <Code>?hasta=</Code>. Las fechas usan ISO 8601 con zona
              horaria (<Code>2026-11-13T19:05:41-03:00</Code>); sin hora, <Code>YYYY-MM-DD</Code>.
            </P>
          </section>

          <section id="servicios" className={`scroll-mt-32 ${cardCls}`}>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-canopy-600 dark:text-gold-400">
              Servicios y especificaciones
            </p>
            <P>
              Desde afuera todo se ve como <Code>{"/v1/{servicio}/{ruta}"}</Code>, por eso algunos nombres se repiten:{" "}
              <Code>/v1/alertas/alertas</Code>, <Code>/v1/silos/silos</Code>. Cada servicio publica su spec OpenAPI 3.1
              (dedoc/scramble) en <Code>/docs/api</Code>.
            </P>
            <div className="mt-5">
              <Table
                head={["Servicio", "Subdominio", "Qué hace"]}
                rows={SERVICES.map((s) => [
                  <Code key="a">{s.key}</Code>,
                  <code key="b" className="font-mono text-[12px]">{s.host}</code>,
                  s.desc,
                ])}
              />
            </div>
          </section>

          {/* ───── Gateway ───── */}
          <GroupTitle icon={Server}>Gateway</GroupTitle>
          <RouteCard svc="gateway" />

          <Endpoint id="resumen" method="GET" path="/v1/resumen">
            <P>
              Fachada del tablero: junta en paralelo los lotes con su estado (<b>campo</b>), los silos (<b>silos</b>) y
              las alertas activas (<b>alertas</b>) en una sola llamada. <b>Degrada, no falla</b>: si un servicio no
              responde, su bloque viene en <Code>null</Code> y la respuesta agrega <Code>"parcial": true</Code>.
            </P>
            <Note title="Solo para personas">
              Un token de sensor recibe <Code>403 sin_permiso</Code> con el mensaje «El resumen es solo para personas».
            </Note>
          </Endpoint>

          <Endpoint id="estado" method="GET" path="/v1/estado">
            <P>
              Consulta <Code>/health/ready</Code> de cada servicio (timeout 3 s). Requiere rol <Code>admin</Code>.
            </P>
            <SubTitle>Respuesta</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("general", "enum", <>
                  <Code>ok</Code> o <Code>degradado</Code> si algún servicio no responde.
                </>),
                R("servicios", "object", "Estado de cada servicio (auth, campo, silos, mercado, alertas)."),
              ]}
            />
            <P>
              También existen <Code>/health/live</Code> y <Code>/health/ready</Code>, públicos y fuera de{" "}
              <Code>/v1</Code>, pensados para un monitor externo.
            </P>
          </Endpoint>

          {/* ───── Auth ───── */}
          <GroupTitle icon={ShieldCheck}>Auth</GroupTitle>
          <RouteCard svc="auth" />

          <Endpoint id="auth-registro" method="POST" path="/v1/auth/registro">
            <P>Alta autoservicio. Crea un usuario con rol <Code>productor</Code>. Ruta pública.</P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("nombre", "string · máx 80", "Nombre.", true),
                R("apellido", "string · máx 80", "Apellido.", true),
                R("correo", "email · máx 150", "Único en el sistema.", true),
                R("contrasena", "string · 8 a 100", "Se guarda con hash; ningún otro servicio la ve.", true),
                R("profesion", "string · máx 40 · opcional", "Ingeniero agrónomo, Productor, Asesor técnico, Contratista, Otro."),
                R("telefono", "string · máx 30 · opcional", "Teléfono de contacto."),
              ]}
            />
            <P>
              Responde <Code>201</Code> con el usuario, <Code>422</Code> si falla la validación o <Code>503</Code> si
              auth no responde.
            </P>
          </Endpoint>

          <Endpoint id="auth-login" method="POST" path="/v1/auth/login" example="login" onExample={pickExample}>
            <P>
              Valida las credenciales y devuelve un token opaco con su vencimiento. Ruta pública.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("correo", "email", "Correo registrado.", true),
                R("contrasena", "string", "Contraseña.", true),
              ]}
            />
            <SubTitle>Respuesta 200</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("token", "string", "Se envía como Bearer en el resto de las rutas."),
                R("tipo", "string", <><Code>Bearer</Code>.</>),
                R("expira_en", "string", "Vencimiento del token."),
                R("usuario", "object", "Usuario autenticado (id, nombre, apellido, correo, rol, profesion, telefono, activo)."),
              ]}
            />
            <P>
              Errores: <Code>401 credenciales_invalidas</Code> y <Code>403 usuario_inactivo</Code>.
            </P>
          </Endpoint>

          <Endpoint id="auth-sesion" method="GET" path="/v1/auth/me">
            <P>
              Devuelve los datos del usuario autenticado, útil para conocer su rol y nombre. Un token de sensor
              recibe <Code>403</Code> («Este token no pertenece a una persona»); un usuario inexistente o desactivado,{" "}
              <Code>401 no_autenticado</Code>.
            </P>
            <SubTitle>POST /v1/auth/logout</SubTitle>
            <P>
              Revoca el token actual y responde <Code>{`{ "mensaje": "Sesión cerrada" }`}</Code>. Por eso se usa un token
              opaco y no un JWT.
            </P>
          </Endpoint>

          {/* ───── Campo ───── */}
          <GroupTitle icon={Wifi}>Campo & Telemetría IoT</GroupTitle>
          <RouteCard svc="campo" />

          <Endpoint id="campo-establecimientos" method="POST" path="/v1/campo/establecimientos">
            <P>
              Crea un establecimiento. <Code>PUT</Code> usa el mismo cuerpo y <Code>DELETE</Code> hace un borrado lógico
              (<Code>{`{ "mensaje": "Establecimiento eliminado" }`}</Code>).
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("nombre", "string · máx 120", "Nombre del establecimiento.", true),
                R("latitud_centro", "number · -90 a 90", "Centro del mapa.", true),
                R("longitud_centro", "number · -180 a 180", "Centro del mapa.", true),
                R("zona_administrativa", "string · máx 150 · opcional", "Localidad, partido o departamento."),
                R("zoom", "integer · 1 a 22 · opcional", "Zoom inicial del mapa (13 por defecto)."),
              ]}
            />
          </Endpoint>

          <Endpoint id="campo-lotes" method="POST" path="/v1/campo/establecimientos/{id}/lotes">
            <P>
              Crea un lote dentro del establecimiento. <Code>PUT /v1/campo/lotes/{"{id}"}</Code> usa el mismo cuerpo.
              El lote guarda en caché su <Code>estado</Code> (<Code>optimal</Code>, <Code>warning</Code>,{" "}
              <Code>critical</Code>) y <Code>ultima_humedad_suelo_pct</Code>.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("nombre", "string · máx 120", "Nombre del lote.", true),
                R("coordenadas", "array · mín 3 pares", <>Polígono <Code>{"[[latitud, longitud], ...]"}</Code>.</>, true),
                R("superficie_ha", "number", "Superficie en hectáreas.", true),
                R("tipo_cultivo_id", "integer · opcional", <>Id de <Code>/v1/campo/tipos-cultivo</Code>.</>),
                R("variedad", "string · máx 80 · opcional", "Variedad sembrada."),
              ]}
            />
          </Endpoint>

          <Endpoint id="campo-dispositivos" method="POST" path="/v1/campo/lotes/{id}/dispositivos">
            <P>
              Registra un sensor en el lote y emite su token con el permiso <Code>lecturas:crear</Code>. El token se
              muestra <b>una sola vez</b>.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("nombre", "string · máx 80", "Nombre del sensor.", true),
                R("latitud", "number · -90 a 90 · opcional", "Posición del sensor."),
                R("longitud", "number · -180 a 180 · opcional", "Posición del sensor."),
              ]}
            />
            <SubTitle>Respuesta 201</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("dispositivo", "object", "Incluye id, identificador_unico, activo, ultima_conexion_en y ultima_secuencia."),
                R("token", "string", "Credencial del sensor."),
                R("permisos", "array", <><Code>["lecturas:crear"]</Code>.</>),
                R("aviso", "string", "Guardalo ahora: no se vuelve a mostrar."),
              ]}
            />
            <P>
              El sensor se crea <b>activo</b>. Requiere token de usuario (<Code>Authorization: Bearer</Code>). Errores:{" "}
              <Code>404 no_encontrado</Code> si el lote no existe o no es tuyo, <Code>422 validacion</Code> si el cuerpo es
              inválido y <Code>503 servicio_no_disponible</Code> («No se pudo emitir el token del sensor») si auth no
              puede emitir el token; en ese caso el sensor no se crea.
            </P>
            <Pre
              code={`curl -X POST "${BASE_URL}/campo/lotes/15/dispositivos" \\
  -H "Authorization: Bearer TU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "nombre": "Sensor norte", "latitud": -31.4201, "longitud": -64.1888 }'`}
            />
          </Endpoint>

          <Endpoint id="campo-dispositivo-estado" method="PATCH" path="/v1/campo/dispositivos/{id}">
            <P>
              Activa o desactiva un sensor. Desactivar <b>no elimina el token</b>: al reactivar, el sensor sigue usando el
              mismo. Mientras está inactivo, <Code>POST /v1/campo/lecturas</Code> responde <Code>403 sin_permiso</Code>.
              Requiere token de usuario; el sensor debe pertenecer a un lote tuyo.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[R("activo", "boolean", <><Code>true</Code> activa, <Code>false</Code> desactiva.</>, true)]}
            />
            <SubTitle>Respuesta 200</SubTitle>
            <P>El dispositivo actualizado (id, lote_id, nombre, identificador_unico, latitud, longitud, activo, ultima_conexion_en, ultima_secuencia).</P>
            <SubTitle>Errores</SubTitle>
            <Table
              head={["Código", "Cuerpo", "Cuándo"]}
              rows={[
                [<Code key="a">401</Code>, <Code key="b">no_autenticado</Code>, "Falta el token o es inválido."],
                [<Code key="c">404</Code>, <Code key="d">no_encontrado</Code>, "El sensor no existe o es de otro usuario."],
                [<Code key="e">422</Code>, <Code key="f">validacion</Code>, <>Falta <Code>activo</Code> o no es booleano.</>],
              ]}
            />
            <Pre
              code={`curl -X PATCH "${BASE_URL}/campo/dispositivos/42" \\
  -H "Authorization: Bearer TU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "activo": false }'`}
            />
          </Endpoint>

          <Endpoint id="campo-dispositivo-token" method="POST" path="/v1/campo/dispositivos/{id}/token">
            <P>
              Regenera el token del sensor: Campo pide uno nuevo a auth y lo devuelve en esta respuesta. El token se
              muestra <b>una sola vez</b> (Campo no lo guarda) y el anterior queda invalidado. Como el gateway cachea los
              tokens de sensor hasta 5 s, el token viejo puede seguir aceptándose durante ese lapso y después recibe{" "}
              <Code>401 no_autenticado</Code>. Sin cuerpo; requiere token de usuario y que el sensor sea de un lote tuyo.
              Funciona también con el sensor inactivo.
            </P>
            <SubTitle>Respuesta 200</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("dispositivo", "object", "El sensor (mismo formato que en el alta)."),
                R("token", "string", "Credencial nueva. No se vuelve a mostrar."),
                R("permisos", "array", <><Code>["lecturas:crear"]</Code>.</>),
                R("aviso", "string", "Recordatorio de guardarlo y de que el anterior deja de servir."),
              ]}
            />
            <SubTitle>Errores</SubTitle>
            <Table
              head={["Código", "Cuerpo", "Cuándo"]}
              rows={[
                [<Code key="a">401</Code>, <Code key="b">no_autenticado</Code>, "Falta el token o es inválido."],
                [<Code key="c">404</Code>, <Code key="d">no_encontrado</Code>, "El sensor no existe o es de otro usuario."],
                [<Code key="e">503</Code>, <Code key="f">servicio_no_disponible</Code>, "auth no pudo emitir el token; el anterior sigue vigente."],
              ]}
            />
            <Pre
              code={`curl -X POST "${BASE_URL}/campo/dispositivos/42/token" \\
  -H "Authorization: Bearer TU_TOKEN"`}
            />
          </Endpoint>

          <Endpoint id="campo-lecturas" method="POST" path="/v1/campo/lecturas" example="lectura" onExample={pickExample}>
            <P>
              Recibe una lectura de sensor. Solo acepta tokens de dispositivo. Es el flujo de mayor volumen, así que
              guarda y responde sin esperar el procesamiento de alertas.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("secuencia", "integer · min 0", "Contador lógico por dispositivo. Debe persistir si el sensor se reinicia.", true),
                R("humedad_suelo_pct", "number · 0 a 100", "Humedad del suelo.", true),
                R("humedad_aire_pct", "number · 0 a 100", "Humedad del aire.", true),
                R("temperatura_c", "number · -60 a 80", "Temperatura.", true),
                R("precipitacion_mm", "number · min 0 · opcional", "Lluvia medida por el sensor."),
                R("medido_en", "date-time", "Reloj del sensor (el servidor guarda además recibido_en).", true),
              ]}
            />
            <SubTitle>Autenticación y errores</SubTitle>
            <P>
              Requiere <Code>Authorization: Bearer &lt;token del sensor&gt;</Code> (el que emitió el alta o la última
              regeneración). Errores: <Code>401 no_autenticado</Code> si el token falta, es inválido o fue regenerado;{" "}
              <Code>403 sin_permiso</Code> («Dispositivo inexistente o inactivo») si el sensor está <b>inactivo</b> — la
              lectura no se guarda; al reactivarlo vuelve a aceptarse con el mismo token; <Code>403 sin_permiso</Code> si se
              usa un token de usuario; <Code>409 secuencia_conflicto</Code>; <Code>422 validacion</Code>.
            </P>
            <Note title="Deduplicación por secuencia">
              Una repetición exacta responde <Code>200 duplicada: true</Code> sin guardar ni publicar de nuevo. La misma
              secuencia con otros datos responde <Code>409 secuencia_conflicto</Code>. Si{" "}
              <Code>secuencia &gt; ultima_secuencia</Code> se actualiza el caché del lote; una lectura vieja se guarda
              pero no lo pisa.
            </Note>
            <SubTitle>GET /v1/campo/lotes/{"{id}"}/lecturas</SubTitle>
            <P>
              Historial paginado. Parámetros: <Code>desde</Code> y <Code>hasta</Code> (date-time), <Code>page</Code> y{" "}
              <Code>por_pagina</Code>.
            </P>
          </Endpoint>

          <Endpoint id="campo-lluvia" method="POST" path="/v1/campo/lotes/{id}/lluvia" example="lluvia" onExample={pickExample}>
            <P>
              Registra lluvia cargada a mano. <Code>GET</Code> en la misma ruta lista los registros con{" "}
              <Code>desde</Code> y <Code>hasta</Code> (formato <Code>YYYY-MM-DD</Code>).
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("milimetros", "number · 0 a 1000", "Lluvia caída.", true),
                R("fecha_registro", "date", "Día de la lluvia.", true),
                R("clave_idempotencia", "uuid", "Los reintentos reutilizan la clave.", true),
                R("observacion", "string · máx 255 · opcional", "Nota libre."),
              ]}
            />
            <P>
              <Code>201</Code> si se crea, <Code>200</Code> si la clave ya existía en este lote y{" "}
              <Code>409 conflicto</Code> si se usó en otro lote.
            </P>
          </Endpoint>

          <Endpoint id="campo-clima" method="GET" path="/v1/campo/establecimientos/{id}/clima">
            <P>
              Clima actual y pronóstico del establecimiento desde <b>Open-Meteo</b>, único proveedor. Si falla, devuelve
              el último registro guardado con <Code>desactualizada: true</Code>.
            </P>
            <SubTitle>Respuesta 200</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("establecimiento_id", "integer", "Establecimiento consultado."),
                R("consultado_en", "string", "Momento de la consulta."),
                R("actual", "object", <><Code>temperatura_c</Code>, <Code>humedad_pct</Code>, <Code>precipitacion_mm</Code>, <Code>viento_kmh</Code>.</>),
                R("pronostico", "array | null", "Pronóstico."),
                R("fuente", "string", <><Code>open-meteo</Code>.</>),
                R("desactualizada", "boolean", "`true` si es el último dato guardado."),
              ]}
            />
            <P>
              Si no hay ningún dato disponible, responde <Code>503 clima_no_disponible</Code>.
            </P>
          </Endpoint>

          {/* ───── Silos ───── */}
          <GroupTitle icon={Layers}>Silos & Stock</GroupTitle>
          <RouteCard svc="silos" />

          <Endpoint id="silos-crear" method="POST" path="/v1/silos/silos">
            <P>
              Crea un silo o silobolsa del usuario. <Code>PUT /v1/silos/silos/{"{id}"}</Code> usa el mismo cuerpo, sin{" "}
              <Code>establecimiento_id</Code>.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("nombre", "string · máx 80", "Nombre del silo.", true),
                R("tipo", "enum", <><Code>silo</Code> o <Code>silobolsa</Code>.</>, true),
                R("capacidad_tn", "number", "Capacidad en toneladas.", true),
                R("establecimiento_id", "integer · min 1", "Solo al crear.", true),
                R("tipo_cultivo_id", "integer · opcional", "Cultivo almacenado."),
                R("temperatura_limite_c", "number · -50 a 99.9 · opcional", "Límite de temperatura (25 por defecto)."),
              ]}
            />
          </Endpoint>

          <Endpoint id="silos-mediciones" method="PUT" path="/v1/silos/silos/{id}/mediciones">
            <P>
              Registra la humedad del grano y la temperatura del núcleo, y publica el evento{" "}
              <Code>silo_temperatura</Code> que puede disparar alertas.
            </P>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("humedad_grano_pct", "number · 0 a 99.99", "Humedad del grano.", true),
                R("temperatura_nucleo_c", "number · -50 a 99.9", "Temperatura del núcleo.", true),
              ]}
            />
          </Endpoint>

          <Endpoint id="silos-movimientos" method="POST" path="/v1/silos/silos/{id}/movimientos" example="movimiento" onExample={pickExample}>
            <P>
              Registra una entrada (<Code>in</Code>) o una salida (<Code>out</Code>). Cada movimiento corre en una
              transacción con bloqueo de fila (<Code>lockForUpdate()</Code>): dos salidas simultáneas no pueden superar
              el stock.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("direccion", "enum", <><Code>in</Code> o <Code>out</Code>.</>, true),
                R("toneladas", "number", "Toneladas del movimiento.", true),
                R("fecha_movimiento", "date", "Día del movimiento.", true),
                R("clave_idempotencia", "uuid", "Los reintentos reutilizan la clave y devuelven el movimiento ya registrado.", true),
                R("observacion", "string · máx 255 · opcional", "Nota libre."),
              ]}
            />
            <Note title="Reglas de negocio">
              Una salida mayor al stock responde <Code>422 stock_insuficiente</Code>; una entrada que supera{" "}
              <Code>capacidad_tn</Code>, <Code>422 capacidad_excedida</Code>. <Code>almacenado_desde</Code> se completa con
              la primera entrada y vuelve a <Code>null</Code> cuando el stock queda en cero. Una clave usada en otro
              silo responde <Code>409 conflicto</Code>.
            </Note>
            <SubTitle>Consultas relacionadas</SubTitle>
            <P>
              <Code>GET /v1/silos/silos/{"{id}"}/movimientos</Code> lista el historial con <Code>desde</Code> y{" "}
              <Code>hasta</Code>; <Code>GET /v1/silos/silos/{"{id}"}/stock</Code> devuelve el stock actual.
            </P>
          </Endpoint>

          {/* ───── Mercado ───── */}
          <GroupTitle icon={Zap}>Mercado & DSS</GroupTitle>
          <RouteCard svc="mercado" />

          <Endpoint id="cotizaciones" method="GET" path="/v1/mercado/cotizaciones">
            <P>
              Historial de precios de granos (soja, maíz, trigo), por ejemplo para el gráfico de 30 días. La pizarra de
              Rosario viene de granos.ar; los valores se guardan en USD y, cuando hay dólar cargado, también en ARS.
            </P>
            <SubTitle>Parámetros de consulta</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("tipo_cultivo_id", "integer · min 1", "Cultivo, del catálogo de campo.", true),
                R("desde", "date · opcional", "Inicio del rango."),
                R("hasta", "date · opcional", "Fin del rango."),
              ]}
            />
            <SubTitle>GET /v1/mercado/cotizaciones/ultima</SubTitle>
            <P>
              Devuelve la última cotización de <Code>tipo_cultivo_id</Code>. Si todavía no hay una con fecha de hoy,
              dispara la <b>actualización perezosa</b>: un solo pedido gana el lock y consulta al proveedor (timeout
              3 s); si falla, no se reintenta durante 30 minutos. Sin datos responde <Code>404 sin_datos</Code>.
            </P>
            <SubTitle>POST /v1/mercado/cotizaciones · solo admin</SubTitle>
            <P>Carga manual (<Code>fuente = manual</Code>), pensada como respaldo si cae la API.</P>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("tipo_cultivo_id", "integer · min 1", "Cultivo.", true),
                R("fecha_cotizacion", "date", "Día de la cotización.", true),
                R("precio_usd_tn", "number", "Precio en USD por tonelada.", true),
                R("mercado_referencia", "enum", <><Code>CBOT</Code> o <Code>ROSARIO</Code>.</>, true),
              ]}
            />
          </Endpoint>

          <Endpoint id="divisas-insumos" method="GET" path="/v1/mercado/divisas">
            <P>
              Historial del tipo de cambio. Parámetros: <Code>tipo</Code> (<Code>oficial_bna</Code> o{" "}
              <Code>exportador</Code>), <Code>desde</Code> y <Code>hasta</Code>. El dólar oficial se consulta a
              DolarAPI; el exportador se carga a mano. <Code>GET /v1/mercado/divisas/ultima</Code> responde{" "}
              <Code>404 sin_datos</Code> si no hay ninguno cargado.
            </P>
            <SubTitle>POST /v1/mercado/divisas</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("tipo", "enum", <><Code>oficial_bna</Code> o <Code>exportador</Code>.</>, true),
                R("fecha", "date", "Día del valor.", true),
                R("valor_ars_usd", "number", "Pesos por dólar.", true),
              ]}
            />
            <SubTitle>GET · POST /v1/mercado/insumos</SubTitle>
            <P>
              Precios de urea, PDA y gasoil, que no tienen API confiable y se cargan a mano (solo admin). El{" "}
              <Code>GET</Code> acepta <Code>insumo</Code> (<Code>urea</Code>, <Code>pda</Code>, <Code>gasoil</Code>),{" "}
              <Code>desde</Code> y <Code>hasta</Code>.
            </P>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("insumo", "enum", <><Code>urea</Code>, <Code>pda</Code> o <Code>gasoil</Code>.</>, true),
                R("fecha", "date", "Día del precio.", true),
                R("precio_usd", "number", "Precio en USD (por tonelada o por litro, según el insumo).", true),
              ]}
            />
          </Endpoint>

          <Endpoint id="supuestos" method="PUT" path="/v1/mercado/supuestos-margen/{tipo_cultivo_id}">
            <P>
              Guarda los supuestos del usuario para un cultivo: sin ellos no hay margen ni la regla{" "}
              <Code>margen</Code> del índice de venta. <Code>GET</Code> en la misma ruta los devuelve.
            </P>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("rinde_tn_ha", "number · máx 9999", "Rinde esperado.", true),
                R("costo_directo_usd_ha", "number · min 0", "Semilla, agroquímicos y labores.", true),
                R("costo_fertilizante_usd_ha", "number · min 0 · opcional", "Fertilizante."),
                R("costo_comercial_pct", "number · 0 a 100 · opcional", "Flete, comisiones y gastos de comercialización."),
                R("retencion_pct", "number · 0 a 100 · opcional", "Dato cargado por el usuario; no se calcula."),
              ]}
            />
          </Endpoint>

          <Endpoint id="margen" method="GET" path="/v1/mercado/margen/{tipo_cultivo_id}">
            <P>
              Calculadora de margen neto por hectárea, en USD y en ARS, con el precio del día. La respuesta incluye los
              datos usados (precio, fecha, dólar, <Code>fuente</Code> y <Code>desactualizada</Code>).
            </P>
            <Pre
              code={`ingreso_usd_ha = precio_usd_tn × rinde_tn_ha × (1 − retencion_pct/100)
costos_usd_ha  = costo_directo + costo_fertilizante + ingreso_bruto × costo_comercial_pct/100
margen_usd_ha  = ingreso_usd_ha − costos_usd_ha
margen_ars_ha  = margen_usd_ha × dolar_del_dia`}
            />
            <P>
              Errores <Code>404</Code>: <Code>sin_datos</Code> (no hay cotización) y <Code>supuestos_no_cargados</Code>.
            </P>
          </Endpoint>

          <Endpoint id="indice-venta" method="GET" path="/v1/mercado/silos/{silo_id}/indice-venta">
            <P>
              Calcula el índice de venta de un silo, lo guarda y lo devuelve. Pide los datos del silo a{" "}
              <b>silos</b> (único llamado síncrono entre servicios, timeout 3 s) y evalúa cinco reglas ponderadas.{" "}
              <Code>puntaje</Code> va de 0 a 100 y <Code>veredicto</Code> es <Code>sell</Code>, <Code>review</Code> o{" "}
              <Code>wait</Code>.
            </P>
            <SubTitle>Reglas aplicadas</SubTitle>
            <Table
              head={["Regla", "Peso", "Subíndice", "Pasa si"]}
              rows={[
                [<Code key="a">margen</Code>, "25", "mercado", "El margen neto por ha es positivo."],
                [<Code key="a">tendencia_precio</Code>, "25", "mercado", "El precio está por encima de su promedio de 30 días (requiere al menos 3 días de cotizaciones)."],
                [<Code key="a">humedad_grano</Code>, "20", "calidad", "La humedad es apta para la entrega."],
                [<Code key="a">temperatura_nucleo</Code>, "15", "almacenamiento", "La temperatura está dentro del límite del silo."],
                [<Code key="a">stock_disponible</Code>, "15", "almacenamiento", "Hay grano en el silo."],
              ]}
            />
            <P>
              Cada regla devuelve <Code>id</Code>, <Code>label</Code>, <Code>weight</Code>, <Code>sub</Code>,{" "}
              <Code>pass</Code>, <Code>detail</Code> y <Code>hint</Code>. Sin datos (cotización, supuestos o mediciones)
              la regla no pasa y el <Code>hint</Code> indica cómo cargarlos. Errores: <Code>404 no_encontrado</Code> y{" "}
              <Code>503 servicio_no_disponible</Code> si silos no responde. El historial está en{" "}
              <Code>/indice-venta/historial</Code>.
            </P>
          </Endpoint>

          <Endpoint id="webhook-cotizaciones" method="POST" path="/webhooks/cotizaciones">
            <P>
              Webhook entrante de cotizaciones. Se llama <b>directamente sobre mercado</b> (no pasa por el gateway):{" "}
              <Code>https://mercado.agronoma.site/api/v1/webhooks/cotizaciones</Code>.
            </P>
            <SubTitle>Procesamiento</SubTitle>
            <Table
              head={["Paso", "Qué pasa"]}
              rows={[
                ["1", <>Verifica la firma HMAC del cuerpo enviada en <Code>X-Firma</Code>. Si no coincide: <Code>401 firma_invalida</Code>.</>],
                ["2", <>Guarda el <Code>event_id</Code> del proveedor (único). Si ya existe responde <Code>200</Code> con <Code>duplicado: true</Code> sin reprocesar.</>],
                ["3", <>Valida y guarda la cotización (<Code>fuente = webhook</Code>); datos inválidos responden <Code>422 validacion</Code>.</>],
                ["4", <>Responde <Code>200</Code> con <Code>{`{ "recibido": true, "duplicado": false }`}</Code> y publica <Code>cotizacion_actualizada</Code>.</>],
              ]}
            />
          </Endpoint>

          {/* ───── Alertas ───── */}
          <GroupTitle icon={Bell}>Alertas & Streaming</GroupTitle>
          <RouteCard svc="alertas" />

          <Endpoint id="alertas-lista" method="GET" path="/v1/alertas/alertas">
            <P>
              Lista las alertas del usuario. También sirve de polling cuando SSE no fluye. El detalle está en{" "}
              <Code>GET /v1/alertas/alertas/{"{id}"}</Code>.
            </P>
            <SubTitle>Parámetros de consulta</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("estado", "enum · opcional", <><Code>active</Code>, <Code>attended</Code> o <Code>resolved</Code>.</>),
                R("tipo", "enum · opcional", <><Code>moisture</Code>, <Code>silo_temp</Code>, <Code>no_rain</Code>, <Code>market</Code> o <Code>price_target</Code>.</>),
                R("desde_id", "integer · min 0 · opcional", "Solo alertas con id mayor (polling incremental)."),
              ]}
            />
            <SubTitle>Tipos de alerta</SubTitle>
            <Table
              head={["Tipo", "Origen", "Severidad típica"]}
              rows={[
                [<Code key="a">moisture</Code>, <Code key="b">lectura_recibida</Code>, "critical, warning"],
                [<Code key="a">no_rain</Code>, <><Code key="b">lectura_recibida</Code> (días sin lluvia)</>, "warning"],
                [<Code key="a">silo_temp</Code>, <Code key="b">silo_temperatura</Code>, "critical, warning"],
                [<Code key="a">market</Code>, <Code key="b">indice_venta_calculado</Code>, "info"],
                [<Code key="a">price_target</Code>, <Code key="b">cotizacion_actualizada</Code>, "info"],
              ]}
            />
            <P>
              Hay una sola alerta activa por tipo y entidad (lote, silo o cultivo); si llega un evento más grave, sube
              la severidad en vez de duplicar.
            </P>
          </Endpoint>

          <Endpoint id="alertas-estado" method="PATCH" path="/v1/alertas/alertas/{id}/atender">
            <P>
              Pasa la alerta a <Code>attended</Code> y completa <Code>atendida_en</Code>.{" "}
              <Code>PATCH /v1/alertas/alertas/{"{id}"}/resolver</Code> la pasa a <Code>resolved</Code> y completa{" "}
              <Code>resuelta_en</Code>. Ambas devuelven la alerta actualizada.
            </P>
            <P>
              <Code>atender</Code> sobre una alerta ya resuelta responde <Code>409 transicion_invalida</Code> («La
              alerta ya está resuelta»).
            </P>
          </Endpoint>

          <Endpoint id="alertas-feed" method="SSE" path="/v1/alertas/alertas/feed">
            <P>
              Canal unidireccional <Code>text/event-stream</Code>: cada alerta se envía como evento con su id. La
              conexión se corta a los 25 s y el navegador reconecta con <Code>Last-Event-ID</Code> sin perder alertas.
              Si el hosting hace buffering y SSE no fluye, usá polling cada 5 s sobre{" "}
              <Code>GET /v1/alertas/alertas?estado=active&amp;desde_id=</Code>.
            </P>
          </Endpoint>

          <Endpoint id="reglas" method="POST" path="/v1/alertas/reglas">
            <P>
              Reglas globales que definen los umbrales de cada tipo. Cualquier usuario puede listarlas con{" "}
              <Code>GET</Code>; crear y editar es solo para <Code>admin</Code>.
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("tipo", "enum", <><Code>moisture</Code>, <Code>silo_temp</Code>, <Code>no_rain</Code>, <Code>market</Code>, <Code>price_target</Code>.</>, true),
                R("severidad", "enum", <><Code>critical</Code>, <Code>warning</Code> o <Code>info</Code>.</>, true),
                R("parametros", "objeto", <>Clave-valor según el tipo: <Code>moisture</Code> → <Code>umbral_menor_pct</Code>; <Code>no_rain</Code> → <Code>dias_minimos</Code>; <Code>silo_temp</Code> → <Code>margen_c</Code>; <Code>market</Code> → <Code>veredictos</Code> (array: sell, review, wait); <Code>price_target</Code> → <Code>enfriamiento_horas</Code>.</>, true),
                R("activa", "boolean · opcional", "Habilita o deshabilita la regla."),
              ]}
            />
            <P>
              <Code>PUT /v1/alertas/reglas/{"{id}"}</Code> acepta <Code>severidad</Code>, <Code>parametros</Code> (obligatorio)
              y <Code>activa</Code>; el tipo no se puede cambiar.
            </P>
          </Endpoint>

          <Endpoint id="objetivos" method="POST" path="/v1/alertas/objetivos-precio">
            <P>
              Crea un objetivo de precio por usuario, por ejemplo «avisame si la soja pasa 300 USD». Cuando{" "}
              <Code>mercado</Code> publica <Code>cotizacion_actualizada</Code>, se evalúan los objetivos del cultivo y se
              genera una alerta <Code>price_target</Code> (<Code>ultimo_disparo_en</Code> evita avisar en cada
              actualización).
            </P>
            <SubTitle>Cuerpo de la petición (JSON)</SubTitle>
            <Table
              head={PARAMS_HEAD}
              rows={[
                R("tipo_cultivo_id", "integer · min 1", "Cultivo a vigilar.", true),
                R("moneda", "enum", <><Code>USD</Code> o <Code>ARS</Code>.</>, true),
                R("direccion", "enum", <><Code>sube</Code>: avisa si pasa el umbral. <Code>baja</Code>: avisa si cae por debajo.</>, true),
                R("umbral", "number · máx 9999999999", "Precio de disparo.", true),
              ]}
            />
            <P>
              Responde <Code>201</Code> al crear, o <Code>200</Code> con el objetivo existente si ya había uno con el
              mismo usuario, cultivo, moneda, dirección y umbral. <Code>PUT</Code> suma el campo{" "}
              <Code>activo</Code>; <Code>GET</Code> acepta <Code>?activo=</Code>; <Code>DELETE</Code> responde{" "}
              <Code>{`{ "mensaje": "Objetivo eliminado" }`}</Code>. Las cotizaciones desactualizadas no disparan
              objetivos.
            </P>
          </Endpoint>
        </main>

        {/* Panel de código */}
        <aside className="pb-14 lg:col-start-2 xl:col-start-3 xl:py-14 xl:pb-0">
          <div className="space-y-6 xl:sticky xl:top-[92px] xl:max-h-[calc(100vh-108px)] xl:overflow-y-auto no-scrollbar xl:px-1 xl:py-1">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(EXAMPLES).map(([k, e]) => (
                <button
                  key={k}
                  onClick={() => pickExample(k)}
                  className={`rounded-full border px-3 py-1 font-mono text-[11px] transition ${
                    exKey === k
                      ? "border-canopy-600 bg-canopy-600 text-white dark:border-gold-400 dark:bg-gold-400 dark:text-canopy-950"
                      : "border-canopy-300 text-canopy-700 hover:border-canopy-500 dark:border-gold-400/20 dark:text-canopy-200"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <CodeFrame
              title={`request // ${ex.method} ${ex.path}`}
              right={
                <div className="flex gap-1">
                  {LANGS.map((l) => (
                    <Tab key={l} active={lang === l} onClick={() => setLang(l)}>
                      {l}
                    </Tab>
                  ))}
                </div>
              }
              footer={
                <>
                  <span>Timeout 5000 ms</span>
                  <CopyBtn text={sample} />
                </>
              }
            >
              <pre className="overflow-x-auto no-scrollbar p-4 font-mono text-[11.5px] leading-relaxed text-canopy-50">
                <Highlight code={sample} />
              </pre>
            </CodeFrame>

            <CodeFrame
              title="response"
              right={
                <div className="flex gap-1">
                  {ex.responses.map((x, i) => (
                    <Tab key={x.code} active={resp === i} onClick={() => setResp(i)}>
                      {x.code}
                    </Tab>
                  ))}
                </div>
              }
              footer={
                <>
                  <span>{r.title}</span>
                  <span className="text-lime-400">application/json</span>
                </>
              }
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${TONE[r.tone]}`}>
                  {r.code} {r.label}
                </span>
              </div>
              <pre className="overflow-x-auto no-scrollbar p-4 font-mono text-[11.5px] leading-relaxed text-canopy-50">
                <Highlight code={r.body} />
              </pre>
            </CodeFrame>

            <div className="rounded-xl border border-canopy-200 bg-white p-5 dark:border-gold-400/15 dark:bg-canopy-900/40">
              <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-canopy-800 dark:text-white">
                <FileJson size={15} className="text-canopy-600 dark:text-gold-400" /> Eventos y contratos
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-canopy-700 dark:text-canopy-200">
                Los servicios publican <Code>lectura_recibida</Code>, <Code>silo_temperatura</Code>,{" "}
                <Code>indice_venta_calculado</Code> y <Code>cotizacion_actualizada</Code>, cada uno con su JSON Schema
                versionado. Las specs completas de cada servicio están en <Code>/docs/api</Code>.
              </p>
              <button
                onClick={downloadYaml}
                className="mt-4 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-canopy-600 transition hover:text-canopy-800 dark:text-gold-400 dark:hover:text-gold-300"
              >
                Descargar openapi.yaml <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </>
  );
}
