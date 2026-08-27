/**
 * RutasSection — Sección 4 de Home.
 *
 * G7 · Capacidad premium del constructor: la sección acepta selección
 * manual y ordenada de rutas, límite de elementos y visibilidad de
 * paradas. Sin configuración, el comportamiento es idéntico al histórico
 * (rutas publicadas, orden del servidor, sin paradas).
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { RutaCard } from "@/components/cards/RutaCard";
import { RUTAS_MOCK } from "@/mocks/rutas";
import { useTranslation } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedRoutes } from "@/lib/cms/public-reads.functions";
import type { SuggestedRoute } from "@/types/entities";

function readSlugList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) =>
      typeof it === "string" ? it : ((it as { slug?: string } | null)?.slug ?? ""),
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

export function RutasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchRoutes = useServerFn(listPublishedRoutes);
  const { data } = useQuery({
    queryKey: ["home", "rutas", "published"],
    queryFn: () => fetchRoutes(),
    initialData: RUTAS_MOCK as readonly SuggestedRoute[],
    staleTime: 5 * 60 * 1000,
  });
  const available: readonly SuggestedRoute[] =
    data && data.length > 0 ? data : RUTAS_MOCK;

  const source = typeof config?.source === "string" ? config.source : "auto";
  const selected = readSlugList(config?.route_slugs);
  const ordered: readonly SuggestedRoute[] =
    source === "manual" && selected.length > 0
      ? selected
          .map((slug) => available.find((r) => r.slug === slug))
          .filter((r): r is SuggestedRoute => Boolean(r))
      : available;

  const maxItems =
    typeof config?.max_items === "number" && config.max_items > 0
      ? Math.floor(config.max_items)
      : undefined;
  const routes = maxItems ? ordered.slice(0, maxItems) : ordered;

  const showStops = config?.show_stops === true;
  const columns = String(config?.columns ?? "3");
  const gridCols =
    columns === "2"
      ? "@3xl:grid-cols-2"
      : columns === "4"
        ? "@3xl:grid-cols-4"
        : "@3xl:grid-cols-3";

  const title =
    typeof config?.heading === "string" && config.heading.trim()
      ? config.heading
      : t("sections.routes_title");
  const subtitle =
    typeof config?.subheading === "string" && config.subheading.trim()
      ? config.subheading
      : t("sections.routes_sub");

  return (
    <section id="rutas" className="@container py-20 @3xl:py-28">
      <Container>
        <SectionHeader title={title} subtitle={subtitle} />
        <div
          data-home-grid="rutas"
          data-rutas-source={source}
          className={`grid grid-cols-1 gap-6 ${gridCols}`}
        >
          {routes.map((r) => (
            <div key={r.id} className="flex min-w-0 flex-col gap-2">
              <RutaCard route={r} />
              {showStops && r.destination_slugs.length > 0 ? (
                <ul
                  data-rutas-stops
                  className="flex flex-wrap gap-1.5 px-1 text-xs text-muted-foreground"
                >
                  {r.destination_slugs.map((slug) => (
                    <li
                      key={slug}
                      className="rounded-pill border border-border/60 px-2 py-0.5 capitalize"
                    >
                      {slug.replace(/-/g, " ")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
