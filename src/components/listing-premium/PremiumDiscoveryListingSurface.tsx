/**
 * Superficie canónica de listados Premium para Valladolid.mx.
 *
 * Autoridad visual: IMG_0580 (Hoteles) + IMG_0581 (Restaurantes).
 * Una sola composición gobernada; cada familia aporta copy, filtros y medios.
 * Editorial conserva una lectura clara aun sin fotografía propia.
 * Cinematográfica amplía el protagonismo del medio sin cambiar datos ni acciones.
 */
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BedDouble,
  ChefHat,
  Compass,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
} from "lucide-react";

import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { cn } from "@/lib/utils";
import { ACTIVE_BRAND } from "@/config/brand";
import { attributeValues, humanizeAttributeValue } from "@/lib/business-attributes/types";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((module) => ({ default: module.InteractiveMap })),
);

const ALL = "__all__";

type SupportedFamily = "hoteles" | "restaurantes";

interface FamilyProfile {
  family: SupportedFamily;
  eyebrow: string;
  title: string;
  subtitle: string;
  aluxTitle: string;
  prompts: readonly string[];
  primaryFilterLabel: string;
  secondaryFilterLabel: string;
  itemNoun: string;
  itemNounPlural: string;
  actionLabel: string;
  conciergeTitle: string;
  conciergeCopy: string;
  heroSlides: readonly { src: string; label: string; alt: string }[];
  icon: ReactNode;
}

const HOTEL_MEDIA = [
  "/api/public/studio-media/conceptual-preview/2026-09-01/hoteles-hero-colonial-v1.webp",
  "/api/public/studio-media/conceptual-preview/2026-09-01/hoteles-hero-campo-v1.webp",
  "/api/public/studio-media/conceptual-preview/2026-09-01/hoteles-hero-costa-v1.webp",
] as const;

const RESTAURANT_MEDIA = [
  "/api/public/studio-media/2026/1788291771784-5vcdnt-restaurante-fonda-mercado-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291772757-yp7xx5-restaurante-comal-cocina-maya-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291775648-7j8tiw-restaurante-patio-colonial-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291770675-89lsmh-restaurante-patio-izamal-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291773480-6zjzv5-restaurante-costa-el-cuyo-conceptual-v1.webp",
  "/api/public/studio-media/2026/1788291774706-qcx0r0-restaurante-campo-milpa-conceptual-v1.webp",
] as const;

const PROFILES: Record<SupportedFamily, FamilyProfile> = {
  hoteles: {
    family: "hoteles",
    eyebrow: "Hospedaje seleccionado para explorar la región",
    title: "Hoteles para vivir el Oriente Maya",
    subtitle: "Encuentra dónde hospedarte según tu ruta, tus noches y tu forma de viajar.",
    aluxTitle: "¿Cómo quieres hospedarte?",
    prompts: [
      "Hotel boutique",
      "Viaje en pareja",
      "Cerca del centro",
      "Con piscina",
      "Base para explorar",
    ],
    primaryFilterLabel: "Tipo de alojamiento",
    secondaryFilterLabel: "Servicios",
    itemNoun: "hospedaje",
    itemNounPlural: "hospedajes",
    actionLabel: "Ver hotel",
    conciergeTitle: "¿Necesitas ayuda para elegir?",
    conciergeCopy:
      "Un concierge humano puede revisar fechas, acompañantes, presupuesto y tus hoteles guardados.",
    heroSlides: [
      {
        src: HOTEL_MEDIA[0],
        label: "Ciudad colonial",
        alt: "Visual conceptual temporal de hospedaje colonial del Oriente Maya",
      },
      {
        src: HOTEL_MEDIA[1],
        label: "Campo y siembra",
        alt: "Visual conceptual temporal de hospedaje rural entre milpa y campo yucateco",
      },
      {
        src: HOTEL_MEDIA[2],
        label: "Costa y playa",
        alt: "Visual conceptual temporal de hospedaje frente a la costa del Oriente Maya",
      },
    ],
    icon: <BedDouble className="size-4" aria-hidden />,
  },
  restaurantes: {
    family: "restaurantes",
    eyebrow: "Cocina de origen · Oriente Maya de Yucatán",
    title: "Sabores del Oriente Maya de Yucatán",
    subtitle: "Tradición que inspira, ingredientes locales y experiencias que se quedan contigo.",
    aluxTitle: "¿Qué se te antoja hoy?",
    prompts: ["Cocina yucateca", "Cena en pareja", "Familiar", "Comida local", "Patio tranquilo"],
    primaryFilterLabel: "Tipo de cocina",
    secondaryFilterLabel: "Experiencia",
    itemNoun: "restaurante",
    itemNounPlural: "restaurantes",
    actionLabel: "Ver restaurante",
    conciergeTitle: "Tu mesa puede ser parte de un viaje completo",
    conciergeCopy:
      "Alux organiza fechas, acompañantes, restricciones y presupuesto; un concierge humano puede revisar el expediente.",
    heroSlides: [
      {
        src: RESTAURANT_MEDIA[0],
        label: "Cocina de origen",
        alt: "Visual conceptual temporal de cocina yucateca del Oriente Maya",
      },
      {
        src: RESTAURANT_MEDIA[1],
        label: "Sabores del Mayab",
        alt: "Visual conceptual temporal de cocina maya al comal",
      },
      {
        src: RESTAURANT_MEDIA[2],
        label: "Patios de Valladolid",
        alt: "Visual conceptual temporal de restaurante en patio colonial",
      },
      {
        src: RESTAURANT_MEDIA[3],
        label: "Izamal",
        alt: "Visual conceptual temporal de gastronomía en Izamal",
      },
      {
        src: RESTAURANT_MEDIA[4],
        label: "Costa de El Cuyo",
        alt: "Visual conceptual temporal de cocina costera en El Cuyo",
      },
      {
        src: RESTAURANT_MEDIA[5],
        label: "Campo y milpa",
        alt: "Visual conceptual temporal de cocina de campo y milpa",
      },
    ],
    icon: <ChefHat className="size-4" aria-hidden />,
  },
};

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim()))),
  ).sort((a, b) => a.localeCompare(b, "es"));
}

