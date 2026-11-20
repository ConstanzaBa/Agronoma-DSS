import { getToken, setPendingFirstLogin, signOut } from "../auth.js";

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

// Códigos de error del backend/Gateway con un mensaje claro para la persona (el texto técnico del backend no se muestra).
const MENSAJES_CODIGO = {
  sin_cuenta: "Tu usuario ya no pertenece a ninguna cuenta. Iniciá sesión nuevamente o consultá al administrador.",
  sin_permiso: "No tenés permiso para realizar esta acción.",
  rol_invalido: "Tu rol no está habilitado para usar esta función. Consultá al administrador de tu cuenta.",
  sin_estancia: "Todavía no tenés una estancia asignada. Consultá al administrador de tu cuenta.",
  dato_global: "Los datos de mercado son globales y no se cargan desde una cuenta.",
  reglas_globales: "Las reglas de alerta son globales del sistema y no se pueden modificar desde tu cuenta.",
  establecimiento_invalido: "El establecimiento elegido no pertenece a tu cuenta. Elegí otro e intentá de nuevo.",
  servicio_no_disponible: "El servicio no está disponible en este momento. Intentá de nuevo en unos minutos.",
};

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
    // 403 sin_cuenta (Gateway): el usuario ya no pertenece a ninguna cuenta (p. ej. empleado dado de baja) → sin acceso.
    if (auth && (res.status === 401 || (res.status === 403 && (data?.codigo === "usuario_inactivo" || data?.codigo === "sin_cuenta")))) endSession();
    // El Gateway bloquea la navegación autenticada mientras el primer ingreso está pendiente.
    // SUPUESTO: lo informa con 403 y codigo "primer_ingreso_pendiente" (o el indicador homónimo en el cuerpo).
    if (auth && res.status === 403 && (data?.codigo === "primer_ingreso_pendiente" || data?.primer_ingreso_pendiente === true)) {
      setPendingFirstLogin(true);
      if (window.location.pathname !== "/primer-ingreso") window.location.replace("/primer-ingreso");
    }
    // Mensaje entendible común para los códigos de permisos/contexto (los módulos pueden afinarlo después).
    const amigable = [403, 422, 503].includes(res.status) ? MENSAJES_CODIGO[data?.codigo] : null;
    throw new ApiError(res.status, data, amigable ?? data?.mensaje ?? data?.message ?? `Error ${res.status}`);
  }
  return data;
}
