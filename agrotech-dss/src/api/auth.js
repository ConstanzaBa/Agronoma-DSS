import { request } from "./http.js";

// Rutas del Gateway: /v1/auth/* → servicio Auth. El navegador nunca llama a Auth directamente.

export const login = (correo, contrasena) =>
  request("/auth/login", { method: "POST", auth: false, body: { correo, contrasena } });

/** Contratación: crea cuenta + plan + administrador único. plan ∈ core | pro | enterprise. */
export const contratar = ({ nombre, apellido, correo, plan }) =>
  request("/auth/contratacion", { method: "POST", auth: false, body: { nombre, apellido, correo, plan } });

/** Solo demo. Público. 404 si la función está desactivada; el token vence y deja de servir tras el primer ingreso. */
export const getCorreoSimulado = (token, signal) =>
  request(`/auth/correo-simulado/${encodeURIComponent(token)}`, { auth: false, signal });

/**
 * Registro EXCLUSIVO de empleados. Nunca se envía rol=admin ni IDs de cuenta/usuario/empleado/estancia:
 * la pertenencia la resuelve el backend a partir de codigo_estancia.
 */
export const register = ({ codigo_estancia, rol, nombre, apellido, correo, contrasena, profesion }) => {
  const body = { codigo_estancia, rol, nombre, apellido, correo, contrasena };
  if (profesion) body.profesion = profesion; // dato personal opcional, no equivale al rol
  return request("/auth/registro", { method: "POST", auth: false, body });
};

export const getMe = () => request("/auth/me");

export const logout = () => request("/auth/logout", { method: "POST" });

/**
 * Primer ingreso: completa datos personales y cambia la contraseña temporal.
 * SUPUESTO (el contrato no detalla el cuerpo): contrasena_actual (la temporal), contrasena (la nueva) y
 * los datos personales nombre / apellido / telefono / profesion. Si el backend usa otros nombres, se ajusta solo aquí.
 */
export const primerIngreso = ({ nombre, apellido, telefono, profesion, contrasena_actual, contrasena }) =>
  request("/auth/primer-ingreso", {
    method: "POST",
    body: { nombre, apellido, telefono: telefono || null, profesion: profesion || null, contrasena_actual, contrasena },
  });

export const getPerfil = (signal) => request("/auth/perfil", { signal });

/** Datos personales previstos: nombre, apellido, teléfono, profesión (el correo no se cambia). */
export const updatePerfil = ({ nombre, apellido, telefono, profesion }) =>
  request("/auth/perfil", {
    method: "PUT",
    body: { nombre, apellido, telefono: telefono || null, profesion: profesion || null },
  });