function itemAttributes(item: TourismCardVM): string[] {
  const structured = ["services", "amenities", "accessibility", "traveler_profile"]
    .flatMap((key) => attributeValues(item.filterAttributes?.[key]))
    .map(humanizeAttributeValue);
  return unique([
    ...structured,
    ...item.highlights,
    ...item.badges.map((badge) => badge.label),
  ]).filter((value) => !/verificad|oriente maya/i.test(value));
}

function itemType(item: TourismCardVM, profile: FamilyProfile): string {
  const structured = attributeValues(item.filterAttributes?.hotel_type)[0];
  if (structured) return humanizeAttributeValue(structured);
  const eyebrow = item.eyebrow?.trim();
  if (eyebrow && !/hotel|hospedaje|restaurante|gastronom/i.test(eyebrow)) return eyebrow;
  return profile.family === "hoteles" ? "Hospedaje" : "Cocina local";
}

function itemZone(item: TourismCardVM): string | null {
  const value = attributeValues(item.filterAttributes?.zone)[0];
  return value ? humanizeAttributeValue(value) : null;
}

function mediaFor(item: TourismCardVM, index: number, profile: FamilyProfile) {
  const fallback = profile.heroSlides[index % profile.heroSlides.length];
  return {
    src: item.mediaUrl ?? fallback.src,
    alt: item.mediaAlt ?? fallback.alt,
    conceptual: !item.mediaUrl,
  };
}

function askAlux(profile: FamilyProfile, preference: string) {
  const task = profile.family === "hoteles" ? "elegir dónde hospedarme" : "elegir dónde comer";
  openAluxFloating({
    reason: "manual",
    hint: `Ayúdame a ${task}. Preferencia inicial: ${preference}. Primero determina si estoy planeando el viaje o si ya estoy en Valladolid o el Oriente Maya. Si planeo, pregunta fechas, acompañantes y presupuesto; pide ubicación sólo si ya estoy en destino y con permiso. Usa Mi Viaje y explica por qué recomiendas cada opción.`,
  });
}

