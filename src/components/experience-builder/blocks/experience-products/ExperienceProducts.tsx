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

function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  if (amount === 0) return "Gratis";
  const c = (currency ?? "MXN").toUpperCase();
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${c} ${amount.toFixed(0)}`;
  }
}

/* ------------------------------------------------------------------ *
 * v1.1.0 — Tourism Card helpers (Founder Experience Rule).
 * ------------------------------------------------------------------ */

const ENTITY_KIND_LABEL: Record<ExperienceEntityKind, string> = {
  product: "Producto",
  business: "Empresa",
  hotel: "Hospedaje",
  restaurant: "Restaurante",
  experience: "Experiencia",
  event: "Evento",
  destination: "Destino",
  landing: "Landing",
};

function entityEyebrow(item: ExperienceProductItem): string | null {
  if (item.entityKind) return ENTITY_KIND_LABEL[item.entityKind];
  if (item.productType) return item.productType;
  return null;
}

function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5", className)}
      fill="currentColor"
    >
      <path d="M10 1.6l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.7 1-5.8L1.5 7.8l5.9-.9L10 1.6z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M10 18s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" />
      <circle cx="10" cy="8" r="2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5V10l3 2" strokeLinecap="round" />
    </svg>
  );
}

function badgeToneClass(tone: ExperienceProductItem["badges"][number]["tone"]): string {
  switch (tone) {
    case "primary":
      return "bg-primary/10 text-primary";
    case "success":
      return "bg-success/10 text-success";
    case "warning":
      return "bg-warning/10 text-warning";
    default:
      return "bg-muted text-foreground/75";
  }
}

function MediaPlaceholder({ kind }: { kind: ExperienceEntityKind | null }) {
  // Gradiente cálido inspirado en la piedra colonial de Valladolid.
  // Diferencia entidades por matiz pero mantiene la misma familia.
  const gradient: Record<ExperienceEntityKind | "default", string> = {
    product: "from-primary/30 via-primary/10 to-warning/20",
    business: "from-success/30 via-primary/10 to-warning/20",
    hotel: "from-info/30 via-primary/10 to-warning/20",
    restaurant: "from-warning/40 via-primary/10 to-destructive/10",
    experience: "from-primary/40 via-warning/20 to-success/10",
    event: "from-destructive/20 via-warning/30 to-primary/20",
    destination: "from-info/30 via-success/10 to-warning/20",
    landing: "from-primary/20 via-muted to-warning/20",
    default: "from-primary/20 via-muted to-warning/20",
  };
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-full w-full bg-gradient-to-br",
        gradient[kind ?? "default"],
      )}
    />
  );
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
                  <ProductCard
                    item={it}
                    capabilities={capabilities}
                    renderItemActions={renderItemActions}
                    variant="carousel"
                  />
                </li>
              ))}
            </ul>
          ) : variant === "list" ? (
            <ul role="list" className="flex flex-col gap-3">
              {g.items.map((it) => (
                <li key={it.id}>
                  <ProductRow
                    item={it}
                    capabilities={capabilities}
                    renderItemActions={renderItemActions}
                  />
                </li>
              ))}
            </ul>
          ) : variant === "featured" ? (
            <FeaturedLayout
              items={g.items}
              capabilities={capabilities}
              renderItemActions={renderItemActions}
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
                  <ProductCard
                    item={it}
                    capabilities={capabilities}
                    renderItemActions={renderItemActions}
                    variant="grid"
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

/* ------------------------------------------------------------------ *
 * Sub-componentes internos
 * ------------------------------------------------------------------ */

interface ItemProps {
  item: ExperienceProductItem;
  capabilities: ExperienceProductsDTO["capabilities"];
  renderItemActions?: (item: ExperienceProductItem) => ReactNode;
}

function ProductCard({
  item,
  capabilities,
  renderItemActions,
  variant,
}: ItemProps & { variant: "grid" | "carousel" }) {
  const price = formatPrice(item.priceAmount, item.priceCurrency);
  const showMedia = capabilities.showMedia;
  const eyebrow = entityEyebrow(item);
  const distance = formatDistance(item.location?.distanceKm);
  const highlights = item.highlights.slice(0, 3);
  return (
    <article
      data-eb-entity={item.entityKind ?? undefined}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated",
      )}
    >
      {showMedia ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {item.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.mediaUrl}
              alt={item.mediaAlt ?? item.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <MediaPlaceholder kind={item.entityKind} />
          )}
          {/* Eyebrow: ¿QUÉ ES? */}
          {eyebrow ? (
            <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-soft backdrop-blur">
              {eyebrow}
            </span>
          ) : null}
          {/* Diferenciadores institucionales/badges: ¿QUÉ LA HACE DIFERENTE? */}
          {item.badges.length > 0 ? (
            <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1">
              {item.badges.slice(0, 2).map((b, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-pill px-2 py-0.5 text-[10px] font-semibold shadow-soft backdrop-blur",
                    badgeToneClass(b.tone),
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}
          {/* Fecha/horario: contexto temporal para eventos y experiencias */}
          {item.dateLabel ? (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-pill bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-soft backdrop-blur">
              <ClockIcon />
              {item.dateLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        {/* ¿DÓNDE ESTÁ? */}
        {item.location ? (
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <PinIcon />
            <span className="truncate">{item.location.label}</span>
            {distance ? (
              <span className="ml-auto shrink-0 rounded-pill bg-muted px-1.5 py-0.5 text-[10px] text-foreground/70">
                {distance}
              </span>
            ) : null}
          </p>
        ) : null}

        {/* ¿QUÉ ES? (título) */}
        <h3 className="mt-1 text-base font-semibold leading-tight">
          {item.href ? (
            <a href={item.href} className="hover:underline">
              {item.name}
            </a>
          ) : (
            item.name
          )}
        </h3>
        {capabilities.showBusiness && item.businessName ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.businessName}</p>
        ) : null}
        {item.tagline ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.tagline}
          </p>
        ) : null}

        {/* ¿POR QUÉ VALE LA PENA? (rating) */}
        {item.rating ? (
          <p className="mt-2 flex items-center gap-1 text-xs">
            <StarIcon className="text-warning" />
            <span className="font-semibold text-foreground">
              {item.rating.value.toFixed(1)}
            </span>
            {item.rating.count > 0 ? (
              <span className="text-muted-foreground">
                ({item.rating.count} reseñas)
              </span>
            ) : null}
          </p>
        ) : null}

        {/* ¿QUÉ LA HACE DIFERENTE? (highlights) */}
        {highlights.length > 0 ? (
          <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/80"
              >
                {h}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Precio + CTA (¿QUÉ ACCIÓN REALIZAR AHORA?) */}
        <div className="mt-auto pt-4">
          {(capabilities.showPrice && (price || item.priceHint)) ? (
            <p className="flex items-baseline gap-1.5">
              {price ? (
                <span className="text-base font-bold text-foreground">
                  {price}
                </span>
              ) : null}
              {item.priceHint ? (
                <span className="text-xs text-muted-foreground">
                  {item.priceHint}
                </span>
              ) : null}
            </p>
          ) : null}
          <PrimaryCta primary={item.primaryAction} secondary={item.secondaryAction} />
          {(capabilities.showFavorite || capabilities.showActions) &&
          renderItemActions ? (
            <div className="mt-2 flex flex-col gap-2">{renderItemActions(item)}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PrimaryCta({
  primary,
  secondary,
}: {
  primary: ExperienceProductItem["primaryAction"];
  secondary: ExperienceProductItem["secondaryAction"];
}) {
  if (!primary && !secondary) return null;
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      {primary ? (
        <a
          href={primary.href ?? "#"}
          className="inline-flex flex-1 items-center justify-center rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {primary.label}
        </a>
      ) : null}
      {secondary ? (
        <a
          href={secondary.href ?? "#"}
          className="inline-flex items-center justify-center rounded-pill border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {secondary.label}
        </a>
      ) : null}
    </div>
  );
}

function ProductRow({ item, capabilities, renderItemActions }: ItemProps) {
  const price = formatPrice(item.priceAmount, item.priceCurrency);
  return (
    <article className="flex gap-4 rounded-2xl border border-border bg-card p-4">
      {capabilities.showMedia && item.mediaUrl ? (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.mediaUrl}
            alt={item.mediaAlt ?? item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.productType ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.productType}
              </p>
            ) : null}
            <h3 className="truncate text-base font-semibold">
              {item.href ? (
                <a href={item.href} className="hover:underline">
                  {item.name}
                </a>
              ) : (
                item.name
              )}
            </h3>
            {item.tagline ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {item.tagline}
              </p>
            ) : null}
          </div>
          {capabilities.showPrice && price ? (
            <p className="shrink-0 text-sm font-semibold">{price}</p>
          ) : null}
        </div>
        {(capabilities.showFavorite || capabilities.showActions) &&
        renderItemActions ? (
          <div className="mt-2 flex flex-wrap gap-2">{renderItemActions(item)}</div>
        ) : null}
      </div>
    </article>
  );
}

function FeaturedLayout({
  items,
  capabilities,
  renderItemActions,
}: {
  items: ExperienceProductItem[];
  capabilities: ExperienceProductsDTO["capabilities"];
  renderItemActions?: (item: ExperienceProductItem) => ReactNode;
}) {
  const [featured, ...rest] = items;
  if (!featured) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProductCard
          item={featured}
          capabilities={capabilities}
          renderItemActions={renderItemActions}
          variant="grid"
        />
      </div>
      {rest.length > 0 ? (
        <ul role="list" className="flex flex-col gap-3">
          {rest.slice(0, 3).map((it) => (
            <li key={it.id}>
              <ProductRow
                item={it}
                capabilities={capabilities}
                renderItemActions={renderItemActions}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}