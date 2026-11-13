import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

/**
 * Modal propio que reemplaza window.alert / window.confirm / window.prompt.
 * No tiene relación con las alertas del backend (useAlertas): es solo UI.
 *
 *   const dialog = useDialog();
 *   await dialog.alert({ variant: "error", title: "No se pudo guardar", message: "…" });
 *   if (await dialog.confirm({ variant: "warning", title, message, confirmText: "Resolver" })) { … }
 *   const name = await dialog.prompt({ title, message, defaultValue }); // string | null
 *
 * variant: "success" | "error" | "warning" | "info". Si se abre otro diálogo mientras hay uno visible, queda en cola.
 */
const DialogContext = createContext(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog debe usarse dentro de <DialogProvider>.");
  return ctx;
}

const VARIANTS = {
  success: { icon: CheckCircle2, ring: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400", title: "Listo" },
  error: { icon: XCircle, ring: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400", title: "Ocurrió un error" },
  warning: { icon: AlertTriangle, ring: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", title: "Atención" },
  info: { icon: HelpCircle, ring: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400", title: "Información" },
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogProvider({ children }) {
  const [current, setCurrent] = useState(null); // { kind, ...opts, resolve }
  const queue = useRef([]);
  const seq = useRef(0);

  const next = useCallback(() => setCurrent(queue.current.shift() ?? null), []);

  const open = useCallback(
    (kind, opts) =>
      new Promise((resolve) => {
        const item = { kind, ...opts, resolve, id: ++seq.current };
        setCurrent((cur) => {
          if (cur) {
            queue.current.push(item);
            return cur;
          }
          return item;
        });
      }),
    []
  );

  const api = useMemo(
    () => ({
      alert: (o = {}) => open("alert", o).then(() => undefined),
      confirm: (o = {}) => open("confirm", o),
      prompt: (o = {}) => open("prompt", o),
    }),
    [open]
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={current.id} item={current} onDone={next} />}
    </DialogContext.Provider>
  );
}

function DialogView({ item, onDone }) {
  const { kind, variant = kind === "confirm" ? "warning" : "info" } = item;
  const v = VARIANTS[variant] ?? VARIANTS.info;
  const Icon = v.icon;
  const uid = useId();
  const titleId = `${uid}-t`;
  const descId = `${uid}-d`;
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const okRef = useRef(null);
  const cancelRef = useRef(null);
  const closed = useRef(false); // bloquea doble resolución (doble clic, Enter repetido)
  const [value, setValue] = useState(item.defaultValue ?? "");
  const [shake, setShake] = useState(false);

  const finish = useCallback(
    (result) => {
      if (closed.current) return;
      closed.current = true;
      item.resolve(result);
      onDone();
    },
    [item, onDone]
  );

  const cancelValue = kind === "alert" ? undefined : kind === "confirm" ? false : null;
  const cancel = useCallback(() => finish(cancelValue), [finish, cancelValue]);

  const accept = () => {
    if (kind === "prompt") {
      const t = value.trim();
      if (item.required !== false && !t) return setShake(true);
      return finish(t);
    }
    finish(kind === "confirm" ? true : undefined);
  };

  // Foco inicial (en confirmaciones destructivas, el botón seguro) y restauración al cerrar.
  useEffect(() => {
    const prev = document.activeElement;
    const target = kind === "prompt" ? inputRef.current : kind === "confirm" && item.danger ? cancelRef.current : okRef.current;
    target?.focus();
    if (kind === "prompt") target?.select?.();
    const lock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = lock;
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teclado: Esc cancela; Tab queda atrapado dentro del modal. Se escucha en captura para que
  // un modal subyacente (p. ej. Carga manual) no reciba el mismo Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      } else if (e.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!panelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [cancel]);

  const confirmCls = item.danger
    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-400"
    : "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-400";
  const btnBase = "rounded-lg px-5 py-2.5 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f1b2c]";

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
    >
      <div
        ref={panelRef}
        role={kind === "alert" && variant === "error" ? "alertdialog" : kind === "confirm" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={item.message ? descId : undefined}
        className="w-full max-w-md rounded-2xl border border-canopy-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1b2c]"
      >
        <div className="flex items-start gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${v.ring}`}>
            <Icon size={22} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold leading-snug text-canopy-900 dark:text-white">
              {item.title ?? v.title}
            </h2>
            {item.message && (
              <p id={descId} className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-canopy-700 dark:text-canopy-200">
                {item.message}
              </p>
            )}
          </div>
        </div>

        {kind === "prompt" && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              accept();
            }}
          >
            <input
              ref={inputRef}
              value={value}
              maxLength={item.maxLength ?? 120}
              onChange={(e) => {
                setValue(e.target.value);
                setShake(false);
              }}
              aria-label={item.label ?? item.title ?? "Valor"}
              aria-invalid={shake}
              placeholder={item.placeholder}
              className="w-full rounded-lg border border-canopy-300 bg-white px-3 py-2.5 text-sm text-canopy-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/15 dark:bg-[#0b1522] dark:text-white"
            />
            {shake && <p role="alert" className="mt-1.5 font-mono text-xs text-red-600 dark:text-red-400">Este campo es obligatorio.</p>}
          </form>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {kind !== "alert" && (
            <button
              ref={cancelRef}
              type="button"
              onClick={cancel}
              className={`${btnBase} border border-canopy-300 font-semibold text-canopy-800 hover:bg-canopy-100 focus-visible:ring-canopy-400 dark:border-white/15 dark:text-canopy-100 dark:hover:bg-white/5`}
            >
              {item.cancelText ?? "Cancelar"}
            </button>
          )}
          <button ref={okRef} type="button" onClick={accept} className={`${btnBase} text-white shadow-md ${confirmCls}`}>
            {item.confirmText ?? (kind === "alert" ? "Aceptar" : kind === "prompt" ? "Guardar" : "Confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}
