/**
 * CategoriaCard — acceso canónico de navegación turística.
 *
 * Presentación aprobada Founder 2026-08-27:
 * tarjeta compacta marfil, ícono universal centrado y etiqueta HTML.
 * Las tarjetas editoriales con fotografía pertenecen a otra familia.
 */
import type { Category } from "@/types/entities";
import { TourismCategoryIcon } from "@/components/omxds/TourismCategoryIcon";

const ROUTE_BY_SLUG: Partial<Record<string, string>> = {
  experiencias: "/experiencias",
  hoteles: "/hoteles",
  restaurantes: "/restaurantes",
  eventos: "/eventos",
};

const CONTROL_CLASS = [
  "group flex min-h-[104px] w-full min-w-0 flex-col items-center justify-center gap-2.5",
  "rounded-xl border border-primary/20 bg-card px-3 py-4 text-center",
  "transition-colors duration-200",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  "sm:min-h-[120px]",
].join(" ");

export function CategoriaCard({ category }: { category: Category }) {
  const href = ROUTE_BY_SLUG[category.slug] ?? null;
  const content = (
    <>
      <TourismCategoryIcon
        slug={category.slug}
        variant="standard"
        size={44}
        className="shrink-0 transition-transform duration-200 group-hover:scale-[1.04]"
      />
      <span className="line-clamp-2 min-w-0 text-sm font-medium leading-snug text-foreground">
        {category.name}
      </span>
    </>
  );

  if (!href) {
    return (
      <div
        className={`${CONTROL_CLASS} cursor-default opacity-70`}
        data-omxds-category-button={category.slug}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      className={`${CONTROL_CLASS} hover:border-primary/40 hover:bg-primary/[0.04]`}
      data-omxds-category-button={category.slug}
      data-omxds-touch-target="44"
      aria-label={category.name}
    >
      {content}
    </a>
  );
}
