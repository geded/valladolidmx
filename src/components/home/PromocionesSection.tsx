/**
 * PromocionesSection — Campañas y ofertas vigentes.
 *
 * Sprint Reconciliación 6. Consume `listFeaturedPromotions` y navega a
 * los landings `/l/{slug}` ya publicados. Si no hay promociones activas
 * la sección se oculta para no dejar placeholders en Home.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { listFeaturedPromotions, type PublicPromoCard } from "@/lib/promotions/public-reads.functions";

export function PromocionesSection({ config }: { config?: Record<string, unknown> } = {}) {
  const fetchPromos = useServerFn(listFeaturedPromotions);
  const { data } = useQuery({
    queryKey: ["home", "promociones", "featured"],
    queryFn: () => fetchPromos({ data: { limit: 6 } }),
    staleTime: 5 * 60 * 1000,
  });
  const promos: PublicPromoCard[] = data ?? [];
  if (promos.length === 0) return null;
  const title = typeof config?.heading === "string" && config.heading.trim() ? config.heading : "Promociones vigentes";
  return (
    <section id="promociones" className="@container py-20 @3xl:py-28">
      <Container>
        <SectionHeader
          eyebrow="Ofertas"
          title={title}
          subtitle="Campañas activas de hoteles, restaurantes y experiencias del Oriente Maya."
          actions={
            <Link
              to="/promociones"
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Ver todas
            </Link>
          }
        />
        <ul data-home-grid="promociones" className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {promos.map((p) => (
            <li key={p.slug}>
              <Link
                to="/l/$slug"
                params={{ slug: p.slug }}
                className="group block h-full rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-lg font-semibold text-foreground group-hover:text-primary">
                  {p.title}
                </p>
                {p.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}