/**
 * `ExperiencesListingSurface` — tienda pública de Experiencias.
 *
 * Autoridad visual: piezas Premium ya aprobadas (`PremiumEditorialHero`,
 * `PremiumAluxBar`, `PremiumSectionHead`), el buscador canónico del Home
 * (`HeroSearchPill`) y la navegación de categorías oficial
 * (`CategoryNavGrid` + `TourismCategoryIcon`). No introduce hero, iconos,
 * tarjetas ni tokens nuevos ni superficies paralelas: esta misma
 * superficie sirve la ruta pública y la revisión interna.
 *
 * Datos: exclusivamente el DTO público real (`PublicListingDTO`). Los
 * filtros, categorías, destinos, precios, duraciones y coordenadas se
 * derivan de lo publicado en el CMS; si un dato no existe, no se muestra.
 * La etiqueta "Reserva en línea" sólo aparece con la capacidad comercial
 * acreditada (modo de conversión + pago en línea autorizado).
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, List, Map as MapIcon, Star, Users, X } from "lucide-react";

import {
  PremiumAluxBar,
  PremiumEditorialHero,
  PremiumSectionHead,
} from "@/components/home-premium/shared/PremiumShowcase";
import {
  ExperienceFiltersBar,
  type FilterSelection,
} from "@/components/experience-premium/ExperienceFiltersBar";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { HeroSearchPill } from "@/components/home/HeroSearchPill";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { askAluxWithPreferenceMemory } from "@/lib/alux/travel-preferences";
import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
import { emitAluxSignal } from "@/lib/alux/signal-emitter";
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft/hooks";
import { compositionFromPartySize, type PartyComposition } from "@/lib/traveler/party-composition";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import { resolveExperienceCommerce } from "@/lib/experiences/experience-commerce";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON_SLUGS } from "@/lib/omxds/category-icon-registry";

/* El mapa sólo se descarga cuando la vista lo necesita. */
const LazyInteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((mod) => ({ default: mod.InteractiveMap })),
);

/** Campos comerciales/territoriales reales que agrega la lectura pública. */
type StoreCardVM = TourismCardVM & {
  readonly destinationSlug?: string | null;
  readonly conversionMode?: string | null;
  readonly acceptsOnlinePayment?: boolean;
  readonly onlineSalePriceAmount?: number | null;
  readonly onlineSalePriceCurrency?: string | null;
  readonly durationMinutes?: number | null;
  readonly coordinates?: { lat: number; lng: number } | null;
};

const ALL = "__todas__";
const ALL_CATEGORY_SLUG = "todas";

/** Resuelve etiquetas CMS contra la autoridad iconográfica; falla cerrado. */
function categoryIconSlug(label: string): string | null {
  const slug = slugify(label);
  const aliases: Record<string, string> = {
    experiencia: "experiencias",
    tour: "tours",
    evento: "eventos",
    transporte: "rutas",
    servicio: "que-hacer",
    artesanal: "artesanias",
  };
  const exact = CATEGORY_ICON_SLUGS.find((icon) => icon === slug);
  const canonicalWithinLabel = CATEGORY_ICON_SLUGS.find(
    (icon) => slug.startsWith(`${icon}-`) || slug.endsWith(`-${icon}`),
  );
  return exact ?? aliases[slug] ?? canonicalWithinLabel ?? null;
}

const TRAVELER_OPTIONS = ["1 persona", "2 personas", "3 personas", "4 personas", "5 o más"];

const PARTY_PROMPT: Record<PartyComposition, string> = {
  solo: "Viajo solo",
  pareja: "En pareja",
  familiar: "En familia",
  amigos: "Con amigos",
};

