const R = 64;
const C = 2 * Math.PI * R;

const tone = {
  sell: "stroke-green-600 dark:stroke-gold-300",
  review: "stroke-amber-500",
  wait: "stroke-red-500",
};

/** Medidor circular 0–100 del índice de oportunidad. */
export default function ScoreRing({ value, verdict = "sell" }) {
  return (
    <div className="relative h-[156px] w-[156px] shrink-0" role="img" aria-label={`Puntaje ${value} de 100`}>
      <svg viewBox="0 0 156 156" className="h-full w-full -rotate-90">
        <circle cx="78" cy="78" r={R} fill="none" strokeWidth="13" className="stroke-green-100 dark:stroke-white/5" />
        <circle
          cx="78"
          cy="78"
          r={R}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - value / 100)}
          className={`transition-[stroke-dashoffset] duration-700 ${tone[verdict]}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="text-5xl font-extrabold leading-none text-canopy-900 dark:text-white">{value}</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-canopy-700 dark:text-canopy-200">
          Score
        </p>
      </div>
    </div>
  );
}
