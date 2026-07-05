/**
 * EmpresaCard — Tarjeta teaser de Empresa recomendada.
 * En Fase 4 el orden vendrá del Motor de Visibilidad Inteligente.
 */
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import type { BusinessTeaser } from "@/types/entities";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { resolveCanonicalPath } from "@/lib/navigation";
import { TrustBadge } from "@/components/reviews/TrustBadge";

export function EmpresaCard({ business }: { business: BusinessTeaser }) {
  // US-E3.2 · Fase B — canonical territorial. Fallback a /marketplace/$slug
  // (que 301 al canonical) sólo si aún no hay destino/categoría publicados.
  const href =
    business.destination_slug && business.category_slug
      ? resolveCanonicalPath({
          kind: "business",
          slug: business.slug,
          category: business.category_slug,
          destination: business.destination_slug,
        })
      : `/marketplace/${business.slug}`;
  return (
    <Link
      to={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <PlaceholderImage palette={business.palette} label={business.name} aspect="4/3" className="rounded-none border-0" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{business.category_slug}</p>
        <h3 className="text-base font-semibold">{business.name}</h3>
        <p className="text-sm text-muted-foreground">{business.tagline}</p>
        <TrustBadge subjectKind="business" subjectId={business.id} className="mt-1" />
        <div className="mt-auto flex items-center gap-1.5 pt-2 text-xs font-medium text-primary">
          Ver empresa
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </Link>
  );
}
