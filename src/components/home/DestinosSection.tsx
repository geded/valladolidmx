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

export function DestinosSection() {
  const { t } = useTranslation();
  const fetchDestinations = useServerFn(listPublishedDestinations);
  const { data } = useQuery({
    queryKey: ["home", "destinos", "published"],
    queryFn: () => fetchDestinations(),
    initialData: DESTINOS_MOCK as readonly Destination[],
    staleTime: 5 * 60 * 1000,
  });
  const destinations = data && data.length > 0 ? data : DESTINOS_MOCK;
  return (
    <section id="destinos" className="py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow={t("hero.eyebrow")}
          title={t("sections.destinations_title")}
          subtitle={t("sections.destinations_sub")}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <DestinoCard key={d.id} destination={d} />
          ))}
        </div>
      </Container>
    </section>
  );
}
