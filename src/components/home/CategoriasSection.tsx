/**
 * CategoriasSection — Sección 3 de Home.
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CategoriaCard } from "@/components/cards/CategoriaCard";
import { CATEGORIAS_MOCK } from "@/mocks/categorias";
import { useTranslation } from "@/i18n/context";

export function CategoriasSection() {
  const { t } = useTranslation();
  return (
    <section id="categorias" className="bg-secondary/40 py-20 md:py-28">
      <Container>
        <SectionHeader title={t("sections.categories_title")} subtitle={t("sections.categories_sub")} />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CATEGORIAS_MOCK.map((c) => (
            <CategoriaCard key={c.id} category={c} />
          ))}
        </div>
      </Container>
    </section>
  );
}
