/**
 * DestinosSection — Sección 2 de Home.
 * Lista de destinos del Oriente Maya. Multi-región ready (recibe destinos por prop).
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { DestinoCard } from "@/components/cards/DestinoCard";
import { useTranslation } from "@/i18n/context";
import { usePublishedDestinations } from "@/lib/destinations/destination-labels";

export function DestinosSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const { data } = usePublishedDestinations();
  const destinations = data ?? [];
  const title =
    typeof config?.heading === "string" && config.heading.trim()
      ? config.heading
      : t("sections.destinations_title");
  return (
    <section id="destinos" className="@container py-20 @3xl:py-28">
      <Container>
        <SectionHeader
          eyebrow={t("hero.eyebrow")}
          title={title}
          subtitle={t("sections.destinations_sub")}
        />
        {destinations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay destinos publicados para esta región.
          </p>
        ) : (
          <div
            data-home-grid="destinos"
            className="grid grid-cols-1 gap-6 @2xl:grid-cols-2 @5xl:grid-cols-3"
          >
            {destinations.map((d) => (
              <DestinoCard key={d.id} destination={d} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
