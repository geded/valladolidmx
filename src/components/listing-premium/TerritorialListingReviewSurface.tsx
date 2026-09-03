import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  Heart,
  Home,
  Landmark,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import {
  attributeValues,
  humanizeAttributeValue,
} from "@/lib/business-attributes/types";

const MEDIA = "/api/public/studio-media/governed/v1p1c";

type TerritorialListingFamily =
  | "hoteles"
  | "restaurantes"
  | "casas-de-vacaciones"
  | "eventos"
  | "lugares";

interface ListingItem {
  name: string;
  zone: string;
  copy: string;
  image: string;
  tags: string[];
  type: string;
  href?: string;
  startsAt?: string | null;
  source?: TourismCardVM;
}


interface NearbyItem {
  name: string;
  zone: string;
  image: string;
}

interface ListingProfile {
  family: TerritorialListingFamily;
  breadcrumb: string;
  eyebrow: string;
  title: string;
  description: string;
  resultsTitle: string;
  itemLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  aluxQuestion: string;
  aluxOptions: string[];
  filters: string[];
  nearbyTitle: string;
  mapTitle: string;
  aluxMapTitle: string;
  aluxMapDescription: string;
  items: ListingItem[];
  nearby: NearbyItem[];
}

const HOTEL_ITEMS: ListingItem[] = [
  {
    name: "Hacienda San Servacio Boutique",
    zone: "Centro Histórico · Valladolid",
    copy: "Una casona serena para caminar la ciudad y comenzar desde aquí cada ruta.",
    image: `${MEDIA}/hotel-cover.jpg`,
    tags: ["Hotel boutique", "Alberca", "Desayuno yucateco"],
    type: "Hotel boutique",
  },
  {
    name: "Posada Calzada de los Frailes",
    zone: "Barrio de Sisal · Valladolid",
    copy: "Habitaciones alrededor de un patio de piedra, cerca del convento y la Calzada.",
    image: `${MEDIA}/hotel-gallery-1.jpg`,
    tags: ["Patio colonial", "Céntrico", "Viaje en pareja"],
    type: "Posada",
  },
  {
    name: "Casa de los Arcos",
    zone: "Centro · Valladolid",
    copy: "Una estancia íntima para explorar mercados, barrios y sabores caminando.",
    image: `${MEDIA}/hotel-gallery-2.jpg`,
    tags: ["Casa histórica", "Terraza", "Cerca del centro"],
    type: "Hotel urbano",
  },
];

const HOTEL_NEARBY: NearbyItem[] = [
  {
    name: "Hacienda de campo",
    zone: "A 28 km de Valladolid",
    image: `${MEDIA}/destination-gallery-1.jpg`,
  },
  {
    name: "Estancia junto al cenote",
    zone: "A 36 km de Valladolid",
    image: `${MEDIA}/experience-gallery-1.jpg`,
  },
];

const RESTAURANT_ITEMS: ListingItem[] = [
  {
    name: "Casa del Maíz · Cocina de Oriente",
    zone: "Centro Histórico · Valladolid",
    copy: "Recados, maíz y productos de temporada narran el Oriente Maya desde una mesa contemporánea.",
    image: `${MEDIA}/restaurant-cover.jpg`,
    tags: ["Cocina yucateca", "Producto local", "Ideal en pareja"],
    type: "Cocina de autor",
  },
  {
    name: "El Atrio del Mayab",
    zone: "Plaza principal · Valladolid",
    copy: "Sabores regionales frente al corazón de la ciudad, pensados para una comida sin prisa.",
    image: `${MEDIA}/restaurant-gallery-1.jpg`,
    tags: ["Regional", "Terraza", "En familia"],
    type: "Cocina regional",
  },
  {
    name: "Patio de los Frailes",
    zone: "Barrio de Sisal · Valladolid",
    copy: "Una cocina íntima junto a la Calzada, con ingredientes locales y ambiente de patio colonial.",
    image: `${MEDIA}/restaurant-gallery-2.jpg`,
    tags: ["Cena", "Patio colonial", "Opciones vegetarianas"],
    type: "Bistró yucateco",
  },
];

const RESTAURANT_NEARBY: NearbyItem[] = [
  {
    name: "Cocina de comunidad",
    zone: "A 18 km de Valladolid",
    image: `${MEDIA}/destination-gallery-1.jpg`,
  },
  {
    name: "Mesa junto al cenote",
    zone: "A 27 km de Valladolid",
    image: `${MEDIA}/experience-gallery-1.jpg`,
  },
];

const VACATION_RENTAL_ITEMS: ListingItem[] = [
  {
    name: "Casa de patio colonial",
    zone: "Centro Histórico · Valladolid",
    copy: "Una casa completa con patio de piedra y alberca privada para vivir la ciudad y explorar desde aquí.",
    image: `${MEDIA}/hotel-cover.jpg`,
    tags: ["Hasta 8 huéspedes", "3 recámaras", "Alberca privada"],
    type: "Casa completa",
  },
  {
    name: "Villa Sisal",
    zone: "Barrio de Sisal · Valladolid",
    copy: "Jardín, hamacas y cocina equipada cerca de la Calzada de los Frailes.",
    image: `${MEDIA}/hotel-gallery-1.jpg`,
    tags: ["Hasta 6 huéspedes", "Jardín", "Estancia larga"],
    type: "Villa",
  },
  {
    name: "Casa del camino a los cenotes",
    zone: "Zona de cenotes · Valladolid",
    copy: "Una estancia independiente para combinar descanso, naturaleza y recorridos cercanos.",
    image: `${MEDIA}/hotel-gallery-2.jpg`,
    tags: ["Hasta 10 huéspedes", "4 recámaras", "Estacionamiento"],
    type: "Casa rural",
  },
];

const VACATION_RENTAL_NEARBY: NearbyItem[] = [
  {
    name: "Villa cerca de Ek’ Balam",
    zone: "A 28 km de Valladolid",
    image: `${MEDIA}/destination-gallery-1.jpg`,
  },
  {
    name: "Estancia rumbo a Río Lagartos",
    zone: "A 46 km de Valladolid",
    image: `${MEDIA}/experience-gallery-1.jpg`,
  },
];

