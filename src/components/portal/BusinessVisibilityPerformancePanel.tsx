/**
 * Panel de la empresa: dónde apareció su ficha y cuántos clics recibió,
 * separando el espacio contratado del orgánico.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getBusinessVisibilityPerformance,
  ctr,
  type BusinessPlacementRow,
} from "@/lib/visibility/visibility-performance.functions";

const PLACEMENT_LABEL: Record<string, string> = {
  contratado: "Espacio contratado",
  fijado: "Destacado programado",
  editorial: "Recomendado por el equipo",
  organico: "Orgánico",
};

export function BusinessVisibilityPerformancePanel({
  businessId,
  windowDays = 30,
}: {
  businessId: string;
  windowDays?: number;
}) {
  const call = useServerFn(getBusinessVisibilityPerformance);
  const query = useQuery<BusinessPlacementRow[]>({
    queryKey: ["portal", "visibility-performance", businessId, windowDays],
    queryFn: () => call({ data: { businessId, windowDays } }),
  });

  const rows = query.data ?? [];
  const impressions = rows.reduce((a, r) => a + r.impressions, 0);
  const clicks = rows.reduce((a, r) => a + r.clicks, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-semibold">Dónde apareció tu ficha</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Últimos {windowDays} días: veces que se mostró tu ficha en el sitio y cuántas personas
        entraron desde ahí.
      </p>

      {query.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Calculando…</p>
      ) : query.isError ? (
        <p className="mt-3 text-sm text-destructive">No fue posible leer estos datos.</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no registramos apariciones en este periodo.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Cell label="Mostrado" value={impressions} />
            <Cell label="Clics" value={clicks} />
            <Cell label="Efectividad" value={`${ctr(impressions, clicks)}%`} />
          </div>
          <ul className="divide-y divide-border/60 text-sm">
            {rows.map((r) => (
              <li
                key={`${r.surface}-${r.placement}`}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <span className="truncate">
                  {r.surface}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {PLACEMENT_LABEL[r.placement] ?? r.placement}
                  </span>
                </span>
                <span className="shrink-0 font-medium">
                  {r.impressions} · {r.clicks} clics
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Cell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
