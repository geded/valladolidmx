/**
 * ResenasSection — Sección 9 de Home.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ResenaCard } from "@/components/cards/ResenaCard";
import { RESENAS_MOCK } from "@/mocks/resenas";
import { useTranslation } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeaturedReviews } from "@/lib/cms/public-reads.functions";
import type { Review } from "@/types/entities";

export function ResenasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchReviews = useServerFn(listFeaturedReviews);
  const { data } = useQuery({
    queryKey: ["home", "resenas", "featured"],
    queryFn: () => fetchReviews(),
    initialData: RESENAS_MOCK as readonly Review[],
    staleTime: 5 * 60 * 1000,
  });
  const reviews = data && data.length > 0 ? data : RESENAS_MOCK;
  const title = typeof config?.heading === "string" && config.heading.trim() ? config.heading : t("sections.reviews_title");
  return (
    <section id="resenas" className="bg-secondary/40 py-20 md:py-28">
      <Container>
        <SectionHeader title={title} subtitle={t("sections.reviews_sub")} />
        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <ResenaCard key={r.id} review={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}