const EVENT_ITEMS: ListingItem[] = [
  {
    name: "Noche de Valladolid",
    zone: "Centro Histórico · Valladolid",
    copy: "Trova, patrimonio y sabores locales para vivir la ciudad cuando cae la tarde.",
    image: `${MEDIA}/destination-gallery-1.jpg`,
    tags: ["14 septiembre", "19:00 h", "Cultural", "Entrada libre"],
    type: "Cultura y tradición",
  },
  {
    name: "Encuentro de cocinas del Oriente",
    zone: "Barrio de Sisal · Valladolid",
    copy: "Cocineras, productores y mesas compartidas alrededor de los sabores de la región.",
    image: `${MEDIA}/restaurant-gallery-1.jpg`,
    tags: ["21 septiembre", "12:00 h", "Gastronomía", "En familia"],
    type: "Gastronomía",
  },
  {
    name: "Música bajo las estrellas",
    zone: "Calzada de los Frailes · Valladolid",
    copy: "Una velada íntima que conecta música yucateca con el paisaje nocturno de Valladolid.",
    image: `${MEDIA}/destination-cover.jpg`,
    tags: ["28 septiembre", "20:00 h", "Música", "Reservación"],
    type: "Música",
  },
];

const EVENT_NEARBY: NearbyItem[] = [
  {
    name: "Fiesta tradicional de comunidad",
    zone: "A 18 km de Valladolid",
    image: `${MEDIA}/destination-gallery-2.jpg`,
  },
  {
    name: "Agenda cultural de Espita",
    zone: "A 27 km de Valladolid",
    image: `${MEDIA}/experience-gallery-1.jpg`,
  },
];

const PROFILES: Record<TerritorialListingFamily, ListingProfile> = {
  hoteles: {
    family: "hoteles",
    breadcrumb: "Hoteles",
    eyebrow: "Dónde dormir",
    title: "Hoteles en Valladolid",
    description:
      "Encuentra una estancia que acompañe tu forma de viajar y te conecte con todo el territorio.",
    resultsTitle: "Hospedajes en Valladolid",
    itemLabel: "hotel",
    searchLabel: "Buscar hotel",
    searchPlaceholder: "Buscar hotel, zona o servicio",
    aluxQuestion: "¿Cómo te gustaría hospedarte?",
    aluxOptions: ["Boutique", "En pareja", "En familia", "Con piscina", "Cerca del centro"],
    filters: ["Zona", "Tipo de hospedaje", "Servicios"],
    nearbyTitle: "Opciones cerca de Valladolid",
    mapTitle: "Hoteles en Valladolid",
    aluxMapTitle: "Dormir bien también organiza la ruta.",
    aluxMapDescription:
      "Guarda opciones y Alux calculará noches, trayectos y experiencias cercanas.",
    items: HOTEL_ITEMS,
    nearby: HOTEL_NEARBY,
  },
  restaurantes: {
    family: "restaurantes",
    breadcrumb: "Restaurantes",
    eyebrow: "Dónde comer",
    title: "Restaurantes en Valladolid",
    description:
      "Descubre cocinas que cuentan el territorio con maíz, recados, producto local y hospitalidad vallisoletana.",
    resultsTitle: "Mesas en Valladolid",
    itemLabel: "restaurante",
    searchLabel: "Buscar restaurante",
    searchPlaceholder: "Buscar restaurante, cocina o zona",
    aluxQuestion: "¿Qué experiencia gastronómica buscas?",
    aluxOptions: ["Cocina local", "En pareja", "En familia", "Terraza", "Cerca de mí"],
    filters: ["Zona", "Tipo de cocina", "Ideal para"],
    nearbyTitle: "Sabores cerca de Valladolid",
    mapTitle: "Restaurantes en Valladolid",
    aluxMapTitle: "Cada mesa puede abrir una nueva ruta.",
    aluxMapDescription:
      "Guarda tus favoritos y Alux los combinará con mercados, barrios y experiencias cercanas.",
    items: RESTAURANT_ITEMS,
    nearby: RESTAURANT_NEARBY,
  },
  "casas-de-vacaciones": {
    family: "casas-de-vacaciones",
    breadcrumb: "Casas de vacaciones",
    eyebrow: "Dónde quedarte",
    title: "Casas de vacaciones en Valladolid",
    description:
      "Encuentra una casa completa para tu grupo y úsala como punto de partida para descubrir todo el territorio.",
    resultsTitle: "Casas en Valladolid",
    itemLabel: "casa",
    searchLabel: "Buscar casa",
    searchPlaceholder: "Buscar casa, zona o servicio",
    aluxQuestion: "¿Cómo te gustaría vivir tu estancia?",
    aluxOptions: ["En familia", "En pareja", "Con amigos", "Con piscina", "Estancia larga"],
    filters: ["Zona", "Tipo de propiedad", "Espacios y servicios"],
    nearbyTitle: "Casas cerca de Valladolid",
    mapTitle: "Casas de vacaciones en Valladolid",
    aluxMapTitle: "Tu casa también organiza la ruta.",
    aluxMapDescription:
      "Guarda opciones y Alux conectará huéspedes, noches, trayectos y experiencias cercanas.",
    items: VACATION_RENTAL_ITEMS,
    nearby: VACATION_RENTAL_NEARBY,
  },
  eventos: {
    family: "eventos",
    breadcrumb: "Eventos",
    eyebrow: "Qué sucede",
    title: "Eventos en Valladolid",
    description:
      "Encuentra lo que sucede durante tu estancia y convierte cada fecha en una forma de descubrir el territorio.",
    resultsTitle: "Agenda en Valladolid",
    itemLabel: "evento",
    searchLabel: "Buscar evento",
    searchPlaceholder: "Buscar evento, fecha o sede",
    aluxQuestion: "¿Qué fechas estarás en la región?",
    aluxOptions: ["Este fin de semana", "En familia", "Cultura", "Gastronomía", "Entrada libre"],
    filters: ["Fecha", "Tipo de evento", "Ideal para"],
    nearbyTitle: "Eventos cerca de Valladolid",
    mapTitle: "Eventos en Valladolid",
    aluxMapTitle: "Tu agenda también puede descubrir territorio.",
    aluxMapDescription:
      "Dime tus fechas y Alux combinará eventos, trayectos y experiencias sin romper el ritmo del viaje.",
    items: EVENT_ITEMS,
    nearby: EVENT_NEARBY,
  },
  /* G4-PLACES · sin fixtures: la familia `lugares` sólo se alimenta del
     PublicListingDTO productivo (points_of_interest). */
  lugares: {
    family: "lugares",
    breadcrumb: "Lugares y sitios de interés",
    eyebrow: "Qué visitar",
    title: "Lugares y sitios de interés en Valladolid",
    description:
      "Cenotes, conventos, calles y sitios emblemáticos que cuentan la historia viva del Oriente Maya.",
    resultsTitle: "Lugares en Valladolid",
    itemLabel: "lugar",
    searchLabel: "Buscar lugar",
    searchPlaceholder: "Buscar lugar, tipo o zona",
    aluxQuestion: "¿Qué te gustaría descubrir?",
    aluxOptions: ["Cenotes", "Historia colonial", "Cultura maya", "Entrada libre", "Media jornada"],
    filters: ["Zona", "Tipo de lugar", "Categoría"],
    nearbyTitle: "Lugares cerca de Valladolid",
    mapTitle: "Lugares en Valladolid",
    aluxMapTitle: "Cada lugar abre una nueva ruta.",
    aluxMapDescription:
      "Guarda tus imprescindibles y Alux organizará recorridos, tiempos y combinaciones cercanas.",
    items: [],
    nearby: [],
  },
};

