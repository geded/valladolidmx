/**
 * RutasSection — Sección 4 de Home.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { RutaCard } from "@/components/cards/RutaCard";
import { RUTAS_MOCK } from "@/mocks/rutas";
import { useTranslation } from "@/i18n/context";

export function RutasSection() {
  const { t } = useTranslation();
  return (
    <section id="rutas" className="py-20 md:py-28">
      <Container>
        <SectionHeader title={t("sections.routes_title")} subtitle={t("sections.routes_sub")} />
        <div className="grid gap-6 md:grid-cols-3">
          {RUTAS_MOCK.map((r) => (
            <RutaCard key={r.id} route={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}
