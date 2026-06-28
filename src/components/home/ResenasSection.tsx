/**
 * ResenasSection — Sección 9 de Home.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ResenaCard } from "@/components/cards/ResenaCard";
import { RESENAS_MOCK } from "@/mocks/resenas";
import { useTranslation } from "@/i18n/context";

export function ResenasSection() {
  const { t } = useTranslation();
  return (
    <section id="resenas" className="bg-secondary/40 py-20 md:py-28">
      <Container>
        <SectionHeader title={t("sections.reviews_title")} subtitle={t("sections.reviews_sub")} />
        <div className="grid gap-6 md:grid-cols-3">
          {RESENAS_MOCK.map((r) => (
            <ResenaCard key={r.id} review={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}
