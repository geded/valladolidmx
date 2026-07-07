/**
 * H-03 · U1.2 — Tourism Card (Presentación oficial reutilizable).
 *
 * Card oficial del ecosistema turístico Valladolid.mx. Un único
 * componente para toda la familia (empresa, producto, hotel,
 * restaurante, experiencia, evento, promoción, ruta, destino, región,
 * categoría). Extraída de `experience-products` en U1.2 para que
 * `experience-related-collection` y futuros bloques la reutilicen sin
 * fabricar cards paralelas (Regla Single Card Family).
 *
 * Founder Experience Rule — cada card debe responder above-the-fold:
 *   1. ¿Qué es?           → eyebrow + título.
 *   2. ¿Por qué vale?     → rating + reseñas.
 *   3. ¿Dónde está?       → location + distancia.
 *   4. ¿Qué la diferencia?→ highlights + badges institucionales.
 *   5. ¿Qué acción hacer? → primaryAction / secondaryAction.
 *
 * Founder Design Principle — identidad Oriente Maya, no clonar
 * Airbnb / TripAdvisor / Google Travel. Piedra colonial, calidez,
 * jerarquía clara, distintivos institucionales visibles.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * View Model — común a toda la Biblioteca Turística.
 * ------------------------------------------------------------------ */
export type TourismEntityKind =
  | "product"
  | "business"
  | "hotel"
  | "restaurant"
  | "experience"
  | "event"
  | "destination"
  | "landing"
  | "promotion"
  | "route"
  | "region"
  | "category"
  | "mixed";

export const TOURISM_ENTITY_LABEL: Record<TourismEntityKind, string> = {
  product: "Producto",
  business: "Empresa",
  hotel: "Hospedaje",
  restaurant: "Restaurante",
  experience: "Experiencia",
  event: "Evento",
  destination: "Destino",
  landing: "Landing",
  promotion: "Promoción",
  route: "Ruta",
  region: "Región",
  category: "Categoría",
  mixed: "Descubrir",
};

export type TourismCardBadgeTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "info";

export interface TourismCardBadge {
  label: string;
  tone: TourismCardBadgeTone;
}

export interface TourismCardAction {
  label: string;
  href: string | null;
}

export interface TourismCardVM {
  id: string;
  entityKind: TourismEntityKind | null;
  /** Override manual del eyebrow (ej. tipo de producto o categoría). */
  eyebrow?: string | null;
  /** Letra asignada en un mapa sincronizado (A, B, C…). */
  mapLabel?: string | null;
  name: string;
  href: string | null;
  tagline: string | null;
  businessName: string | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  rating: { value: number; count: number } | null;
  location: { label: string; distanceKm: number | null } | null;
  /** Territorial context: destino / región (chip debajo del título). */
  territorialContext: string | null;
  highlights: string[];
  badges: TourismCardBadge[];
  /** Distintivos institucionales oficiales (Pueblo Mágico, etc.). */
  institutionalBadges: TourismCardBadge[];
  dateLabel: string | null;
  availabilityLabel: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceHint: string | null;
  primaryAction: TourismCardAction | null;
  secondaryAction: TourismCardAction | null;
  /** Explainable-by-default: motivo por el que aparece esta card. */
  rationale?: string | null;
}

export interface TourismCardCapabilities {
  showMedia: boolean;
  showEyebrow: boolean;
  showBusiness: boolean;
  showTagline: boolean;
  showRating: boolean;
  showLocation: boolean;
  showDistance: boolean;
  showTerritorialContext: boolean;
  showHighlights: boolean;
  showBadges: boolean;
  showInstitutionalBadges: boolean;
  showDate: boolean;
  showAvailability: boolean;
  showPrice: boolean;
  showPrimaryAction: boolean;
  showSecondaryAction: boolean;
  showFavorite: boolean;
  showRationale: boolean;
  compact: boolean;
}

