/**
 * H-03 · Ola I3.b — `vmx.experience.related-collection` (Capa 1: Presentación).
 *
 * Componente puro. Recibe DTO validado y renderiza sin acceder a
 * contextos, hooks de datos ni server functions. Todas las variantes
 * viven aquí — la evolución futura ocurre añadiendo variantes o
 * capabilities, jamás duplicando el bloque.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  kindLabel,
  type ExperienceRelatedCollectionDTO,
  type ExperienceRelatedItem,
  type ExperienceRelatedVariant,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";

export interface ExperienceRelatedCollectionProps {
  dto: ExperienceRelatedCollectionDTO;
  className?: string;
  /** Slot opcional para inyectar acciones interactivas (Favoritos, Plan). */
  renderItemActions?: (item: ExperienceRelatedItem) => ReactNode;
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

export function ExperienceRelatedCollection({
  dto,
  className,
  renderItemActions,
}: ExperienceRelatedCollectionProps) {
  const {
    variant,
    columns,
    heading,
    subheading,
    emptyMessage,
    ariaLabel,
    groups,
    capabilities,
  } = dto;

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section
      aria-label={ariaLabel}
      data-eb-block="experience-related-collection"
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

      {totalItems === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
                  <p className="text-sm text-muted-foreground">
                    {g.emptyMessage}
                  </p>
                ) : (
                  <ItemsLayout
                    variant={groupVariant}
                    columns={columns}
                    items={g.items}
                    capabilities={capabilities}
                    renderItemActions={renderItemActions}
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
 * Sub-componentes internos
 * ------------------------------------------------------------------ */

interface ItemsLayoutProps {
  variant: ExperienceRelatedVariant;
  columns: number;
  items: ExperienceRelatedItem[];
  capabilities: ExperienceRelatedCollectionDTO["capabilities"];
  renderItemActions?: (item: ExperienceRelatedItem) => ReactNode;
}

function ItemsLayout({
  variant,
  columns,
  items,
  capabilities,
  renderItemActions,
}: ItemsLayoutProps) {
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
            <RelatedCard
              item={it}
              capabilities={capabilities}
              renderItemActions={renderItemActions}
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
            <RelatedRow
              item={it}
              capabilities={capabilities}
              renderItemActions={renderItemActions}
              compact={variant === "compact"}
            />
          </li>
        ))}
      </ul>
    );
  }
  if (variant === "featured") {
    const [featured, ...rest] = items;
    if (!featured) return null;
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RelatedCard
            item={featured}
            capabilities={capabilities}
            renderItemActions={renderItemActions}
          />
        </div>
        {rest.length > 0 ? (
          <ul role="list" className="flex flex-col gap-3">
            {rest.slice(0, 3).map((it) => (
              <li key={`${it.kind}-${it.id}`}>
                <RelatedRow
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
          <RelatedCard
            item={it}
            capabilities={capabilities}
            renderItemActions={renderItemActions}
          />
        </li>
      ))}
    </ul>
  );
}

interface ItemProps {
  item: ExperienceRelatedItem;
  capabilities: ExperienceRelatedCollectionDTO["capabilities"];
  renderItemActions?: (item: ExperienceRelatedItem) => ReactNode;
}

function RelatedCard({ item, capabilities, renderItemActions }: ItemProps) {
  const price = capabilities.showPrice
    ? formatPrice(item.priceAmount, item.priceCurrency)
    : null;
  const date = capabilities.showDate ? formatDate(item.dateStart) : null;
  const showMedia = capabilities.showImage && item.imageUrl;
  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary"
      data-eb-item-kind={item.kind}
    >
      {showMedia ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl!}
            alt={item.imageAlt ?? item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          {capabilities.showKindBadge ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {kindLabel(item.kind)}
            </p>
          ) : <span />}
          {capabilities.showBadges && item.badges.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1">
              {item.badges.map((b, i) => (
                <BadgeChip key={i} label={b.label} tone={b.tone} />
              ))}
            </div>
          ) : null}
        </div>
        <h4 className="mt-1 text-base font-semibold leading-tight">
          {item.href ? (
            <a href={item.href} className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h4>
        {item.subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
        {item.description ? (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        {(date || price) ? (
          <p className="mt-3 text-sm font-semibold">
            {[date, price].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {capabilities.showMeta && item.meta.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.meta.map((m, i) => (
              <li key={i}>{m.label}</li>
            ))}
          </ul>
        ) : null}
        {capabilities.showRationale && item.rationale ? (
          <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
            {item.rationale}
          </p>
        ) : null}
        {renderItemActions ? (
          <div className="mt-4 flex flex-col gap-2">{renderItemActions(item)}</div>
        ) : null}
      </div>
    </article>
  );
}

function RelatedRow({
  item,
  capabilities,
  renderItemActions,
  compact,
}: ItemProps & { compact?: boolean }) {
  const price = capabilities.showPrice
    ? formatPrice(item.priceAmount, item.priceCurrency)
    : null;
  const date = capabilities.showDate ? formatDate(item.dateStart) : null;
  return (
    <article
      className={cn(
        "flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary",
        compact ? "p-3" : "",
      )}
      data-eb-item-kind={item.kind}
    >
      {capabilities.showImage && item.imageUrl ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-lg bg-muted",
            compact ? "h-14 w-14" : "h-20 w-20",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.imageAlt ?? item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {capabilities.showKindBadge ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {kindLabel(item.kind)}
              </p>
            ) : null}
            <h4 className="truncate text-base font-semibold">
              {item.href ? (
                <a href={item.href} className="hover:underline">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h4>
            {item.subtitle ? (
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            ) : null}
            {!compact && item.description ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
          {date || price ? (
            <p className="shrink-0 text-sm font-semibold">
              {[date, price].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {capabilities.showRationale && item.rationale ? (
          <p className="mt-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-primary">
            {item.rationale}
          </p>
        ) : null}
        {renderItemActions ? (
          <div className="mt-2 flex flex-wrap gap-2">{renderItemActions(item)}</div>
        ) : null}
      </div>
    </article>
  );
}

function BadgeChip({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "primary" | "success" | "warning" | "info";
}) {
  return (
    <span
      className={cn(
        "rounded-pill px-2 py-0.5 text-[10px] font-semibold",
        tone === "primary"
          ? "bg-primary/10 text-primary"
          : tone === "success"
            ? "bg-emerald-500/10 text-emerald-600"
            : tone === "warning"
              ? "bg-amber-500/10 text-amber-700"
              : tone === "info"
                ? "bg-sky-500/10 text-sky-700"
                : "bg-muted text-foreground/70",
      )}
    >
      {label}
    </span>
  );
}