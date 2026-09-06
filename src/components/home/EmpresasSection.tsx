/**
 * EmpresasSection — Sección 8 de Home.
 * Selección futura del Motor de Visibilidad Inteligente (Fase 4).
 *
 * Lote 3E — CMS-first: sólo empresas publicadas y elegibles marcadas como
 * destacadas en CMS. Sin resultado se muestra un estado vacío honesto.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { EmpresaCard } from "@/components/cards/EmpresaCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeaturedBusinesses } from "@/lib/cms/public-reads.functions";
import type { BusinessTeaser } from "@/types/entities";

const GRID_CLASS = "grid grid-cols-1 gap-6 @2xl:grid-cols-2 @5xl:grid-cols-4";

export function EmpresasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchBusinesses = useServerFn(listFeaturedBusinesses);
  const { data, isPending } = useQuery({
    queryKey: ["home", "empresas", "featured"],
    queryFn: () => fetchBusinesses(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const businesses: readonly BusinessTeaser[] = data ?? [];
  const title =
    typeof config?.heading === "string" && config.heading.trim()
      ? config.heading
      : t("sections.empresas_title");
  return (
    <section id="empresas" className="@container py-20 @3xl:py-28">
      <Container>
        <SectionHeader title={title} subtitle={t("sections.empresas_sub")} />
        {isPending ? (
          <div
            data-home-grid="empresas"
            data-state="loading"
            aria-busy="true"
            className={GRID_CLASS}
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <p data-home-empty="empresas" role="status" className="text-sm text-muted-foreground">
            Aún no hay empresas destacadas publicadas.
          </p>
        ) : (
          <div data-home-grid="empresas" className={GRID_CLASS}>
            {businesses.map((b) => (
              <EmpresaCard key={b.id} business={b} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
