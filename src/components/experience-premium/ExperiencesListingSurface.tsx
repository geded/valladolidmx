/**
 * `ExperiencesListingSurface` — listado maestro de Experiencias.
 *
 * Autoridad visual: Home Premium aprobado. Reutiliza EXACTAMENTE las
 * piezas compartidas ya extraídas del Home (`PremiumEditorialHero`,
 * `PremiumAluxBar`, `PremiumSectionHead`, `PremiumShowcaseGrid`,
 * `PremiumCompactRow`). No introduce hero, tarjetas ni tokens nuevos.
 *
 * Datos: exclusivamente el DTO público real (`PublicListingDTO`). Los
 * filtros se derivan de valores realmente publicados en el CMS; si un
 * eje no tiene datos, no se muestra. Nada inventado.
 */
import { useMemo, useState } from "react";

import {
  PremiumAluxBar,
  PremiumCompactRow,
  PremiumEditorialHero,
  PremiumSectionHead,
  PremiumShowcaseGrid,
  type PremiumShowcaseItem,
} from "@/components/home-premium/shared/PremiumShowcase";
import {
  ExperienceFiltersBar,
  type FilterSelection,
} from "@/components/experience-premium/ExperienceFiltersBar";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";

import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PartyComposition } from "@/lib/traveler/party-composition";
import { resolveExperienceCommerce } from "@/lib/experiences/experience-commerce";
import { cn } from "@/lib/utils";

const INTENT_PROMPTS = [
  "Cultura maya",
  "Cenotes y naturaleza",
  "Con guía local",
  "En familia",
  "Medio día",
] as const;

interface FacetGroup {
  id: string;
  label: string;
  /** Eje sin respaldo en el contrato CMS: se rotula como capacidad DEMO. */
  demo: boolean;
  options: { value: string; label: string; count: number }[];
  values: (vm: TourismCardVM) => string[];
}

/** Eje de filtro basado en `filterAttributes` (mismo contrato del CMS). */
export interface ExperienceAttributeAxis {
  readonly key: string;
  readonly label: string;
  /** true cuando el eje aún no existe en `tourism_attribute_definitions`. */
  readonly demo?: boolean;
}

