import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useTheme } from "./hooks.js";
import { getSession } from "./auth.js";
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
  return session ? children : <Navigate to="/login" replace />;
}

/** Login/registro: con sesión activa se va directo al panel. */
function GuestOnly({ children }) {
  return getSession() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <DialogProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home dark={dark} onToggle={toggle} />} />
        <Route path="/login" element={<GuestOnly><Login dark={dark} onToggle={toggle} /></GuestOnly>} />
        <Route path="/registro" element={<GuestOnly><Register dark={dark} onToggle={toggle} /></GuestOnly>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard dark={dark} onToggle={toggle} /></RequireAuth>} />
        <Route path="/docs" element={<ApiDocs dark={dark} onToggle={toggle} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </DialogProvider>
  );
}
