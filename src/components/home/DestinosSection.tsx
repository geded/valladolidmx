/**
 * DestinosSection — Sección 2 de Home.
 * Lista de destinos del Oriente Maya. Multi-región ready (recibe destinos por prop).
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { DestinoCard } from "@/components/cards/DestinoCard";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { useTranslation } from "@/i18n/context";

export function DestinosSection() {
  const { t } = useTranslation();
  return (
    <section id="destinos" className="py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow={t("hero.eyebrow")}
          title={t("sections.destinations_title")}
          subtitle={t("sections.destinations_sub")}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINOS_MOCK.map((d) => (
            <DestinoCard key={d.id} destination={d} />
          ))}
        </div>
      </Container>
    </section>
  );
}
