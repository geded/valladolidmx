/**
 * Monitor de usuarios · M3 — Estadísticas de una Landing SEO.
 *
 * Tarjeta de lectura dentro del panel "Landing SEO premium". Reutiliza la
 * misma agregación que el monitor; no crea métricas propias.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  aggregatePagePerformance,
  type PagePerformanceSnapshot,
} from "@/lib/visitor-intel/page-performance.functions";

const SOURCE_LABEL: Record<string, string> = {
  organic: "Buscadores",
  campaign: "Campañas",
  referral: "Referidos",
  direct: "Directo",
};

export function LandingPerformanceCard({ landingPath }: { landingPath: string }) {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const aggregate = useServerFn(aggregatePagePerformance);

  const query = useQuery<PagePerformanceSnapshot>({
    queryKey: ["visitor-intel", "landing-performance", landingPath, windowDays],
    queryFn: () =>
      aggregate({ data: { window_days: windowDays, route_prefix: landingPath, limit: 5 } }),
  });

  const snapshot = query.data;

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Estadísticas de esta landing
        </p>
        <select
          value={windowDays}
          onChange={(event) => setWindowDays(Number(event.target.value) as 7 | 30 | 90)}
          className="rounded-pill border border-border bg-card px-2.5 py-1 text-xs ring-focus"
          aria-label="Periodo de las estadísticas"
        >
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      {query.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Calculando…</p>
      ) : query.isError ? (
        <p className="mt-2 text-xs text-destructive">No fue posible leer las estadísticas.</p>
      ) : !snapshot || snapshot.total_views === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Aún sin visitas registradas en este periodo.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-card p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Visitas</p>
              <p className="text-lg font-semibold">{snapshot.total_views}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Visitantes</p>
              <p className="text-lg font-semibold">{snapshot.total_visitors}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Lectura</p>
              <p className="text-lg font-semibold">{snapshot.funnel.engaged}</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {Object.entries(snapshot.by_source)
              .filter(([, count]) => count > 0)
              .map(([source, count]) => (
                <li key={source} className="rounded-pill border border-border px-2.5 py-1">
                  {SOURCE_LABEL[source] ?? source}: <strong>{count}</strong>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
