/**
 * U-VISUAL · V3 — TourismListingSurface (Founder Discovery Standard).
 *
 * Superficie oficial ÚNICA para toda la experiencia de descubrimiento de
 * ValladolidMX: `/hoteles`, `/restaurantes`, `/experiencias`,
 * `/casas-de-vacaciones`, `/eventos`, `/que-hacer`, `/promociones`,
 * `/oriente-maya/:destino/:categoria` y toda futura categoría (museos,
 * spas, tours, guías, transporte, bodas, naturaleza, gastronomía,
 * compras…).
 *
 * Founder Discovery Principle — la superficie debe responder above-the-
 * fold:
 *   1. ¿Qué puedo descubrir aquí?           → Hero cinematic + eyebrow.
 *   2. ¿Cuál parece la mejor opción?        → TourismCard con jerarquía.
 *   3. ¿Qué hay cerca?                      → chip territorial + (V4) mapa.
 *   4. ¿Por qué es diferente?               → Institutional Badges strip.
 *   5. ¿Cuál debería abrir ahora?           → CTA / precio / disponibilidad.
 *
 * Composición pura sobre bloques oficiales. Cero lógica de negocio y
 * cero componentes paralelos. Los filtros (facets) son client-side y
 * puramente presentacionales — cada ruta pre-filtra por sus search
 * params antes de pasar `items`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map as MapIcon, MapPin, Sparkles } from "lucide-react";
import { PremiumHero } from "@/components/premium";
import { InstitutionalBadgesBlock } from "@/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import type { TravelItemKind } from "@/lib/traveler/travel-plans.functions";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import {
  TourismCard,
  TourismCardRow,
  type TourismCardCapabilities,
  type TourismCardVM,
  type TourismEntityKind,
} from "@/components/experience-builder/tourism-card/TourismCard";
import type { ExperienceHeroBadge } from "@/lib/experience-builder/blocks/experience-hero/contract";
import type { InstitutionalBadgeItem } from "@/lib/experience-builder/blocks/experience-institutional-badges/contract";
import { cn } from "@/lib/utils";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { openAluxFloating } from "@/lib/alux/floating-bus";

/* ------------------------------------------------------------------ *
 * Hero — spec ligera; la superficie construye el DTO oficial.
 * ------------------------------------------------------------------ */
export interface TourismListingHeroSpec {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  mediaUrl?: string | null;
  mediaAlt?: string | null;
  badges?: ExperienceHeroBadge[];
  metaLabel?: string | null;
}

/* ------------------------------------------------------------------ *
 * Facets — 100% presentacional, estado local. Los routes con URL params
 * pueden seguir filtrando en su loader sin conflicto.
 * ------------------------------------------------------------------ */
export interface FacetOption {
  value: string;
  label: string;
  count?: number;
}

export interface FacetDef {
  id: string;
  label: string;
  options: FacetOption[];
  /**
   * Función que devuelve el valor de faceta para una card. Si retorna
   * null, la card queda fuera cuando el facet está activo.
   */
  extract: (vm: TourismCardVM) => string | null;
}

/* ------------------------------------------------------------------ *
 * Surface props
 * ------------------------------------------------------------------ */
