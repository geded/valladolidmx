/**
 * CategoriasSection — Sección 3 de Home.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CategoriaCard } from "@/components/cards/CategoriaCard";
import { CATEGORIAS_MOCK } from "@/mocks/categorias";
import { useTranslation } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHomeFeaturedCategories } from "@/lib/cms/public-reads.functions";
import type { Category } from "@/types/entities";

export function CategoriasSection() {
  const { t } = useTranslation();
  const fetchHomeCategories = useServerFn(listHomeFeaturedCategories);
  const { data } = useQuery({
    queryKey: ["home", "categorias", "featured"],
    queryFn: () => fetchHomeCategories(),
    initialData: CATEGORIAS_MOCK as readonly Category[],
    staleTime: 5 * 60 * 1000,
  });
  const categories = data && data.length > 0 ? data : CATEGORIAS_MOCK;
  return (
    <section id="categorias" className="bg-secondary/40 py-20 md:py-28">
      <Container>
        <SectionHeader title={t("sections.categories_title")} subtitle={t("sections.categories_sub")} />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <CategoriaCard key={c.id} category={c} />
          ))}
        </div>
      </Container>
    </section>
  );
}
