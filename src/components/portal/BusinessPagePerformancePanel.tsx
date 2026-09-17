/**
 * Monitor de usuarios · M5 — Rendimiento de las páginas de la empresa.
 *
 * Vista del empresario dentro del Portal. Sólo muestra las páginas públicas
 * de su propia empresa; la autorización real vive en la server function.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getBusinessPagePerformance,
  type PagePerformanceSnapshot,
} from "@/lib/visitor-intel/page-performance.functions";

const SOURCE_LABEL: Record<string, string> = {
  organic: "Buscadores",
  campaign: "Campañas",
  referral: "Referidos",
  direct: "Directo",
};

export function BusinessPagePerformancePanel({
  businessId,
  windowDays,
}: {
  businessId: string;
  windowDays: 7 | 30 | 90;
}) {
  const call = useServerFn(getBusinessPagePerformance);
  const query = useQuery<PagePerformanceSnapshot>({
    queryKey: ["portal", "page-performance", businessId, windowDays],
    queryFn: () => call({ data: { business_id: businessId, window_days: windowDays } }),
  });

  const snapshot = query.data;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-semibold">Visitas a tus páginas</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cuántas personas vieron tu perfil, tus productos y tu landing de promoción.
      </p>

      {query.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Calculando…</p>
      ) : query.isError ? (
        <p className="mt-3 text-sm text-destructive">No fue posible leer las visitas.</p>
      ) : !snapshot || snapshot.total_views === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aún sin visitas registradas en este periodo.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Visitas</p>
              <p className="text-lg font-semibold">{snapshot.total_views}</p>
            </div>
            <div className="rounded-xl border border-border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Visitantes</p>
              <p className="text-lg font-semibold">{snapshot.total_visitors}</p>
            </div>
            <div className="rounded-xl border border-border p-2">
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

          <ul className="divide-y divide-border/60 text-sm">
            {snapshot.pages.slice(0, 8).map((page) => (
              <li key={page.route} className="flex items-center justify-between gap-3 py-1.5">
                <a
                  href={page.route}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary underline underline-offset-4"
                >
                  {page.route}
                </a>
                <span className="shrink-0 font-medium">{page.views}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
