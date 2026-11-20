// Sesión real contra el Gateway (Bearer token emitido por Auth).
// "Recordarme" → localStorage; de lo contrario sessionStorage.
const KEY = "agronoma-session";

function read(store) {
  try {
    const raw = store.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isExpired(s) {
  const t = s?.expiraEn ? Date.parse(s.expiraEn) : NaN;
  return Number.isFinite(t) && t <= Date.now();
}

/**
 * `primer_ingreso_pendiente` de una respuesta de Auth (login o /auth/me): raíz o dentro de `usuario`.
 * Devuelve true | false, o undefined si la respuesta no lo informa.
 */
export const readPending = (data) => {
  const v = data?.primer_ingreso_pendiente ?? data?.usuario?.primer_ingreso_pendiente;
  return typeof v === "boolean" ? v : undefined;
};
export const readPendingFlag = (data) => readPending(data) === true;

/**
 * Usuario normalizado a partir de la respuesta de login o /auth/me, con `rol` siempre en el objeto usuario
 * (el rol puede llegar en la raíz o dentro de `usuario`). Idempotente.
 */
export function normalizeUser(data) {
  if (!data || typeof data !== "object") return null;
  const user = data.usuario && typeof data.usuario === "object" ? data.usuario : data;
  const { primer_ingreso_pendiente: _p, usuario: _u, ...rest } = user; // el indicador vive en la sesión, no en el usuario
  const rol = data.rol ?? user.rol ?? null;
  return { ...rest, rol };
}

/** Guarda la sesión a partir de la respuesta de POST /v1/auth/login (incluye primer_ingreso_pendiente). */
export function signIn(data, remember = true) {
  const { token, expira_en } = data;
  const usuario = normalizeUser(data);
  signOut();
  const store = remember ? localStorage : sessionStorage;
  try {
    store.setItem(
      KEY,
      JSON.stringify({
        token,
        expiraEn: expira_en ?? null,
        usuario: usuario ?? null,
        primerIngresoPendiente: readPendingFlag(data),
      })
    );
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Sesión vigente ({ token, expiraEn, usuario }) o null. Limpia si expiró. */
export function getSession() {
  const s = read(localStorage) ?? read(sessionStorage);
  if (!s?.token) return null;
  if (isExpired(s)) {
    signOut();
    return null;
  }
  return s;
}

export const getToken = () => getSession()?.token ?? null;
export const getUser = () => getSession()?.usuario ?? null;

/** Actualiza solo el usuario (p. ej. tras GET /auth/me) conservando token y almacenamiento. Acepta la respuesta cruda. */
export function setUser(data) {
  const usuario = normalizeUser(data);
  for (const store of [localStorage, sessionStorage]) {
    const s = read(store);
    if (!s) continue;
    try {
      store.setItem(KEY, JSON.stringify({ ...s, usuario }));
    } catch {
      /* noop */
    }
  }
}

/** Actualiza solo el indicador de primer ingreso pendiente, conservando token y usuario. */
export function setPendingFirstLogin(pending) {
  for (const store of [localStorage, sessionStorage]) {
    const s = read(store);
    if (!s) continue;
    try {
      store.setItem(KEY, JSON.stringify({ ...s, primerIngresoPendiente: !!pending }));
    } catch {
      /* noop */
    }
  }
}

export const isFirstLoginPending = () => getSession()?.primerIngresoPendiente === true;

/**
 * Aplica una respuesta de GET /auth/me a la sesión: usuario (con rol) e indicador de primer ingreso.
 * Devuelve el usuario normalizado.
 */
export function syncFromMe(data) {
  const usuario = normalizeUser(data);
  setUser(usuario);
  const pending = readPending(data);
  if (pending !== undefined) setPendingFirstLogin(pending);
  return usuario;
}

// Roles del contrato. El rol viene del backend (login / GET /auth/me); aquí solo se usa para mostrar u ocultar UI.
export const ROLE_LABELS = {
  admin: "Administrador",
  productor: "Productor",
  ingeniero_agronomo: "Ingeniero agrónomo",
  asesor_tecnico: "Asesor técnico",
  contratista: "Contratista",
  otro: "Otro",
};
export const EMPLOYEE_ROLES = ["productor", "ingeniero_agronomo", "asesor_tecnico", "contratista", "otro"];
export const KNOWN_ROLES = ["admin", ...EMPLOYEE_ROLES];

/** Rol válido del usuario, o null si falta o no es uno del contrato (no se inventan roles). */
export const roleOf = (user) => (KNOWN_ROLES.includes(user?.rol) ? user.rol : null);
/** Único administrador de la cuenta. Todo lo demás (empleado o rol desconocido) se trata con el mínimo de privilegios. */
export const isAdminUser = (user) => roleOf(user) === "admin";
export const isEmployeeUser = (user) => EMPLOYEE_ROLES.includes(roleOf(user));
export const getRole = () => roleOf(getUser());
export const isAdmin = () => isAdminUser(getUser());
export const isEmployee = () => isEmployeeUser(getUser());

/** Elimina toda la información de sesión local. */
export function signOut() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
