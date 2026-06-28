/**
 * EmpresasSection — Sección 8 de Home.
 * Selección futura del Motor de Visibilidad Inteligente (Fase 4).
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { EmpresaCard } from "@/components/cards/EmpresaCard";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { EMPRESAS_MOCK } from "@/mocks/empresas";
import { useTranslation } from "@/i18n/context";

export function EmpresasSection() {
  const { t } = useTranslation();
  return (
    <section id="empresas" className="py-20 md:py-28">
      <Container>
        <SectionHeader
          title={t("sections.empresas_title")}
          subtitle={t("sections.empresas_sub")}
          actions={<ComingSoonBadge label="Motor de Visibilidad · pronto" />}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EMPRESAS_MOCK.map((b) => (
            <EmpresaCard key={b.id} business={b} />
          ))}
        </div>
      </Container>
    </section>
  );
}
