/**
 * EmpresaCard — Tarjeta teaser de Empresa recomendada.
 * En Fase 4 el orden vendrá del Motor de Visibilidad Inteligente.
 */
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import type { BusinessTeaser } from "@/types/entities";
import { useTranslation } from "@/i18n/context";

export function EmpresaCard({ business }: { business: BusinessTeaser }) {
  const { t } = useTranslation();
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <PlaceholderImage palette={business.palette} label={business.name} aspect="4/3" className="rounded-none border-0" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{business.category_slug}</p>
        <h3 className="text-base font-semibold">{business.name}</h3>
        <p className="text-sm text-muted-foreground">{business.tagline}</p>
        <div className="mt-auto pt-2">
          <ComingSoonBadge label={t("common.coming_soon")} />
        </div>
      </div>
    </article>
  );
}
