/**
 * DestinosSection — Sección 2 de Home.
 * Lista de destinos del Oriente Maya. Multi-región ready (recibe destinos por prop).
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { DestinoCard } from "@/components/cards/DestinoCard";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { useTranslation } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import type { Destination } from "@/types/territory";

export function DestinosSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchDestinations = useServerFn(listPublishedDestinations);
  const { data } = useQuery({
    queryKey: ["home", "destinos", "published"],
    queryFn: () => fetchDestinations(),
    initialData: DESTINOS_MOCK as readonly Destination[],
    staleTime: 5 * 60 * 1000,
  });
  const destinations = data && data.length > 0 ? data : DESTINOS_MOCK;
  const title = typeof config?.heading === "string" && config.heading.trim() ? config.heading : t("sections.destinations_title");
  return (
    <section id="destinos" className="@container py-20 @3xl:py-28">
      <Container>
        <SectionHeader
          eyebrow={t("hero.eyebrow")}
          title={title}
          subtitle={t("sections.destinations_sub")}
        />
        <div data-home-grid="destinos" className="grid grid-cols-1 gap-6 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {destinations.map((d) => (
            <DestinoCard key={d.id} destination={d} />
          ))}
        </div>
      </Container>
    </section>
  );
}
