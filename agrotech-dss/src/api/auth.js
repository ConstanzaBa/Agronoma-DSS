import { request } from "./http.js";

// Rutas públicas del Gateway: /v1/auth/* → servicio Auth.
export const login = (correo, contrasena) =>
  request("/auth/login", { method: "POST", auth: false, body: { correo, contrasena } });

export const register = (payload) =>
  request("/auth/registro", { method: "POST", auth: false, body: payload });

export const getMe = () => request("/auth/me");

export const logout = () => request("/auth/logout", { method: "POST" });