export const DEFAULT_TOURISM_CAPABILITIES: TourismCardCapabilities = {
  showMedia: true,
  showEyebrow: true,
  showBusiness: true,
  showTagline: true,
  showRating: true,
  showLocation: true,
  showDistance: true,
  showTerritorialContext: true,
  showHighlights: true,
  showBadges: true,
  showInstitutionalBadges: true,
  showDate: true,
  showAvailability: true,
  showPrice: true,
  showPrimaryAction: true,
  showSecondaryAction: true,
  showFavorite: true,
  showRationale: false,
  compact: false,
};

export function withDefaultCapabilities(
  partial: Partial<TourismCardCapabilities> | undefined,
): TourismCardCapabilities {
  return { ...DEFAULT_TOURISM_CAPABILITIES, ...(partial ?? {}) };
}

/* ------------------------------------------------------------------ *
 * Format helpers
 * ------------------------------------------------------------------ */
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

function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function entityEyebrow(vm: TourismCardVM): string | null {
  if (vm.eyebrow != null) return vm.eyebrow;
  if (vm.entityKind) return TOURISM_ENTITY_LABEL[vm.entityKind];
  return null;
}

/* ------------------------------------------------------------------ *
 * Icons (SVG inline — sin dependencia externa por variante)
 * ------------------------------------------------------------------ */
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

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("h-3 w-3", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M13.2 6.8l-1.6 4.8-4.8 1.6 1.6-4.8 4.8-1.6z" />
    </svg>
  );
}

function badgeToneClass(tone: TourismCardBadgeTone): string {
  switch (tone) {
    case "primary":
      return "bg-primary/10 text-primary";
    case "success":
      return "bg-success/10 text-success";
    case "warning":
      return "bg-warning/10 text-warning";
    case "info":
      return "bg-info/10 text-info";
    default:
      return "bg-muted text-foreground/75";
  }
}

