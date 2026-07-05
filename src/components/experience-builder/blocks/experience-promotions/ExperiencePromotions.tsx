/**
 * H-03 · Ola I2.b — `vmx.experience.promotions` (Capa 1: Presentación).
 *
 * Componente puro: recibe DTO validado y renderiza sin acceder a
 * contextos, hooks de datos ni server functions. Todas las variantes
 * viven aquí — la evolución futura ocurre añadiendo variantes o
 * capabilities, jamás duplicando el bloque.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  computeUrgencyDays,
  type ExperiencePromotionItem,
  type ExperiencePromotionsDTO,
} from "@/lib/experience-builder/blocks/experience-promotions/contract";

export interface ExperiencePromotionsProps {
  dto: ExperiencePromotionsDTO;
  className?: string;
  /**
   * Slot opcional para inyectar acciones interactivas por item
   * (FavoriteButton, CopyCoupon, share) desde la capa de comportamiento.
   * Mantiene la presentación 100% pura.
   */
  renderItemActions?: (item: ExperiencePromotionItem) => ReactNode;
}

function formatMoney(amount: number | null, currency: string | null): string | null {
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

function urgencyToneFor(days: number | null): "danger" | "warning" | null {
  if (days == null) return null;
  if (days <= 3) return "danger";
  if (days <= 14) return "warning";
  return null;
}

function urgencyLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days < 0) return "Expiró";
  if (days === 0) return "Termina hoy";
  if (days === 1) return "Termina mañana";
  if (days <= 14) return `Termina en ${days} días`;
  return null;
}

function groupItems(
  items: ExperiencePromotionItem[],
  groupBy: ExperiencePromotionsDTO["groupBy"],
): Array<{ key: string; label: string | null; items: ExperiencePromotionItem[] }> {
  if (groupBy === "none") return [{ key: "all", label: null, items }];
  const map = new Map<string, ExperiencePromotionItem[]>();
  for (const it of items) {
    let key = "otros";
    if (groupBy === "business") key = it.businessName?.trim() || "otros";
    if (groupBy === "urgency") {
      const days = computeUrgencyDays(it.endsAt);
      key = days == null ? "sin-fecha" : days <= 3 ? "expira-pronto" : days <= 14 ? "esta-quincena" : "abierta";
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  const labelMap: Record<string, string> = {
    "expira-pronto": "Expira pronto",
    "esta-quincena": "Termina esta quincena",
    abierta: "Vigencia amplia",
    "sin-fecha": "Sin fecha",
  };
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: labelMap[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
    items: list,
  }));
}

export function ExperiencePromotions({
  dto,
  className,
  renderItemActions,
}: ExperiencePromotionsProps) {
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
      data-eb-block="experience-promotions"
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

  if (variant === "banner") {
    // Banner: usa sólo el primer item como hero-strip.
    const [primary] = items;
    return wrap(
      <PromotionBanner
        item={primary}
        capabilities={capabilities}
        renderItemActions={renderItemActions}
      />,
    );
  }

  if (variant === "strip") {
    return wrap(
      <ul
        role="list"
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {items.map((it) => (
          <li key={it.id} className="min-w-[240px] max-w-[280px] shrink-0 snap-start">
            <PromotionStripCard
              item={it}
              capabilities={capabilities}
              renderItemActions={renderItemActions}
            />
          </li>
        ))}
      </ul>,
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
                <li key={it.id} className="min-w-[260px] max-w-[320px] shrink-0 snap-start">
                  <PromotionCard
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
                  <PromotionRow
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
                  <PromotionCard
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
  item: ExperiencePromotionItem;
  capabilities: ExperiencePromotionsDTO["capabilities"];
  renderItemActions?: (item: ExperiencePromotionItem) => ReactNode;
}

function DiscountBadge({
  item,
  compact,
}: {
  item: ExperiencePromotionItem;
  compact?: boolean;
}) {
  const label =
    item.discountLabel?.trim() ||
    (item.discountPercent != null ? `−${item.discountPercent}%` : null);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill bg-primary/10 font-semibold text-primary",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      )}
    >
      {label}
    </span>
  );
}

function UrgencyTag({ item, enabled }: { item: ExperiencePromotionItem; enabled: boolean }) {
  if (!enabled) return null;
  const days = computeUrgencyDays(item.endsAt);
  const tone = urgencyToneFor(days);
  const label = urgencyLabel(days);
  if (!tone || !label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold",
        tone === "danger"
          ? "bg-red-500/10 text-red-600"
          : "bg-amber-500/10 text-amber-700",
      )}
    >
      {label}
    </span>
  );
}

function BadgesRow({ item }: { item: ExperiencePromotionItem }) {
  if (item.badges.length === 0) return null;
  return (
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
                  : b.tone === "danger"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-muted text-foreground/70",
          )}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