export function PremiumDiscoveryListingSurface({
  dto,
  presentation = "editorial",
}: {
  dto: PublicListingDTO;
  presentation?: PremiumPresentation;
}) {
  // Esta superficie sólo se invoca para las dos familias soportadas desde la
  // entrada canónica. El fallback mantiene estable el orden de hooks aun ante
  // un DTO inválido y evita una segunda vía de render.
  const profile = PROFILES[dto.family as SupportedFamily] ?? PROFILES.hoteles;
  const territorial = Boolean(dto.destinationSlug);
  const [destination, setDestination] = useState(ALL);
  const [primary, setPrimary] = useState(ALL);
  const [secondary, setSecondary] = useState(ALL);
  const [query, setQuery] = useState("");
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(
      () => setHeroIndex((value) => (value + 1) % profile.heroSlides.length),
      6800,
    );
    return () => window.clearInterval(timer);
  }, [profile.heroSlides.length]);

  const items = useMemo(() => [...dto.items], [dto.items]);
  const destinations = useMemo(
    () =>
      unique(items.map((item) => (territorial ? itemZone(item) : (item.location?.label ?? null)))),
    [items, territorial],
  );
  const primaryValues = useMemo(
    () => unique(items.map((item) => itemType(item, profile))),
    [items, profile],
  );
  const secondaryValues = useMemo(
    () => unique(items.flatMap(itemAttributes)).slice(0, 12),
    [items],
  );
  const filtered = useMemo(() => {
    const q = normalized(query.trim());
    return items.filter((item) => {
      const scope = territorial ? itemZone(item) : item.location?.label;
      if (destination !== ALL && scope !== destination) return false;
      if (primary !== ALL && itemType(item, profile) !== primary) return false;
      if (secondary !== ALL && !itemAttributes(item).includes(secondary)) return false;
      if (!q) return true;
      return normalized(
        [item.name, item.tagline, item.location?.label, ...itemAttributes(item)]
          .filter(Boolean)
          .join(" "),
      ).includes(q);
    });
  }, [destination, items, primary, profile, query, secondary, territorial]);
  const mapped = filtered.filter(
    (item): item is TourismCardVM & { coordinates: { lat: number; lng: number } } =>
      item.coordinates?.lat != null && item.coordinates?.lng != null,
  );
  const heroItem = items.find((item) => item.mediaUrl) ?? null;
  const hero = heroItem
    ? { src: heroItem.mediaUrl!, alt: heroItem.mediaAlt ?? heroItem.name, conceptual: false }
    : { ...profile.heroSlides[heroIndex], conceptual: true };
  const cinematic = presentation === "cinematic";

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-[94rem] px-3 sm:px-5 lg:px-8">
        <PremiumHero profile={profile} hero={hero} cinematic={cinematic} />
        <AluxPreferenceBar profile={profile} />
        <FilterBar
          profile={profile}
          query={query}
          setQuery={setQuery}
          destination={destination}
          setDestination={setDestination}
          destinations={destinations}
          destinationLabel={territorial ? "Zona" : "Destino"}
          primary={primary}
          setPrimary={setPrimary}
          primaryValues={primaryValues}
          secondary={secondary}
          setSecondary={setSecondary}
          secondaryValues={secondaryValues}
          showMapMobile={showMapMobile}
          setShowMapMobile={setShowMapMobile}
        />

        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(24rem,.88fr)_18rem]">
          <section className="min-w-0" aria-label={`${profile.itemNounPlural} del Oriente Maya`}>
            <p className="mb-3 text-sm text-muted-foreground">
              <strong className="text-foreground">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? profile.itemNoun : profile.itemNounPlural} publicado
              {filtered.length === 1 ? "" : "s"}
            </p>
            {filtered.length ? (
              <div className="space-y-3">
                {filtered.map((item, index) => (
                  <PremiumListingCard
                    key={item.id}
                    item={item}
                    index={index}
                    profile={profile}
                    featured={index === 0}
                    cinematic={cinematic}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
                {dto.emptyMessage}
              </div>
            )}
          </section>

          <div className={cn("min-w-0", showMapMobile ? "block" : "hidden xl:block")}>
            <MapPanel mapped={mapped} profile={profile} />
          </div>

          <aside className="space-y-4">
            <RoutePanel profile={profile} />
            <ConciergePanel
              profile={profile}
              filtered={filtered.length}
              destination={destination}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function PremiumHero({
  profile,
  hero,
  cinematic,
}: {
  profile: FamilyProfile;
  hero: { src: string; alt: string; conceptual: boolean };
  cinematic: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-b-[2rem] border-x border-b border-border bg-selva shadow-soft",
        cinematic ? "min-h-[34rem]" : "grid min-h-[22rem] lg:grid-cols-2",
      )}
    >
      <div className={cn("relative min-h-64 overflow-hidden", cinematic && "absolute inset-0")}>
        <img src={hero.src} alt={hero.alt} className="absolute inset-0 size-full object-cover" />
        <div
          className={cn(
            "absolute inset-0",
            cinematic
              ? "bg-gradient-to-r from-black/80 via-black/42 to-transparent"
              : "bg-gradient-to-t from-black/35 via-transparent to-black/10",
          )}
        />
        {hero.conceptual ? (
          <span className="absolute left-5 top-5 rounded-pill bg-background/92 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur">
            Visual conceptual temporal · reemplazable en Medios
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "relative flex flex-col justify-center px-7 py-10 text-white sm:px-10 lg:px-12",
          cinematic ? "min-h-[34rem] max-w-3xl" : "bg-selva",
        )}
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {profile.icon}
          {profile.eyebrow}
        </p>
        <h1 className="mt-5 max-w-2xl font-display text-4xl leading-[0.98] sm:text-5xl lg:text-6xl">
          {profile.title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-white/82 sm:text-lg">
          {profile.subtitle}
        </p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {ACTIVE_BRAND.discoveryPromise}
        </p>
      </div>
    </section>
  );
}

function AluxPreferenceBar({ profile }: { profile: FamilyProfile }) {
  return (
    <TourismAluxPanel
      className="relative z-10 -mt-1 rounded-t-none"
      title={profile.aluxTitle}
      description={`Cuéntame si estás planeando venir o si ya estás aquí. Ajustaré ${profile.itemNounPlural}, rutas y tiempos a tu momento real.`}
      task={`Ayúdame a ${profile.family === "hoteles" ? "elegir dónde hospedarme" : "elegir dónde comer"} en el Oriente Maya.`}
      prompts={profile.prompts}
      compact
    />
  );
}

interface FilterBarProps {
  profile: FamilyProfile;
  query: string;
  setQuery: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  destinations: string[];
  destinationLabel: string;
  primary: string;
  setPrimary: (value: string) => void;
  primaryValues: string[];
  secondary: string;
  setSecondary: (value: string) => void;
  secondaryValues: string[];
  showMapMobile: boolean;
  setShowMapMobile: (value: boolean) => void;
}

function FilterBar(props: FilterBarProps) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.35fr_repeat(3,1fr)_auto]">
        <label className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <span className="sr-only">Buscar</span>
          <input
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            placeholder={`Buscar ${props.profile.itemNoun}, zona o servicio`}
            className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-selva"
          />
        </label>
        <SelectFilter
          label={props.destinationLabel}
          value={props.destination}
          setValue={props.setDestination}
          options={props.destinations}
        />
        <SelectFilter
          label={props.profile.primaryFilterLabel}
          value={props.primary}
          setValue={props.setPrimary}
          options={props.primaryValues}
        />
        <SelectFilter
          label={props.profile.secondaryFilterLabel}
          value={props.secondary}
          setValue={props.setSecondary}
          options={props.secondaryValues}
        />
        <button
          type="button"
          aria-expanded={props.showMapMobile}
          onClick={() => props.setShowMapMobile(!props.showMapMobile)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium xl:hidden"
        >
          <MapIcon className="size-4" aria-hidden />{" "}
          {props.showMapMobile ? "Ocultar mapa" : "Ver mapa"}
        </button>
      </div>
    </section>
  );
}

