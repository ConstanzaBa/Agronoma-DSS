import { Archive, BellRing, Check, LogOut, Map, Moon, RefreshCw, Sun, Tractor, TrendingUp, UserCircle, Users } from "lucide-react";
import { ROLE_LABELS } from "../../auth.js";

const items = [
  { id: "map", label: "Telemetry Map", icon: Map },
  { id: "alerts", label: "Alert Feed", icon: BellRing },
  { id: "silos", label: "Silo Metrics", icon: Archive },
  { id: "market", label: "Market Predict", icon: TrendingUp },
  { id: "team", label: "Team Access", icon: Users, adminOnly: true }, // empleados y códigos: solo administrador
  { id: "profile", label: "Mi perfil", icon: UserCircle },
];

export default function Sidebar({ alertCount = 0, tab, onTab, dark, onToggle, syncState, onSync, onLogout, user = null, isAdmin = false }) {
  return (
    <aside className="border-b border-canopy-200 bg-white p-4 dark:border-white/10 dark:bg-[#06170b]/70 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 text-white shadow-md dark:from-canopy-600 dark:to-canopy-400">
          <Tractor size={22} />
        </span>
        <div className="leading-tight">
          <p className="text-xl font-bold text-canopy-900 dark:text-white">Agronoma</p>
          <p className="font-mono text-[11px] tracking-wider text-canopy-600 dark:text-gold-300/90">SYS.OPS_V4.2</p>
        </div>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-9 lg:flex-col lg:overflow-visible">
        {items.filter((i) => !i.adminOnly || isAdmin).map(({ id, label, icon: Icon }) => {
          const badge = id === "alerts" ? alertCount : 0;
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-current={active ? "page" : undefined}
              className={[
                "flex shrink-0 items-center gap-3 rounded-lg border px-4 py-3 text-left text-[15px] font-medium transition lg:w-full",
                active
                  ? "border-green-300 bg-green-50 text-canopy-900 dark:border-canopy-500/60 dark:bg-canopy-700/30 dark:text-gold-300"
                  : "border-transparent text-canopy-800 hover:bg-canopy-100 dark:text-canopy-200 dark:hover:bg-white/5",
              ].join(" ")}
            >
              <Icon size={19} className="shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
              {badge > 0 && (
                <span className="ml-auto grid h-7 w-7 place-items-center rounded-full border border-red-200 bg-red-100 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-900/40 dark:text-red-400">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {user && (
        <p className="mt-4 hidden truncate font-mono text-[11px] text-canopy-600 dark:text-canopy-300 lg:mt-auto lg:block" title={user.correo}>
          {[user.nombre, user.apellido].filter(Boolean).join(" ") || user.correo}
          <span className="block uppercase tracking-wider text-canopy-500 dark:text-gold-300/80">{ROLE_LABELS[user.rol] ?? user.rol}</span>
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 lg:mt-4 lg:flex-col lg:items-stretch lg:border-t lg:border-canopy-200 lg:pt-5 dark:lg:border-white/10">
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-canopy-200 text-canopy-700 transition hover:bg-canopy-100 dark:border-gold-400/25 dark:text-gold-400 dark:hover:bg-white/5"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={onLogout}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-canopy-200 px-3 font-mono text-xs uppercase tracking-wider text-canopy-700 transition hover:bg-canopy-100 dark:border-white/15 dark:text-canopy-200 dark:hover:bg-white/5 lg:flex-1"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>

        <button
          onClick={onSync}
          disabled={syncState === "syncing"}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-[15px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-80 dark:from-canopy-600 dark:via-canopy-500 dark:to-gold-300 dark:text-canopy-950 dark:shadow-none lg:flex-none"
        >
          {syncState === "done" ? (
            <>
              <Check size={17} /> Synced
            </>
          ) : (
            <>
              <RefreshCw size={17} className={syncState === "syncing" ? "animate-spin" : ""} /> Sync Data
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