export interface TourismListingSurfaceProps {
  hero: TourismListingHeroSpec;
  items: TourismCardVM[];
  facets?: FacetDef[];
  /** Slug del destino activo — activa strip de Institutional Badges. */
  destinationSlug?: string | null;
  destinationLabel?: string | null;
  /** Distintivos institucionales explícitos (override). */
  institutionalBadgeItems?: InstitutionalBadgeItem[];
  columns?: 1 | 2 | 3;
  emptyMessage?: string;
  emptyHint?: React.ReactNode;
  capabilities?: Partial<TourismCardCapabilities>;
  /** Slot reservado para V4 · Maps Everywhere. */
  mapSlot?: React.ReactNode;
  /** Entidad favoritable por card (fallback: se deduce por entityKind). */
  favoriteKindFor?: (vm: TourismCardVM) => "business" | "product" | "promotion" | null;
  /**
   * TP1.4 · Universal "Agregar a Mi Viaje".
   * Por defecto `true`: la superficie renderiza el botón cuando la
   * política central de elegibilidad (`evaluateTripEligibility`) lo
   * autoriza. Superficies que deban excluirlo explícitamente pueden
   * pasar `false` sin romper consumidores existentes.
   */
  showAddToTrip?: boolean;
  /** G5 · presentación compartida; se deriva del medio cuando no se especifica. */
  presentation?: PremiumPresentation;
  /** Identidad funcional del listado; sólo ajusta copy, nunca datos. */
  familyLabel?: string;
  /** Preguntas de entrada aprobadas para el copiloto. */
  intentPrompts?: readonly string[];
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export function TourismListingSurface({
  hero,
  items,
  facets = [],
  destinationSlug,
  destinationLabel,
  institutionalBadgeItems,
  columns = 3,
  emptyMessage = "Aún no hay resultados publicados. Explora otros destinos del Oriente Maya.",
  emptyHint,
  capabilities,
  mapSlot,
  favoriteKindFor,
  showAddToTrip = true,
  presentation,
  familyLabel = "opciones",
  intentPrompts = [],
  className,
}: TourismListingSurfaceProps) {
  const [active, setActive] = useState<Record<string, string | null>>({});
  const [nearMeOn, setNearMeOn] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const geo = useVisitorGeolocation();

  // A13 · ¿Algún item publicó coordenadas? Sin coords no hay ranking real.
  const hasAnyCoords = useMemo(
    () => items.some((it) => it.coordinates?.lat != null && it.coordinates?.lng != null),
    [items],
  );

  const filtered = useMemo(() => {
    if (facets.length === 0) return items;
    return items.filter((vm) =>
      facets.every((f) => {
        const sel = active[f.id];
        if (!sel) return true;
        return f.extract(vm) === sel;
      }),
    );
  }, [items, facets, active]);

  // A13 · Cuando "Cerca de mí" está activo y hay GPS, calculamos distancia
  // real y ordenamos por cercanía. Los items sin coordenadas quedan al
  // final para no ocultarlos.
  const displayItems = useMemo(() => {
    if (!nearMeOn || !geo.location) return filtered;
    const loc = geo.location;
    const withDistance = filtered.map((vm) => {
      if (!vm.coordinates) return { vm, km: null as number | null };
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(vm.coordinates.lat - loc.lat);
      const dLng = toRad(vm.coordinates.lng - loc.lng);
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(loc.lat)) * Math.cos(toRad(vm.coordinates.lat)) * Math.sin(dLng / 2) ** 2;
      const km = 2 * R * Math.asin(Math.sqrt(s));
      return { vm, km };
    });
    withDistance.sort((a, b) => {
      if (a.km == null && b.km == null) return 0;
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    });
    return withDistance.map(({ vm, km }) =>
      km == null
        ? vm
        : {
            ...vm,
            location: vm.location
              ? { ...vm.location, distanceKm: km }
              : { label: destinationLabel ?? "Ubicación", distanceKm: km },
          },
    );
  }, [filtered, nearMeOn, geo.location, destinationLabel]);

  const heroMedia = useMemo(() => {
    const rows = [
      ...(hero.mediaUrl ? [{ url: hero.mediaUrl, alt: hero.mediaAlt }] : []),
      ...items
        .filter((item) => Boolean(item.mediaUrl))
        .map((item) => ({ url: item.mediaUrl as string, alt: item.mediaAlt ?? item.name })),
    ];
    return rows
      .filter((row, index) => rows.findIndex((candidate) => candidate.url === row.url) === index)
      .slice(0, 3);
  }, [hero.mediaAlt, hero.mediaUrl, items]);

  // Editorial es el fallback universal. Cinematográfica sólo se activa
  // cuando fue seleccionada y existe fotografía gobernada.
  const premiumPresentation: PremiumPresentation =
    presentation === "cinematic" && heroMedia.length > 0 ? "cinematic" : "editorial";
  const activeHeroMedia = heroMedia[heroIndex % Math.max(heroMedia.length, 1)] ?? null;

