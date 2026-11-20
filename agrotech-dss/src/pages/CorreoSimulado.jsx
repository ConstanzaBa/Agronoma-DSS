import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, MailOpen, MailX } from "lucide-react";
import AuthLayout, { primaryBtn } from "../components/auth/AuthLayout.jsx";
import { getCorreoSimulado } from "../api/auth.js";

/**
 * Bandeja de demostración: GET /v1/auth/correo-simulado/{token} (pública).
 * 404 → la función está desactivada, o el token venció / ya se completó el primer ingreso.
 * El contrato no detalla el cuerpo de la respuesta: se muestran los campos de texto que traiga, sin asumir nombres.
 */
const LABELS = { para: "Para", destinatario: "Para", correo: "Para", asunto: "Asunto", cuerpo: "Mensaje", mensaje: "Mensaje", contrasena_temporal: "Contraseña temporal", expira_en: "Vence" };

export default function CorreoSimulado({ dark, onToggle }) {
  const { token } = useParams();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    getCorreoSimulado(token, ctrl.signal)
      .then((data) => setState({ status: "ok", data: data?.correo_simulado ?? data }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: err.status === 404 ? "notfound" : "error", msg: err.message });
      });
    return () => ctrl.abort();
  }, [token]);

  const entries =
    state.status === "ok" && state.data && typeof state.data === "object"
      ? Object.entries(state.data).filter(([k, v]) => k !== "token" && v != null && typeof v !== "object")
      : [];

  return (
    <AuthLayout
      dark={dark}
      onToggle={onToggle}
      title="Correo simulado"
      subtitle="Bandeja de demostración. En producción este mensaje llega a tu correo real."
      footer={<Link to="/login" className="font-bold text-canopy-600 underline-offset-4 hover:underline dark:text-gold-400">Ir a iniciar sesión</Link>}
    >
      {state.status === "loading" && (
        <p className="flex items-center gap-2 font-mono text-sm text-canopy-700 dark:text-canopy-200">
          <Loader2 size={16} className="animate-spin" /> Abriendo correo...
        </p>
      )}

      {state.status === "notfound" && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-5 font-mono text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          <p className="flex items-center gap-2 text-sm font-bold">
            <MailX size={18} /> Correo no disponible
          </p>
          <p className="mt-2">
            La bandeja de demostración está desactivada, el enlace venció o ya completaste tu primer ingreso. Usá la contraseña
            temporal que recibiste para iniciar sesión.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 p-4 font-mono text-xs text-red-600 dark:text-red-400">
          {state.msg || "No se pudo abrir el correo."}
        </div>
      )}

      {state.status === "ok" && (
        <div className="rounded-md border border-canopy-300 bg-white p-5 dark:border-gold-400/20 dark:bg-canopy-900/60">
          <p className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-canopy-600 dark:text-gold-400">
            <MailOpen size={16} /> Mensaje recibido
          </p>
          {entries.length === 0 ? (
            <p className="font-mono text-xs text-canopy-600 dark:text-canopy-300">El correo no trajo contenido para mostrar.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              {entries.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-canopy-500 dark:text-canopy-400">{LABELS[k] ?? k.replace(/_/g, " ")}</dt>
                  <dd className={`mt-0.5 whitespace-pre-wrap break-words text-canopy-900 dark:text-white ${k === "contrasena_temporal" ? "font-mono font-bold" : ""}`}>{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
          <Link to="/login" className={`${primaryBtn} mt-5`}>
            Iniciar sesión
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