interface FacetGroup {
  id: string;
  label: string;
  /** Eje sin respaldo en el contrato CMS: se rotula como capacidad DEMO. */
  demo: boolean;
  options: { value: string; label: string; count: number }[];
  values: (vm: StoreCardVM) => string[];
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

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function attributeValues(vm: TourismCardVM, key: string): string[] {
  const raw = vm.filterAttributes?.[key];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** Precio publicado de la experiencia (venta en línea o precio de ficha). */
function priceAmountOf(vm: StoreCardVM): number | null {
  const amount = vm.onlineSalePriceAmount ?? vm.priceAmount ?? null;
  return typeof amount === "number" && amount > 0 ? amount : null;
}

/** Rango de precio derivado del dato real; nunca un rango inventado. */
function priceBucket(vm: StoreCardVM): string[] {
  const amount = priceAmountOf(vm);
  if (amount === null) return [];
  if (amount <= 500) return ["Hasta $500"];
  if (amount <= 1500) return ["$500 a $1,500"];
  return ["Más de $1,500"];
}

/** Rango de duración derivado de los minutos publicados. */
function durationBucket(vm: StoreCardVM): string[] {
  const minutes = vm.durationMinutes ?? null;
  if (!minutes || minutes <= 0) return [];
  if (minutes <= 120) return ["Hasta 2 horas"];
  if (minutes <= 240) return ["2 a 4 horas"];
  return ["Más de 4 horas"];
}

function buildFacets(
  items: readonly StoreCardVM[],
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
      id: "duracion-real",
      label: "Duración",
      demo: false,
      values: durationBucket,
    },
    {
      id: "precio",
      label: "Precio por persona",
      demo: false,
      values: priceBucket,
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
      values: (vm: StoreCardVM) => attributeValues(vm, axis.key),
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

/** Duración publicada: minutos reales o el eje administrable `duracion`. */
function durationLabelOf(vm: StoreCardVM, valueLabels: Record<string, string>): string | null {
  const minutes = vm.durationMinutes ?? null;
  if (minutes && minutes > 0) {
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1).replace(".0", "")} h`;
  }
  const raw = attributeValues(vm, "duracion")[0] ?? null;
  return raw ? (valueLabels[raw] ?? humanizeValue(raw)) : null;
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
  const [party, setParty] = useState<PartyComposition | null>(null);
  const [active, setActive] = useState<FilterSelection>({});
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [category, setCategory] = useState<string>(ALL);
  const [destination, setDestination] = useState<string>(ALL);
  const [date, setDate] = useState("");
  const [travelers, setTravelers] = useState("2 personas");
  const [focused, setFocused] = useState<string | null>(null);
  const anonymousTrip = useAnonymousTrip();

  const items = dto.items as readonly StoreCardVM[];
  const facets = useMemo(
    () => buildFacets(items, attributeAxes, attributeValueLabels),
    [items, attributeAxes, attributeValueLabels],
  );
  const categoryFacet = facets.find((facet) => facet.id === "tipo") ?? null;
  const destinationFacet = facets.find((facet) => facet.id === "destino") ?? null;
  /* Los ejes del buscador y de las categorías no se duplican en la barra de
     filtros: un solo control por criterio. */
  const barFacets = facets.filter((facet) => facet.id !== "tipo" && facet.id !== "destino");

  useEffect(() => {
    const count = anonymousTrip.trip?.travelerCount;
    if (!count || party) return;
    setParty(
      (count.children ?? 0) > 0
        ? "familiar"
        : compositionFromPartySize(count.adults + (count.children ?? 0)),
    );
  }, [anonymousTrip.trip?.travelerCount, party]);

  const filtered = useMemo(() => {
    return items.filter((vm) => {
      if (category !== ALL && vm.eyebrow !== category) return false;
      if (destination !== ALL && vm.territorialContext !== destination) return false;
      return barFacets.every((facet) => {
        const selected = active[facet.id] ?? [];
        if (selected.length === 0) return true;
        const values = facet.values(vm);
        return selected.some((value) => values.includes(value));
      });
    });
  }, [items, barFacets, active, category, destination]);

  const toggleFacet = (groupId: string, value: string) =>
    setActive((current) => {
      const selected = current[groupId] ?? [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [groupId]: next };
    });

  /** Criterios activos como etiquetas quitables. */
  const activeChips = barFacets.flatMap((facet) =>
    (active[facet.id] ?? []).map((value) => ({
      groupId: facet.id,
      value,
      label: facet.options.find((option) => option.value === value)?.label ?? humanizeValue(value),
    })),
  );

  const rememberContext = (kind: "territory_viewed" | "category_explored", key: string) => {
    if (typeof window === "undefined") return;
    void emitAluxSignal({
      kind,
      key,
      purpose: "continuity",
      context: {
        isAuthenticated: false,
        surface: "experiences-listing",
        route: window.location.pathname,
      },
    });
  };

  const selectDestination = (value: string) => {
    setDestination(value);
    if (value !== ALL) rememberContext("territory_viewed", slugify(value));
  };

  const selectCategory = (value: string) => {
    setCategory(value);
    if (value !== ALL) rememberContext("category_explored", slugify(value));
  };

  const selectParty = (value: PartyComposition) => {
    setParty(value);
    const adults = value === "solo" ? 1 : value === "pareja" ? 2 : value === "familiar" ? 2 : 4;
    void anonymousTrip.setTravelerCount(
      value === "familiar" ? { adults: 2, children: 2 } : { adults, children: 0 },
    );
  };

  const askAlux = (preference?: string) => {
    const context = [
      destination !== ALL ? `Destino: ${destination}` : null,
      category !== ALL ? `Categoría: ${category}` : null,
      party ? `Compañía: ${PARTY_PROMPT[party]}` : null,
      date ? `Fecha tentativa: ${date}` : null,
      travelers ? `Viajeros: ${travelers}` : null,
      preference,
    ]
      .filter(Boolean)
      .join(" · ");
    askAluxWithPreferenceMemory({
      surface: "experiences-listing",
      ...(preference ? { prompt: preference } : party ? { prompt: PARTY_PROMPT[party] } : {}),
      hint: buildAluxStageAwareHint(
        "Ayúdame a elegir experiencias publicadas del Oriente Maya y a convertirlas en una propuesta para el concierge humano.",
        context || undefined,
      ),
    });
  };

  const goToResults = () =>
    document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });

  const heroMedia = items.find((item) => item.mediaUrl);

  /* Categorías: misma autoridad iconográfica y de layout del ecosistema. */
  const categoryItems = categoryFacet
    ? [
        { slug: ALL_CATEGORY_SLUG, label: "Todas", count: items.length, value: ALL },
        ...categoryFacet.options.map((option) => ({
          slug: categoryIconSlug(option.label) ?? slugify(option.label),
          label: option.label,
          count: option.count,
          value: option.value,
        })),
      ]
    : [];
  const activeCategorySlug =
    category === ALL
      ? ALL_CATEGORY_SLUG
      : (categoryItems.find((item) => item.value === category)?.slug ?? ALL_CATEGORY_SLUG);

  /* Mapa: sólo coordenadas reales guardadas en el CMS. */
  const located = filtered.filter((card) => card.coordinates);
  const markers = located.map((card) => ({
    lat: card.coordinates!.lat,
    lng: card.coordinates!.lng,
    title: card.name,
    key: card.id,
  }));
  const center = markers.length
    ? {
        lat: markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length,
        lng: markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length,
      }
    : null;

  const focusCard = (id: string) => {
    setFocused(id);
    if (typeof document === "undefined") return;
    document
      .getElementById(`experiencia-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const clearAll = () => {
    setCategory(ALL);
    setDestination(ALL);
    setActive({});
  };

  return (
    <div className={cn("flex flex-col gap-10", className)}>
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
            ? { url: heroMedia.mediaUrl, alt: heroMedia.mediaAlt ?? dto.hero.title, asset: heroMedia.mediaAsset }
            : null
        }
        caption={dto.destinationLabel ? `Experiencias en ${dto.destinationLabel}` : undefined}
        searchSlot={
          <HeroSearchPill
            maxWidth="full"
            destinoLabel="Destino"
            destinoPlaceholder="¿Dónde quieres vivirla?"
            categoriaLabel="Experiencia"
            categoriaPlaceholder="¿Qué quieres vivir?"
            submitLabel="Buscar"
            destinoOptionsOverride={(destinationFacet?.options ?? []).map((option) => ({
              slug: option.value,
              name: option.label,
              hint: `${option.count} ${option.count === 1 ? "experiencia" : "experiencias"}`,
            }))}
            categoriaOptionsOverride={(categoryFacet?.options ?? []).map((option) => ({
              slug: option.value,
              name: option.label,
              hint: `${option.count} ${option.count === 1 ? "experiencia" : "experiencias"}`,
            }))}
            onDestinoChange={(option) => selectDestination(option?.slug ?? ALL)}
            onCategoriaChange={(option) => selectCategory(option?.slug ?? ALL)}
            onSubmitSearch={goToResults}
            extraSegments={
              <>
                <PillDateSegment value={date} onChange={setDate} />
                <PillTravelersSegment value={travelers} onChange={setTravelers} />
              </>
            }
          />
        }
      />

      <PremiumAluxBar
        question="¿Con quién vivirás esta experiencia?"
        selectedParty={party}
        onSelectParty={selectParty}
        onContinue={() => askAlux()}
        continueLabel="Ver sugerencias de Alux"
      />

      {categoryItems.length ? (
        <section aria-labelledby="categorias-title">
          <PremiumSectionHead
            id="categorias-title"
            kicker="Qué quieres vivir"
            title="Explora por categoría"
          />
          <div className="mt-3">
            <CategoryNavGrid
              items={categoryItems.map(({ slug, label, count }) => ({ slug, label, count }))}
              mode="select"
              activeSlug={activeCategorySlug}
              onSelect={(slug) => {
                const hit = categoryItems.find((item) => item.slug === slug);
                selectCategory(hit?.value ?? ALL);
              }}
              desktopColumnsClassName="lg:grid-cols-6"

            />
          </div>
        </section>
      ) : null}

      {barFacets.length ? (
        <div className="flex flex-col gap-2">
          <ExperienceFiltersBar
            groups={barFacets.map((facet) => ({
              id: facet.id,
              label: facet.label,
              options: facet.options,
            }))}
            selection={active}
            onToggle={toggleFacet}
            onClear={() => setActive({})}
            resultCount={filtered.length}
            primaryGroupIds={["duracion-real", "precio", "operador"]}
          />
          {activeChips.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={`${chip.groupId}:${chip.value}`}
                  type="button"
                  onClick={() => toggleFacet(chip.groupId, chip.value)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-pill border border-border bg-card px-3 text-xs font-medium ring-focus hover:bg-muted"
                >
                  {chip.label}
                  <X className="size-3" aria-hidden />
                  <span className="sr-only">Quitar filtro</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActive({})}
                className="text-xs font-semibold text-primary underline-offset-4 ring-focus hover:underline"
              >
                Limpiar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <section id="resultados" aria-labelledby="resultados-title" className="scroll-mt-32">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PremiumSectionHead
            id="resultados-title"
            kicker="Explora y compara"
            title={
              filtered.length === 1
                ? "1 experiencia para ti"
                : `${filtered.length} experiencias para ti`
            }
            description={
              reviewNotice
                ? "Incluye registros en revisión interna, marcados como DEMO."
                : "Fotos grandes, información esencial y precio visible para decidir con facilidad."
            }
          />
          {filtered.length ? (
            <div
              className="flex shrink-0 rounded-pill border border-border bg-card p-1 xl:hidden"
              aria-label="Vista de resultados"
            >
              <Button
                type="button"
                variant={view === "lista" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("lista")}
                className="rounded-pill px-4"
              >
                <List aria-hidden />
                Lista
              </Button>
              <Button
                type="button"
                variant={view === "mapa" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("mapa")}
                className="rounded-pill px-4"
              >
                <MapIcon aria-hidden />
                Ver mapa
              </Button>
            </div>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="border-y border-border py-12 text-center">
            <h3 className="font-display text-2xl">Prueba otra combinación</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {category !== ALL || destination !== ALL || activeChips.length
                ? "Ninguna experiencia publicada coincide con esa búsqueda."
                : dto.emptyMessage}
            </p>
            <Button type="button" variant="outline" className="mt-5 rounded-pill" onClick={clearAll}>
              Ver todas las experiencias
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.78fr)]">
            <div
              className={cn(
                "grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-2",
                view === "mapa" ? "hidden xl:grid" : "grid",
              )}
            >
              {filtered.map((vm) => (
                <ExperienceStoreCard
                  key={vm.id}
                  vm={vm}
                  valueLabels={attributeValueLabels}
                  focused={focused === vm.id}
                />
              ))}
            </div>
            <div className={cn(view === "mapa" ? "block" : "hidden xl:block")}>
              <div className="xl:sticky xl:top-28">
                {center ? (
                  <div className="h-[24rem] overflow-hidden rounded-xl border border-border shadow-soft xl:h-[38rem]">
                    <Suspense
                      fallback={
                        <div className="grid size-full place-items-center bg-muted/40 text-xs text-muted-foreground">
                          Cargando mapa…
                        </div>
                      }
                    >
                      <LazyInteractiveMap
                        lat={center.lat}
                        lng={center.lng}
                        markers={markers}
                        showMarkerNames
                        onMarkerSelect={focusCard}
                        className="size-full"
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div className="grid min-h-[16rem] place-items-center rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    Estas experiencias todavía no tienen su ubicación publicada en el mapa.
                  </div>
                )}
                {located.length < filtered.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {filtered.length - located.length} de {filtered.length} experiencias aún no
                    tienen ubicación publicada y no aparecen en el mapa.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Segmentos adicionales de la píldora (misma interacción del Home)
 * ------------------------------------------------------------------ */

function PillDateSegment({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex min-h-12 min-w-0 w-[calc(50%-0.5rem)] flex-none items-center gap-2 rounded-full px-3 py-1 text-left transition-colors sm:py-1.5",
        "hover:bg-muted/60 focus-within:bg-muted/70",
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">
          Fecha
        </span>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Fecha tentativa de la experiencia"
          className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none sm:text-[13px]"
        />
      </span>
    </label>
  );
}

function PillTravelersSegment({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={closeRef}
          type="button"
          aria-label={`Viajeros: ${value}`}
          className={cn(
            "group relative flex min-h-12 min-w-0 w-[calc(50%-0.5rem)] flex-none items-center gap-2 rounded-full px-3 py-1 text-left transition-colors sm:py-1.5",
            "hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            open && "bg-muted/70",
          )}
        >
          <Users className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">
              Viajeros
            </span>
            <span className="truncate text-xs font-medium text-foreground sm:text-[13px]">
              {value}
            </span>
          </span>
          <ChevronDown
            className="ml-auto hidden size-3.5 shrink-0 text-muted-foreground/70 sm:block"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        <ul>
          {TRAVELER_OPTIONS.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  option === value && "bg-muted font-medium",
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ *
 * Tarjeta de la tienda
 * ------------------------------------------------------------------ */

function ExperienceStoreCard({
  vm,
  valueLabels,
  focused = false,
}: {
  vm: StoreCardVM;
  valueLabels: Record<string, string>;
  focused?: boolean;
}) {
  const eligibility = evaluateTripEligibility({
    kind: "product",
    targetId: vm.id,
    title: vm.name,
  });
  /* Capacidad comercial real acreditada en el CMS: la tarjeta nunca ofrece
     reservar en línea sin modo de conversión y pago autorizado. */
  const commerce = resolveExperienceCommerce({
    conversionMode: vm.conversionMode ?? null,
    acceptsOnlinePayment: vm.acceptsOnlinePayment === true,
    priceAmount: vm.onlineSalePriceAmount ?? vm.priceAmount,
    priceCurrency: vm.onlineSalePriceCurrency ?? vm.priceCurrency,
  });
  const onlineSale = vm.conversionMode === "reservar_en_linea" && vm.acceptsOnlinePayment === true;
  const duration = durationLabelOf(vm, valueLabels);
  const reviewBadge = (vm.badges ?? [])
    .map((badge) => (typeof badge === "string" ? badge : badge.label))
    .find((label) => /DEMO/i.test(label));

  return (
    <article
      id={`experiencia-${vm.id}`}
      className={cn(
        "group min-w-0 scroll-mt-32 rounded-2xl transition-shadow",
        focused && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <a href={vm.href ?? "/experiencias"} className="block size-full ring-focus">
          {vm.mediaUrl ? (
            <img
              src={vm.mediaUrl}
              alt={vm.mediaAlt ?? vm.name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
              loading="lazy"
            />
          ) : (
            <span className="grid size-full place-items-center text-xs text-muted-foreground">
              Sin fotografía publicada
            </span>
          )}
        </a>
        {reviewBadge || onlineSale ? (
          <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase shadow-soft">
            {reviewBadge ?? "Reserva en línea"}
          </span>
        ) : null}
        {eligibility.eligible ? (
          <div className="absolute right-3 top-3 rounded-pill bg-background/90 shadow-soft">
            <AddToTravelPlanButton
              kind="product"
              targetId={vm.id}
              title={vm.name}
              subtitle={vm.businessName ?? undefined}
              imageUrl={vm.mediaUrl}
            />
          </div>
        ) : null}
      </div>
      <div className="pt-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="truncate font-semibold text-primary">
            {[vm.territorialContext, vm.eyebrow].filter(Boolean).join(" · ")}
          </p>
          {vm.rating ? (
            <span className="inline-flex shrink-0 items-center gap-1 font-medium">
              <Star className="size-3 fill-current" aria-hidden /> {vm.rating.value.toFixed(1)}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">
          <a href={vm.href ?? "/experiencias"} className="ring-focus">
            {vm.name}
          </a>
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {[duration, vm.businessName].filter(Boolean).join(" · ") || "Experiencia publicada"}
        </p>
        <p className="mt-2 text-sm">
          {commerce.priceLabel ? (
            <>
              <span className="font-semibold">{commerce.priceLabel}</span>
              <span className="text-muted-foreground"> por persona</span>
            </>
          ) : (
            <span className="text-muted-foreground">Precio a consultar</span>
          )}
        </p>
      </div>
    </article>
  );
}
