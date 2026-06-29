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

export function RutasSection() {
  const { t } = useTranslation();
  const fetchRoutes = useServerFn(listPublishedRoutes);
  const { data } = useQuery({
    queryKey: ["home", "rutas", "published"],
    queryFn: () => fetchRoutes(),
    initialData: RUTAS_MOCK as readonly SuggestedRoute[],
    staleTime: 5 * 60 * 1000,
  });
  const routes = data && data.length > 0 ? data : RUTAS_MOCK;
  return (
    <section id="rutas" className="py-20 md:py-28">
      <Container>
        <SectionHeader title={t("sections.routes_title")} subtitle={t("sections.routes_sub")} />
        <div className="grid gap-6 md:grid-cols-3">
          {routes.map((r) => (
            <RutaCard key={r.id} route={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}