function PriceLine({ item }: { item: ExperiencePromotionItem }) {
  const promo = formatMoney(item.pricePromo, item.priceCurrency);
  const original = formatMoney(item.priceOriginal, item.priceCurrency);
  if (!promo && !original) return null;
  return (
    <p className="mt-3 flex items-baseline gap-2 text-sm">
      {promo ? <span className="font-semibold">{promo}</span> : null}
      {original && original !== promo ? (
        <span className="text-xs text-muted-foreground line-through">{original}</span>
      ) : null}
    </p>
  );
}

function CouponLine({ item, enabled }: { item: ExperiencePromotionItem; enabled: boolean }) {
  if (!enabled || !item.couponCode) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 text-[11px] font-mono uppercase tracking-wider">
      <span className="text-muted-foreground">Cupón</span>
      <span className="font-semibold">{item.couponCode}</span>
    </p>
  );
}

function PromotionCard({
  item,
  capabilities,
  renderItemActions,
  variant,
}: ItemProps & { variant: "grid" | "carousel" }) {
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
            alt={item.mediaAlt ?? item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {capabilities.showDiscount ? <DiscountBadge item={item} /> : null}
            <UrgencyTag item={item} enabled={capabilities.urgencyAware && capabilities.showExpiry} />
          </div>
          <BadgesRow item={item} />
        </div>
        <h3 className="mt-2 text-base font-semibold leading-tight">
          {item.href ? (
            <a href={item.href} className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {capabilities.showBusiness && item.businessName ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.businessName}</p>
        ) : null}
        {item.description ? (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <PriceLine item={item} />
        <CouponLine item={item} enabled={capabilities.showCouponCode} />
        {(capabilities.showFavorite || capabilities.showActions) && renderItemActions ? (
          <div className="mt-4 flex flex-col gap-2">{renderItemActions(item)}</div>
        ) : null}
      </div>
    </article>
  );
}

function PromotionRow({ item, capabilities, renderItemActions }: ItemProps) {
  return (
    <article className="flex gap-4 rounded-2xl border border-border bg-card p-4">
      {capabilities.showMedia && item.mediaUrl ? (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.mediaUrl}
            alt={item.mediaAlt ?? item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {capabilities.showDiscount ? <DiscountBadge item={item} compact /> : null}
              <UrgencyTag
                item={item}
                enabled={capabilities.urgencyAware && capabilities.showExpiry}
              />
            </div>
            <h3 className="mt-1 truncate text-base font-semibold">
              {item.href ? (
                <a href={item.href} className="hover:underline">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h3>
            {item.description ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
          <PriceLine item={item} />
        </div>
        <CouponLine item={item} enabled={capabilities.showCouponCode} />
        {(capabilities.showFavorite || capabilities.showActions) && renderItemActions ? (
          <div className="mt-2 flex flex-wrap gap-2">{renderItemActions(item)}</div>
        ) : null}
      </div>
    </article>
  );
}

function PromotionStripCard({ item, capabilities, renderItemActions }: ItemProps) {
  return (
    <article className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        {capabilities.showDiscount ? <DiscountBadge item={item} compact /> : null}
        <UrgencyTag item={item} enabled={capabilities.urgencyAware && capabilities.showExpiry} />
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
      {capabilities.showBusiness && item.businessName ? (
        <p className="text-[11px] text-muted-foreground">{item.businessName}</p>
      ) : null}
      <CouponLine item={item} enabled={capabilities.showCouponCode} />
      {(capabilities.showFavorite || capabilities.showActions) && renderItemActions ? (
        <div className="mt-auto flex flex-wrap gap-1 pt-1">{renderItemActions(item)}</div>
      ) : null}
    </article>
  );
}

function PromotionBanner({ item, capabilities, renderItemActions }: ItemProps) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {capabilities.showDiscount ? <DiscountBadge item={item} /> : null}
          <UrgencyTag item={item} enabled={capabilities.urgencyAware && capabilities.showExpiry} />
        </div>
        <h3 className="mt-1 text-lg font-semibold">
          {item.href ? (
            <a href={item.href} className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {item.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        ) : null}
        <CouponLine item={item} enabled={capabilities.showCouponCode} />
      </div>
      {(capabilities.showFavorite || capabilities.showActions) && renderItemActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {renderItemActions(item)}
        </div>
      ) : null}
    </article>
  );
}

function FeaturedLayout({
  items,
  capabilities,
  renderItemActions,
}: {
  items: ExperiencePromotionItem[];
  capabilities: ExperiencePromotionsDTO["capabilities"];
  renderItemActions?: (item: ExperiencePromotionItem) => ReactNode;
}) {
  const [featured, ...rest] = items;
  if (!featured) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PromotionCard
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
              <PromotionRow
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