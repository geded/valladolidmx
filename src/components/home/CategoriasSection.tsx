/**
 * CategoriasSection — Sección 3 de Home.
 *
 * Navegación responsive aprobada: 2 columnas en celular, 4 en tablet
 * y hasta 8 en escritorio. Las categorías usan CategoriaCard como
 * botón compacto; no se renderizan tarjetas editoriales sin fotografía.
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

export function CategoriasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const fetchHomeCategories = useServerFn(listHomeFeaturedCategories);
  const { data } = useQuery({
    queryKey: ["home", "categorias", "featured"],
    queryFn: () => fetchHomeCategories(),
    initialData: CATEGORIAS_MOCK as readonly Category[],
    staleTime: 5 * 60 * 1000,
  });
  const categories = data && data.length > 0 ? data : CATEGORIAS_MOCK;
  const title =
    typeof config?.heading === "string" && config.heading.trim()
      ? config.heading
      : t("sections.categories_title");

  return (
    <section id="categorias" className="@container bg-secondary/40 py-14 @3xl:py-20">
      <Container>
        <SectionHeader title={title} subtitle={t("sections.categories_sub")} />
        <div
          data-home-grid="categorias"
          className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8"
        >
          {categories.map((category) => (
            <CategoriaCard key={category.id} category={category} />
          ))}
        </div>
      </Container>
    </section>
  );
}