function MediaPlaceholder({ kind }: { kind: TourismEntityKind | null }) {
  const gradient: Record<TourismEntityKind | "default", string> = {
    product: "from-primary/30 via-primary/10 to-warning/20",
    business: "from-success/30 via-primary/10 to-warning/20",
    hotel: "from-info/30 via-primary/10 to-warning/20",
    restaurant: "from-warning/40 via-primary/10 to-destructive/10",
    experience: "from-primary/40 via-warning/20 to-success/10",
    event: "from-destructive/20 via-warning/30 to-primary/20",
    destination: "from-info/30 via-success/10 to-warning/20",
    landing: "from-primary/20 via-muted to-warning/20",
    promotion: "from-warning/40 via-destructive/10 to-primary/20",
    route: "from-success/30 via-info/10 to-warning/20",
    region: "from-info/30 via-success/10 to-warning/20",
    category: "from-primary/20 via-warning/10 to-success/10",
    mixed: "from-primary/20 via-muted to-warning/20",
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

/* ------------------------------------------------------------------ *
 * TourismCard — Variante GRID / CAROUSEL / FEATURED.
 * ------------------------------------------------------------------ */
export interface TourismCardProps {
  vm: TourismCardVM;
  capabilities?: Partial<TourismCardCapabilities>;
  className?: string;
  /** Slot para inyectar acciones interactivas (FavoriteButton, etc.). */
  renderActions?: (vm: TourismCardVM) => ReactNode;
}

export function TourismCard({
  vm,
  capabilities,
  className,
  renderActions,
}: TourismCardProps) {
  const caps = withDefaultCapabilities(capabilities);
  const price = caps.showPrice ? formatPrice(vm.priceAmount, vm.priceCurrency) : null;
  const eyebrow = caps.showEyebrow ? entityEyebrow(vm) : null;
  const distance = caps.showDistance
    ? formatDistance(vm.location?.distanceKm ?? null)
    : null;
  const highlights = caps.showHighlights ? vm.highlights.slice(0, 3) : [];
  const badges = caps.showBadges ? vm.badges.slice(0, 2) : [];
  const institutional = caps.showInstitutionalBadges
    ? vm.institutionalBadges.slice(0, 2)
    : [];
  return (
    <article
      data-eb-entity={vm.entityKind ?? undefined}
      data-tourism-card="grid"
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated",
        className,
      )}
    >
      {caps.showMedia ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {vm.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vm.mediaUrl}
              alt={vm.mediaAlt ?? vm.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <MediaPlaceholder kind={vm.entityKind} />
          )}
          {eyebrow ? (
            <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-soft backdrop-blur">
              {eyebrow}
            </span>
          ) : null}
          {institutional.length + badges.length > 0 ? (
            <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1">
              {institutional.map((b, i) => (
                <span
                  key={`inst-${i}`}
                  className={cn(
                    "rounded-pill px-2 py-0.5 text-[10px] font-semibold shadow-soft backdrop-blur",
                    badgeToneClass(b.tone),
                  )}
                >
                  {b.label}
                </span>
              ))}
              {badges.map((b, i) => (
                <span
                  key={`b-${i}`}
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
          {caps.showDate && vm.dateLabel ? (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-pill bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-soft backdrop-blur">
              <ClockIcon />
              {vm.dateLabel}
            </span>
          ) : null}
          {caps.showAvailability && vm.availabilityLabel ? (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-pill bg-success/90 px-2.5 py-1 text-[11px] font-semibold text-success-foreground shadow-soft backdrop-blur">
              {vm.availabilityLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        {caps.showLocation && vm.location ? (
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <PinIcon />
            <span className="truncate">{vm.location.label}</span>
            {distance ? (
              <span className="ml-auto shrink-0 rounded-pill bg-muted px-1.5 py-0.5 text-[10px] text-foreground/70">
                {distance}
              </span>
            ) : null}
          </p>
        ) : null}

        <h3 className="mt-1 text-base font-semibold leading-tight">
          {vm.href ? (
            <a href={vm.href} className="hover:underline">
              {vm.name}
            </a>
          ) : (
            vm.name
          )}
        </h3>

        {caps.showTerritorialContext && vm.territorialContext ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            <CompassIcon />
            <span className="truncate">{vm.territorialContext}</span>
          </p>
        ) : null}

        {caps.showBusiness && vm.businessName ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{vm.businessName}</p>
        ) : null}
        {caps.showTagline && vm.tagline ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {vm.tagline}
          </p>
        ) : null}

        {caps.showRating && vm.rating ? (
          <p className="mt-2 flex items-center gap-1 text-xs">
            <StarIcon className="text-warning" />
            <span className="font-semibold text-foreground">
              {vm.rating.value.toFixed(1)}
            </span>
            {vm.rating.count > 0 ? (
              <span className="text-muted-foreground">
                ({vm.rating.count} reseñas)
              </span>
            ) : null}
          </p>
        ) : null}

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

        {caps.showRationale && vm.rationale ? (
          <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
            {vm.rationale}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          {caps.showPrice && (price || vm.priceHint) ? (
            <p className="flex items-baseline gap-1.5">
              {price ? (
                <span className="text-base font-bold text-foreground">
                  {price}
                </span>
              ) : null}
              {vm.priceHint ? (
                <span className="text-xs text-muted-foreground">
                  {vm.priceHint}
                </span>
              ) : null}
            </p>
          ) : null}
          <PrimaryCta
            primary={caps.showPrimaryAction ? vm.primaryAction : null}
            secondary={caps.showSecondaryAction ? vm.secondaryAction : null}
          />
          {caps.showFavorite && renderActions ? (
            <div className="mt-2 flex flex-col gap-2">{renderActions(vm)}</div>
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
  primary: TourismCardAction | null;
  secondary: TourismCardAction | null;
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

/* ------------------------------------------------------------------ *
 * TourismCardRow — Variante LIST / COMPACT.
 * ------------------------------------------------------------------ */
export interface TourismCardRowProps extends TourismCardProps {}

export function TourismCardRow({
  vm,
  capabilities,
  className,
  renderActions,
}: TourismCardRowProps) {
  const caps = withDefaultCapabilities(capabilities);
  const price = caps.showPrice ? formatPrice(vm.priceAmount, vm.priceCurrency) : null;
  const eyebrow = caps.showEyebrow ? entityEyebrow(vm) : null;
  const distance = caps.showDistance
    ? formatDistance(vm.location?.distanceKm ?? null)
    : null;
  const badges = caps.showBadges ? vm.badges.slice(0, 2) : [];
  const institutional = caps.showInstitutionalBadges
    ? vm.institutionalBadges.slice(0, 2)
    : [];
  const size = caps.compact ? "h-16 w-16" : "h-24 w-24";
  return (
    <article
      data-eb-entity={vm.entityKind ?? undefined}
      data-tourism-card="row"
      className={cn(
        "flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated",
        caps.compact ? "p-3" : "",
        className,
      )}
    >
      {caps.showMedia ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-xl bg-muted",
            size,
          )}
        >
          {vm.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vm.mediaUrl}
              alt={vm.mediaAlt ?? vm.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <MediaPlaceholder kind={vm.entityKind} />
          )}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h4 className="truncate text-base font-semibold">
              {vm.href ? (
                <a href={vm.href} className="hover:underline">
                  {vm.name}
                </a>
              ) : (
                vm.name
              )}
            </h4>
            {caps.showTerritorialContext && vm.territorialContext ? (
              <p className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                <CompassIcon />
                <span className="truncate">{vm.territorialContext}</span>
              </p>
            ) : null}
            {caps.showBusiness && vm.businessName ? (
              <p className="text-xs text-muted-foreground">{vm.businessName}</p>
            ) : null}
            {!caps.compact && caps.showTagline && vm.tagline ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {vm.tagline}
              </p>
            ) : null}
            {caps.showLocation && vm.location ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <PinIcon />
                <span className="truncate">{vm.location.label}</span>
                {distance ? (
                  <span className="ml-1 rounded-pill bg-muted px-1.5 py-0.5 text-[10px] text-foreground/70">
                    {distance}
                  </span>
                ) : null}
              </p>
            ) : null}
            {caps.showRating && vm.rating ? (
              <p className="mt-1 flex items-center gap-1 text-xs">
                <StarIcon className="text-warning" />
                <span className="font-semibold text-foreground">
                  {vm.rating.value.toFixed(1)}
                </span>
                {vm.rating.count > 0 ? (
                  <span className="text-muted-foreground">
                    ({vm.rating.count})
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            {institutional.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-1">
                {institutional.map((b, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-pill px-2 py-0.5 text-[10px] font-semibold",
                      badgeToneClass(b.tone),
                    )}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}
            {caps.showDate && vm.dateLabel ? (
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ClockIcon />
                {vm.dateLabel}
              </p>
            ) : null}
            {caps.showPrice && (price || vm.priceHint) ? (
              <p className="text-sm font-semibold">
                {price ?? vm.priceHint}
              </p>
            ) : null}
          </div>
        </div>
        {caps.showRationale && vm.rationale ? (
          <p className="mt-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-primary">
            {vm.rationale}
          </p>
        ) : null}
        {(vm.primaryAction && caps.showPrimaryAction) ||
        (vm.secondaryAction && caps.showSecondaryAction) ? (
          <PrimaryCta
            primary={caps.showPrimaryAction ? vm.primaryAction : null}
            secondary={caps.showSecondaryAction ? vm.secondaryAction : null}
          />
        ) : null}
        {caps.showFavorite && renderActions ? (
          <div className="mt-2 flex flex-wrap gap-2">{renderActions(vm)}</div>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * FeaturedTourismLayout — Uno destacado + secundarios (reutilizable).
 * ------------------------------------------------------------------ */
export interface FeaturedTourismLayoutProps {
  items: TourismCardVM[];
  capabilities?: Partial<TourismCardCapabilities>;
  renderActions?: (vm: TourismCardVM) => ReactNode;
}

export function FeaturedTourismLayout({
  items,
  capabilities,
  renderActions,
}: FeaturedTourismLayoutProps) {
  const [featured, ...rest] = items;
  if (!featured) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TourismCard
          vm={featured}
          capabilities={capabilities}
          renderActions={renderActions}
        />
      </div>
      {rest.length > 0 ? (
        <ul role="list" className="flex flex-col gap-3">
          {rest.slice(0, 3).map((it) => (
            <li key={it.id}>
              <TourismCardRow
                vm={it}
                capabilities={capabilities}
                renderActions={renderActions}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}