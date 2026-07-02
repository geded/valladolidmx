/**
 * RutasSection — Sección 4 de Home.
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

export function RutasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchRoutes = useServerFn(listPublishedRoutes);
  const { data } = useQuery({
    queryKey: ["home", "rutas", "published"],
    queryFn: () => fetchRoutes(),
    initialData: RUTAS_MOCK as readonly SuggestedRoute[],
    staleTime: 5 * 60 * 1000,
  });
  const routes = data && data.length > 0 ? data : RUTAS_MOCK;
  const title = typeof config?.heading === "string" && config.heading.trim() ? config.heading : t("sections.routes_title");
  return (
    <section id="rutas" className="@container py-20 md:py-28">
      <Container>
        <SectionHeader title={title} subtitle={t("sections.routes_sub")} />
        <div data-home-grid="rutas" className="grid grid-cols-1 gap-6 @3xl:grid-cols-3">
          {routes.map((r) => (
            <RutaCard key={r.id} route={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}
