/**
 * `ExperiencesListingSurface` — tienda pública de Experiencias.
 *
 * Autoridad visual: maqueta de tienda aprobada (`/lovable/experiencias-
 * tienda-maqueta`) construida sobre las piezas Premium ya aprobadas
 * (`PremiumEditorialHero`, `PremiumAluxBar`, `PremiumSectionHead`).
 * No introduce hero, tarjetas ni tokens nuevos ni superficies paralelas:
 * esta misma superficie sirve la ruta pública y la revisión interna.
 *
 * Datos: exclusivamente el DTO público real (`PublicListingDTO`). Los
 * filtros, categorías, destinos, precios, duraciones y coordenadas se
 * derivan de lo publicado en el CMS; si un dato no existe, no se muestra.
 * La etiqueta "Reserva en línea" sólo aparece con la capacidad comercial
 * acreditada (modo de conversión + pago en línea autorizado).
 */
import { useEffect, useMemo, useState } from "react";
import { List, Map as MapIcon, MapPin, Search, Star } from "lucide-react";

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
import { InteractiveMap } from "@/components/maps/InteractiveMap";
import { Button } from "@/components/ui/button";
import { TourismCategoryIcon } from "@/components/omxds/TourismCategoryIcon";

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
  return exact ?? aliases[slug] ?? null;
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
  const [query, setQuery] = useState("");
  const [party, setParty] = useState<PartyComposition | null>(null);
  const [active, setActive] = useState<FilterSelection>({});
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [category, setCategory] = useState<string>(ALL);
  const [destination, setDestination] = useState<string>(ALL);
  const [date, setDate] = useState("");
  const [travelers, setTravelers] = useState("2 personas");
  const anonymousTrip = useAnonymousTrip();

  const items = dto.items as readonly StoreCardVM[];
  const facets = useMemo(
    () => buildFacets(items, attributeAxes, attributeValueLabels),
    [items, attributeAxes, attributeValueLabels],
  );
  const categoryFacet = facets.find((facet) => facet.id === "tipo") ?? null;
  const destinationFacet = facets.find((facet) => facet.id === "destino") ?? null;
  /* Los ejes de las barras (categoría y destino) no se duplican en la barra
     de filtros para que el visitante tenga un solo control por eje. */
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
    const needle = query.trim().toLowerCase();
    return items.filter((vm) => {
      const matchesQuery =
        !needle ||
        [vm.name, vm.tagline, vm.businessName, vm.territorialContext]
          .filter(Boolean)
          .some((value) => (value as string).toLowerCase().includes(needle));
      if (!matchesQuery) return false;
      if (category !== ALL && vm.eyebrow !== category) return false;
      if (destination !== ALL && vm.territorialContext !== destination) return false;
      return barFacets.every((facet) => {
        const selected = active[facet.id] ?? [];
        if (selected.length === 0) return true;
        const values = facet.values(vm);
        return selected.some((value) => values.includes(value));
      });
    });
  }, [items, barFacets, active, query, category, destination]);

  const toggleFacet = (groupId: string, value: string) =>
    setActive((current) => {
      const selected = current[groupId] ?? [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [groupId]: next };
    });

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
            ? { url: heroMedia.mediaUrl, alt: heroMedia.mediaAlt ?? dto.hero.title }
            : null
        }
        caption={dto.destinationLabel ? `Experiencias en ${dto.destinationLabel}` : undefined}
        searchSlot={
          <div className="rounded-2xl border border-border bg-background/95 p-2 shadow-elevated backdrop-blur-sm">
            <label className="block rounded-xl px-3 py-2.5">
              <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                Qué quieres vivir
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cenotes, cocina maya, bicicleta…"
                className="mt-0.5 min-h-6 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="mt-1 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {destinationFacet ? (
                <SearchSelect
                  label="Destino"
                  value={destination}
                  onChange={selectDestination}
                  options={[
                    { value: ALL, label: "Todos los destinos" },
                    ...destinationFacet.options.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
              ) : null}
              {categoryFacet ? (
                <SearchSelect
                  label="Categoría"
                  value={category}
                  onChange={selectCategory}
                  options={[
                    { value: ALL, label: "Todas las categorías" },
                    ...categoryFacet.options.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
              ) : null}
              <label className="bg-card px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                  Fecha tentativa
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="Fecha tentativa de la experiencia"
                  className="mt-0.5 min-h-6 w-full bg-transparent text-sm outline-none"
                />
              </label>
              <SearchSelect
                label="Viajeros"
                value={travelers}
                onChange={setTravelers}
                options={TRAVELER_OPTIONS.map((value) => ({ value, label: value }))}
              />
            </div>
            <Button type="button" onClick={goToResults} className="mt-2 min-h-11 w-full rounded-pill">
              <Search aria-hidden />
              Buscar experiencias
            </Button>
          </div>
        }
      />

      <PremiumAluxBar
        question="¿Con quién vivirás esta experiencia?"
        selectedParty={party}
        onSelectParty={selectParty}
        onContinue={() => askAlux()}
        continueLabel="Ver sugerencias de Alux"
      />

      {categoryFacet ? (
        <section aria-labelledby="categorias-title">
          <PremiumSectionHead
            id="categorias-title"
            kicker="Qué quieres vivir"
            title="Explora por categoría"
          />
          <div className="-mx-4 mt-2 flex snap-x gap-7 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
            <CategoryTile
              label="Todas"
              slug={null}
              selected={category === ALL}
              onSelect={() => selectCategory(ALL)}
            />
            {categoryFacet.options.map((option) => (
              <CategoryTile
                key={option.value}
                label={option.label}
                slug={categoryIconSlug(option.label)}
                selected={category === option.value}
                onSelect={() => selectCategory(option.value)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {destinationFacet ? (
        <section aria-labelledby="destinos-title" className="border-y border-border py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-52">
              <p className="text-xs font-semibold uppercase text-primary">Dónde quieres ir</p>
              <h2 id="destinos-title" className="mt-1 font-display text-2xl">
                Explora por destino
              </h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:ml-auto">
              {[
                { value: ALL, label: "Todos los destinos" },
                ...destinationFacet.options.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={destination === option.value ? "default" : "outline"}
                  aria-pressed={destination === option.value}
                  onClick={() => selectDestination(option.value)}
                  className="min-h-11 shrink-0 rounded-pill px-5"
                >
                  {option.value !== ALL ? <MapPin aria-hidden /> : null}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {barFacets.length ? (
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
        />
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
              className="flex shrink-0 rounded-pill border border-border bg-card p-1"
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
                Mapa
              </Button>
            </div>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="border-y border-border py-12 text-center">
            <h3 className="font-display text-2xl">Prueba otra combinación</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {query || category !== ALL || destination !== ALL || Object.values(active).some((v) => v?.length)
                ? "Ninguna experiencia publicada coincide con esa búsqueda."
                : dto.emptyMessage}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-pill"
              onClick={() => {
                setQuery("");
                setCategory(ALL);
                setDestination(ALL);
                setActive({});
              }}
            >
              Ver todas las experiencias
            </Button>
          </div>
        ) : view === "lista" ? (
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((vm) => (
              <ExperienceStoreCard key={vm.id} vm={vm} valueLabels={attributeValueLabels} />
            ))}
          </div>
        ) : (
          <ExperiencesMapView cards={filtered} valueLabels={attributeValueLabels} />
        )}
      </section>
    </div>
  );
}

function SearchSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="bg-card px-3 py-2.5">
      <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 min-h-6 w-full bg-transparent text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CategoryTile({
  label,
  slug,
  selected,
  onSelect,
}: {
  label: string;
  slug: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "h-24 min-w-20 snap-start flex-col gap-1 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 py-2 whitespace-normal shadow-none hover:bg-transparent",
        selected
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {slug ? (
        <TourismCategoryIcon slug={slug} variant="standard" size={44} />
      ) : (
        <span className="grid size-11 place-items-center font-display text-xl" aria-hidden>
          ···
        </span>
      )}
      <span className="line-clamp-2 text-center text-xs leading-tight">{label}</span>
    </Button>
  );
}

function ExperienceStoreCard({
  vm,
  valueLabels,
  compact = false,
}: {
  vm: StoreCardVM;
  valueLabels: Record<string, string>;
  compact?: boolean;
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
    <article className={cn("group min-w-0", compact && "grid grid-cols-[8rem_minmax(0,1fr)] gap-3")}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-muted",
          compact ? "h-32" : "aspect-[4/5]",
        )}
      >
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
        {!compact && (reviewBadge || onlineSale) ? (
          <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase shadow-soft">
            {reviewBadge ?? "Reserva en línea"}
          </span>
        ) : null}
        {!compact && eligibility.eligible ? (
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
      <div className={cn("pt-3", compact && "flex min-w-0 flex-col justify-center pt-0")}>
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
        <h3
          className={cn("mt-1 line-clamp-2 font-semibold leading-snug", compact ? "text-base" : "text-[15px]")}
        >
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
        {compact && eligibility.eligible ? (
          <div className="mt-2">
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
    </article>
  );
}

function ExperiencesMapView({
  cards,
  valueLabels,
}: {
  cards: readonly StoreCardVM[];
  valueLabels: Record<string, string>;
}) {
  /* Sólo se dibujan coordenadas reales guardadas en el CMS. */
  const located = cards.filter((card) => card.coordinates);
  const markers = located.map((card) => ({
    lat: card.coordinates!.lat,
    lng: card.coordinates!.lng,
    title: card.name,
    key: card.id,
    href: card.href ?? null,
  }));
  const center = markers.length
    ? {
        lat: markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length,
        lng: markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length,
      }
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {cards.slice(0, 4).map((card) => (
          <ExperienceStoreCard key={card.id} vm={card} valueLabels={valueLabels} compact />
        ))}
      </div>
      {center ? (
        <div className="min-h-[32rem] overflow-hidden rounded-xl border border-border shadow-soft">
          <InteractiveMap
            lat={center.lat}
            lng={center.lng}
            markers={markers}
            showMarkerNames
            className="size-full min-h-[32rem]"
          />
        </div>
      ) : (
        <div className="grid min-h-[20rem] place-items-center rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Estas experiencias todavía no tienen su ubicación publicada en el mapa.
        </div>
      )}
      {located.length < cards.length && center ? (
        <p className="text-xs text-muted-foreground xl:col-span-2">
          {cards.length - located.length} de {cards.length} experiencias aún no tienen ubicación
          publicada y no aparecen en el mapa.
        </p>
      ) : null}
    </div>
  );
}