export function TerritorialListingReviewSurface({
  family = "hoteles",
  dto,
  nearbyItems,
  lockedDestinationLabel,
}: {
  family?: TerritorialListingFamily;
  dto?: PublicListingDTO;
  /** Eventos de otros destinos: sección de descubrimiento separada. */
  nearbyItems?: readonly TourismCardVM[];
  /** Contexto territorial bloqueado (listado dentro de un destino). */
  lockedDestinationLabel?: string | null;
}) {
  const profile = PROFILES[family];
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const items = useMemo(
    () => (dto ? dto.items.map((item) => listingItemFromDTO(item, profile)) : profile.items),
    [dto, profile],
  );
  if (family === "eventos") {
    return (
      <EventListingBody
        profile={profile}
        items={items}
        dto={dto}
        nearbyItems={nearbyItems}
        lockedDestinationLabel={lockedDestinationLabel ?? dto?.destinationLabel ?? null}
      />
    );
  }
  if (family === "lugares") {
    return (
      <PlaceListingBody
        profile={profile}
        items={items}
        dto={dto}
        nearbyItems={nearbyItems}
        lockedDestinationLabel={lockedDestinationLabel ?? dto?.destinationLabel ?? null}
      />
    );
  }
  return (
    <TerritorialListingBody
      profile={profile}
      items={items}
      dto={dto}
      query={query}
      setQuery={setQuery}
      zone={zone}
      setZone={setZone}
      primary={primary}
      setPrimary={setPrimary}
      secondary={secondary}
      setSecondary={setSecondary}
    />
  );
}

