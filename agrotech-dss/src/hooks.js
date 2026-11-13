import { useEffect, useState } from "react";

const KEY = "agronoma-theme";

export function useTheme() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible */
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