function humanizeValue(value: string): string {
  const text = value.replace(/-/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toShowcaseItem(vm: TourismCardVM): PremiumShowcaseItem {
  return {
    key: vm.id,
    name: vm.name,
    note: vm.tagline ?? vm.businessName ?? "Experiencia publicada en el Oriente Maya",
    media: vm.mediaUrl ? { url: vm.mediaUrl, alt: vm.mediaAlt ?? vm.name } : null,
    to: vm.href ?? "/experiencias",
    kicker: "Experiencia",
    meta: vm.territorialContext,
  };
}

function attributeValues(vm: TourismCardVM, key: string): string[] {
  const raw = vm.filterAttributes?.[key];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function buildFacets(
  items: readonly TourismCardVM[],
  attributeAxes: readonly ExperienceAttributeAxis[],
  valueLabels: Record<string, string>,
): FacetGroup[] {
  const axes: Omit<FacetGroup, "options">[] = [
    {
      id: "destino",
      label: "Destino",
      demo: false,
      values: (vm) => (vm.territorialContext ? [vm.territorialContext] : []),
    },
    {
      id: "tipo",
      label: "Tipo de experiencia",
      demo: false,
      values: (vm) => (vm.eyebrow ? [vm.eyebrow] : []),
    },
    {
      id: "operador",
      label: "Operador",
      demo: false,
      values: (vm) => (vm.businessName ? [vm.businessName] : []),
    },
    ...attributeAxes.map((axis) => ({
      id: axis.key,
      label: axis.label,
      demo: axis.demo === true,
      values: (vm: TourismCardVM) => attributeValues(vm, axis.key),
    })),
  ];
  return axes
    .map((axis) => {
      const counts = new Map<string, number>();
      for (const vm of items) {
        for (const value of axis.values(vm)) {
          const clean = value.trim();
          if (!clean) continue;
          counts.set(clean, (counts.get(clean) ?? 0) + 1);
        }
      }
      const options = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({
          value,
          label: valueLabels[value] ?? humanizeValue(value),
          count,
        }));
      return { ...axis, options };
    })
    .filter((facet) => facet.options.length > 1);
}

export interface ExperiencesListingSurfaceProps {
  dto: PublicListingDTO;
  /** Aviso de superficie de revisión interna (preview noindex). */
  reviewNotice?: string | null;
  /** Ejes de filtro adicionales leídos de `filterAttributes`. */
  attributeAxes?: readonly ExperienceAttributeAxis[];
  /** Etiquetas legibles de los valores de atributo. */
  attributeValueLabels?: Record<string, string>;
  className?: string;
}

export function ExperiencesListingSurface({
  dto,
  reviewNotice = null,
  attributeAxes = [],
  attributeValueLabels = {},
  className,
}: ExperiencesListingSurfaceProps) {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState<PartyComposition | null>(null);
  const [active, setActive] = useState<FilterSelection>({});

  const items = dto.items;
  const facets = useMemo(
    () => buildFacets(items, attributeAxes, attributeValueLabels),
    [items, attributeAxes, attributeValueLabels],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((vm) => {
      const matchesQuery =
        !needle ||
        [vm.name, vm.tagline, vm.businessName, vm.territorialContext]
          .filter(Boolean)
          .some((value) => (value as string).toLowerCase().includes(needle));
      if (!matchesQuery) return false;
      return facets.every((facet) => {
        const selected = active[facet.id] ?? [];
        if (selected.length === 0) return true;
        const values = facet.values(vm);
        return selected.some((value) => values.includes(value));
      });
    });
  }, [items, facets, active, query]);

  const toggleFacet = (groupId: string, value: string) =>
    setActive((current) => {
      const selected = current[groupId] ?? [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [groupId]: next };
    });


  const featured = filtered.slice(0, 4).map(toShowcaseItem);
  const rest = filtered.slice(4);

  const askAlux = (preference?: string) =>
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(
        "Ayúdame a elegir experiencias reales publicadas en el Oriente Maya.",
        [preference, party ? `Viajo ${party}` : null].filter(Boolean).join(" · ") || undefined,
      ),
    });

  const heroMedia = items.find((item) => item.mediaUrl);

  return (
    <div className={cn("space-y-8", className)}>
      {reviewNotice ? (
        <p className="rounded-pill border border-dashed border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          {reviewNotice}
        </p>
      ) : null}

      <PremiumEditorialHero
        eyebrow={dto.hero.eyebrow}
        title={dto.hero.title}
        subtitle={dto.hero.subtitle}
        media={
          heroMedia?.mediaUrl
            ? { url: heroMedia.mediaUrl, alt: heroMedia.mediaAlt ?? dto.hero.title }
            : null
        }
        caption={dto.destinationLabel ? `Experiencias en ${dto.destinationLabel}` : undefined}
        searchSlot={
          <label className="block">
            <span className="sr-only">¿Qué experiencia quieres vivir?</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="¿Qué experiencia quieres vivir?"
              className="min-h-11 w-full rounded-pill border border-border bg-background px-5 text-sm"
            />
          </label>
        }
      />

      <ExperienceFiltersBar
        groups={facets.map((facet) => ({
          id: facet.id,
          label: facet.label,
          options: facet.options,
        }))}
        selection={active}
        onToggle={toggleFacet}
        onClear={() => setActive({})}
        resultCount={filtered.length}
      />




      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {query || Object.values(active).some(Boolean)
            ? "Ninguna experiencia publicada coincide con esos filtros."
            : dto.emptyMessage}
        </p>
      ) : (
        <>
          <section aria-labelledby="experiencias-destacadas">
            <PremiumSectionHead
              id="experiencias-destacadas"
              kicker="Empieza por aquí"
              title="Experiencias publicadas del Oriente Maya"
              description="Vivencias con guías, cocineros y comunidades verificadas por Valladolid.mx."
            />
            <PremiumShowcaseGrid
              items={featured}
              featuredKicker="Experiencia"
              detailLabel="Ver experiencia"
            />
          </section>

          {rest.length > 0 ? (
            <section aria-labelledby="experiencias-todas">
              <PremiumSectionHead
                id="experiencias-todas"
                kicker="Todas las experiencias"
                title={`${filtered.length} experiencias publicadas`}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((vm) => (
                  <ExperienceListCard key={vm.id} vm={vm} valueLabels={attributeValueLabels} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function ExperienceListCard({
  vm,
  valueLabels,
}: {
  vm: TourismCardVM;
  valueLabels: Record<string, string>;
}) {
  const eligibility = evaluateTripEligibility({
    kind: "product",
    targetId: vm.id,
    title: vm.name,
  });
  /* Capacidad comercial real: el listado nunca muestra "Reservar" sin
     acreditación; el precio sólo aparece si está publicado. */
  const commerce = resolveExperienceCommerce({
    conversionMode: null,
    acceptsOnlinePayment: false,
    priceAmount: vm.priceAmount,
    priceCurrency: vm.priceCurrency,
  });
  /* Duración publicada (eje `duracion`); se omite si no hay dato. */
  const durationRaw = attributeValues(vm, "duracion")[0] ?? null;
  const durationLabel = durationRaw ? (valueLabels[durationRaw] ?? humanizeValue(durationRaw)) : null;
  return (
    <div className="flex flex-col gap-2">
      <PremiumCompactRow item={toShowcaseItem(vm)} />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {durationLabel ? (
          <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {durationLabel}
          </span>
        ) : null}
        {commerce.priceLabel ? (
          <span className="text-xs text-muted-foreground">Desde {commerce.priceLabel}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Precio no publicado</span>
        )}
        {eligibility.eligible ? (
          <AddToTravelPlanButton
            kind="product"
            targetId={vm.id}
            title={vm.name}
            subtitle={vm.businessName ?? undefined}
            imageUrl={vm.mediaUrl}
          />
        ) : null}
      </div>
    </div>
  );
}
