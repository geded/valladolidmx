/**
 * H-03 · Ola I2.c — `vmx.experience.reviews` (Capa 1: Presentación).
 *
 * Componente puro: recibe DTO validado y renderiza sin acceder a
 * contextos, hooks de datos ni server functions. Todas las variantes
 * viven aquí — la evolución futura ocurre añadiendo variantes o
 * capabilities, jamás duplicando el bloque.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  clampRating,
  ratingLabel,
  type ExperienceReviewItem,
  type ExperienceReviewsAggregate,
  type ExperienceReviewsDTO,
  type ExperienceReviewsPlatform,
} from "@/lib/experience-builder/blocks/experience-reviews/contract";

export interface ExperienceReviewsProps {
  dto: ExperienceReviewsDTO;
  className?: string;
  /** Slot opcional para inyectar acciones por reseña (útil, reportar, share). */
  renderItemActions?: (item: ExperienceReviewItem) => ReactNode;
  /** Slot opcional para acciones globales (escribir reseña, ver todas). */
  renderHeaderActions?: () => ReactNode;
}

const PLATFORM_LABEL: Record<ExperienceReviewsPlatform, string> = {
  internal: "Valladolid.mx",
  google: "Google",
  tripadvisor: "TripAdvisor",
  booking: "Booking",
  facebook: "Facebook",
  airbnb: "Airbnb",
  yelp: "Yelp",
  alux: "Alux",
  other: "Otra fuente",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  try {
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "short",
    }).format(new Date(t));
  } catch {
    return null;
  }
}

