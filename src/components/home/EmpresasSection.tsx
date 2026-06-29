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
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeaturedBusinesses } from "@/lib/cms/public-reads.functions";
import type { BusinessTeaser } from "@/types/entities";

export function EmpresasSection() {
  const { t } = useTranslation();
  const fetchBusinesses = useServerFn(listFeaturedBusinesses);
  const { data } = useQuery({
    queryKey: ["home", "empresas", "featured"],
    queryFn: () => fetchBusinesses(),
    initialData: EMPRESAS_MOCK as readonly BusinessTeaser[],
    staleTime: 5 * 60 * 1000,
  });
  const businesses = data && data.length > 0 ? data : EMPRESAS_MOCK;
  return (
    <section id="empresas" className="py-20 md:py-28">
      <Container>
        <SectionHeader
          title={t("sections.empresas_title")}
          subtitle={t("sections.empresas_sub")}
          actions={<ComingSoonBadge label="Motor de Visibilidad · pronto" />}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {businesses.map((b) => (
            <EmpresaCard key={b.id} business={b} />
          ))}
        </div>
      </Container>
    </section>
  );
}
