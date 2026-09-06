/**
 * ResenasSection — Sección 9 de Home.
 *
 * Lote 3E — CMS-first: sólo reseñas publicadas y marcadas como destacadas
 * en CMS. Sin resultado se muestra un estado vacío honesto; jamás reseñas
 * ficticias presentadas como reales.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ResenaCard } from "@/components/cards/ResenaCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeaturedReviews } from "@/lib/cms/public-reads.functions";
import type { Review } from "@/types/entities";

const GRID_CLASS = "grid grid-cols-1 gap-6 @3xl:grid-cols-3";

export function ResenasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchReviews = useServerFn(listFeaturedReviews);
  const { data, isPending } = useQuery({
    queryKey: ["home", "resenas", "featured"],
    queryFn: () => fetchReviews(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const reviews: readonly Review[] = data ?? [];
  const title =
    typeof config?.heading === "string" && config.heading.trim()
      ? config.heading
      : t("sections.reviews_title");
  return (
    <section id="resenas" className="@container bg-secondary/40 py-20 @3xl:py-28">
      <Container>
        <SectionHeader title={title} subtitle={t("sections.reviews_sub")} />
        {isPending ? (
          <div
            data-home-grid="resenas"
            data-state="loading"
            aria-busy="true"
            className={GRID_CLASS}
          >
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p data-home-empty="resenas" role="status" className="text-sm text-muted-foreground">
            Aún no hay reseñas publicadas para la portada.
          </p>
        ) : (
          <div data-home-grid="resenas" className={GRID_CLASS}>
            {reviews.map((r) => (
              <ResenaCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