function StarLine({ rating, scale = 5, size = "sm" }: { rating: number; scale?: number; size?: "sm" | "md" | "lg" }) {
  const stars = clampRating(rating, scale);
  const cls =
    size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm";
  return (
    <span aria-label={`${stars} de 5 estrellas`} className={cn("text-primary", cls)}>
      {"★".repeat(stars)}
      <span className="text-muted-foreground">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

function PlatformBadge({ platform }: { platform: ExperienceReviewsPlatform }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

function Distribution({
  aggregate,
}: {
  aggregate: ExperienceReviewsAggregate;
}) {
  const total = Object.values(aggregate.distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1" role="list">
      {[5, 4, 3, 2, 1].map((k) => {
        const n = aggregate.distribution[k as 1 | 2 | 3 | 4 | 5];
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <li key={k} className="flex items-center gap-2 text-[11px]">
            <span className="w-6 text-right text-muted-foreground">{k}★</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="w-8 text-right tabular-nums text-muted-foreground">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AggregateCard({
  aggregate,
  showDistribution,
  showByPlatform,
}: {
  aggregate: ExperienceReviewsAggregate;
  showDistribution: boolean;
  showByPlatform: boolean;
}) {
  return (
    <aside
      data-eb-slot="reviews-aggregate"
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums">
          {aggregate.average != null ? aggregate.average.toFixed(1) : "—"}
        </span>
        <StarLine rating={aggregate.average ?? 0} size="md" />
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {ratingLabel(aggregate.average)}
        </span>
        <span> · {aggregate.count} reseña{aggregate.count === 1 ? "" : "s"}</span>
      </p>
      {showDistribution ? <Distribution aggregate={aggregate} /> : null}
      {showByPlatform && aggregate.byPlatform.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Por fuente
          </p>
          <ul role="list" className="flex flex-col gap-1">
            {aggregate.byPlatform.map((p) => (
              <li
                key={p.platform}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground/80">
                  {PLATFORM_LABEL[p.platform]}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {p.average.toFixed(1)} · {p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

interface ReviewCardProps {
  item: ExperienceReviewItem;
  capabilities: ExperienceReviewsDTO["capabilities"];
  renderItemActions?: (item: ExperienceReviewItem) => ReactNode;
  compact?: boolean;
}

function ReviewCard({ item, capabilities, renderItemActions, compact }: ReviewCardProps) {
  const date = formatDate(item.publishedAt);
  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border border-border bg-card",
        compact ? "p-4" : "p-5",
      )}
      data-eb-featured={item.featured || undefined}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StarLine rating={item.rating} scale={item.ratingScale} />
            {capabilities.showPlatformBadge ? (
              <PlatformBadge platform={item.platform} />
            ) : null}
            {item.featured ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Destacada
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-semibold">
            {item.author.displayName}
            {item.author.verified ? (
              <span
                className="ml-1 align-middle text-[10px] font-semibold text-primary"
                title="Autor verificado"
              >
                ✓
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {[
              item.author.location,
              capabilities.showTravelerType ? item.travelerType : null,
              capabilities.showLanguage ? item.language?.toUpperCase() ?? null : null,
              date,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>
      {item.title ? (
        <p className="text-base font-semibold leading-tight">{item.title}</p>
      ) : null}
      <p className={cn("whitespace-pre-line text-sm text-foreground/85", compact ? "line-clamp-4" : "")}>
        {item.body}
      </p>
      {capabilities.showTags && item.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/70"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}
      {capabilities.showBusinessResponse && item.response ? (
        <div className="mt-1 rounded-xl border border-dashed border-border bg-muted/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Respuesta del negocio
          </p>
          <p className="mt-1 text-xs font-medium text-foreground/90">
            {item.response.authorName}
            {item.response.authorRole ? (
              <span className="text-muted-foreground"> · {item.response.authorRole}</span>
            ) : null}
          </p>
          <p className="mt-1 whitespace-pre-line text-xs text-foreground/80">
            {item.response.body}
          </p>
        </div>
      ) : null}
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          {capabilities.showHelpful && item.helpfulCount != null ? (
            <span>Útil · {item.helpfulCount}</span>
          ) : null}
          {capabilities.showExternalLink && item.externalUrl ? (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary hover:underline"
            >
              Ver original ↗
            </a>
          ) : null}
        </div>
        {renderItemActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {renderItemActions(item)}
          </div>
        ) : null}
      </footer>
    </article>
  );
}

function groupItems(
  items: ExperienceReviewItem[],
  groupBy: ExperienceReviewsDTO["groupBy"],
): Array<{ key: string; label: string | null; items: ExperienceReviewItem[] }> {
  if (groupBy === "none") return [{ key: "all", label: null, items }];
  const map = new Map<string, ExperienceReviewItem[]>();
  for (const it of items) {
    let key = "otros";
    if (groupBy === "platform") key = it.platform;
    else if (groupBy === "language") key = it.language ?? "sin-idioma";
    else if (groupBy === "travelerType") key = it.travelerType ?? "sin-tipo";
    else if (groupBy === "rating") {
      const norm = clampRating(it.rating, it.ratingScale);
      key = `${norm}`;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label:
      groupBy === "platform"
        ? PLATFORM_LABEL[key as ExperienceReviewsPlatform] ?? key
        : groupBy === "rating"
          ? `${key}★`
          : key,
    items: list,
  }));
}

function JsonLd({ dto }: { dto: ExperienceReviewsDTO }) {
  if (!dto.capabilities.seoJsonLd || !dto.aggregate || dto.aggregate.count === 0) {
    return null;
  }
  const payload = {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    ratingValue: dto.aggregate.average,
    reviewCount: dto.aggregate.count,
    bestRating: 5,
    worstRating: 1,
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

export function ExperienceReviews({
  dto,
  className,
  renderItemActions,
  renderHeaderActions,
}: ExperienceReviewsProps) {
  const {
    variant,
    heading,
    subheading,
    emptyMessage,
    columns,
    groupBy,
    ariaLabel,
    items,
    aggregate,
    capabilities,
  } = dto;

  const showAggregate = capabilities.showAggregate && aggregate != null && aggregate.count > 0;

  const wrap = (children: ReactNode) => (
    <section
      aria-label={ariaLabel}
      data-eb-block="experience-reviews"
      data-eb-variant={variant}
      className={cn("w-full", className)}
    >
      <JsonLd dto={dto} />
      {heading || subheading || renderHeaderActions ? (
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            {heading ? (
              <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
            ) : null}
            {subheading ? (
              <p className="text-sm text-muted-foreground">{subheading}</p>
            ) : null}
          </div>
          {renderHeaderActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {renderHeaderActions()}
            </div>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );

  if (variant === "summary") {
    if (!aggregate || aggregate.count === 0) {
      return wrap(<p className="text-sm text-muted-foreground">{emptyMessage}</p>);
    }
    return wrap(
      <AggregateCard
        aggregate={aggregate}
        showDistribution={capabilities.showAggregateDistribution}
        showByPlatform={capabilities.showByPlatform}
      />,
    );
  }

  if (items.length === 0 && !showAggregate) {
    return wrap(<p className="text-sm text-muted-foreground">{emptyMessage}</p>);
  }

  const groups = groupItems(items, groupBy);

  const bodyGrid = (list: ExperienceReviewItem[]) => (
    <ul
      role="list"
      className={cn(
        "grid gap-4",
        columns === 1
          ? "grid-cols-1"
          : columns === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : columns === 4
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2",
      )}
    >
      {list.map((it) => (
        <li key={it.id}>
          <ReviewCard
            item={it}
            capabilities={capabilities}
            renderItemActions={renderItemActions}
          />
        </li>
      ))}
    </ul>
  );

  const bodyList = (list: ExperienceReviewItem[]) => (
    <ul role="list" className="flex flex-col gap-4">
      {list.map((it) => (
        <li key={it.id}>
          <ReviewCard
            item={it}
            capabilities={capabilities}
            renderItemActions={renderItemActions}
          />
        </li>
      ))}
    </ul>
  );

  const bodyCarousel = (list: ExperienceReviewItem[]) => (
    <ul
      role="list"
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
    >
      {list.map((it) => (
        <li key={it.id} className="min-w-[280px] max-w-[340px] shrink-0 snap-start">
          <ReviewCard
            item={it}
            capabilities={capabilities}
            renderItemActions={renderItemActions}
          />
        </li>
      ))}
    </ul>
  );

  const bodyCompact = (list: ExperienceReviewItem[]) => (
    <ul role="list" className="flex flex-col divide-y divide-border">
      {list.map((it) => (
        <li key={it.id} className="flex items-center gap-3 py-2">
          <StarLine rating={it.rating} scale={it.ratingScale} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">
              {it.author.displayName}
              <span className="ml-1 text-muted-foreground">
                · {PLATFORM_LABEL[it.platform]}
              </span>
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{it.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  const bodyFeatured = (list: ExperienceReviewItem[]) => {
    if (list.length === 0) return null;
    const [primary, ...rest] = list;
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReviewCard
            item={primary}
            capabilities={capabilities}
            renderItemActions={renderItemActions}
          />
        </div>
        <ul role="list" className="flex flex-col gap-3">
          {rest.slice(0, 3).map((it) => (
            <li key={it.id}>
              <ReviewCard
                item={it}
                capabilities={capabilities}
                renderItemActions={renderItemActions}
                compact
              />
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const bodyWall = (list: ExperienceReviewItem[]) => (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {list.map((it) => (
        <ReviewCard
          key={it.id}
          item={it}
          capabilities={capabilities}
          renderItemActions={renderItemActions}
        />
      ))}
    </div>
  );

  const renderBody = (list: ExperienceReviewItem[]): ReactNode => {
    if (list.length === 0) return null;
    if (variant === "grid") return bodyGrid(list);
    if (variant === "carousel") return bodyCarousel(list);
    if (variant === "compact") return bodyCompact(list);
    if (variant === "featured") return bodyFeatured(list);
    if (variant === "wall") return bodyWall(list);
    return bodyList(list);
  };

  const listSide = (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label ? (
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {g.label}
            </h3>
          ) : null}
          {renderBody(g.items)}
        </div>
      ))}
    </div>
  );

  if (showAggregate) {
    return wrap(
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <AggregateCard
          aggregate={aggregate!}
          showDistribution={capabilities.showAggregateDistribution}
          showByPlatform={capabilities.showByPlatform}
        />
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          listSide
        )}
      </div>,
    );
  }

  return wrap(listSide);
}