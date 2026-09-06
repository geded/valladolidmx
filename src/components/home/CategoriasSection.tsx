/**
 * CategoriasSection — Sección 3 de Home.
 *
 * Lote 3E — CMS-first: las categorías provienen exclusivamente de
 * `business_categories` publicadas con `home_featured`. Sin resultado del
 * CMS se muestra un estado vacío honesto; nunca contenido ficticio.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CategoriaCard } from "@/components/cards/CategoriaCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/context";
import { useHomeFeaturedCategories } from "@/lib/cms/home-featured-categories-query";
import type { Category } from "@/types/entities";

const GRID_CLASS = "grid grid-cols-1 gap-4 @2xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4";

export function CategoriasSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const { data, isPending } = useHomeFeaturedCategories();
  const categories: readonly Category[] = data ?? [];
  const title =
    typeof config?.heading === "string" && config.heading.trim()
      ? config.heading
      : t("sections.categories_title");
  return (
    <section id="categorias" className="@container bg-secondary/40 py-20 @3xl:py-28">
      <Container>
        <SectionHeader title={title} subtitle={t("sections.categories_sub")} />
        {isPending ? (
          <div
            data-home-grid="categorias"
            data-state="loading"
            aria-busy="true"
            className={GRID_CLASS}
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p data-home-empty="categorias" role="status" className="text-sm text-muted-foreground">
            Aún no hay categorías publicadas para la portada.
          </p>
        ) : (
          <div data-home-grid="categorias" className={GRID_CLASS}>
            {categories.map((c) => (
              <CategoriaCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
