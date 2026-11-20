/**
 * Monitor de usuarios · M2 — Panel "Rendimiento de páginas".
 *
 * Vive dentro de Inteligencia del Visitante. Presentación pura sobre
 * `aggregatePagePerformance`. No crea superficies paralelas.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  aggregatePagePerformance,
  type PagePerformanceSnapshot,
} from "@/lib/visitor-intel/page-performance.functions";
import { PAGE_TYPES, type PageType } from "@/lib/visitor-intel/page-signals";

const PAGE_TYPE_LABEL: Record<PageType, string> = {
  home: "Inicio",
  landing_seo: "Landings SEO",
  business: "Perfiles de empresa",
  product: "Fichas de producto",
  destination: "Destinos",
  category: "Categorías",
  experiences: "Experiencias",
  event: "Eventos",
  route: "Rutas",
  editorial: "Editorial",
  other: "Otras",
};

const SOURCE_LABEL: Record<string, string> = {
  organic: "Buscadores",
  campaign: "Campañas",
  referral: "Referidos",
  direct: "Directo",
};

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Móvil",
  tablet: "Tableta",
  desktop: "Escritorio",
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function PagePerformancePanel() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [pageType, setPageType] = useState<PageType | "all">("all");
  const aggregate = useServerFn(aggregatePagePerformance);

  const query = useQuery<PagePerformanceSnapshot>({
    queryKey: ["visitor-intel", "page-performance", windowDays, pageType],
    queryFn: () =>
      aggregate({
        data: {
          window_days: windowDays,
          ...(pageType === "all" ? {} : { page_type: pageType }),
          limit: 25,
        },
      }),
  });

  const snapshot = query.data;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Rendimiento de páginas</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Visitas reales de las páginas públicas, su origen y hasta dónde llegan las personas.
            Sin datos personales: sólo señales seudónimas del recorrido.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value) as 7 | 30 | 90)}
            className="rounded-pill border border-border bg-card px-3 py-1.5 text-xs ring-focus"
            aria-label="Periodo"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <select
            value={pageType}
            onChange={(event) => setPageType(event.target.value as PageType | "all")}
            className="rounded-pill border border-border bg-card px-3 py-1.5 text-xs ring-focus"
            aria-label="Tipo de página"
          >
            <option value="all">Todas las páginas</option>
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PAGE_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {query.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Calculando…</p>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-destructive">No fue posible leer el rendimiento.</p>
      ) : !snapshot || snapshot.total_views === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Todavía no hay visitas registradas en este periodo. Las señales empiezan a acumularse
          desde que se activó la medición.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Visitas" value={snapshot.total_views} />
            <Stat label="Visitantes" value={snapshot.total_visitors} />
            <Stat label="Lectura profunda" value={snapshot.funnel.engaged} />
            <Stat label="Reservas pagadas" value={snapshot.funnel.orders_paid} />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Avance de personas (visitantes anónimos)
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Stat label="Sesiones nuevas" value={snapshot.journey.new_sessions} />
              <Stat label="Exploradores" value={snapshot.journey.deep_explorers} />
              <Stat label="Primera intención" value={snapshot.journey.anonymous_intents} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Hitos del recorrido, no clics: llegada, exploración profunda (varias páginas o
              permanencia) y primera señal de interés sin cuenta.
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Origen de la visita
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(snapshot.by_source).map(([source, count]) => (
                  <li key={source} className="flex justify-between gap-3">
                    <span>{SOURCE_LABEL[source] ?? source}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dispositivo e idioma
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(snapshot.by_device).map(([device, count]) => (
                  <li key={device} className="flex justify-between gap-3">
                    <span>{DEVICE_LABEL[device] ?? device}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
                {Object.entries(snapshot.by_locale).map(([locale, count]) => (
                  <li key={locale} className="flex justify-between gap-3 text-muted-foreground">
                    <span>Idioma {locale}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Página</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Visitas</th>
                  <th className="px-3 py-2 text-right">Visitantes</th>
                  <th className="px-3 py-2 text-right">Lectura</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.pages.map((row) => (
                  <tr key={row.route} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <a
                        href={row.route}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-primary underline underline-offset-4"
                      >
                        {row.route}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {PAGE_TYPE_LABEL[row.page_type]}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{row.views}</td>
                    <td className="px-3 py-2 text-right">{row.visitors}</td>
                    <td className="px-3 py-2 text-right">{pct(row.engagement_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Embudo turístico del periodo
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Visitas" value={snapshot.funnel.views} />
              <Stat label="Lectura profunda" value={snapshot.funnel.engaged} />
              <Stat label="Señales de interés" value={snapshot.funnel.added_to_plan} />
              <Stat label="Viajes creados" value={snapshot.funnel.plans_created} />
              <Stat label="Reservas pagadas" value={snapshot.funnel.orders_paid} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Confianza declarada: las visitas y señales son observadas; los viajes y reservas del
              periodo no están atribuidos página por página.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
