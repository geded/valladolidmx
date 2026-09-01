/**
 * Listado Premium de restaurantes alineado con la referencia aprobada.
 * Editorial funciona sin medios propios; cinematográfica amplía la fotografía
 * sin cambiar navegación, filtros, acciones ni el expediente de concierge.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChefHat,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  UtensilsCrossed,
} from "lucide-react";

import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { cn } from "@/lib/utils";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((module) => ({ default: module.InteractiveMap })),
);

const ALL = "__all__";

/** Medios gobernados: IA, conceptuales, temporales y reemplazables desde CMS. */
const GOVERNED_MEDIA = [
  "/api/public/studio-media/2026/1788291771784-5vcdnt-restaurante-fonda-mercado-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291775648-7j8tiw-restaurante-patio-colonial-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291770675-89lsmh-restaurante-patio-izamal-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291772757-yp7xx5-restaurante-comal-cocina-maya-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291773480-6zjzv5-restaurante-costa-el-cuyo-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291774706-qcx0r0-restaurante-campo-milpa-conceptual-v1.webp",
] as const;

const HERO_SLIDES = [
  { src: GOVERNED_MEDIA[0], label: "Cocina de origen" },
  { src: GOVERNED_MEDIA[3], label: "Sabores del Mayab" },
  { src: GOVERNED_MEDIA[1], label: "Patios de Valladolid" },
] as const;

const DEMO_ITEMS: TourismCardVM[] = [
  {
    id: "preview-la-mesa-del-mayab",
    entityKind: "business",
    eyebrow: "Cocina yucateca contemporánea",
    name: "La Mesa del Mayab",
    href: null,
    tagline: "Ingredientes locales, técnica actual y el alma yucateca en cada plato.",
    businessName: null,
    mediaUrl: GOVERNED_MEDIA[1],
    mediaAlt: "Restaurante en un patio tropical del Oriente Maya",
    rating: null,
    location: { label: "Valladolid", distanceKm: null },
    territorialContext: "Valladolid · Oriente Maya",
    highlights: ["Cena", "Patio"],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
    rationale: "Visualización temporal mientras el restaurante completa su ficha.",
  },
  {
    id: "preview-cocina-de-dona-elsa",
    entityKind: "business",
    eyebrow: "Cocina yucateca",
    name: "Cocina de Doña Elsa",
    href: null,
    tagline: "Recetas de familia que cuentan historias de generaciones.",
    businessName: null,
    mediaUrl: GOVERNED_MEDIA[3],
    mediaAlt: "Cocina tradicional yucateca servida en vajilla regional",
    rating: null,
    location: { label: "Valladolid", distanceKm: null },
    territorialContext: "Valladolid · Oriente Maya",
    highlights: ["Patio", "Familiar"],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
    rationale: "Visualización temporal mientras el restaurante completa su ficha.",
  },
  {
    id: "preview-patio-de-izamal",
    entityKind: "business",
    eyebrow: "Cocina yucateca",
    name: "El Patio de Izamal",
    href: null,
    tagline: "Sabores tradicionales en un patio lleno de historia.",
    businessName: null,
    mediaUrl: GOVERNED_MEDIA[2],
    mediaAlt: "Patio amarillo de restaurante en Izamal",
    rating: null,
    location: { label: "Izamal", distanceKm: null },
    territorialContext: "Izamal · Oriente Maya",
    highlights: ["Patio", "Familiar"],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
    rationale: "Visualización temporal mientras el restaurante completa su ficha.",
  },
];

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim()))),
  ).sort((a, b) => a.localeCompare(b, "es"));
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function destinationOf(item: TourismCardVM): string | null {
  return item.location?.label ?? null;
}

function cuisineOf(item: TourismCardVM): string | null {
  const value = item.eyebrow?.trim();
  return value && !/restaurante|oriente maya|verificad/i.test(value) ? value : null;
}

function experienceValues(item: TourismCardVM): string[] {
  return unique([...item.highlights, ...item.badges.map((badge) => badge.label)]).filter(
    (value) => !/restaurante|oriente maya|verificad/i.test(value),
  );
}

function withGovernedMedia(item: TourismCardVM, index: number): TourismCardVM {
  if (item.mediaUrl) return item;
  return {
    ...item,
    mediaUrl: GOVERNED_MEDIA[index % GOVERNED_MEDIA.length],
    mediaAlt: `Visual conceptual temporal para ${item.name}`,
  };
}

