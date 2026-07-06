/**
 * H-03 · Ola I3.b — `vmx.experience.related-collection` (Capa 1: Presentación).
 * U1.2 · v1.1.0 — Reutiliza la Tourism Card oficial. NO renderiza
 * cards propias. Founder Directive: Related Collection es una
 * recomendación turística útil (contexto + confianza + relevancia +
 * siguiente acción), no un carrusel decorativo.
 *
 * Componente puro. Recibe DTO validado y delega en `<TourismCard/>` +
 * `<TourismCardRow/>` (Biblioteca Turística Oficial). Sin acceso a
 * contextos, hooks de datos ni server functions.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  type ExperienceRelatedCollectionDTO,
  type ExperienceRelatedItem,
  type ExperienceRelatedVariant,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import {
  TourismCard,
  TourismCardRow,
  FeaturedTourismLayout,
  type TourismCardCapabilities,
  type TourismCardVM,
  type TourismEntityKind,
} from "@/components/experience-builder/tourism-card/TourismCard";

export interface ExperienceRelatedCollectionProps {
  dto: ExperienceRelatedCollectionDTO;
  className?: string;
  /** Slot opcional para inyectar acciones interactivas (Favoritos, Plan). */
  renderItemActions?: (item: ExperienceRelatedItem) => ReactNode;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Mapping ExperienceRelatedItem → TourismCardVM
 * ------------------------------------------------------------------ */
function relatedItemToVM(
  item: ExperienceRelatedItem,
  showKindBadge: boolean,
): TourismCardVM {
  const dateLabel =
    item.dateLabel ??
    (item.dateStart ? formatDate(item.dateStart) : null);
  const meta = item.meta.filter((m) => m.label);
  const territorialContext =
    item.territorialContext ??
    meta.find((m) => m.iconKey === "map-pin")?.label ??
    null;
  // Fallback description → tagline en Tourism Card.
  const tagline = item.description ?? item.subtitle ?? null;
  return {
    id: `${item.kind}:${item.id}`,
    entityKind: item.kind as TourismEntityKind,
    eyebrow: showKindBadge ? undefined : null,
    name: item.title,
    href: item.href,
    tagline,
    businessName: item.businessName,
    mediaUrl: item.imageUrl,
    mediaAlt: item.imageAlt,
    rating: item.rating,
    location: item.location,
    territorialContext,
    highlights: item.highlights,
    badges: item.badges,
    institutionalBadges: item.institutionalBadges,
    dateLabel,
    availabilityLabel: item.availabilityLabel,
    priceAmount: item.priceAmount,
    priceCurrency: item.priceCurrency,
    priceHint: item.priceHint,
    primaryAction: item.primaryAction,
    secondaryAction: item.secondaryAction,
    rationale: item.rationale,
  };
}

function capsToTourism(
  caps: ExperienceRelatedCollectionDTO["capabilities"],
  density: ExperienceRelatedCollectionDTO["density"],
): Partial<TourismCardCapabilities> {
  return {
    showMedia: caps.showImage,
    showEyebrow: caps.showKindBadge,
    showBadges: caps.showBadges,
    showInstitutionalBadges: caps.showInstitutionalBadges,
    showRating: caps.showRating,
    showLocation: caps.showImage || caps.showMeta,
    showDistance: caps.showDistance,
    showTerritorialContext: caps.showTerritorialContext,
    showHighlights: caps.showHighlights,
    showDate: caps.showDate,
    showAvailability: caps.showAvailability,
    showPrice: caps.showPrice,
    showBusiness: true,
    showTagline: true,
    showPrimaryAction: true,
    showSecondaryAction: caps.showSecondaryAction,
    showFavorite: caps.showFavorite,
    showRationale: caps.showRationale,
    compact: density === "compact" || caps.compact,
  };
}

