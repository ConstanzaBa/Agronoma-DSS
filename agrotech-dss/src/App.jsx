import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import Contratacion from "./pages/Contratacion.jsx";
import CorreoSimulado from "./pages/CorreoSimulado.jsx";
import PrimerIngreso from "./pages/PrimerIngreso.jsx";
import { useTheme } from "./hooks.js";
import { getSession, isFirstLoginPending } from "./auth.js";
import { endSession } from "./api/http.js";
import { DialogProvider } from "./components/dialog/DialogProvider.jsx";

/** Ruta privada: sin sesión vigente no se monta la página (y por lo tanto no se dispara ninguna llamada al Gateway). */
function RequireAuth({ children }) {
  const session = getSession();
  const expiraEn = session?.expiraEn;
  // Si el token vence con la página abierta, se cierra la sesión y se vuelve al login.
  useEffect(() => {
    const ms = expiraEn ? Date.parse(expiraEn) - Date.now() : NaN;
    if (!(ms > 0)) return;
    const t = setTimeout(endSession, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [expiraEn]);
  if (!session) return <Navigate to="/login" replace />;
  // Primer ingreso pendiente: no se permite la navegación normal hasta completarlo.
  if (isFirstLoginPending()) return <Navigate to="/primer-ingreso" replace />;
  return children;
}

/** Primer ingreso: requiere sesión con el primer ingreso realmente pendiente; si no, va al panel. */
function RequireFirstLogin({ children }) {
  const expiraEn = getSession()?.expiraEn;
  useEffect(() => {
    const ms = expiraEn ? Date.parse(expiraEn) - Date.now() : NaN;
    if (!(ms > 0)) return;
    const t = setTimeout(endSession, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [expiraEn]);
  if (!getSession()) return <Navigate to="/login" replace />;
  if (!isFirstLoginPending()) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Login / contratación / registro de empleados: con sesión activa se va al panel (o al primer ingreso). */
function GuestOnly({ children }) {
  if (!getSession()) return children;
  return <Navigate to={isFirstLoginPending() ? "/primer-ingreso" : "/dashboard"} replace />;
}

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <DialogProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home dark={dark} onToggle={toggle} />} />
        <Route path="/login" element={<GuestOnly><Login dark={dark} onToggle={toggle} /></GuestOnly>} />
        <Route path="/contratacion" element={<GuestOnly><Contratacion dark={dark} onToggle={toggle} /></GuestOnly>} />
        <Route path="/registro" element={<GuestOnly><Register dark={dark} onToggle={toggle} /></GuestOnly>} />
        <Route path="/correo-simulado/:token" element={<CorreoSimulado dark={dark} onToggle={toggle} />} />
        <Route path="/primer-ingreso" element={<RequireFirstLogin><PrimerIngreso dark={dark} onToggle={toggle} /></RequireFirstLogin>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard dark={dark} onToggle={toggle} /></RequireAuth>} />
        <Route path="/docs" element={<ApiDocs dark={dark} onToggle={toggle} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </DialogProvider>
  );
}