export function RestaurantsPremiumListingSurface({
  dto,
  presentation = "editorial",
}: {
  dto: PublicListingDTO;
  presentation?: PremiumPresentation;
}) {
  const items = useMemo(
    () => (dto.items.length ? dto.items : DEMO_ITEMS).map(withGovernedMedia),
    [dto.items],
  );
  const destinations = useMemo(() => unique(items.map(destinationOf)), [items]);
  const cuisines = useMemo(() => unique(items.map(cuisineOf)), [items]);
  const experiences = useMemo(() => unique(items.flatMap(experienceValues)).slice(0, 14), [items]);
  const [destination, setDestination] = useState(dto.destinationLabel ?? ALL);
  const [cuisine, setCuisine] = useState(ALL);
  const [experience, setExperience] = useState(ALL);
  const [query, setQuery] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const cinematic = presentation === "cinematic";

  const filtered = useMemo(() => {
    const q = normalized(query.trim());
    return items.filter((item) => {
      if (destination !== ALL && destinationOf(item) !== destination) return false;
      if (cuisine !== ALL && cuisineOf(item) !== cuisine) return false;
      if (experience !== ALL && !experienceValues(item).includes(experience)) return false;
      if (!q) return true;
      return normalized(
        [item.name, item.tagline, destinationOf(item), ...item.highlights]
          .filter(Boolean)
          .join(" "),
      ).includes(q);
    });
  }, [cuisine, destination, experience, items, query]);

  const mapped = filtered.filter(
    (item): item is TourismCardVM & { coordinates: { lat: number; lng: number } } =>
      item.coordinates?.lat != null && item.coordinates?.lng != null,
  );
  const summary = `Busco una propuesta gastronómica en ${
    destination === ALL ? "el Oriente Maya de Yucatán" : destination
  }. Estoy comparando ${filtered.length} restaurante${filtered.length === 1 ? "" : "s"}.`;

  function askAlux(preference: string) {
    openAluxFloating({
      reason: "manual",
      hint: `Ayúdame a elegir dónde comer. Preferencia inicial: ${preference}. Primero determina si estoy planeando, si ya estoy en Valladolid o si recorro el Oriente Maya. Si todavía planeo, pregunta fechas, acompañantes, presupuesto y ruta; solicita ubicación sólo si ya estoy en destino y con permiso.`,
    });
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setHeroSlide((current) => (current + 1) % HERO_SLIDES.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pb-12">
      <ApprovedHero cinematic={cinematic} slide={heroSlide} onSlideChange={setHeroSlide} />

      <div className="relative z-10 -mt-5 px-3 sm:-mt-7 sm:px-5 lg:px-8">
        <AluxPanel onAsk={askAlux} />
      </div>

      <div className="mx-auto max-w-[92rem] px-3 sm:px-5 lg:px-8">
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((value) => !value)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium shadow-sm"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
          </button>
          <button
            type="button"
            aria-expanded={showMap}
            onClick={() => setShowMap((value) => !value)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium shadow-sm"
          >
            <MapIcon className="size-4" aria-hidden />
            {showMap ? "Ocultar mapa" : "Ver mapa"}
          </button>
        </div>

        {showFilters ? (
          <FilterPanel
            query={query}
            setQuery={setQuery}
            destination={destination}
            setDestination={setDestination}
            destinations={destinations}
            cuisine={cuisine}
            setCuisine={setCuisine}
            cuisines={cuisines}
            experience={experience}
            setExperience={setExperience}
            experiences={experiences}
            reset={() => {
              setDestination(dto.destinationLabel ?? ALL);
              setCuisine(ALL);
              setExperience(ALL);
              setQuery("");
            }}
          />
        ) : null}

        {showMap ? <RestaurantMap mapped={mapped} /> : null}

        <section className="mt-3" aria-label="Restaurantes del Oriente Maya">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{filtered.length}</strong> restaurante
              {filtered.length === 1 ? "" : "s"}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Mapa disponible bajo demanda
            </p>
          </div>
          {filtered.length ? (
            <div className={cn("grid gap-3", cinematic && "lg:grid-cols-2")}>
              <RestaurantCard item={filtered[0]} featured={!cinematic} />
              {filtered.length > 1 ? (
                <div className={cn("grid gap-3 sm:grid-cols-2", cinematic && "contents")}>
                  {filtered.slice(1).map((item) => (
                    <RestaurantCard key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        <ConciergeBand summary={summary} />
      </div>
    </div>
  );
}

function ApprovedHero({
  cinematic,
  slide,
  onSlideChange,
}: {
  cinematic: boolean;
  slide: number;
  onSlideChange: (slide: number) => void;
}) {
  const active = HERO_SLIDES[slide] ?? HERO_SLIDES[0];
  return (
    <section
      className={cn(
        "relative mx-auto max-w-[92rem] overflow-hidden border-y border-border bg-[#173d2e] lg:rounded-b-[1.8rem] lg:border-x",
        cinematic ? "min-h-[31rem]" : "min-h-[21rem]",
      )}
    >
      <div className={cn("grid h-full", !cinematic && "lg:grid-cols-[1.05fr_.95fr]")}>
        <div
          className={cn(
            "relative overflow-hidden",
            cinematic ? "absolute inset-0" : "min-h-[21rem]",
          )}
        >
          <img
            key={active.src}
            src={active.src}
            alt="Sabores yucatecos del Oriente Maya"
            className="absolute inset-0 size-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
          />
          <div
            className={cn(
              "absolute inset-0",
              cinematic
                ? "bg-gradient-to-r from-black/80 via-black/42 to-black/10"
                : "bg-gradient-to-t from-black/60 via-transparent to-black/5 lg:hidden",
            )}
          />
        </div>
        <div
          className={cn(
            "relative flex flex-col justify-center px-6 py-10 text-white sm:px-9",
            cinematic
              ? "min-h-[31rem] max-w-3xl justify-end lg:px-14 lg:py-14"
              : "absolute inset-0 justify-end lg:static lg:justify-center lg:px-12",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#efbd5b]">
            Restaurantes · Oriente Maya
          </p>
          <h1
            className={cn(
              "mt-3 max-w-2xl font-serif leading-[.96]",
              cinematic ? "text-5xl sm:text-7xl" : "text-4xl sm:text-5xl",
            )}
          >
            Sabores del Oriente Maya de Yucatán
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/86 sm:text-base">
            Tradición que inspira, ingredientes locales y experiencias que se quedan contigo.
          </p>
          <div className="mt-5 flex items-center gap-2" aria-label="Cambiar portada gastronómica">
            {HERO_SLIDES.map((item, index) => (
              <button
                key={item.src}
                type="button"
                onClick={() => onSlideChange(index)}
                aria-label={`Mostrar ${item.label}`}
                aria-current={index === slide}
                className={cn(
                  "h-2 rounded-full border border-white/70 transition-all",
                  index === slide ? "w-8 bg-white" : "w-2 bg-white/35",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AluxPanel({ onAsk }: { onAsk: (preference: string) => void }) {
  const preferences = ["Cocina yucateca", "Cena en pareja", "Familiar", "Comida local"];
  return (
    <section className="mx-auto max-w-[88rem] rounded-[1.3rem] border border-[#dfd1b7] bg-[#fffaf0]/95 p-3 shadow-[0_10px_30px_rgba(57,43,22,.13)] backdrop-blur sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[#e8dcc5] text-[#173d2e]">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#173d2e]">Alux · copiloto gastronómico</p>
            <h2 className="font-serif text-xl leading-tight text-[#18271f]">
              ¿Qué se te antoja hoy?
            </h2>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {preferences.map((preference, index) => (
            <button
              key={preference}
              type="button"
              onClick={() => onAsk(preference)}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-4 text-xs font-medium",
                index === 0
                  ? "border-[#173d2e] bg-[#173d2e] text-white"
                  : "border-[#d7c9af] bg-white/70 text-[#263a30]",
              )}
            >
              {preference}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onAsk("una propuesta completa para mi viaje")}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#bc4d26] px-5 text-sm font-semibold text-white"
        >
          Preguntar a Alux
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

function RestaurantCard({ item, featured = false }: { item: TourismCardVM; featured?: boolean }) {
  const eligible = evaluateTripEligibility({
    kind: "business",
    targetId: item.id,
    title: item.name,
    mode: "universal",
  }).eligible;
  const href = item.href ?? item.primaryAction?.href;
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-[#dfd3be] bg-[#fffaf1] shadow-sm",
        featured && "lg:grid lg:grid-cols-[.9fr_1.1fr]",
      )}
    >
      <div className={cn("relative overflow-hidden bg-muted", featured ? "min-h-60" : "h-48")}>
        {item.mediaUrl ? (
          <img
            src={item.mediaUrl}
            alt={item.mediaAlt ?? item.name}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center bg-[#e8dfce] text-[#173d2e]">
            <ChefHat className="size-9" />
          </div>
        )}
        {featured ? (
          <span className="absolute left-3 top-3 rounded bg-[#bc4d26] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Destacado
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#8b5a2b]">
          {item.eyebrow ?? "Restaurante"}
        </p>
        <h2 className="mt-1 font-serif text-2xl leading-tight text-[#16291f]">{item.name}</h2>
        <p className="mt-1 text-xs font-medium text-[#4e6558]">
          {[item.eyebrow, destinationOf(item)].filter(Boolean).join(" · ")}
        </p>
        {item.tagline ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#3d493f]">{item.tagline}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.highlights.slice(0, 3).map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-[#d7cfad] bg-[#f1f1d7] px-2.5 py-1 text-[11px] text-[#314739]"
            >
              {highlight}
            </span>
          ))}
        </div>
        <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-[1fr_auto]">
          {href ? (
            <a
              href={href}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#173d2e] px-4 text-sm font-semibold text-white"
            >
              Ver restaurante <ArrowRight className="size-4" />
            </a>
          ) : (
            <span className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#173d2e] px-4 text-sm font-semibold text-white/80">
              Ficha en preparación
            </span>
          )}
          <div className="flex items-center justify-center gap-2">
            <FavoriteButton entityKind="business" entityId={item.id} />
            {eligible ? (
              <AddToTravelPlanButton
                kind="business"
                targetId={item.id}
                title={item.name}
                slug={item.href?.split("/").filter(Boolean).at(-1) ?? null}
                imageUrl={item.mediaUrl}
                subtitle={item.tagline ?? item.territorialContext}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterPanel({
  query,
  setQuery,
  destination,
  setDestination,
  destinations,
  cuisine,
  setCuisine,
  cuisines,
  experience,
  setExperience,
  experiences,
  reset,
}: {
  query: string;
  setQuery: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  destinations: string[];
  cuisine: string;
  setCuisine: (value: string) => void;
  cuisines: string[];
  experience: string;
  setExperience: (value: string) => void;
  experiences: string[];
  reset: () => void;
}) {
  return (
    <section
      className="mt-3 rounded-xl border border-border bg-card p-3 shadow-sm"
      aria-label="Buscar y filtrar restaurantes"
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.35fr_repeat(3,1fr)_auto]">
        <label className="relative">
          <span className="sr-only">Buscar restaurante</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Restaurante, platillo o zona"
            className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <FilterSelect
          label="Destino"
          value={destination}
          options={destinations}
          onChange={setDestination}
        />
        <FilterSelect
          label="Tipo de cocina"
          value={cuisine}
          options={cuisines}
          onChange={setCuisine}
        />
        <FilterSelect
          label="Ambiente"
          value={experience}
          options={experiences}
          onChange={setExperience}
        />
        <button
          type="button"
          onClick={reset}
          className="min-h-11 px-3 text-sm font-semibold text-primary"
        >
          Limpiar
        </button>
      </div>
    </section>
  );
}

function RestaurantMap({
  mapped,
}: {
  mapped: Array<TourismCardVM & { coordinates: { lat: number; lng: number } }>;
}) {
  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">
            Mapa Valladolid.mx
          </p>
          <h2 className="font-serif text-xl">Restaurantes en el territorio</h2>
        </div>
        <MapPin className="size-5 text-primary" />
      </div>
      {mapped.length ? (
        <Suspense
          fallback={
            <div className="grid h-80 place-items-center bg-muted text-sm text-muted-foreground">
              Preparando mapa…
            </div>
          }
        >
          <InteractiveMap
            lat={mapped[0].coordinates.lat}
            lng={mapped[0].coordinates.lng}
            zoom={10}
            markerTitle={mapped[0].name}
            markers={mapped.map((item) => ({
              lat: item.coordinates.lat,
              lng: item.coordinates.lng,
              title: item.name,
              href: item.href,
            }))}
            className="h-80 w-full"
          />
        </Suspense>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/.12),transparent_55%),hsl(var(--muted))] px-6 text-center">
          <MapPin className="size-7 text-primary" />
          <p className="mt-2 font-semibold">Ubicaciones en proceso de acreditación</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El mapa se completa con coordenadas verificadas desde el CMS.
          </p>
        </div>
      )}
    </section>
  );
}

function ConciergeBand({ summary }: { summary: string }) {
  return (
    <section className="mt-4 rounded-xl border border-[#d8c8ac] bg-[#fff8eb] p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-3">
          <UserRoundCheck className="mt-1 size-6 shrink-0 text-[#173d2e]" />
          <div>
            <h2 className="font-serif text-xl text-[#173d2e]">
              Tu mesa puede ser parte de un viaje completo
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#4f6055]">
              Guarda tus favoritos. Alux organiza fechas, acompañantes, restricciones y presupuesto;
              un concierge humano puede revisar el expediente y enviarte una propuesta.
            </p>
          </div>
        </div>
        <RequestConciergeButton
          kind="travel_plan"
          summary={summary}
          label="Solicitar propuesta humana"
        />
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <ChefHat className="mx-auto size-8 text-primary" />
      <p className="mt-3 font-semibold">No encontramos restaurantes con esos filtros.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Prueba otro destino o pídele a Alux una alternativa compatible con tu ruta.
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <UtensilsCrossed className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full appearance-none rounded-lg border border-border bg-background pl-10 pr-8 text-sm font-medium outline-none focus:border-primary"
      >
        <option value={ALL}>{label}: todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        ⌄
      </span>
    </label>
  );
}
