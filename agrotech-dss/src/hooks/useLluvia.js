import { useCallback, useEffect, useMemo, useState } from "react";
import { listLluvia } from "../api/campo.js";

const iso = (d) => d.toLocaleDateString("en-CA");

/** Lluvia de los últimos 30 días de todos los lotes: GET /v1/campo/lotes/{id}/lluvia. */
export function useLluvia(lots) {
  const [items, setItems] = useState([]);
  const key = lots.map((l) => l.id).join(",");

  const reload = useCallback(async () => {
    if (!lots.length) return setItems([]);
    const d = new Date();
    d.setDate(d.getDate() - 30);
    try {
      const lists = await Promise.all(lots.map((l) => listLluvia(l.id, { desde: iso(d), hasta: iso(new Date()) })));
      setItems(
        lists.flatMap((rows, i) =>
          rows.map((r) => ({
            id: `rain-${r.id}`,
            kind: "rain",
            lotId: lots[i].id,
            lotName: lots[i].name,
            mm: Number(r.milimetros) || 0,
            date: String(r.fecha_registro ?? "").slice(0, 10),
            note: r.observacion ?? "",
          }))
        )
      );
    } catch {
      /* se conserva el último valor; el resto del panel sigue funcionando */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const rain30 = useMemo(() => items.reduce((a, r) => a + r.mm, 0), [items]);
  return { items, rain30, reload };
}
