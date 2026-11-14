import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import { useTheme } from "./hooks.js";

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home dark={dark} onToggle={toggle} />} />
        <Route path="/login" element={<Login dark={dark} onToggle={toggle} />} />
        <Route path="/registro" element={<Register dark={dark} onToggle={toggle} />} />
        <Route path="/dashboard" element={<Dashboard dark={dark} onToggle={toggle} />} />
        <Route path="/docs" element={<ApiDocs dark={dark} onToggle={toggle} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
