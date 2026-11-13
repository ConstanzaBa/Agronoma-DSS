export function Card({ className = "", gradient = false, ...props }) {
  return (
    <section
      className={[
        "rounded-2xl border shadow-sm",
        "border-canopy-200/80 dark:border-white/10 dark:shadow-none",
        gradient
          ? "bg-gradient-to-br from-green-100/80 via-white to-white dark:from-canopy-700/40 dark:via-[#0f1b2c] dark:to-[#0f1b2c]"
          : "bg-white dark:bg-[#0f1b2c]/95",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export const monoLabel =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-canopy-600/80 dark:text-canopy-300";