function SelectFilter({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-selva"
      >
        <option value={ALL}>{label}: todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        ⌄
      </span>
    </label>
  );
}

function PremiumListingCard({
  item,
  index,
  profile,
  featured,
  cinematic,
}: {
  item: TourismCardVM;
  index: number;
  profile: FamilyProfile;
  featured: boolean;
  cinematic: boolean;
}) {
  const media = mediaFor(item, index, profile);
  const eligible = evaluateTripEligibility({
    kind: "business",
    targetId: item.id,
    title: item.name,
    mode: "universal",
  }).eligible;
  const slug = item.href?.split("/").filter(Boolean).at(-1) ?? null;
  return (
    <article
      id={featured ? "resultados" : undefined}
      className={cn(
        "group overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        featured || cinematic
          ? "grid md:grid-cols-[minmax(13rem,.86fr)_minmax(0,1.14fr)]"
          : "grid grid-cols-[8rem_minmax(0,1fr)]",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          featured || cinematic ? "min-h-56" : "min-h-36",
        )}
      >
        <img
          src={media.src}
          alt={media.alt}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        />
        {featured ? (
          <span className="absolute left-3 top-3 rounded-pill bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Destacado
          </span>
        ) : null}
        {media.conceptual ? (
          <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[9px] text-white">
            Visual temporal
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {itemType(item, profile)}
            </p>
            <h3 className="mt-1 font-display text-2xl leading-tight text-foreground">
              {item.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {itemType(item, profile)} ·{" "}
              {item.location?.label ?? item.territorialContext ?? "Oriente Maya"}
            </p>
          </div>
          <FavoriteButton entityKind="business" entityId={item.id} />
        </div>
        {item.tagline ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.tagline}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {itemAttributes(item)
            .slice(0, 3)
            .map((value) => (
              <span
                key={value}
                className="rounded-pill border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground"
              >
                {value}
              </span>
            ))}
        </div>
        <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-[1fr_auto]">
          {item.href ? (
            <a
              href={item.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-selva px-4 text-sm font-semibold text-selva-foreground"
            >
              {profile.actionLabel}
              <ArrowRight className="size-4" aria-hidden />
            </a>
          ) : null}
          {eligible ? (
            <AddToTravelPlanButton
              kind="business"
              targetId={item.id}
              title={item.name}
              slug={slug}
              imageUrl={item.mediaUrl}
              subtitle={item.tagline ?? item.territorialContext}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MapPanel({
  mapped,
  profile,
}: {
  mapped: Array<TourismCardVM & { coordinates: { lat: number; lng: number } }>;
  profile: FamilyProfile;
}) {
  return (
    <section className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Mapa Valladolid.mx
        </p>
        <h2 className="font-display text-xl">
          {profile.itemNounPlural[0].toUpperCase() + profile.itemNounPlural.slice(1)} en el
          territorio
        </h2>
      </div>
      {mapped.length ? (
        <Suspense
          fallback={
            <div className="grid min-h-[30rem] place-items-center text-sm text-muted-foreground">
              Preparando mapa territorial…
            </div>
          }
        >
          <InteractiveMap
            lat={mapped[0].coordinates.lat}
            lng={mapped[0].coordinates.lng}
            zoom={9}
            markerTitle={mapped[0].name}
            markers={mapped.map((item) => ({
              lat: item.coordinates.lat,
              lng: item.coordinates.lng,
              title: item.name,
              href: item.href,
            }))}
            className="min-h-[31rem] h-full"
          />
        </Suspense>
      ) : (
        <div className="grid min-h-[26rem] place-items-center px-8 text-center text-sm text-muted-foreground">
          Los resultados publicados todavía no tienen coordenadas verificadas.
        </div>
      )}
      <div className="flex min-h-14 items-center gap-3 border-t border-border px-4 text-sm">
        <Compass className="size-5 text-selva" aria-hidden />
        <span>Tu plan de viaje conecta lugares guardados y noches.</span>
      </div>
    </section>
  );
}

function RoutePanel({ profile }: { profile: FamilyProfile }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-display text-xl">Alux conecta tu ruta</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Valladolid como base para descubrir cenotes, comunidades, pueblos y experiencias cercanas.
      </p>
      <button
        type="button"
        onClick={() => askAlux(profile, "Conecta estas opciones con mi ruta")}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-selva"
      >
        Ver sugerencias <ArrowRight className="size-4" aria-hidden />
      </button>
    </section>
  );
}

function ConciergePanel({
  profile,
  filtered,
  destination,
}: {
  profile: FamilyProfile;
  filtered: number;
  destination: string;
}) {
  const summary = `Estoy revisando ${filtered} ${filtered === 1 ? profile.itemNoun : profile.itemNounPlural} en ${destination === ALL ? "el Oriente Maya de Yucatán" : destination}. Quiero una propuesta para mi viaje.`;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
          <UserRoundCheck className="size-5" aria-hidden />
        </span>
        <h2 className="font-display text-lg leading-tight">{profile.conciergeTitle}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{profile.conciergeCopy}</p>
      <div className="mt-4">
        <RequestConciergeButton kind="travel_plan" summary={summary} />
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        Compartiremos tu selección sólo con tu autorización.
      </p>
    </section>
  );
}