  useEffect(() => {
    if (heroMedia.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = window.setInterval(
      () => setHeroIndex((current) => (current + 1) % heroMedia.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [heroMedia.length]);

  const badgeItems = useMemo<InstitutionalBadgeItem[]>(() => {
    if (institutionalBadgeItems && institutionalBadgeItems.length > 0)
      return institutionalBadgeItems;
    if (!destinationSlug) return [];
    // Fallback ligero para categorías sin destino aún resuelto:
    // deferimos al bloque oficial vía `source: "destination"`.
    return [];
  }, [institutionalBadgeItems, destinationSlug]);

  const showBadges = badgeItems.length > 0;
  const territorialChip = destinationLabel ? `Explorando en ${destinationLabel}` : null;

  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("space-y-6", className)}>
      <PremiumHero
        layout="listing"
        vm={{
          presentation: premiumPresentation,
          eyebrow: hero.eyebrow ?? undefined,
          title: hero.title,
          description: hero.subtitle ?? undefined,
          media: activeHeroMedia
            ? {
                url: activeHeroMedia.url,
                alt: activeHeroMedia.alt ?? `${hero.title} en Valladolid, Oriente Maya de Yucatán`,
              }
            : null,
          badges: hero.badges?.map((badge) => ({ label: badge.label })) ?? [],
        }}
      />

      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-soft"
        aria-label="Alux, copiloto de viaje"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(15rem,.7fr)_minmax(0,1.4fr)_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Alux · copiloto de Valladolid.mx</p>
              <h2 className="font-serif text-xl">¿Qué necesitas para tu viaje?</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {intentPrompts.slice(0, 5).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() =>
                  openAluxFloating({
                    reason: "manual",
                    hint: `Ayúdame a comparar ${familyLabel}. Mi prioridad es: ${prompt}.`,
                  })
                }
                className="min-h-10 rounded-pill border border-border bg-background px-3 py-2 text-sm transition hover:border-primary/50 hover:bg-primary/5"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              openAluxFloating({
                reason: "manual",
                hint: `Ayúdame a elegir entre estas ${familyLabel} usando el contexto real de Mi Viaje.`,
              })
            }
            className="min-h-11 rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Afinar con Alux
          </button>
        </div>
      </section>

      {showBadges ? (
        <InstitutionalBadgesBlock
          config={{
            source: "destination",
            subjectSlug: destinationSlug ?? "",
            variant: "soft",
            size: "md",
            layout: "strip",
            items: badgeItems,
            ariaLabel: destinationLabel
              ? `Distintivos institucionales de ${destinationLabel}`
              : "Distintivos institucionales",
            capabilities: { showLabel: true, showTooltip: true, mobileVisibleMax: 3 },
          }}
        />
      ) : null}

      {territorialChip || facets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
          {territorialChip ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {territorialChip}
            </span>
          ) : null}
          {facets.map((f) => (
            <FacetChipGroup
              key={f.id}
              facet={f}
              value={active[f.id] ?? null}
              onChange={(v) => setActive((s) => ({ ...s, [f.id]: v }))}
            />
          ))}
          {hasAnyCoords ? (
            <button
              type="button"
              onClick={() => {
                if (!nearMeOn && geo.status !== "granted") geo.request();
                setNearMeOn((v) => !v);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold transition-colors",
                nearMeOn && geo.location
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/80 hover:bg-muted/70",
              )}
              title={
                geo.status === "denied"
                  ? "Permiso denegado — reintentar"
                  : "Ordenar por cercanía real usando tu ubicación"
              }
            >
              <MapPin className="size-3.5" aria-hidden />
              {nearMeOn && geo.location
                ? "Cerca de mí ✓"
                : geo.status === "prompting"
                  ? "Ubicando…"
                  : "Cerca de mí"}
            </button>
          ) : null}
          {mapSlot ? (
            <button
              type="button"
              onClick={() => setMapOpen((value) => !value)}
              aria-expanded={mapOpen}
              className="inline-flex items-center gap-1.5 rounded-pill bg-muted px-3 py-1 text-xs font-semibold text-foreground/80 hover:bg-muted/70 xl:hidden"
            >
              <MapIcon className="size-3.5" aria-hidden />
              {mapOpen ? "Ocultar mapa" : "Ver mapa"}
            </button>
          ) : null}
          {Object.values(active).some(Boolean) ? (
            <button
              type="button"
              onClick={() => setActive({})}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}

      {displayItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyHint ? <div className="mt-3 text-sm">{emptyHint}</div> : null}
        </div>
      ) : (
        <div
          className={cn(
            mapSlot && "grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]",
          )}
        >
          <ul role="list" className={cn("grid gap-5", colClass)}>
            {displayItems.map((vm) => (
              <li key={vm.id}>
                {columns === 1 ? (
                  <TourismCardRow
                    vm={vm}
                    capabilities={capabilities}
                    renderActions={(v) => renderCardActions(v, favoriteKindFor, showAddToTrip)}
                  />
                ) : (
                  <TourismCard
                    vm={vm}
                    capabilities={capabilities}
                    renderActions={(v) => renderCardActions(v, favoriteKindFor, showAddToTrip)}
                  />
                )}
              </li>
            ))}
          </ul>
          {mapSlot ? (
            <aside
              className={cn(
                "overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
                mapOpen ? "block" : "hidden xl:block",
              )}
              aria-label="Mapa del listado"
            >
              {mapSlot}
            </aside>
          ) : null}
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Continuidad del viaje
          </p>
          <h2 className="mt-1 font-serif text-2xl">
            Convierte tus guardados en un itinerario real
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Alux organiza tu selección; cuando el plan esté listo, puedes enviarlo a un concierge
            humano para recibir una propuesta.
          </p>
        </div>
        <Link
          to="/arma-tu-viaje"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Abrir Arma tu viaje
        </Link>
      </section>
    </div>
  );
}

function renderCardActions(
  v: TourismCardVM,
  favoriteKindFor: TourismListingSurfaceProps["favoriteKindFor"],
  showAddToTrip: boolean,
) {
  const kind = favoriteKindFor?.(v) ?? favoriteKindFromEntity(v.entityKind);
  const travelKind = travelKindFromEntity(v.entityKind);
  const canAddToTrip =
    showAddToTrip &&
    travelKind != null &&
    evaluateTripEligibility({ kind: travelKind, targetId: v.id, title: v.name, mode: "universal" })
      .eligible;
  if (!kind && !canAddToTrip) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {kind ? <FavoriteButton entityKind={kind} entityId={v.id} /> : null}
      {canAddToTrip ? (
        <AddToTravelPlanButton
          kind={travelKind as TravelItemKind}
          targetId={v.id}
          title={v.name}
          slug={v.href?.split("/").filter(Boolean).at(-1) ?? null}
          imageUrl={v.mediaUrl}
          subtitle={v.tagline ?? v.businessName ?? null}
        />
      ) : null}
    </div>
  );
}

function favoriteKindFromEntity(
  kind: TourismEntityKind | null,
): "business" | "product" | "promotion" | null {
  switch (kind) {
    case "product":
      return "product";
    case "promotion":
      return "promotion";
    case "business":
    case "hotel":
    case "restaurant":
    case "experience":
      return "business";
    default:
      return null;
  }
}

/**
 * TP1.4 · Deriva el `TravelItemKind` universal a partir del
 * `TourismEntityKind`. Sólo se autorizan `product`, `business` y `event`
 * en TourismCard (destination, region, promotion, landing, route,
 * category, mixed y desconocidos → null).
 */
function travelKindFromEntity(kind: TourismEntityKind | null): TravelItemKind | null {
  switch (kind) {
    case "product":
      return "product";
    case "event":
      return "event";
    case "business":
    case "hotel":
    case "restaurant":
    case "experience":
      return "business";
    default:
      return null;
  }
}

function FacetChipGroup({
  facet,
  value,
  onChange,
}: {
  facet: FacetDef;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (facet.options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {facet.label}
      </span>
      {facet.options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={cn(
              "rounded-pill px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/80 hover:bg-muted/70",
            )}
          >
            {opt.label}
            {opt.count != null ? <span className="ml-1 opacity-70">({opt.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Helper: deriva un facet "Destino" a partir de las cards
 * (usa `location.label` como slug legible).
 * ------------------------------------------------------------------ */
export function buildDestinationFacet(items: TourismCardVM[]): FacetDef | null {
  const counts = new Map<string, number>();
  for (const it of items) {
    const key = it.location?.label;
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size <= 1) return null;
  const options: FacetOption[] = Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ value: label, label, count }));
  return {
    id: "destino",
    label: "Destino",
    options,
    extract: (vm) => vm.location?.label ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Helper: facet "Tipo" a partir del eyebrow (útil en `/que-hacer`).
 * ------------------------------------------------------------------ */
export function buildEntityKindFacet(items: TourismCardVM[]): FacetDef | null {
  const counts = new Map<string, { label: string; count: number }>();
  for (const it of items) {
    const key = it.entityKind ?? "mixed";
    const label = it.eyebrow ?? key;
    const prev = counts.get(key);
    counts.set(key, { label, count: (prev?.count ?? 0) + 1 });
  }
  if (counts.size <= 1) return null;
  const options: FacetOption[] = Array.from(counts.entries()).map(([value, v]) => ({
    value,
    label: v.label,
    count: v.count,
  }));
  return {
    id: "tipo",
    label: "Tipo",
    options,
    extract: (vm) => vm.entityKind ?? null,
  };
}
