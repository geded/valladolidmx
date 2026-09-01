/**
 * Listado Premium de hoteles — composición aprobada IMG_0513.
 *
 * Reutiliza exclusivamente el DTO público, TourismCardRow, Mi Viaje,
 * favoritos, mapa Valladolid.mx, Alux global y el expediente canónico de
 * concierge. No introduce lecturas paralelas ni contenido de catálogo.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BedDouble, Compass, MapPin, Search, Sparkles, UserRoundCheck } from "lucide-react";

import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";
import {
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

const CONCEPT_HERO_SLIDES = [
  {
    src: "/media/preview-generated/hoteles-hero-colonial-v1.webp",
    alt: "Visualización conceptual de un hotel colonial del Oriente Maya",
    label: "Ciudad colonial",
  },
  {
    src: "/media/preview-generated/hoteles-hero-campo-v1.webp",
    alt: "Visualización conceptual de hospedaje rural entre milpa y campo yucateco",
    label: "Campo y siembra",
  },
  {
    src: "/media/preview-generated/hoteles-hero-costa-v1.webp",
    alt: "Visualización conceptual de hospedaje frente a la costa del Oriente Maya",
    label: "Costa y playa",
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

function typeOf(item: TourismCardVM): string | null {
  return item.eyebrow ?? (item.entityKind === "hotel" ? "Hotel" : null);
}

function serviceValues(item: TourismCardVM): string[] {
  return [...item.highlights, ...item.badges.map((badge) => badge.label)];
}

function HotelActions({ item }: { item: TourismCardVM }) {
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

export function HotelsPremiumListingSurface({
  dto,
  presentation = "editorial",
}: {
  dto: PublicListingDTO;
  presentation?: PremiumPresentation;
}) {
  const items = useMemo(() => [...dto.items], [dto.items]);
  const destinations = useMemo(() => unique(items.map(destinationOf)), [items]);
  const types = useMemo(() => unique(items.map(typeOf)), [items]);
  const services = useMemo(() => unique(items.flatMap(serviceValues)).slice(0, 12), [items]);
  const [destination, setDestination] = useState(dto.destinationLabel ?? ALL);
  const [type, setType] = useState(ALL);
  const [service, setService] = useState(ALL);
  const [query, setQuery] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);

  const filtered = useMemo(() => {
    const q = normalized(query.trim());
    return items.filter((item) => {
      if (destination !== ALL && destinationOf(item) !== destination) return false;
      if (type !== ALL && typeOf(item) !== type) return false;
      if (service !== ALL && !serviceValues(item).includes(service)) return false;
      if (!q) return true;
      return normalized(
        [item.name, item.tagline, item.territorialContext, destinationOf(item), ...item.highlights]
          .filter(Boolean)
          .join(" "),
      ).includes(q);
    });
  }, [destination, items, query, service, type]);

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
  const summary = `Busco una propuesta de hospedaje en ${
    destination === ALL ? "el Oriente Maya de Yucatán" : destination
  }. Estoy comparando ${filtered.length} opción${filtered.length === 1 ? "" : "es"} desde el listado Premium.`;

  function askAlux(preference: string) {
    openAluxFloating({
      reason: "manual",
      hint: `Ayúdame a elegir hospedaje. Preferencia inicial: ${preference}. Primero determina si estoy planeando, ya estoy en Valladolid o recorriendo el Oriente Maya; usa mi perfil y Mi Viaje. No pidas ubicación si todavía estoy preparando el viaje. Sugiere noches, base territorial y actividades compatibles, y explícame por qué.`,
    });
  }

  useEffect(() => {
    if (!usesConceptualHero || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = window.setInterval(
      () => setHeroSlide((current) => (current + 1) % CONCEPT_HERO_SLIDES.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [usesConceptualHero]);

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
        <div
          className={cn(
            "relative grid min-h-[24rem]",
            cinematic ? "min-h-[34rem]" : "lg:grid-cols-[1.05fr_.95fr]",
          )}
        >
          <div
            className={cn(
              "relative min-h-64 overflow-hidden bg-muted lg:min-h-full",
              cinematic && "absolute inset-0",
            )}
          >
            <img
              key={heroMedia}
              src={heroMedia}
              alt={heroAlt ?? ""}
              className="absolute inset-0 size-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
            />
            <div
              className={cn(
                "absolute inset-0",
                cinematic
                  ? "bg-gradient-to-r from-black/82 via-black/48 to-black/10"
                  : "bg-gradient-to-t from-black/45 via-transparent to-black/10",
              )}
            />
            <span className="absolute left-5 top-5 rounded-pill bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
              {usesConceptualHero
                ? `${conceptualHero.label} · visualización temporal`
                : "Hospedaje seleccionado para explorar la región"}
            </span>
            {usesConceptualHero ? (
              <div
                className="absolute bottom-5 left-5 flex gap-2"
                aria-label="Cambiar portada conceptual"
              >
                {CONCEPT_HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    onClick={() => setHeroSlide(index)}
                    aria-label={`Mostrar ${slide.label}`}
                    aria-current={index === heroSlide}
                    className={cn(
                      "h-2.5 rounded-full border border-white/75 transition-all",
                      index === heroSlide ? "w-8 bg-white" : "w-2.5 bg-white/35",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "relative flex flex-col justify-center overflow-hidden px-7 py-10 text-white sm:px-10 lg:px-12",
              cinematic ? "min-h-[34rem] bg-transparent lg:max-w-3xl" : "bg-[#123e2f]",
            )}
          >
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10"
            />
            <p className="relative text-xs font-semibold uppercase tracking-[.18em] text-[#edb84f]">
              Hospedaje · Oriente Maya de Yucatán
            </p>
            <h1
              className={cn(
                "relative mt-4 max-w-xl font-serif leading-[.98]",
                cinematic ? "text-5xl sm:text-6xl lg:text-7xl" : "text-4xl sm:text-5xl lg:text-6xl",
              )}
            >
              Hoteles para vivir el Oriente Maya
            </h1>
            <p className="relative mt-5 max-w-lg text-base leading-relaxed text-white/82 sm:text-lg">
              Encuentra dónde hospedarte según tu ruta, tus noches y tu forma de viajar.
            </p>
            <button
              type="button"
              onClick={() => askAlux("quiero definir la mejor base para mi viaje")}
              className="relative mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-pill border border-[#edb84f]/70 px-5 py-2.5 text-sm font-semibold text-[#ffd77e] transition hover:bg-white/10"
            >
              <Sparkles className="size-4" aria-hidden />
              Afinar mi hospedaje con Alux
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-border bg-card/90 p-4 shadow-soft sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Compass className="size-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alux · copiloto de viaje</p>
              <h2 className="font-serif text-xl">¿Cómo quieres hospedarte?</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Hotel boutique",
              "Viaje en pareja",
              "Cerca del centro",
              "Con piscina",
              "Base para explorar",
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
            onClick={() => askAlux("necesito una recomendación completa")}
            className="min-h-11 rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Recomiéndame opciones
          </button>
        </div>
      </section>

      <section
        aria-label="Buscar y filtrar hoteles"
        className="rounded-[1.6rem] border border-border bg-card p-4 shadow-soft"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(3,1fr)]">
          <label className="relative">
            <span className="sr-only">Buscar hotel</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar hotel, zona o servicio"
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
            label="Tipo de alojamiento"
            value={type}
            options={types}
            onChange={setType}
          />
          <FilterSelect
            label="Servicios"
            value={service}
            options={services}
            onChange={setService}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong> hospedaje
            {filtered.length === 1 ? "" : "s"} publicado{filtered.length === 1 ? "" : "s"}
          </p>
          {destination !== ALL || type !== ALL || service !== ALL || query ? (
            <button
              type="button"
              onClick={() => {
                setDestination(dto.destinationLabel ?? ALL);
                setType(ALL);
                setService(ALL);
                setQuery("");
              }}
              className="min-h-11 px-3 text-sm font-semibold text-primary"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </section>

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
                renderActions={(hotel) => <HotelActions item={hotel} />}
                className={cn(index === 0 && "border-primary/30 bg-primary/[.025]")}
              />
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-border bg-card p-10 text-center">
              <BedDouble className="mx-auto size-8 text-primary" aria-hidden />
              <p className="mt-3 font-semibold">No encontramos hospedajes con esos filtros.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prueba otro destino o pídele a Alux una alternativa cercana.
              </p>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
                  Mapa Valladolid.mx
                </p>
                <h2 className="font-serif text-xl">Hospedajes en el territorio</h2>
              </div>
              <MapPin className="size-5 text-primary" aria-hidden />
            </div>
            {mapped.length ? (
              <Suspense
                fallback={
                  <div className="grid h-[28rem] place-items-center bg-muted text-sm text-muted-foreground">
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
                  className="h-[28rem] w-full"
                />
              </Suspense>
            ) : (
              <div className="flex h-[20rem] flex-col items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/.12),transparent_55%),hsl(var(--muted))] px-8 text-center">
                <MapPin className="size-8 text-primary" aria-hidden />
                <p className="mt-3 font-semibold">Ubicaciones en proceso de acreditación</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Los hoteles aparecen en el mapa únicamente cuando publican coordenadas
                  verificadas.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[1.6rem] border border-primary/20 bg-primary/[.045] p-5">
            <div className="flex gap-3">
              <UserRoundCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="font-serif text-xl">¿Necesitas una propuesta personal?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Un concierge humano puede revisar tus fechas, acompañantes, presupuesto y hoteles
                  guardados. Tú decides cuándo compartirlos.
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
      </section>
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full appearance-none rounded-xl border border-border bg-background px-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