export function ExperienceRelatedCollection({
  dto,
  className,
  renderItemActions,
}: ExperienceRelatedCollectionProps) {
  const {
    variant,
    columns,
    density,
    heading,
    subheading,
    emptyMessage,
    ariaLabel,
    groups,
    capabilities,
  } = dto;

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
  const tourismCaps = capsToTourism(capabilities, density);
  const renderActionsAdapter = renderItemActions
    ? (vm: TourismCardVM) => {
        // El id del VM es `kind:id`, no lo usamos para lookup — el
        // slot original opera sobre el item completo.
        const original = groups
          .flatMap((g) => g.items)
          .find((it) => `${it.kind}:${it.id}` === vm.id);
        return original ? renderItemActions(original) : null;
      }
    : undefined;

  return (
    <section
      aria-label={ariaLabel}
      data-eb-block="experience-related-collection"
      data-eb-variant={variant}
      data-eb-density={density}
      className={cn("w-full", className)}
    >
      {heading || subheading ? (
        <header className="mb-5 flex flex-col gap-1">
          {heading ? (
            <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
          ) : null}
          {subheading ? (
            <p className="text-sm text-muted-foreground">{subheading}</p>
          ) : null}
        </header>
      ) : null}

      {totalItems === 0 ? (
        <div
          role="status"
          className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center"
        >
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((g) => {
            if (g.items.length === 0 && !g.emptyMessage) return null;
            const groupVariant = g.variant ?? variant;
            return (
              <div key={g.id}>
                {g.heading || g.subheading || g.seeAllHref ? (
                  <header className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      {g.heading ? (
                        <h3 className="text-xl font-semibold tracking-tight">
                          {g.heading}
                        </h3>
                      ) : null}
                      {g.subheading ? (
                        <p className="text-sm text-muted-foreground">
                          {g.subheading}
                        </p>
                      ) : null}
                    </div>
                    {g.seeAllHref ? (
                      <a
                        href={g.seeAllHref}
                        className="shrink-0 text-sm font-medium text-primary hover:underline"
                      >
                        {g.seeAllLabel ?? "Ver todos"}
                      </a>
                    ) : null}
                  </header>
                ) : null}

                {g.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                    {g.emptyMessage}
                  </div>
                ) : (
                  <ItemsLayout
                    variant={groupVariant}
                    columns={columns}
                    items={g.items}
                    capabilities={capabilities}
                    tourismCaps={tourismCaps}
                    renderItemActions={renderActionsAdapter}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Sub-componentes internos — layouts que delegan en TourismCard.
 * ------------------------------------------------------------------ */

interface ItemsLayoutProps {
  variant: ExperienceRelatedVariant;
  columns: number;
  items: ExperienceRelatedItem[];
  capabilities: ExperienceRelatedCollectionDTO["capabilities"];
  tourismCaps: Partial<TourismCardCapabilities>;
  renderItemActions?: (vm: TourismCardVM) => ReactNode;
}

function ItemsLayout({
  variant,
  columns,
  items,
  capabilities,
  tourismCaps,
  renderItemActions,
}: ItemsLayoutProps) {
  const showKindBadge = capabilities.showKindBadge;
  const toVM = (it: ExperienceRelatedItem) => relatedItemToVM(it, showKindBadge);

  if (variant === "carousel") {
    return (
      <ul
        role="list"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {items.map((it) => (
          <li
            key={`${it.kind}-${it.id}`}
            className="min-w-[260px] max-w-[300px] shrink-0 snap-start"
          >
            <TourismCard
              vm={toVM(it)}
              capabilities={tourismCaps}
              renderActions={renderItemActions}
            />
          </li>
        ))}
      </ul>
    );
  }
  if (variant === "list" || variant === "compact") {
    return (
      <ul role="list" className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={`${it.kind}-${it.id}`}>
            <TourismCardRow
              vm={toVM(it)}
              capabilities={{
                ...tourismCaps,
                compact: variant === "compact" || tourismCaps.compact,
              }}
              renderActions={renderItemActions}
            />
          </li>
        ))}
      </ul>
    );
  }
  if (variant === "featured") {
    return (
      <FeaturedTourismLayout
        items={items.map(toVM)}
        capabilities={tourismCaps}
        renderActions={renderItemActions}
      />
    );
  }
  // grid / masonry
  return (
    <ul
      role="list"
      className={cn(
        "grid gap-4",
        columns === 1
          ? "grid-cols-1"
          : columns === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : columns === 4
              ? "grid-cols-2 lg:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2",
      )}
    >
      {items.map((it) => (
        <li key={`${it.kind}-${it.id}`}>
          <TourismCard
            vm={toVM(it)}
            capabilities={tourismCaps}
            renderActions={renderItemActions}
          />
        </li>
      ))}
    </ul>
  );
}