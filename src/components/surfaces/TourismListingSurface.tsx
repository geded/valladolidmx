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
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import { InstitutionalBadgesBlock } from "@/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import type { TravelItemKind } from "@/lib/traveler/travel-plans.functions";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import {
  TourismCard,
  type TourismCardCapabilities,
  type TourismCardVM,
  type TourismEntityKind,
} from "@/components/experience-builder/tourism-card/TourismCard";
import type {
  ExperienceHeroDTO,
  ExperienceHeroBadge,
} from "@/lib/experience-builder/blocks/experience-hero/contract";
import type { InstitutionalBadgeItem } from "@/lib/experience-builder/blocks/experience-institutional-badges/contract";
import { cn } from "@/lib/utils";

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

function heroSpecToDTO(spec: TourismListingHeroSpec): ExperienceHeroDTO {
  const hasMedia = !!spec.mediaUrl;
  // Alt fallback descriptivo: "<Título> en Valladolid, Oriente Maya"
  // Evita alts de una sola palabra tipo "Hoteles" cuando el editor
  // no captura un mediaAlt específico.
  const fallbackAlt = `${spec.title} en Valladolid, Oriente Maya`;
  return {
    variant: hasMedia ? "cinematic" : "editorial",
    eyebrow: spec.eyebrow ?? null,
    eyebrowStyle: hasMedia ? "script" : "eyebrow",
    title: spec.title,
    description: spec.subtitle ?? null,
    media: hasMedia
      ? { url: spec.mediaUrl as string, alt: spec.mediaAlt ?? fallbackAlt, overlay: 0.45 }
      : null,
    mediaSlides: hasMedia
      ? [{ url: spec.mediaUrl as string, alt: spec.mediaAlt ?? fallbackAlt }]
      : [],
    overlapHeader: hasMedia,
    badges: spec.badges ?? [],
    meta: spec.metaLabel ? [{ iconKey: "map-pin", label: spec.metaLabel }] : [],
    ctaPrimary: null,
    ctaSecondary: null,
  };
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
  className,
}: TourismListingSurfaceProps) {
  const [active, setActive] = useState<Record<string, string | null>>({});
  const [nearMeOn, setNearMeOn] = useState(false);
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
        Math.cos(toRad(loc.lat)) *
          Math.cos(toRad(vm.coordinates.lat)) *
          Math.sin(dLng / 2) ** 2;
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

  const heroDto = useMemo(() => heroSpecToDTO(hero), [hero]);

  const badgeItems = useMemo<InstitutionalBadgeItem[]>(() => {
    if (institutionalBadgeItems && institutionalBadgeItems.length > 0)
      return institutionalBadgeItems;
    if (!destinationSlug) return [];
    // Fallback ligero para categorías sin destino aún resuelto:
    // deferimos al bloque oficial vía `source: "destination"`.
    return [];
  }, [institutionalBadgeItems, destinationSlug]);

  const showBadges = badgeItems.length > 0;
  const territorialChip = destinationLabel
    ? `Explorando en ${destinationLabel}`
    : null;

  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("space-y-6", className)}>
      <ExperienceHero dto={heroDto} headingLevel="h1" />

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

      {mapSlot ? <div>{mapSlot}</div> : null}

      {displayItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyHint ? <div className="mt-3 text-sm">{emptyHint}</div> : null}
        </div>
      ) : (
        <ul role="list" className={cn("grid gap-5", colClass)}>
          {displayItems.map((vm) => (
            <li key={vm.id}>
              <TourismCard
                vm={vm}
                capabilities={capabilities}
                renderActions={(v) => {
                  const kind =
                    favoriteKindFor?.(v) ?? favoriteKindFromEntity(v.entityKind);
                  if (!kind) return null;
                  return <FavoriteButton entityKind={kind} entityId={v.id} />;
                }}
              />
            </li>
          ))}
        </ul>
      )}
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
            {opt.count != null ? (
              <span className="ml-1 opacity-70">({opt.count})</span>
            ) : null}
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