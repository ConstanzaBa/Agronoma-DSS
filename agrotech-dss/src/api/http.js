import { getToken, signOut } from "../auth.js";

// Única base URL del frontend: el Gateway. Definida en .env (VITE_API_URL).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const PREFIX = "/v1";

export class ApiError extends Error {
  constructor(status, body, message) {
    super(message);
    this.status = status; // 0 = error de red / configuración
    this.code = body?.codigo ?? null;
    // Errores de validación 422 de Laravel: { campo: "mensaje" }
    // Silos/otros servicios responden { codigo: "validacion", detalles: { campo: [msgs] } }; Laravel estándar, { errors }.
    const errs = body?.errors ?? (body?.codigo === "validacion" ? body.detalles : null);
    this.fields =
      errs && typeof errs === "object"
        ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
        : null;
  }
}

/** URL absoluta de una ruta pública del Gateway (sin el prefijo /v1), p. ej. "/alertas/alertas/feed". */
export function apiUrl(path) {
  if (!BASE) throw new ApiError(0, null, "Falta configurar VITE_API_URL.");
  return `${BASE}${PREFIX}${path}`;
}

export function endSession() {
  signOut();
  if (window.location.pathname !== "/login") window.location.replace("/login");
}

/**
 * Llama al Gateway. `path` es la ruta pública sin el prefijo /v1, p. ej. "/auth/login".
 * `auth: false` omite el token y no dispara el cierre de sesión ante 401 (login/registro).
 */
export async function request(path, { method = "GET", body, auth = true, signal } = {}) {
  if (!BASE) throw new ApiError(0, null, "Falta configurar VITE_API_URL.");

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${PREFIX}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError(0, null, "No se pudo conectar con el servidor. Revisá tu conexión.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!res.ok) {
    // 401: token ausente/vencido/inválido → sesión terminada.
    // 403: sin permiso; si la cuenta fue desactivada también se cierra la sesión.
    if (auth && (res.status === 401 || (res.status === 403 && data?.codigo === "usuario_inactivo"))) endSession();
    throw new ApiError(res.status, data, data?.mensaje ?? data?.message ?? `Error ${res.status}`);
  }
  return data;
}
