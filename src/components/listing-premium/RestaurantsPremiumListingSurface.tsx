/**
 * Listado Premium de restaurantes.
 *
 * Editorial funciona sin fotografía. Cinematográfica usa únicamente medios
 * canónicos y mantiene las mismas lecturas públicas, acciones y expediente de
 * concierge. La selección visible aquí sirve para preview; el CMS conservará
 * la autoridad final de publicación.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChefHat, MapPin, Search, Sparkles, UserRoundCheck, UtensilsCrossed } from "lucide-react";

import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";
import {
  TourismCard,
  TourismCardRow,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";
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
const MEDIA_ROOT = "/api/public/studio-media/conceptual-preview/2026-09-01";

const CONCEPT_HERO_SLIDES = [
  {
    src: `${MEDIA_ROOT}/restaurantes-hero-colonial-v1.webp`,
    alt: "Mesa de cocina yucateca en un patio colonial de Valladolid",
    label: "Patios de Valladolid",
  },
  {
    src: `${MEDIA_ROOT}/restaurantes-hero-cocina-ancestral-v1.webp`,
    alt: "Ingredientes regionales y comal en una cocina tradicional del Oriente Maya",
    label: "Cocina de origen",
  },
  {
    src: `${MEDIA_ROOT}/restaurantes-hero-contemporanea-v1.webp`,
    alt: "Cena contemporánea con ingredientes yucatecos en un patio tropical",
    label: "Mesa contemporánea",
  },
] as const;

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

function RestaurantActions({ item }: { item: TourismCardVM }) {
  const eligible = evaluateTripEligibility({
    kind: "business",
    targetId: item.id,
    title: item.name,
    mode: "universal",
  }).eligible;

  return (
    <div className="flex flex-wrap gap-2">
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
  );
}

export function RestaurantsPremiumListingSurface({
  dto,
  presentation = "editorial",
}: {
  dto: PublicListingDTO;
  presentation?: PremiumPresentation;
}) {
  const items = useMemo(() => [...dto.items], [dto.items]);
  const destinations = useMemo(() => unique(items.map(destinationOf)), [items]);
  const cuisines = useMemo(() => unique(items.map(cuisineOf)), [items]);
  const experiences = useMemo(() => unique(items.flatMap(experienceValues)).slice(0, 14), [items]);
  const [destination, setDestination] = useState(dto.destinationLabel ?? ALL);
  const [cuisine, setCuisine] = useState(ALL);
  const [experience, setExperience] = useState(ALL);
  const [query, setQuery] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);

  const filtered = useMemo(() => {
    const q = normalized(query.trim());
    return items.filter((item) => {
      if (destination !== ALL && destinationOf(item) !== destination) return false;
      if (cuisine !== ALL && cuisineOf(item) !== cuisine) return false;
      if (experience !== ALL && !experienceValues(item).includes(experience)) return false;
      if (!q) return true;
      return normalized(
        [
          item.name,
          item.tagline,
          item.territorialContext,
          destinationOf(item),
          ...item.highlights,
          ...item.badges.map((badge) => badge.label),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(q);
    });
  }, [cuisine, destination, experience, items, query]);

  const mapped = filtered.filter(
    (item): item is TourismCardVM & { coordinates: { lat: number; lng: number } } =>
      item.coordinates?.lat != null && item.coordinates?.lng != null,
  );
  const catalogHero = items.find((item) => item.mediaUrl) ?? null;
  const conceptualHero = CONCEPT_HERO_SLIDES[heroSlide] ?? CONCEPT_HERO_SLIDES[0];
  const heroMedia = catalogHero?.mediaUrl ?? conceptualHero.src;
  const heroAlt = catalogHero?.mediaAlt ?? conceptualHero.alt;
  const usesConceptualHero = !catalogHero;
  const cinematic = presentation === "cinematic";
  const summary = `Busco una propuesta gastronómica en ${
    destination === ALL ? "el Oriente Maya de Yucatán" : destination
  }. Estoy comparando ${filtered.length} restaurante${filtered.length === 1 ? "" : "s"} desde el listado Premium.`;

  function askAlux(preference: string) {
    openAluxFloating({
      reason: "manual",
      hint: `Ayúdame a elegir dónde comer. Preferencia inicial: ${preference}. Primero determina si estoy planeando, ya estoy en Valladolid o recorriendo el Oriente Maya. Si todavía planeo, no pidas ubicación para dar opciones cercanas: pregunta fechas, acompañantes, presupuesto y ruta. Si ya estoy aquí, usa ubicación sólo con permiso. Combina restaurantes guardados con horarios, trayectos y actividades, y explica por qué recomiendas cada opción.`,
    });
  }

  useEffect(() => {
    if (!usesConceptualHero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setHeroSlide((current) => (current + 1) % CONCEPT_HERO_SLIDES.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [usesConceptualHero]);

  return (
    <div className="space-y-6 pb-10">
      {cinematic ? (
        <CinematicHero
          media={heroMedia}
          alt={heroAlt ?? ""}
          label={usesConceptualHero ? conceptualHero.label : "Sabores del Oriente Maya"}
          conceptual={usesConceptualHero}
          slide={heroSlide}
          onSlideChange={setHeroSlide}
          onAskAlux={() => askAlux("quiero diseñar una ruta gastronómica")}
        />
      ) : (
        <EditorialHero
          media={heroMedia}
          alt={heroAlt ?? ""}
          label={usesConceptualHero ? conceptualHero.label : "Sabores del Oriente Maya"}
          conceptual={usesConceptualHero}
          slide={heroSlide}
          onSlideChange={setHeroSlide}
          onAskAlux={() => askAlux("quiero diseñar una ruta gastronómica")}
        />
      )}

      <section className="rounded-[1.6rem] border border-border bg-card/90 p-4 shadow-soft sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alux · copiloto gastronómico</p>
              <h2 className="font-serif text-xl">¿Qué mesa buscas hoy?</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Cocina yucateca",
              "Viaje en pareja",
              "Con niños",
              "Comida local",
              "Cena especial",
            ].map((preference) => (
              <button
                key={preference}
                type="button"
                onClick={() => askAlux(preference)}
                className="min-h-11 rounded-pill border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-primary/50 hover:bg-primary/5"
              >
                {preference}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => askAlux("recomiéndame una experiencia completa")}
            className="min-h-11 rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Recomiéndame una mesa
          </button>
        </div>
      </section>

      <section
        aria-label="Buscar y filtrar restaurantes"
        className="rounded-[1.6rem] border border-border bg-card p-4 shadow-soft"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(3,1fr)]">
          <label className="relative">
            <span className="sr-only">Buscar restaurante</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar restaurante, platillo o zona"
              className="min-h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
            label="Ambiente o momento"
            value={experience}
            options={experiences}
            onChange={setExperience}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong> restaurante
            {filtered.length === 1 ? "" : "s"} publicado{filtered.length === 1 ? "" : "s"}
          </p>
          {destination !== ALL || cuisine !== ALL || experience !== ALL || query ? (
            <button
              type="button"
              onClick={() => {
                setDestination(dto.destinationLabel ?? ALL);
                setCuisine(ALL);
                setExperience(ALL);
                setQuery("");
              }}
              className="min-h-11 px-3 text-sm font-semibold text-primary"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </section>

      {cinematic ? (
        <CinematicResults filtered={filtered} mapped={mapped} summary={summary} />
      ) : (
        <EditorialResults filtered={filtered} mapped={mapped} summary={summary} />
      )}
    </div>
  );
}

function HeroPagination({
  slide,
  onSlideChange,
}: {
  slide: number;
  onSlideChange: (slide: number) => void;
}) {
  return (
    <div className="flex gap-2" aria-label="Cambiar portada gastronómica">
      {CONCEPT_HERO_SLIDES.map((item, index) => (
        <button
          key={item.src}
          type="button"
          onClick={() => onSlideChange(index)}
          aria-label={`Mostrar ${item.label}`}
          aria-current={index === slide}
          className={cn(
            "h-2.5 rounded-full border border-white/75 transition-all",
            index === slide ? "w-8 bg-white" : "w-2.5 bg-white/35",
          )}
        />
      ))}
    </div>
  );
}

function EditorialHero({
  media,
  alt,
  label,
  conceptual,
  slide,
  onSlideChange,
  onAskAlux,
}: {
  media: string;
  alt: string;
  label: string;
  conceptual: boolean;
  slide: number;
  onSlideChange: (slide: number) => void;
  onAskAlux: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
      <div className="grid min-h-[24rem] lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative min-h-64 overflow-hidden bg-muted lg:min-h-full">
          <img
            key={media}
            src={media}
            alt={alt}
            className="absolute inset-0 size-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
          <span className="absolute left-5 top-5 rounded-pill bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {label}
            {conceptual ? " · visualización temporal" : ""}
          </span>
          {conceptual ? (
            <div className="absolute bottom-5 left-5">
              <HeroPagination slide={slide} onSlideChange={onSlideChange} />
            </div>
          ) : null}
        </div>
        <div className="relative flex flex-col justify-center overflow-hidden bg-[#123e2f] px-7 py-10 text-white sm:px-10 lg:px-12">
          <div
            aria-hidden
            className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10"
          />
          <p className="relative text-xs font-semibold uppercase tracking-[.18em] text-[#edb84f]">
            Restaurantes · Oriente Maya de Yucatán
          </p>
          <h1 className="relative mt-4 max-w-xl font-serif text-4xl leading-[.98] sm:text-5xl lg:text-6xl">
            Sabores del Oriente Maya de Yucatán
          </h1>
          <p className="relative mt-5 max-w-lg text-base leading-relaxed text-white/82 sm:text-lg">
            Tradición que inspira, ingredientes locales y experiencias que se quedan contigo.
          </p>
          <button
            type="button"
            onClick={onAskAlux}
            className="relative mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-pill border border-[#edb84f]/70 px-5 py-2.5 text-sm font-semibold text-[#ffd77e] transition hover:bg-white/10"
          >
            <Sparkles className="size-4" aria-hidden />
            Diseñar ruta gastronómica
          </button>
        </div>
      </div>
    </section>
  );
}

function CinematicHero({
  media,
  alt,
  label,
  conceptual,
  slide,
  onSlideChange,
  onAskAlux,
}: {
  media: string;
  alt: string;
  label: string;
  conceptual: boolean;
  slide: number;
  onSlideChange: (slide: number) => void;
  onAskAlux: () => void;
}) {
  return (
    <section className="relative min-h-[31rem] overflow-hidden rounded-[2rem] border border-border bg-[#102f25] shadow-soft sm:min-h-[36rem]">
      <img
        key={media}
        src={media}
        alt={alt}
        className="absolute inset-0 size-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
      <div className="relative flex min-h-[31rem] max-w-3xl flex-col justify-end px-7 py-10 text-white sm:min-h-[36rem] sm:px-10 lg:px-14 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#f0bc57]">
          Sabores · Oriente Maya de Yucatán
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[.94] sm:text-6xl lg:text-7xl">
          La región se descubre en la mesa
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
          De la cocina de origen a las nuevas mesas de Valladolid: encuentra el sabor que encaja con
          tu viaje.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onAskAlux}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-[#efb447] px-5 py-2.5 text-sm font-semibold text-[#173c2f]"
          >
            <Sparkles className="size-4" aria-hidden />
            Diseñar ruta gastronómica
          </button>
          <span className="rounded-pill border border-white/30 bg-black/20 px-4 py-2 text-xs text-white/85 backdrop-blur">
            {label}
            {conceptual ? " · visualización temporal" : ""}
          </span>
        </div>
        {conceptual ? (
          <div className="mt-5">
            <HeroPagination slide={slide} onSlideChange={onSlideChange} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EditorialResults({
  filtered,
  mapped,
  summary,
}: {
  filtered: TourismCardVM[];
  mapped: Array<TourismCardVM & { coordinates: { lat: number; lng: number } }>;
  summary: string;
}) {
  return (
    <>
      {filtered.length ? (
        <section className="space-y-4">
          <TourismCardRow
            vm={{
              ...filtered[0],
              mapLabel: filtered[0].coordinates ? "A" : null,
            }}
            capabilities={{ showFavorite: true, showRationale: true }}
            renderActions={(restaurant) => <RestaurantActions item={restaurant} />}
            className="border-primary/30 bg-primary/[.025]"
          />
          {filtered.length > 1 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(1).map((item) => (
                <TourismCard
                  key={item.id}
                  vm={item}
                  capabilities={{ showFavorite: true, showRationale: true }}
                  renderActions={(restaurant) => <RestaurantActions item={restaurant} />}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section>
          <EmptyState />
        </section>
      )}
      <SupportBand mapped={mapped} summary={summary} compact />
    </>
  );
}

function CinematicResults({
  filtered,
  mapped,
  summary,
}: {
  filtered: TourismCardVM[];
  mapped: Array<TourismCardVM & { coordinates: { lat: number; lng: number } }>;
  summary: string;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
      <div className="min-w-0 space-y-3">
        {filtered.length ? (
          filtered.map((item, index) => (
            <TourismCardRow
              key={item.id}
              vm={{
                ...item,
                mapLabel: item.coordinates ? String.fromCharCode(65 + (index % 26)) : null,
              }}
              capabilities={{ compact: index > 0, showFavorite: true, showRationale: true }}
              renderActions={(restaurant) => <RestaurantActions item={restaurant} />}
              className={cn(index === 0 && "border-primary/30 bg-primary/[.025]")}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
      <SupportBand mapped={mapped} summary={summary} />
    </section>
  );
}

function SupportBand({
  mapped,
  summary,
  compact = false,
}: {
  mapped: Array<TourismCardVM & { coordinates: { lat: number; lng: number } }>;
  summary: string;
  compact?: boolean;
}) {
  return (
    <aside className={cn("min-w-0 space-y-4", !compact && "xl:sticky xl:top-24 xl:self-start")}>
      <div className="overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
              Mapa Valladolid.mx
            </p>
            <h2 className="font-serif text-xl">Restaurantes en el territorio</h2>
          </div>
          <MapPin className="size-5 text-primary" aria-hidden />
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
              zoom={11}
              markerTitle={mapped[0].name}
              markers={mapped.map((item) => ({
                lat: item.coordinates.lat,
                lng: item.coordinates.lng,
                title: item.name,
                href: item.href,
              }))}
              className={cn("w-full", compact ? "h-80" : "h-[28rem]")}
            />
          </Suspense>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/.12),transparent_55%),hsl(var(--muted))] px-8 text-center">
            <MapPin className="size-8 text-primary" aria-hidden />
            <p className="mt-3 font-semibold">Ubicaciones en proceso de acreditación</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Cada restaurante aparecerá cuando publique coordenadas verificadas.
            </p>
          </div>
        )}
      </div>
      <div className="rounded-[1.6rem] border border-primary/20 bg-primary/[.045] p-5">
        <div className="flex gap-3">
          <UserRoundCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-serif text-xl">Una propuesta hecha para tu viaje</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Un concierge humano puede combinar fechas, acompañantes, restricciones alimentarias,
              presupuesto y lugares guardados.
            </p>
            <div className="mt-4">
              <RequestConciergeButton
                kind="travel_plan"
                summary={summary}
                label="Solicitar propuesta humana"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Al solicitarla, iniciarás sesión para conservar el expediente y darle seguimiento.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function EmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border border-dashed border-border bg-card p-10 text-center",
        className,
      )}
    >
      <ChefHat className="mx-auto size-8 text-primary" aria-hidden />
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
      <UtensilsCrossed
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full appearance-none rounded-xl border border-border bg-background pl-11 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        ⌄
      </span>
    </label>
  );
}
