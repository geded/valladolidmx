/**
 * H-03 · Ola I2.a — `vmx.experience.products` (Capa 1: Presentación).
 *
 * Componente puro: recibe DTO validado y renderiza sin acceder a
 * contextos, hooks de datos ni server functions. Todas las variantes
 * viven aquí — la evolución futura ocurre añadiendo variantes o
 * capabilities, jamás duplicando el bloque.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  ExperienceEntityKind,
  ExperienceProductItem,
  ExperienceProductsDTO,
} from "@/lib/experience-builder/blocks/experience-products/contract";
import {
  TourismCard,
  TourismCardRow,
  FeaturedTourismLayout,
  type TourismCardVM,
  type TourismCardCapabilities,
  type TourismEntityKind,
} from "@/components/experience-builder/tourism-card/TourismCard";

export interface ExperienceProductsProps {
  dto: ExperienceProductsDTO;
  className?: string;
  /**
   * Slot opcional para inyectar acciones interactivas por item
   * (FavoriteButton, ProductActions) desde la capa de comportamiento.
   * Mantiene el bloque de presentación 100% puro.
   */
  renderItemActions?: (item: ExperienceProductItem) => ReactNode;
}

/* ------------------------------------------------------------------ *
 * Mapping ExperienceProductItem → TourismCardVM (U1.2).
 * `experience-products` NO renderiza su propia card: delega al
 * componente oficial TourismCard, la MISMA familia que consume
 * `experience-related-collection` (Founder: single card family).
 * ------------------------------------------------------------------ */
function productItemToVM(item: ExperienceProductItem): TourismCardVM {
  return {
    id: item.id,
    entityKind: (item.entityKind ?? null) as TourismEntityKind | null,
    eyebrow: item.entityKind ? null : (item.productType ?? null),
    name: item.name,
    href: item.href,
    tagline: item.tagline,
    businessName: item.businessName,
    mediaUrl: item.mediaUrl,
    mediaAlt: item.mediaAlt,
    rating: item.rating,
    location: item.location,
    territorialContext: null,
    highlights: item.highlights,
    badges: item.badges.map((b) => ({ label: b.label, tone: b.tone })),
    institutionalBadges: [],
    dateLabel: item.dateLabel,
    availabilityLabel: null,
    priceAmount: item.priceAmount,
    priceCurrency: item.priceCurrency,
    priceHint: item.priceHint,
    primaryAction: item.primaryAction
      ? { label: item.primaryAction.label, href: item.primaryAction.href }
      : null,
    secondaryAction: item.secondaryAction
      ? { label: item.secondaryAction.label, href: item.secondaryAction.href }
      : null,
    rationale: null,
  };
}

function productCapsToVM(
  caps: ExperienceProductsDTO["capabilities"],
): Partial<TourismCardCapabilities> {
  return {
    showMedia: caps.showMedia,
    showPrice: caps.showPrice,
    showBusiness: caps.showBusiness,
    showFavorite: caps.showFavorite,
    compact: caps.compact,
    // resto de capabilities usan defaults del TourismCard (rating,
    // location, distance, highlights, badges, dateLabel, actions ON).
  };
}

function groupItems(
  items: ExperienceProductItem[],
  groupBy: ExperienceProductsDTO["groupBy"],
): Array<{ key: string; label: string | null; items: ExperienceProductItem[] }> {
  if (groupBy !== "type") return [{ key: "all", label: null, items }];
  const map = new Map<string, ExperienceProductItem[]>();
  for (const it of items) {
    const key = it.productType?.trim() || "otros";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    items: list,
  }));
}

export function ExperienceProducts({
  dto,
  className,
  renderItemActions,
}: ExperienceProductsProps) {
  const {
    variant,
    heading,
    subheading,
    emptyMessage,
    columns,
    groupBy,
    ariaLabel,
    items,
    capabilities,
  } = dto;

  const vmCaps = productCapsToVM(capabilities);
  const wrapRender =
    renderItemActions
      ? (vm: TourismCardVM) => {
          const original = items.find((it) => it.id === vm.id);
          return original ? renderItemActions(original) : null;
        }
      : undefined;

  const wrap = (children: ReactNode) => (
    <section
      aria-label={ariaLabel}
      data-eb-block="experience-products"
      data-eb-variant={variant}
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
      {children}
    </section>
  );

  if (items.length === 0) {
    return wrap(
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>,
    );
  }

  const groups = groupItems(items, groupBy);

  return wrap(
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label ? (
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {g.label}
            </h3>
          ) : null}
          {variant === "carousel" ? (
            <ul
              role="list"
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
            >
              {g.items.map((it) => (
                <li
                  key={it.id}
                  className="min-w-[260px] max-w-[300px] shrink-0 snap-start"
                >
                  <TourismCard
                    vm={productItemToVM(it)}
                    capabilities={vmCaps}
                    renderActions={wrapRender}
                  />
                </li>
              ))}
            </ul>
          ) : variant === "list" ? (
            <ul role="list" className="flex flex-col gap-3">
              {g.items.map((it) => (
                <li key={it.id}>
                  <TourismCardRow
                    vm={productItemToVM(it)}
                    capabilities={vmCaps}
                    renderActions={wrapRender}
                  />
                </li>
              ))}
            </ul>
          ) : variant === "featured" ? (
            <FeaturedTourismLayout
              items={g.items.map(productItemToVM)}
              capabilities={vmCaps}
              renderActions={wrapRender}
            />
          ) : (
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
              {g.items.map((it) => (
                <li key={it.id}>
                  <TourismCard
                    vm={productItemToVM(it)}
                    capabilities={vmCaps}
                    renderActions={wrapRender}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>,
  );
}