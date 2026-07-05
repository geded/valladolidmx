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
  const showMedia = capabilities.showMedia && item.mediaUrl;
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card",
        variant === "carousel" ? "" : "",
      )}
    >
      {showMedia ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.mediaUrl!}
            alt={item.mediaAlt ?? item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          {item.productType ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.productType}
            </p>
          ) : <span />}
          {item.badges.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1">
              {item.badges.map((b, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-pill px-2 py-0.5 text-[10px] font-semibold",
                    b.tone === "primary"
                      ? "bg-primary/10 text-primary"
                      : b.tone === "success"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : b.tone === "warning"
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-muted text-foreground/70",
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
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
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {item.tagline}
          </p>
        ) : null}
        {capabilities.showPrice && price ? (
          <p className="mt-3 text-sm font-semibold">{price}</p>
        ) : null}
        {(capabilities.showFavorite || capabilities.showActions) &&
        renderItemActions ? (
          <div className="mt-4 flex flex-col gap-2">{renderItemActions(item)}</div>
        ) : null}
      </div>
    </article>
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