function TerritorialListingBody({
  profile,
  items,
  dto,
  query,
  setQuery,
  zone,
  setZone,
  primary,
  setPrimary,
  secondary,
  setSecondary,
}: {
  profile: ListingProfile;
  items: ListingItem[];
  dto?: PublicListingDTO;
  query: string;
  setQuery: (v: string) => void;
  zone: string;
  setZone: (v: string) => void;
  primary: string;
  setPrimary: (v: string) => void;
  secondary: string;
  setSecondary: (v: string) => void;
}) {

  const zones = useMemo(() => unique(items.map((item) => itemZone(item))), [items]);
  const primaryValues = useMemo(() => unique(items.map((item) => item.type)), [items]);
  const secondaryValues = useMemo(
    () => unique(items.flatMap((item) => item.tags)).slice(0, 18),
    [items],
  );
  const filteredItems = useMemo(() => {
    const needle = normalize(query);
    return items.filter((item) => {
      if (zone && itemZone(item) !== zone) return false;
      if (primary && item.type !== primary) return false;
      if (secondary && !item.tags.includes(secondary)) return false;
      if (!needle) return true;
      return normalize([item.name, item.zone, item.copy, item.type, ...item.tags].join(" ")).includes(
        needle,
      );
    });
  }, [items, primary, query, secondary, zone]);
  return (
    <main className="bg-[#f7f2e8] pb-12 text-[#17251f] sm:pb-16">
      <div className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
        <TerritorialBreadcrumb profile={profile} />
        <ListingIntro profile={profile} />
        <AluxBar profile={profile} />
        <Filters
          profile={profile}
          query={query}
          setQuery={setQuery}
          zone={zone}
          setZone={setZone}
          zones={zones}
          primary={primary}
          setPrimary={setPrimary}
          primaryValues={primaryValues}
          secondary={secondary}
          setSecondary={setSecondary}
          secondaryValues={secondaryValues}
        />

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(22rem,.76fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(25rem,.72fr)]">
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  Primero en el destino
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">{profile.resultsTitle}</h2>
              </div>
              <p className="shrink-0 text-sm text-[#667067]">
                {filteredItems.length} {filteredItems.length === 1 ? "opción" : "opciones"}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {filteredItems.map((item, index) => (
                <ListingCard key={item.name} item={item} featured={index === 0} profile={profile} />
              ))}
              {!filteredItems.length ? (
                <div className="rounded-2xl border border-[#ded7c9] bg-white p-8 text-center text-sm text-[#5d685f]">
                  No encontramos opciones con esos filtros. Prueba quitando una selección.
                </div>
              ) : null}
            </div>

            {!dto ? <NearbySection profile={profile} /> : null}
          </div>

          <MapPanel profile={profile} />
        </div>
      </div>
    </main>
  );
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function itemZone(item: ListingItem): string {
  const structured = item.source ? attributeValues(item.source.filterAttributes?.zone)[0] : null;
  return structured ? humanizeAttributeValue(structured) : item.zone;
}

function listingItemFromDTO(item: TourismCardVM, profile: ListingProfile): ListingItem {
  const typeKey =
    profile.family === "eventos"
      ? "event_type"
      : profile.family === "lugares"
      ? "place_type"
      : profile.family === "restaurantes"
      ? "cuisine_type"
      : profile.family === "casas-de-vacaciones"
        ? "property_type"
        : "hotel_type";
  const secondaryKeys =
    profile.family === "eventos"
      ? ["date_range", "audience", "accessibility", "venue_type", "admission_type"]
      : profile.family === "lugares"
      ? ["experience_category", "admission_type", "accessibility", "amenities", "duration", "best_time"]
      : profile.family === "restaurantes"
      ? ["dining_experience", "services", "dietary_options", "meal_period", "traveler_profile"]
      : profile.family === "casas-de-vacaciones"
        ? ["capacity", "bedrooms", "amenities", "stay_features", "traveler_profile", "price_level"]
        : ["services", "amenities", "accessibility", "traveler_profile", "price_level"];
  const structuredType = attributeValues(item.filterAttributes?.[typeKey])[0];
  const structuredTags = secondaryKeys.flatMap((key) =>
    attributeValues(item.filterAttributes?.[key]).map(humanizeAttributeValue),
  );
  return {
    name: item.name,
    zone: item.location?.label ?? profile.breadcrumb,
    copy: item.tagline ?? "",
    // G4-PLACES: los lugares sin medio acreditado usan marcador neutral;
    // nunca heredan una imagen hotelera u otro medio ajeno.
    image: item.mediaUrl ?? (profile.family === "lugares" ? "" : `${MEDIA}/hotel-cover.jpg`),
    tags: unique([
      ...structuredTags,
      ...item.highlights,
      ...item.badges.map((badge) => badge.label),
    ]),
    type: structuredType
      ? humanizeAttributeValue(structuredType)
      : item.eyebrow?.trim() || profile.itemLabel,
    href: item.href ?? undefined,
    startsAt: item.startsAt ?? null,

    source: item,
  };
}

function TerritorialBreadcrumb({
  profile,
  destinationLabel = "Valladolid",
  destinationSlug = "valladolid",
  omitDestination = false,
}: {
  profile: ListingProfile;
  /** Destino real del listado contextual; por defecto conserva Valladolid. */
  destinationLabel?: string;
  destinationSlug?: string;
  /** Listados regionales sin destino fijo omiten el nivel de destino. */
  omitDestination?: boolean;
}) {
  return (
    <nav
      aria-label="Ubicación territorial"
      className="flex min-h-12 items-center gap-2 overflow-x-auto whitespace-nowrap py-3 text-xs text-[#6a726c]"
    >
      <a
        href="/"
        aria-label="Inicio"
        className="grid size-8 shrink-0 place-items-center rounded-full border border-[#ded7c9] bg-white"
      >
        <Home className="size-3.5" aria-hidden />
      </a>
      <ChevronRight className="size-3 shrink-0" aria-hidden />
      <a href="/oriente-maya" className="hover:text-[#0d4b38]">
        Oriente Maya
      </a>
      {!omitDestination ? (
        <>
          <ChevronRight className="size-3 shrink-0" aria-hidden />
          <a href={`/oriente-maya/${destinationSlug}`} className="hover:text-[#0d4b38]">
            {destinationLabel}
          </a>
        </>
      ) : null}
      <ChevronRight className="size-3 shrink-0" aria-hidden />
      <span className="font-semibold text-[#17251f]">{profile.breadcrumb}</span>
    </nav>
  );
}

function ListingIntro({ profile }: { profile: ListingProfile }) {
  const Icon =
    profile.family === "eventos"
      ? CalendarDays
      : profile.family === "lugares"
      ? Landmark
      : profile.family === "restaurantes"
      ? UtensilsCrossed
      : profile.family === "casas-de-vacaciones"
        ? Home
        : BedDouble;
  return (
    <header className="grid gap-5 border-y border-[#ded7c9] py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:py-8">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#ba641e]">
          <Icon className="size-4" aria-hidden /> {profile.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-[2.4rem] leading-[.98] sm:text-5xl lg:text-6xl">
          {profile.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#5d685f] sm:text-lg">
          {profile.description}
        </p>
      </div>
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#0d4b38] px-5 text-sm font-semibold text-[#0d4b38]">
        <Heart className="size-4" aria-hidden /> Ver mi viaje
      </button>
    </header>
  );
}

function AluxBar({ profile }: { profile: ListingProfile }) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-[#073f31] text-white shadow-[0_12px_30px_rgba(7,63,49,.12)]">
      <div className="grid gap-3 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-3">
          <img
            src="/brand/alux/webp/alux-ia-avatar-64.webp"
            alt="Alux"
            className="size-12 object-contain"
          />
          <div>
            <p className="font-display text-lg leading-none">Alux</p>
            <p className="mt-1 text-[11px] text-white/65">Tu concierge IA</p>
          </div>
        </div>
        <div className="min-w-0 sm:pl-3">
          <p className="text-sm font-semibold sm:text-base">{profile.aluxQuestion}</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {profile.aluxOptions.map((option) => (
              <button
                key={option}
                className="min-h-9 shrink-0 rounded-full border border-white/25 px-3 text-xs text-white/90"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <button className="hidden min-h-11 items-center gap-2 rounded-full bg-[#f3a61e] px-5 text-sm font-bold text-[#193126] lg:inline-flex">
          Recomiéndame <Sparkles className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

function Filters({
  profile,
  query,
  setQuery,
  zone,
  setZone,
  zones,
  primary,
  setPrimary,
  primaryValues,
  secondary,
  setSecondary,
  secondaryValues,
}: {
  profile: ListingProfile;
  query: string;
  setQuery: (value: string) => void;
  zone: string;
  setZone: (value: string) => void;
  zones: string[];
  primary: string;
  setPrimary: (value: string) => void;
  primaryValues: string[];
  secondary: string;
  setSecondary: (value: string) => void;
  secondaryValues: string[];
}) {
  const selects = [
    { label: profile.filters[0], value: zone, setValue: setZone, options: zones },
    { label: profile.filters[1], value: primary, setValue: setPrimary, options: primaryValues },
    {
      label: profile.filters[2],
      value: secondary,
      setValue: setSecondary,
      options: secondaryValues,
    },
  ];
  return (
    <section className="mt-4 rounded-2xl border border-[#ded7c9] bg-white p-3 shadow-sm sm:p-4">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
        <label className="relative min-w-[12.5rem] lg:min-w-0">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#788078]"
            aria-hidden
          />
          <span className="sr-only">{profile.searchLabel}</span>
          <input
            placeholder={profile.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-10 pr-3 text-sm outline-none"
          />
        </label>
        <button className="inline-flex min-h-11 min-w-max items-center justify-center gap-2 rounded-xl bg-[#0d4b38] px-4 text-sm font-semibold text-white sm:hidden">
          <Map className="size-4" aria-hidden /> Ver mapa
        </button>
        {selects.map(({ label, value, setValue, options }) => (
          <label key={label} className="relative min-w-max lg:min-w-0">
            <span className="sr-only">{label}</span>
            <select
              aria-label={label}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="min-h-11 w-full appearance-none rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-4 pr-9 text-sm"
            >
              <option value="">{label}: todos</option>
              {options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">⌄</span>
          </label>
        ))}
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setZone("");
            setPrimary("");
            setSecondary("");
          }}
          className="inline-flex min-h-11 min-w-max items-center justify-center gap-2 rounded-xl bg-[#efe8da] px-4 text-sm font-semibold"
        >
          <SlidersHorizontal className="size-4" aria-hidden /> Limpiar
        </button>
      </div>
    </section>
  );
}

function ListingCard({
  item,
  featured,
  profile,
}: {
  item: ListingItem;
  featured: boolean;
  profile: ListingProfile;
}) {
  return (
    <article className="group grid min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#ded7c9] bg-white shadow-sm sm:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="relative min-h-[10rem] overflow-hidden bg-[#ded7c9] sm:min-h-[13rem]">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          /* Marcador neutral: sin medio propio acreditado no se hereda
             ninguna imagen de otra familia o entidad. */
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#efe8da] to-[#ded7c9]">
            <Landmark className="size-8 text-[#8b9389]" aria-hidden />
          </div>
        )}
        {featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#f3a61e] px-2 py-1 text-[10px] font-bold text-[#193126]">
            Recomendado
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ba641e]">
              {item.type}
            </p>
            <h3 className="mt-1 font-display text-xl leading-tight sm:text-2xl">{item.name}</h3>
          </div>
          <button
            aria-label={`Guardar ${item.name}`}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#ded7c9]"
          >
            <Heart className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#697269]">
          <MapPin className="size-3" aria-hidden /> {item.zone}
        </p>
        <p className="mt-3 hidden text-sm leading-6 text-[#5d685f] sm:block">{item.copy}</p>
        <div className="mt-3 hidden flex-wrap gap-2 md:flex">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f1ece2] px-2.5 py-1 text-[11px]">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3">
          {item.href ? (
            <a href={item.href} className="inline-flex min-h-10 items-center rounded-full bg-[#0d4b38] px-4 text-xs font-bold text-white sm:min-h-11 sm:text-sm">
              Ver {profile.itemLabel}
            </a>
          ) : (
            <button className="min-h-10 rounded-full bg-[#0d4b38] px-4 text-xs font-bold text-white sm:min-h-11 sm:text-sm">
              Ver {profile.itemLabel}
            </button>
          )}
          <button className="hidden min-h-11 rounded-full border border-[#0d4b38] px-4 text-sm font-semibold text-[#0d4b38] sm:inline-flex sm:items-center">
            Agregar a mi viaje
          </button>
        </div>
      </div>
    </article>
  );
}

function NearbySection({ profile }: { profile: ListingProfile }) {
  return (
    <section className="mt-10 border-t border-[#ded7c9] pt-7">
      <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
        Amplía la ruta
      </p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">{profile.nearbyTitle}</h2>
          <p className="mt-1 text-sm text-[#667067]">
            Se muestran aparte para conservar claro qué pertenece al destino.
          </p>
        </div>
        <a href="#" className="hidden shrink-0 text-sm font-semibold text-[#0d4b38] sm:block">
          Explorar alrededor →
        </a>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {profile.nearby.map((item) => (
          <article
            key={item.name}
            className="overflow-hidden rounded-2xl border border-[#ded7c9] bg-white"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="absolute inset-0 size-full object-cover"
              />
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="font-display text-base sm:text-lg">{item.name}</h3>
              <p className="mt-1 text-xs text-[#697269]">{item.zone}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MapPanel({ profile }: { profile: ListingProfile }) {
  return (
    <aside className="order-first hidden sm:block lg:order-none lg:sticky lg:top-24">
      <section className="overflow-hidden rounded-2xl border border-[#ded7c9] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#ded7c9] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ba641e]">
              Mapa territorial
            </p>
            <h2 className="font-display text-xl">{profile.mapTitle}</h2>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full bg-[#efe8da] lg:hidden"
            aria-label="Cerrar mapa"
          >
            <Map className="size-4" aria-hidden />
          </button>
        </div>
        <div
          className="relative h-64 overflow-hidden bg-[#dfe9df] sm:h-80 lg:h-[31rem]"
          style={{
            backgroundImage: "radial-gradient(#b8c7b8 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="absolute inset-0 opacity-50 [background:linear-gradient(135deg,transparent_42%,#fff_43%,#fff_47%,transparent_48%),linear-gradient(35deg,transparent_54%,#c9d8c8_55%,#c9d8c8_59%,transparent_60%)]" />
          {[
            [34, 42],
            [58, 28],
            [64, 62],
          ].map(([left, top], index) => (
            <span
              key={index}
              className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#f3a61e] text-xs font-bold shadow-md"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {index + 1}
            </span>
          ))}
          <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold shadow">
            Valladolid · Yucatán
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#ded7c9] p-4 text-sm">
          <span className="text-[#5d685f]">Mapa sincronizado con tus resultados</span>
          <button className="font-semibold text-[#0d4b38]">Ver ruta</button>
        </div>
      </section>
      <section className="mt-4 hidden rounded-2xl bg-[#073f31] p-5 text-white lg:block">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#f3a61e]">
          Alux conecta tu viaje
        </p>
        <h2 className="mt-2 font-display text-2xl">{profile.aluxMapTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">{profile.aluxMapDescription}</p>
        <button className="mt-4 min-h-11 rounded-full bg-[#f3a61e] px-5 text-sm font-bold text-[#193126]">
          Personalizar con Alux
        </button>
      </section>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * EVENTOS — filtros profesionales sobre el mismo lenguaje visual.
 *
 * Fuente única: `PublicListingDTO` (lecturas reales). Los atributos
 * estructurados provienen del CMS (`events.filter_attributes`); los que
 * no existen simplemente no se ofrecen como filtro.
 * ------------------------------------------------------------------ */

const EVENT_SECONDARY_FILTERS = [
  { key: "audience", label: "Ideal para" },
  { key: "admission_type", label: "Entrada" },
  { key: "time_of_day", label: "Horario" },
  { key: "venue_type", label: "Sede o modalidad" },
  { key: "accessibility", label: "Accesibilidad" },
  { key: "reservation_required", label: "Reservación" },
] as const;

const EVENT_DATE_RANGES = [
  { value: "hoy", label: "Hoy" },
  { value: "fin-de-semana", label: "Este fin de semana" },
  { value: "7-dias", label: "Próximos 7 días" },
  { value: "este-mes", label: "Este mes" },
  { value: "proximo-mes", label: "Próximo mes" },
] as const;

type EventDateRange = (typeof EVENT_DATE_RANGES)[number]["value"] | "";

function attrOf(item: ListingItem, key: string): string[] {
  return attributeValues(item.source?.filterAttributes?.[key]);
}

function matchesDateRange(startsAt: string | null | undefined, range: EventDateRange): boolean {
  if (!range) return true;
  if (!startsAt) return false;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (n: number) => new Date(startOfToday.getTime() + n * 86400000);
  if (range === "hoy") return date >= startOfToday && date < day(1);
  if (range === "7-dias") return date >= startOfToday && date < day(7);
  if (range === "fin-de-semana") {
    const dow = startOfToday.getDay(); // 0 domingo
    const daysToSaturday = (6 - dow + 7) % 7;
    const saturday = day(daysToSaturday);
    const monday = new Date(saturday.getTime() + 2 * 86400000);
    return date >= saturday && date < monday;
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth() + (range === "este-mes" ? 0 : 1), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + (range === "este-mes" ? 1 : 2), 1);
  return date >= monthStart && date < monthEnd;
}

function EventListingBody({
  profile,
  items,
  dto,
  nearbyItems,
  lockedDestinationLabel,
}: {
  profile: ListingProfile;
  items: ListingItem[];
  dto?: PublicListingDTO;
  nearbyItems?: readonly TourismCardVM[];
  lockedDestinationLabel?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [destino, setDestino] = useState("");
  const [dateRange, setDateRange] = useState<EventDateRange>("");
  const [eventType, setEventType] = useState("");
  const [secondary, setSecondary] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);

  const locked = Boolean(lockedDestinationLabel);
  const destinos = useMemo(() => unique(items.map((item) => itemZone(item))), [items]);
  const types = useMemo(
    () => unique(items.flatMap((item) => attrOf(item, "event_type").map(humanizeAttributeValue))),
    [items],
  );
  const secondaryGroups = useMemo(
    () =>
      EVENT_SECONDARY_FILTERS.map((group) => ({
        ...group,
        options: unique(
          items.flatMap((item) => attrOf(item, group.key).map(humanizeAttributeValue)),
        ),
      })).filter((group) => group.options.length > 0),
    [items],
  );

  const activeSecondary = Object.entries(secondary).filter(([, value]) => value);
  const hasActiveFilters =
    Boolean(query || dateRange || eventType || (!locked && destino)) || activeSecondary.length > 0;

  const filteredItems = useMemo(() => {
    const needle = normalize(query);
    return items.filter((item) => {
      if (!locked && destino && itemZone(item) !== destino) return false;
      if (!matchesDateRange(item.startsAt, dateRange)) return false;
      if (
        eventType &&
        !attrOf(item, "event_type").map(humanizeAttributeValue).includes(eventType)
      ) {
        return false;
      }
      for (const [key, value] of activeSecondary) {
        if (!attrOf(item, key).map(humanizeAttributeValue).includes(value)) return false;
      }
      if (!needle) return true;
      return normalize(
        [item.name, item.zone, item.copy, item.type, ...item.tags].join(" "),
      ).includes(needle);
    });
  }, [items, query, destino, dateRange, eventType, activeSecondary, locked]);

  const clearAll = () => {
    setQuery("");
    setDestino("");
    setDateRange("");
    setEventType("");
    setSecondary({});
  };

  const resultsTitle = lockedDestinationLabel
    ? `Agenda en ${lockedDestinationLabel}`
    : dto
      ? "Agenda del Oriente Maya"
      : profile.resultsTitle;

  return (
    <main className="bg-[#f7f2e8] pb-12 text-[#17251f] sm:pb-16">
      <div className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
        <TerritorialBreadcrumb profile={profile} />
        <ListingIntro
          profile={
            lockedDestinationLabel
              ? { ...profile, title: `Eventos en ${lockedDestinationLabel}` }
              : dto
                ? { ...profile, title: "Eventos del Oriente Maya" }
                : profile
          }
        />
        <AluxBar profile={profile} />

        <section className="mt-4 rounded-2xl border border-[#ded7c9] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap gap-2 lg:grid lg:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
            <label className="relative min-w-[12.5rem] flex-1 lg:min-w-0">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#788078]"
                aria-hidden
              />
              <span className="sr-only">{profile.searchLabel}</span>
              <input
                placeholder={profile.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-10 pr-3 text-sm outline-none"
              />
            </label>

            {locked ? (
              <span className="inline-flex min-h-11 min-w-max items-center gap-2 rounded-xl border border-[#0d4b38]/25 bg-[#0d4b38]/8 px-4 text-sm font-semibold text-[#0d4b38]">
                <MapPin className="size-4" aria-hidden /> {lockedDestinationLabel}
              </span>
            ) : (
              <EventSelect
                label="Destino"
                value={destino}
                onChange={setDestino}
                options={destinos}
              />
            )}

            <label className="relative min-w-max lg:min-w-0">
              <span className="sr-only">Fecha</span>
              <select
                aria-label="Fecha"
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value as EventDateRange)}
                className="min-h-11 w-full appearance-none rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-4 pr-9 text-sm"
              >
                <option value="">Fecha: cualquiera</option>
                {EVENT_DATE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                ⌄
              </span>
            </label>

            <EventSelect
              label="Tipo de evento"
              value={eventType}
              onChange={setEventType}
              options={types}
            />

            {secondaryGroups.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                aria-expanded={showMore}
                className="inline-flex min-h-11 min-w-max items-center justify-center gap-2 rounded-xl border border-[#0d4b38] px-4 text-sm font-semibold text-[#0d4b38]"
              >
                <SlidersHorizontal className="size-4" aria-hidden /> Más filtros
                {activeSecondary.length ? ` (${activeSecondary.length})` : ""}
              </button>
            ) : null}
          </div>

          {showMore && secondaryGroups.length > 0 ? (
            <div className="mt-3 grid gap-3 border-t border-[#ded7c9] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {secondaryGroups.map((group) => (
                <EventSelect
                  key={group.key}
                  label={group.label}
                  value={secondary[group.key] ?? ""}
                  onChange={(value) =>
                    setSecondary((current) => ({ ...current, [group.key]: value }))
                  }
                  options={group.options}
                />
              ))}
            </div>
          ) : null}

          {hasActiveFilters ? (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#efe8da] px-4 text-sm font-semibold"
              >
                Limpiar filtros
              </button>
            </div>
          ) : null}
        </section>

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(22rem,.76fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(25rem,.72fr)]">
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  {lockedDestinationLabel ? "Primero en el destino" : "Agenda regional"}
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">{resultsTitle}</h2>
              </div>
              <p className="shrink-0 text-sm text-[#667067]">
                {filteredItems.length} {filteredItems.length === 1 ? "evento" : "eventos"}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {filteredItems.map((item, index) => (
                <ListingCard key={item.name} item={item} featured={index === 0} profile={profile} />
              ))}
              {!filteredItems.length ? (
                <div className="rounded-2xl border border-[#ded7c9] bg-white p-8 text-center text-sm text-[#5d685f]">
                  {dto && !hasActiveFilters
                    ? dto.emptyMessage
                    : "No encontramos eventos con esos filtros. Prueba quitando una selección."}
                </div>
              ) : null}
            </div>

            {nearbyItems && nearbyItems.length ? (
              <section className="mt-10 border-t border-[#ded7c9] pt-7">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  Amplía la ruta
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">
                  Eventos cerca de {lockedDestinationLabel}
                </h2>
                <p className="mt-1 text-sm text-[#667067]">
                  Se muestran aparte y no cuentan dentro de la agenda local.
                </p>
                <div className="mt-4 space-y-4">
                  {nearbyItems.slice(0, 6).map((card) => (
                    <ListingCard
                      key={card.id}
                      item={listingItemFromDTO(card, profile)}
                      featured={false}
                      profile={profile}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {!dto ? <NearbySection profile={profile} /> : null}
          </div>

          <EventMapPanel
            profile={profile}
            items={filteredItems}
            title={
              lockedDestinationLabel
                ? `Eventos en ${lockedDestinationLabel}`
                : "Eventos del Oriente Maya"
            }
          />
        </div>
      </div>
    </main>
  );
}

function EventSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative min-w-max lg:min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full appearance-none rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-4 pr-9 text-sm"
      >
        <option value="">{label}: todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
        ⌄
      </span>
    </label>
  );
}

function EventMapPanel({
  profile,
  items,
  title,
  nounSingular = "evento",
  nounPlural = "eventos",
  emptyCoordsMessage = "Los eventos filtrados aún no publican coordenadas de su destino.",
}: {
  profile: ListingProfile;
  items: ListingItem[];
  title?: string;
  nounSingular?: string;
  nounPlural?: string;
  emptyCoordsMessage?: string;
}) {
  const points = items
    .map((item, index) => ({
      item,
      index,
      lat: item.source?.coordinates?.lat ?? null,
      lng: item.source?.coordinates?.lng ?? null,
    }))
    .filter((point) => point.lat != null && point.lng != null) as {
    item: ListingItem;
    index: number;
    lat: number;
    lng: number;
  }[];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const spread = (value: number, values: number[]) => {
    if (values.length < 2) return 50;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 50;
    return 18 + ((value - min) / (max - min)) * 64;
  };
  return (
    <aside className="order-first hidden sm:block lg:order-none lg:sticky lg:top-24">
      <section className="overflow-hidden rounded-2xl border border-[#ded7c9] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#ded7c9] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ba641e]">
              Mapa territorial
            </p>
            <h2 className="font-display text-xl">{title ?? profile.mapTitle}</h2>
          </div>
          <span className="rounded-full bg-[#efe8da] px-3 py-1 text-xs font-semibold">
            {items.length}
          </span>
        </div>
        <div
          className="relative h-64 overflow-hidden bg-[#dfe9df] sm:h-80 lg:h-[31rem]"
          style={{
            backgroundImage: "radial-gradient(#b8c7b8 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="absolute inset-0 opacity-50 [background:linear-gradient(135deg,transparent_42%,#fff_43%,#fff_47%,transparent_48%),linear-gradient(35deg,transparent_54%,#c9d8c8_55%,#c9d8c8_59%,transparent_60%)]" />
          {points.map((point) => (
            <span
              key={point.item.name}
              title={point.item.name}
              className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#f3a61e] text-xs font-bold shadow-md"
              style={{
                left: `${spread(point.lng, lngs)}%`,
                top: `${100 - spread(point.lat, lats)}%`,
              }}
            >
              {point.index + 1}
            </span>
          ))}
          {!points.length ? (
            <span className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-white/95 px-4 py-3 text-center text-xs text-[#5d685f] shadow">
              {emptyCoordsMessage}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#ded7c9] p-4 text-sm">
          <span className="text-[#5d685f]">
            {items.length} {items.length === 1 ? nounSingular : nounPlural} en el mapa
          </span>
        </div>
      </section>
      <section className="mt-4 hidden rounded-2xl bg-[#073f31] p-5 text-white lg:block">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#f3a61e]">
          Alux conecta tu viaje
        </p>
        <h2 className="mt-2 font-display text-2xl">{profile.aluxMapTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">{profile.aluxMapDescription}</p>
      </section>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * LUGARES — G4-PLACES · filtros reales sobre el mismo lenguaje visual.
 *
 * Fuente única: `PublicListingDTO` (lecturas reales de
 * `points_of_interest`). Los atributos estructurados provienen de
 * columnas reales del CMS; los que no existen simplemente no se
 * ofrecen como filtro. Cero fixtures.
 * ------------------------------------------------------------------ */

const PLACE_SECONDARY_FILTERS = [
  { key: "zone", label: "Zona" },
  { key: "admission_type", label: "Entrada" },
  { key: "accessibility", label: "Accesibilidad" },
  { key: "amenities", label: "Servicios" },
  { key: "duration", label: "Tiempo de visita" },
  { key: "best_time", label: "Mejor momento" },
] as const;

function PlaceListingBody({
  profile,
  items,
  dto,
  nearbyItems,
  lockedDestinationLabel,
}: {
  profile: ListingProfile;
  items: ListingItem[];
  dto?: PublicListingDTO;
  nearbyItems?: readonly TourismCardVM[];
  lockedDestinationLabel?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [destino, setDestino] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [category, setCategory] = useState("");
  const [secondary, setSecondary] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);

  const locked = Boolean(lockedDestinationLabel);
  const destinos = useMemo(() => unique(items.map((item) => item.zone)), [items]);
  const placeTypes = useMemo(
    () => unique(items.flatMap((item) => attrOf(item, "place_type").map(humanizeAttributeValue))),
    [items],
  );
  const categories = useMemo(
    () =>
      unique(
        items.flatMap((item) => attrOf(item, "experience_category").map(humanizeAttributeValue)),
      ),
    [items],
  );
  const secondaryGroups = useMemo(
    () =>
      PLACE_SECONDARY_FILTERS.map((group) => ({
        ...group,
        options: unique(
          items.flatMap((item) => attrOf(item, group.key).map(humanizeAttributeValue)),
        ),
      })).filter((group) => group.options.length > 0),
    [items],
  );

  /* Clasificación principal del Inventario de Atractivos del Oriente Maya:
     dos familias documentales (tangibles e intangibles). Se muestra siempre,
     por encima del tipo específico y de las categorías de descubrimiento. */
  const familyCounts = useMemo(() => {
    const counts = { tangible: 0, intangible: 0 };
    for (const item of items) {
      const value = attrOf(item, "attraction_family")[0];
      if (value === "intangible") counts.intangible += 1;
      else if (value === "tangible") counts.tangible += 1;
    }
    return counts;
  }, [items]);

  const activeSecondary = Object.entries(secondary).filter(([, value]) => value);
  const hasActiveFilters =
    Boolean(query || family || placeType || category || (!locked && destino)) ||
    activeSecondary.length > 0;

  const filteredItems = useMemo(() => {
    const needle = normalize(query);
    return items.filter((item) => {
      if (family && !attrOf(item, "attraction_family").includes(family)) return false;
      if (!locked && destino && item.zone !== destino) return false;
      if (
        placeType &&
        !attrOf(item, "place_type").map(humanizeAttributeValue).includes(placeType)
      ) {
        return false;
      }
      if (
        category &&
        !attrOf(item, "experience_category").map(humanizeAttributeValue).includes(category)
      ) {
        return false;
      }
      for (const [key, value] of activeSecondary) {
        if (!attrOf(item, key).map(humanizeAttributeValue).includes(value)) return false;
      }
      if (!needle) return true;
      return normalize(
        [item.name, item.zone, item.copy, item.type, ...item.tags].join(" "),
      ).includes(needle);
    });
  }, [items, query, family, destino, placeType, category, activeSecondary, locked]);

  const clearAll = () => {
    setQuery("");
    setFamily("");
    setDestino("");
    setPlaceType("");
    setCategory("");
    setSecondary({});
  };

  const resultsTitle = lockedDestinationLabel
    ? `Lugares en ${lockedDestinationLabel}`
    : dto
      ? "Lugares del Oriente Maya"
      : profile.resultsTitle;

  return (
    <main className="bg-[#f7f2e8] pb-12 text-[#17251f] sm:pb-16">
      <div className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
        <TerritorialBreadcrumb
          profile={profile}
          destinationLabel={lockedDestinationLabel ?? undefined}
          destinationSlug={dto?.destinationSlug ?? undefined}
          omitDestination={!locked}
        />
        <ListingIntro
          profile={
            lockedDestinationLabel
              ? { ...profile, title: `Lugares y sitios de interés en ${lockedDestinationLabel}` }
              : dto
                ? { ...profile, title: "Lugares y sitios de interés del Oriente Maya" }
                : profile
          }
        />
        <AluxBar profile={profile} />

        <div
          role="group"
          aria-label="Familia de atractivo"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {[
            { value: "", label: "Todos" },
            { value: "tangible", label: "Tangibles", count: familyCounts.tangible },
            { value: "intangible", label: "Intangibles", count: familyCounts.intangible },
          ].map((option) => {
            const active = family === option.value;
            return (
              <button
                key={option.value || "todos"}
                type="button"
                aria-pressed={active}
                onClick={() => setFamily(option.value)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                  active
                    ? "border-[#0d4b38] bg-[#0d4b38] text-white"
                    : "border-[#ded7c9] bg-white text-[#17251f]"
                }`}
              >
                {option.label}
                {typeof option.count === "number" ? (
                  <span className={active ? "text-white/75" : "text-[#788078]"}>{option.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>


        <section className="mt-3 rounded-2xl border border-[#ded7c9] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap gap-2 lg:grid lg:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
            <label className="relative min-w-[12.5rem] flex-1 lg:min-w-0">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#788078]"
                aria-hidden
              />
              <span className="sr-only">{profile.searchLabel}</span>
              <input
                placeholder={profile.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-10 pr-3 text-sm outline-none"
              />
            </label>

            {locked ? (
              <span className="inline-flex min-h-11 min-w-max items-center gap-2 rounded-xl border border-[#0d4b38]/25 bg-[#0d4b38]/8 px-4 text-sm font-semibold text-[#0d4b38]">
                <MapPin className="size-4" aria-hidden /> {lockedDestinationLabel}
              </span>
            ) : (
              <EventSelect
                label="Destino"
                value={destino}
                onChange={setDestino}
                options={destinos}
              />
            )}

            {placeTypes.length > 0 ? (
              <EventSelect
                label="Tipo de lugar"
                value={placeType}
                onChange={setPlaceType}
                options={placeTypes}
              />
            ) : null}

            {categories.length > 0 ? (
              <EventSelect
                label="Categoría"
                value={category}
                onChange={setCategory}
                options={categories}
              />
            ) : null}

            {secondaryGroups.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                aria-expanded={showMore}
                className="inline-flex min-h-11 min-w-max items-center justify-center gap-2 rounded-xl border border-[#0d4b38] px-4 text-sm font-semibold text-[#0d4b38]"
              >
                <SlidersHorizontal className="size-4" aria-hidden /> Más filtros
                {activeSecondary.length ? ` (${activeSecondary.length})` : ""}
              </button>
            ) : null}
          </div>

          {showMore && secondaryGroups.length > 0 ? (
            <div className="mt-3 grid gap-3 border-t border-[#ded7c9] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {secondaryGroups.map((group) => (
                <EventSelect
                  key={group.key}
                  label={group.label}
                  value={secondary[group.key] ?? ""}
                  onChange={(value) =>
                    setSecondary((current) => ({ ...current, [group.key]: value }))
                  }
                  options={group.options}
                />
              ))}
            </div>
          ) : null}

          {hasActiveFilters ? (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#efe8da] px-4 text-sm font-semibold"
              >
                Limpiar filtros
              </button>
            </div>
          ) : null}
        </section>

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(22rem,.76fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(25rem,.72fr)]">
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  {lockedDestinationLabel ? "Primero en el destino" : "Territorio y patrimonio"}
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">{resultsTitle}</h2>
              </div>
              <p className="shrink-0 text-sm text-[#667067]">
                {filteredItems.length} {filteredItems.length === 1 ? "lugar" : "lugares"}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {filteredItems.map((item, index) => (
                <ListingCard key={item.name} item={item} featured={index === 0} profile={profile} />
              ))}
              {!filteredItems.length ? (
                <div className="rounded-2xl border border-[#ded7c9] bg-white p-8 text-center text-sm text-[#5d685f]">
                  {dto && !hasActiveFilters
                    ? dto.emptyMessage
                    : "No encontramos lugares con esos filtros. Prueba quitando una selección."}
                </div>
              ) : null}
            </div>

            {nearbyItems && nearbyItems.length ? (
              <section className="mt-10 border-t border-[#ded7c9] pt-7">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  Amplía la ruta
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">
                  Lugares cerca de {lockedDestinationLabel}
                </h2>
                <p className="mt-1 text-sm text-[#667067]">
                  Se muestran aparte para conservar claro qué pertenece al destino.
                </p>
                <div className="mt-4 space-y-4">
                  {nearbyItems.slice(0, 6).map((card) => (
                    <ListingCard
                      key={card.id}
                      item={listingItemFromDTO(card, profile)}
                      featured={false}
                      profile={profile}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <EventMapPanel
            profile={profile}
            items={filteredItems}
            title={
              lockedDestinationLabel
                ? `Lugares en ${lockedDestinationLabel}`
                : "Lugares del Oriente Maya"
            }
            nounSingular="lugar"
            nounPlural="lugares"
            emptyCoordsMessage="Los lugares filtrados aún no publican coordenadas."
          />
        </div>
      </div>
    </main>
  );
}
