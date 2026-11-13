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

/** Guarda la sesión a partir de la respuesta de POST /v1/auth/login. */
export function signIn({ token, expira_en, usuario }, remember = true) {
  signOut();
  const store = remember ? localStorage : sessionStorage;
  try {
    store.setItem(KEY, JSON.stringify({ token, expiraEn: expira_en ?? null, usuario: usuario ?? null }));
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

/** Actualiza solo el usuario (p. ej. tras GET /auth/me) conservando token y almacenamiento. */
export function setUser(usuario) {
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

/** Elimina toda la información de sesión local. */
export function signOut() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
