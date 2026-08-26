/**
 * G4-F · Home Premium Visual North Star.
 * Preview interna, no indexable, sin persistencia y sin impacto en la Home pública.
 */
import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Hotel,
  Landmark,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Route as RouteIcon,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PremiumPresentationControl } from "@/components/premium";

export const Route = createFileRoute("/lovable/g4-home-premium-preview")({
  head: () => ({
    meta: [
      { title: "G4-F · Vista previa Home Premium (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la página principal premium de Valladolid.mx. No indexable, sin persistencia.",
      },
      { property: "og:title", content: "G4-F · Vista previa Home Premium (interna)" },
      {
        property: "og:description",
        content: "Vista previa interna y no indexable de la Home Premium de Valladolid.mx.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4HomePremiumPreview,
});

const GOVERNED = "/api/public/studio-media/governed/v1p1c";
const MEDIA = {
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, palmeras y arcadas coloniales",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial de Valladolid con fachadas pastel y puertas de madera",
  },
  centro: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Centro histórico de Valladolid con arquitectura colonial bajo la luz cálida de la tarde",
  },
  cocina: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y mesas iluminadas",
  },
  patio: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio de hotel boutique con piscina y arcos de piedra caliza",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote de aguas turquesa dentro de una caverna de piedra caliza",
  },
} as const;

type Media = (typeof MEDIA)[keyof typeof MEDIA];
type VisualDirection = PremiumPresentation;
type CardLayout = "asimetrica" | "cuadricula" | "carrusel";
type SectionKey =
  | "destinos"
  | "pueblosMagicos"
  | "rutas"
  | "experiencias"
  | "servicios"
  | "eventos"
  | "queHacer"
  | "mapa";

type TuningState = {
  direction: VisualDirection;
  heroVariant: VisualDirection;
  layout: CardLayout;
  sections: Record<SectionKey, boolean>;
  order: SectionKey[];
};

const HERO_SLIDES = [
  { media: MEDIA.centro, caption: "Centro histórico al atardecer" },
  { media: MEDIA.cenote, caption: "Cenotes del Oriente Maya de Yucatán" },
] as const;

const ROUTES = [
  {
    id: "essential",
    title: "Valladolid esencial",
    duration: "Medio día",
    stops: 4,
    vibe: "Historia, paseo y sabor",
    description: "Una primera lectura de la ciudad, del centro a una cocina tradicional.",
    sequence: ["Plaza principal", "San Servacio", "Calzada de los Frailes", "Cocina local"],
    media: MEDIA.centro,
  },
  {
    id: "cenotes",
    title: "Cenotes y comunidades",
    duration: "Un día",
    stops: 4,
    vibe: "Naturaleza y cultura viva",
    description: "Una propuesta visual para ordenar agua, territorio y comunidades sin prisas.",
    sequence: ["Valladolid", "Cenote de la región", "Comunidad maya", "Regreso al centro"],
    media: MEDIA.cenote,
  },
  {
    id: "pueblos",
    title: "Pueblos Mágicos del Oriente Maya de Yucatán",
    duration: "Dos días",
    stops: 3,
    vibe: "Patrimonio y vida local",
    description: "Tres escalas para comprender la identidad compartida y los matices del oriente.",
    sequence: ["Valladolid", "Espita", "Izamal"],
    media: MEDIA.calle,
  },
] as const;

type RouteId = (typeof ROUTES)[number]["id"];

const DESTINATIONS = [
  {
    name: "Valladolid",
    note: "Capital turística · punto de partida",
    media: MEDIA.centro,
    puebloMagico: true,
    demo: false,
  },
  {
    name: "Izamal",
    note: "Ciudad amarilla · patrimonio vivo",
    media: MEDIA.calle,
    puebloMagico: true,
    demo: true,
  },
  {
    name: "Espita",
    note: "Arquitectura y ritmo de pueblo",
    media: MEDIA.plaza,
    puebloMagico: true,
    demo: true,
  },
  {
    name: "Temozón",
    note: "Artesanía y sabor del oriente",
    media: MEDIA.cocina,
    puebloMagico: false,
    demo: true,
  },
] as const;

const EXPERIENCES = [
  {
    title: "Inframundo Maya",
    category: "Cenote · Valladolid",
    summary: "Lectura del paisaje kárstico y descenso guiado a una caverna.",
    media: MEDIA.cenote,
  },
  {
    title: "Calzada de los Frailes",
    category: "Caminata cultural",
    summary: "Fachadas restauradas, oficios y memoria urbana.",
    media: MEDIA.calle,
  },
  {
    title: "Amanecer en la plaza",
    category: "Vida local",
    summary: "Arcadas, mercado y cocina de humo antes del mediodía.",
    media: MEDIA.plaza,
  },
  {
    title: "Patios de piedra",
    category: "Arquitectura",
    summary: "Una mirada íntima a los espacios frescos de la ciudad.",
    media: MEDIA.patio,
  },
] as const;

const STAYS = [
  {
    title: "Hacienda San Servacio",
    destination: "Valladolid",
    category: "Hotel boutique · demo visual",
    summary: "Casona colonial con patio de arcos y piscina estilo cenote.",
    media: MEDIA.patio,
  },
  {
    title: "Casa de piedra en el centro",
    destination: "Valladolid",
    category: "Hospedaje · demo visual",
    summary: "Muros gruesos y una ubicación pensada para recorrer la ciudad a pie.",
    media: MEDIA.centro,
  },
] as const;

const FOOD = [
  {
    title: "Cocina de Zací",
    destination: "Valladolid",
    category: "Cocina yucateca · demo visual",
    summary: "Recetario de fuego lento servido en una terraza de arcos.",
    media: MEDIA.cocina,
  },
  {
    title: "Mercado y cocinas de barrio",
    destination: "Valladolid",
    category: "Cocina local · demo visual",
    summary: "Una selección editorial para comprender sabores, horarios y rituales cotidianos.",
    media: MEDIA.plaza,
  },
] as const;

const EVENTS = [
  {
    day: "Fecha por confirmar",
    title: "Noche de Valladolid",
    type: "Música y memoria",
    detail: "Velada cultural en el centro histórico · demo visual, sin disponibilidad afirmada.",
  },
  {
    day: "Sin fecha acreditada",
    title: "Oficios de la Calzada",
    type: "Talleres y comunidad",
    detail: "Encuentro editorial con artesanos locales · demo visual.",
  },
  {
    day: "Agenda en preparación",
    title: "Sabores del oriente",
    type: "Gastronomía",
    detail: "Relato visual de productores y cocinas · demo visual.",
  },
] as const;

const EDITORIAL = [
  {
    kicker: "Patrimonio",
    title: "Leer una ciudad de piedra caliza",
    body: "Claves para mirar fachadas, dinteles y el trazado original del centro.",
    media: MEDIA.centro,
  },
  {
    kicker: "Territorio",
    title: "El agua bajo el suelo",
    body: "Una introducción a los cenotes y su relación con la vida del Oriente Maya de Yucatán.",
    media: MEDIA.cenote,
  },
  {
    kicker: "Cuaderno de viaje",
    title: "Viajar sin prisa",
    body: "Cómo combinar pueblos, cocina y naturaleza en una ruta de varios días.",
    media: MEDIA.calle,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "multi",
  heading: "Paradas de la ruta en el territorio",
  center: { lat: 20.72, lng: -88.3, zoom: 10 },
  points: [
    {
      id: "valladolid",
      kind: "destination",
      lat: 20.6892,
      lng: -88.2018,
      title: "Valladolid",
      subtitle: "Inicio sugerido · Capital Turística del Oriente Maya de Yucatán",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "espita",
      kind: "destination",
      lat: 21.0117,
      lng: -88.3061,
      title: "Espita",
      subtitle: "Segunda parada · demo visual",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "izamal",
      kind: "destination",
      lat: 20.9308,
      lng: -89.0175,
      title: "Izamal",
      subtitle: "Tercera parada · demo visual",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
  ],
  capabilities: {
    showDistance: false,
    showDirections: false,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

const SECTION_LABELS: Record<SectionKey, string> = {
  destinos: "Destinos del Oriente Maya de Yucatán",
  pueblosMagicos: "Pueblos Mágicos",
  rutas: "Rutas recomendadas por Alux",
  experiencias: "Experiencias",
  servicios: "Hospedaje y gastronomía",
  eventos: "Eventos",
  queHacer: "Qué hacer",
  mapa: "Mapa",
};

const DEFAULT_ORDER: SectionKey[] = [
  "destinos",
  "pueblosMagicos",
  "rutas",
  "experiencias",
  "servicios",
  "eventos",
  "queHacer",
  "mapa",
];

const G6_HOME_CATEGORIES = [
  { slug: "destinos", label: "Destinos", href: "#" },
  { slug: "hoteles", label: "Hoteles", href: "#" },
  { slug: "restaurantes", label: "Restaurantes", href: "#" },
  { slug: "experiencias", label: "Experiencias", href: "#" },
  { slug: "cenotes", label: "Cenotes", href: "#" },
  { slug: "zonas-arqueologicas", label: "Zonas arqueológicas", href: "#" },
  { slug: "eventos", label: "Eventos", href: "#" },
  { slug: "gastronomia", label: "Gastronomía", href: "#" },
  { slug: "pueblos", label: "Pueblos", href: "#" },
  { slug: "rutas", label: "Rutas", href: "#" },
  { slug: "artesanias", label: "Artesanías", href: "#" },
  { slug: "mapas", label: "Mapas", href: "#" },
] as const;

function G4HomePremiumPreview() {
  const [tuning, setTuning] = useState<TuningState>({
    direction: "editorial",
    heroVariant: "editorial",
    layout: "asimetrica",
    sections: {
      destinos: true,
      pueblosMagicos: true,
      rutas: true,
      experiencias: true,
      servicios: true,
      eventos: true,
      queHacer: true,
      mapa: true,
    },
    order: DEFAULT_ORDER,
  });
  const [selectedRoute, setSelectedRoute] = useState<RouteId>("essential");
  const [selectedPrompt, setSelectedPrompt] = useState("Tengo medio día");
  const [added, setAdded] = useState(false);
  const [openedMicrosite, setOpenedMicrosite] = useState<string | null>(null);

  const renderSection = (key: SectionKey) => {
    if (!tuning.sections[key]) return null;
    if (key === "destinos")
      return (
        <DestinationsSection
          key={key}
          layout={tuning.layout}
          opened={openedMicrosite}
          onOpen={setOpenedMicrosite}
        />
      );
    if (key === "pueblosMagicos")
      return <PueblosMagicosSection key={key} onCreateRoute={() => setSelectedRoute("pueblos")} />;
    if (key === "rutas")
      return (
        <RoutesSection
          key={key}
          selectedRoute={selectedRoute}
          onSelectRoute={setSelectedRoute}
          onAdd={() => setAdded(true)}
        />
      );
    if (key === "experiencias") return <ExperiencesSection key={key} layout={tuning.layout} />;
    if (key === "servicios") return <ServicesSection key={key} />;
    if (key === "eventos") return <EventsSection key={key} />;
    if (key === "queHacer") return <EditorialSection key={key} />;
    return <MapSection key={key} selectedRoute={selectedRoute} />;
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background pb-20">
      <PreviewRibbon />
      <PreviewHeader />
      <main>
        <Container className="pt-4 sm:pt-6">
          {tuning.heroVariant === "editorial" ? <HeroEditorial /> : <HeroCinematic />}
        </Container>

        <Container className="mt-6 sm:mt-8">
          {/* G6-S1 · adopción de la autoridad única de iconografía turística */}
          <section
            aria-label="Explora por categoría"
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <h2 className="mb-4 text-base font-semibold">Explora por categoría</h2>
            <CategoryNavGrid
              items={G6_HOME_CATEGORIES}
              variant="standard"
              mode="navigate"
              showCounts={false}
              desktopColumnsClassName="lg:grid-cols-6"
            />
          </section>
        </Container>

        <Container className="mt-6 sm:mt-8">
          <AluxPlanner
            selectedPrompt={selectedPrompt}
            onSelectPrompt={setSelectedPrompt}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
            added={added}
            onAdd={() => setAdded(true)}
          />
        </Container>

        {tuning.order.map((key) =>
          tuning.sections[key] ? (
            <Container key={key} className="mt-10 sm:mt-12">
              {renderSection(key)}
            </Container>
          ) : null,
        )}

        <Container className="mt-10 sm:mt-12">
          <TravelPlanClose
            selectedRoute={selectedRoute}
            added={added}
            onAdd={() => setAdded(true)}
          />
        </Container>
      </main>
      <Container className="mt-8">
        <PreviewFooter />
      </Container>
      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
  );
}

function PreviewRibbon() {
  return (
    <div className="border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-xs text-warning-foreground">
      Vista interna G4-F · DEMO VISUAL · no indexable · sin persistencia · producción intacta
    </div>
  );
}

function PreviewHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-lg font-semibold">Valladolid.mx</span>
          <span className="hidden text-[10px] uppercase text-muted-foreground sm:inline">
            Oriente Maya de Yucatán
          </span>
        </Link>
        <nav
          aria-label="Navegación de la vista previa"
          className="hidden items-center gap-1 lg:flex"
        >
          {[
            ["#rutas", "Rutas"],
            ["#destinos", "Destinos"],
            ["#experiencias", "Experiencias"],
            ["#mapa", "Mapa"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-pill px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <Button asChild size="sm" className="rounded-pill">
          <Link to="/arma-tu-viaje">Arma tu viaje</Link>
        </Button>
      </Container>
    </header>
  );
}

function HeroSlideControl({
  index,
  onChange,
  inverted = false,
}: {
  index: number;
  onChange: (value: number) => void;
  inverted?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Seleccionar imagen del hero">
      {HERO_SLIDES.map((slide, itemIndex) => (
        <Button
          key={slide.caption}
          type="button"
          size="sm"
          variant={itemIndex === index ? "default" : "outline"}
          onClick={() => onChange(itemIndex)}
          aria-pressed={itemIndex === index}
          className={cn(
            "min-h-11 rounded-pill px-4",
            inverted &&
              itemIndex !== index &&
              "border-primary-foreground/50 bg-foreground/40 text-primary-foreground hover:bg-foreground/60",
          )}
        >
          {itemIndex + 1} de {HERO_SLIDES.length}
        </Button>
      ))}
      <span
        className={cn("text-xs", inverted ? "text-primary-foreground/85" : "text-muted-foreground")}
      >
        {HERO_SLIDES[index].caption}
      </span>
    </div>
  );
}

function HeroActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button asChild size="lg" className="min-h-12 rounded-pill">
        <Link to="/oriente-maya">
          Explorar Oriente Maya de Yucatán <ArrowRight className="ml-2 size-4" aria-hidden />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="min-h-12 rounded-pill">
        <Link to="/arma-tu-viaje">Arma tu viaje</Link>
      </Button>
    </div>
  );
}

function HeroEditorial() {
  const [index, setIndex] = useState(0);
  const slide = HERO_SLIDES[index];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        <div className="flex flex-col justify-center bg-card p-6 sm:p-9 lg:p-12">
          <p className="text-xs font-semibold uppercase text-primary">
            Revista territorial · Oriente Maya de Yucatán
          </p>
          <h1 className="mt-3 text-balance font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Valladolid, Capital Turística del Oriente Maya de Yucatán
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Historias, rutas y lugares reunidos con una mirada editorial para inspirar el viaje y
            convertirlo, paso a paso, en un itinerario con Alux.
          </p>
          <div className="mt-7">
            <HeroActions />
          </div>
          <div className="mt-7 border-t border-border pt-5">
            <HeroSlideControl index={index} onChange={setIndex} />
          </div>
        </div>
        <figure className="relative min-h-[22rem] overflow-hidden lg:min-h-[38rem]">
          <img
            src={slide.media.url}
            alt={slide.media.alt}
            loading="eager"
            className="absolute inset-0 size-full object-cover"
          />
          <figcaption className="absolute bottom-4 left-4 rounded-md bg-foreground/85 px-3 py-2 text-xs text-background">
            {slide.caption}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function HeroCinematic() {
  const [index, setIndex] = useState(0);
  const slide = HERO_SLIDES[index];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative min-h-[28rem] sm:min-h-[36rem]">
        <img
          src={slide.media.url}
          alt={slide.media.alt}
          loading="eager"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/55 to-foreground/10"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase text-primary">Oriente Maya de Yucatán</p>
          <h1 className="mt-3 max-w-4xl text-balance font-display text-4xl leading-tight text-primary-foreground sm:text-6xl">
            Valladolid, Capital Turística del Oriente Maya de Yucatán
          </h1>
          <div className="mt-5">
            <HeroSlideControl index={index} onChange={setIndex} inverted />
          </div>
        </div>
      </div>
      <div className="grid gap-5 bg-card p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Del asombro a una ruta posible: descubre el territorio y organiza cada parada con Alux
          dentro del Travel Plan canónico.
        </p>
        <HeroActions />
      </div>
    </section>
  );
}

function SectionHead({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase text-primary">{kicker}</p>
        <h2 className="mt-2 text-balance font-display text-3xl sm:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

function DemoTag() {
  return (
    <span className="inline-flex rounded-pill border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
      Demo visual
    </span>
  );
}

function AluxPlanner({
  selectedPrompt,
  onSelectPrompt,
  selectedRoute,
  onSelectRoute,
  added,
  onAdd,
}: {
  selectedPrompt: string;
  onSelectPrompt: (value: string) => void;
  selectedRoute: RouteId;
  onSelectRoute: (value: RouteId) => void;
  added: boolean;
  onAdd: () => void;
}) {
  const prompts = [
    "Tengo medio día",
    "Viajo en pareja",
    "Quiero cenotes y gastronomía",
    "Busco cultura viva",
  ];
  const suggested = ROUTES.find((route) => route.id === selectedRoute) ?? ROUTES[0];
  return (
    <section
      aria-labelledby="alux-title"
      className="overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-soft"
    >
      <div className="grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        <div className="bg-selva p-6 text-selva-foreground sm:p-8">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <p className="text-xs font-semibold uppercase">Planea con Alux</p>
          </div>
          <h2 id="alux-title" className="mt-3 font-display text-3xl">
            ¿Qué quieres descubrir?
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-selva-foreground/80">
            Elige una pista. Alux propone un orden comprensible y lo conecta con el Travel Plan
            canónico; esta preview sólo simula la interacción local.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                size="sm"
                variant={selectedPrompt === prompt ? "default" : "secondary"}
                onClick={() => onSelectPrompt(prompt)}
                className="min-h-11 rounded-pill whitespace-normal text-left"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
        <div className="p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DemoTag />
            <span className="text-xs text-muted-foreground">Respuesta contextual simulada</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Para “{selectedPrompt}”, empezaría por:
          </p>
          <h3 className="mt-1 font-display text-2xl">{suggested.title}</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Clock3 />} label={suggested.duration} />
            <Stat icon={<MapPin />} label={`${suggested.stops} paradas`} />
            <Stat icon={<RouteIcon />} label="Orden sugerido" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Propongo iniciar en el centro, continuar por la parada que requiere más luz de día y
            cerrar cerca de opciones de comida. La distancia y tiempos reales se confirmarían con
            datos acreditados.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              onClick={() => onSelectRoute(suggested.id)}
              className="min-h-11 rounded-pill"
            >
              <MessageCircle className="mr-2 size-4" aria-hidden />
              Personalizar con Alux
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onAdd}
              className="min-h-11 rounded-pill"
            >
              {added ? (
                <Check className="mr-2 size-4" aria-hidden />
              ) : (
                <Compass className="mr-2 size-4" aria-hidden />
              )}
              {added ? "Ruta agregada" : "Agregar ruta a mi viaje"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted p-3 text-center text-xs font-medium text-foreground [&_svg]:mx-auto [&_svg]:mb-1 [&_svg]:size-4 [&_svg]:text-primary">
      <span aria-hidden>{icon}</span>
      <span className="block break-words">{label}</span>
    </div>
  );
}

function RoutesSection({
  selectedRoute,
  onSelectRoute,
  onAdd,
}: {
  selectedRoute: RouteId;
  onSelectRoute: (value: RouteId) => void;
  onAdd: () => void;
}) {
  return (
    <section id="rutas" aria-labelledby="routes-title">
      <SectionHead
        kicker="Elige un ritmo"
        title="Rutas recomendadas por Alux"
        description="Tres relatos compactos que convierten inspiración en una secuencia de paradas. Duraciones y contenidos son demostrativos; no afirman distancia, precio ni disponibilidad."
        action="3 propuestas"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {ROUTES.map((route) => {
          const active = route.id === selectedRoute;
          return (
            <article
              key={route.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card",
                active ? "border-primary shadow-elevated" : "border-border",
              )}
            >
              <div className="grid grid-cols-[7rem_1fr] border-b border-border">
                <img
                  src={route.media.url}
                  alt={route.media.alt}
                  loading="lazy"
                  className="h-full min-h-32 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <DemoTag />
                    {active ? (
                      <span className="rounded-pill bg-primary/15 px-2 py-1 text-[10px] font-semibold text-foreground">
                        Seleccionada
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-display text-xl">{route.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {route.duration} · {route.stops} paradas · {route.vibe}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{route.description}</p>
                <ol className="mt-4 space-y-2" aria-label={`Paradas de ${route.title}`}>
                  {route.sequence.map((stop, index) => (
                    <li key={stop} className="flex items-center gap-3 text-sm">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-semibold">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">{stop}</span>
                      {index < route.sequence.length - 1 ? (
                        <span className="h-px w-5 bg-primary" aria-hidden />
                      ) : null}
                    </li>
                  ))}
                </ol>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() => onSelectRoute(route.id)}
                    className="min-h-11 rounded-pill"
                  >
                    Ver ruta
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      onSelectRoute(route.id);
                      onAdd();
                    }}
                    className="min-h-11 rounded-pill whitespace-normal"
                  >
                    Personalizar con Alux
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DestinationsSection({
  layout,
  opened,
  onOpen,
}: {
  layout: CardLayout;
  opened: string | null;
  onOpen: (value: string) => void;
}) {
  return (
    <section id="destinos" aria-labelledby="destinations-title">
      <SectionHead
        kicker="Territorio"
        title="Explora los destinos del Oriente Maya de Yucatán"
        description="Cada tarjeta es la entrada a su micrositio. Valladolid es la capital turística y el punto de partida sugerido; el resto se presenta como demo visual en esta preview."
        action="Todos los destinos"
      />
      <div
        className={cn(
          "grid gap-3",
          layout === "cuadricula"
            ? "sm:grid-cols-2"
            : layout === "carrusel"
              ? "grid-flow-col auto-cols-[85%] overflow-x-auto pb-2 sm:auto-cols-[45%] lg:auto-cols-[32%]"
              : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {DESTINATIONS.map((destination, index) => {
          const wide = layout === "asimetrica" && index === 0;
          return (
            <article
              key={destination.name}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
                wide && "sm:col-span-2 lg:col-span-2",
              )}
            >
              <div className="relative">
                <img
                  src={destination.media.url}
                  alt={destination.media.alt}
                  loading="lazy"
                  className={cn(
                    "w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.02]",
                    wide ? "aspect-[16/9]" : "aspect-[4/3]",
                  )}
                />
                <span className="absolute left-3 top-3 rounded-pill bg-card px-2.5 py-1 text-[10px] font-semibold uppercase text-card-foreground shadow-soft">
                  {destination.demo ? "Demo visual" : "Capital turística"}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-2xl">{destination.name}</h3>
                  {destination.puebloMagico ? (
                    <span className="rounded-pill border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      Pueblo Mágico
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {destination.note}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpen(destination.name)}
                  className="mt-4 min-h-11 rounded-pill"
                >
                  {opened === destination.name ? (
                    <Check className="mr-2 size-4" aria-hidden />
                  ) : (
                    <Landmark className="mr-2 size-4" aria-hidden />
                  )}
                  {opened === destination.name ? "Micrositio abierto (demo)" : "Ver micrositio"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        Listado demostrativo de los destinos disponibles en esta preview. No se afirma cobertura,
        disponibilidad ni datos operativos; la apertura del micrositio es una acción local simulada.
      </p>
    </section>
  );
}

function PueblosMagicosSection({ onCreateRoute }: { onCreateRoute: () => void }) {
  const pueblos = DESTINATIONS.filter((destination) => destination.puebloMagico);
  return (
    <section id="pueblos-magicos" aria-labelledby="pueblos-title">
      <SectionHead
        kicker="Distintivo territorial"
        title="Pueblos Mágicos del Oriente Maya de Yucatán"
        description="Valladolid, Izamal y Espita comparten un distintivo y tres formas distintas de vivir el oriente de Yucatán."
        action="Descubre los tres"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {pueblos.map((pueblo) => (
          <article
            key={pueblo.name}
            className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3"
          >
            <img
              src={pueblo.media.url}
              alt={pueblo.media.alt}
              loading="lazy"
              className="size-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <span className="rounded-pill border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Pueblo Mágico
              </span>
              <h3 className="mt-1 font-display text-xl">{pueblo.name}</h3>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {pueblo.note}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Badge exclusivamente textual: el distintivo gráfico oficial espera un asset acreditado y
          no se fabrica ni se imita en esta preview.
        </p>
        <Button type="button" onClick={onCreateRoute} className="min-h-11 rounded-pill">
          <RouteIcon className="mr-2 size-4" aria-hidden />
          Crear ruta con Alux
        </Button>
      </div>
    </section>
  );
}

function ExperiencesSection({ layout }: { layout: CardLayout }) {
  const featured = EXPERIENCES[0];
  return (
    <section id="experiencias" aria-labelledby="experiences-title">
      <SectionHead
        kicker="Experiencias"
        title="Vive lo que da forma al territorio"
        description="Una selección densa: un relato protagonista y tres maneras de continuar."
        action="Ver experiencias"
      />
      <div
        className={cn(
          "grid gap-4",
          layout === "carrusel"
            ? "grid-flow-col auto-cols-[86%] overflow-x-auto pb-2 sm:auto-cols-[48%]"
            : "lg:grid-cols-[1.2fr_1fr]",
        )}
      >
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={featured.media.url}
            alt={featured.media.alt}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              <DemoTag />
              <span className="text-xs text-muted-foreground">{featured.category}</span>
            </div>
            <h3 className="mt-3 font-display text-3xl">{featured.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{featured.summary}</p>
            <Button type="button" variant="outline" className="mt-4 min-h-11 rounded-pill">
              Explorar experiencia
            </Button>
          </div>
        </article>
        <div className="grid gap-3">
          {EXPERIENCES.slice(1).map((item) => (
            <CompactMediaRow key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CompactMediaRow({
  item,
}: {
  item: { title: string; category: string; summary: string; media: Media };
}) {
  return (
    <article className="grid min-h-36 grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[10rem_1fr]">
      <img
        src={item.media.url}
        alt={item.media.alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="flex min-w-0 flex-col justify-center p-4">
        <p className="text-[10px] font-semibold uppercase text-primary">{item.category}</p>
        <h3 className="mt-1 font-display text-xl">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.summary}
        </p>
        <span className="mt-2 inline-flex items-center text-xs font-semibold">
          Ver detalle <ChevronRight className="size-3" aria-hidden />
        </span>
      </div>
    </article>
  );
}

function ServicesSection() {
  return (
    <section aria-labelledby="services-title">
      <SectionHead
        kicker="Servicios para continuar"
        title="Descansa bien, come con contexto"
        description="Tarjetas compactas con lo necesario para decidir qué explorar después; sin precios ni disponibilidad simulados."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ServiceColumn icon={<Hotel />} title="Hospedaje" items={STAYS} />
        <ServiceColumn icon={<UtensilsCrossed />} title="Gastronomía" items={FOOD} />
      </div>
    </section>
  );
}

function ServiceColumn({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: readonly {
    title: string;
    destination: string;
    category: string;
    summary: string;
    media: Media;
  }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-primary">
        <span aria-hidden>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[11rem_1fr]"
          >
            <img
              src={item.media.url}
              alt={item.media.alt}
              loading="lazy"
              className="h-full min-h-40 w-full object-cover"
            />
            <div className="min-w-0 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">
                {item.destination} · {item.category}
              </p>
              <h4 className="mt-1 font-display text-xl">{item.title}</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
              <Button type="button" variant="link" className="mt-2 h-auto min-h-11 p-0">
                Ver ficha <ArrowRight className="ml-1 size-3" aria-hidden />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EventsSection() {
  return (
    <section
      aria-labelledby="events-title"
      className="rounded-3xl border border-border bg-card p-5 sm:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,34%)_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Agenda editorial</p>
          <h2 id="events-title" className="mt-2 font-display text-3xl">
            El territorio también ocurre hoy
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Agenda compacta, sin imágenes ornamentales aisladas ni datos de disponibilidad no
            acreditados.
          </p>
          <img
            src={MEDIA.plaza.url}
            alt={MEDIA.plaza.alt}
            loading="lazy"
            className="mt-5 aspect-[16/10] w-full rounded-2xl object-cover"
          />
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {EVENTS.map((event, index) => (
            <li
              key={event.title}
              className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
            >
              <span className="grid size-10 place-items-center rounded-full bg-secondary font-display text-lg">
                {index + 1}
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase text-primary">
                  {event.day} · {event.type}
                </p>
                <h3 className="mt-1 font-display text-xl">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 justify-self-start rounded-pill sm:justify-self-end"
              >
                Ver agenda
              </Button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EditorialSection() {
  return (
    <section aria-labelledby="editorial-title">
      <SectionHead
        kicker="Qué hacer · inspiración"
        title="Historias para mirar mejor"
        description="Contenido transversal que prepara el viaje y contextualiza el territorio; no duplica experiencias ni tours."
        action="Abrir cuaderno editorial"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {EDITORIAL.map((item) => (
          <article
            key={item.title}
            className="grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card md:block"
          >
            <img
              src={item.media.url}
              alt={item.media.alt}
              loading="lazy"
              className="h-full min-h-40 w-full object-cover md:aspect-[4/3] md:h-auto"
            />
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">{item.kicker}</p>
              <h3 className="mt-1 font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MapSection({ selectedRoute }: { selectedRoute: RouteId }) {
  const route = ROUTES.find((item) => item.id === selectedRoute) ?? ROUTES[0];
  return (
    <section
      id="mapa"
      aria-labelledby="map-title"
      className="rounded-3xl border border-border bg-card p-4 sm:p-7"
    >
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Del relato al territorio</p>
          <h2 id="map-title" className="mt-2 font-display text-3xl sm:text-4xl">
            Mira la ruta y sus paradas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            El mapa oficial se acompaña de la lista de puntos del bloque y del contexto de la ruta
            elegida. En móvil, el orden sigue siendo mapa → paradas.
          </p>
        </div>
        <div className="rounded-xl bg-muted p-4">
          <p className="text-[10px] font-semibold uppercase text-primary">Ruta activa · demo</p>
          <p className="mt-1 font-display text-lg">{route.title}</p>
          <p className="text-xs text-muted-foreground">
            {route.duration} · {route.stops} paradas
          </p>
        </div>
      </div>
      <ExperienceMapBlock dto={MAP_DTO} />
    </section>
  );
}

function TravelPlanClose({
  selectedRoute,
  added,
  onAdd,
}: {
  selectedRoute: RouteId;
  added: boolean;
  onAdd: () => void;
}) {
  const route = ROUTES.find((item) => item.id === selectedRoute) ?? ROUTES[0];
  return (
    <section className="overflow-hidden rounded-3xl bg-selva text-selva-foreground">
      <div className="grid gap-6 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" aria-hidden />
            <p className="text-xs font-semibold uppercase">Tu Travel Plan canónico</p>
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">Tu ruta empieza a tomar forma</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-selva-foreground/80">
            {route.title} · {route.duration} · {route.stops} paradas. Alux puede ajustar el orden
            según tus intereses sin crear otro modelo de itinerario.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button type="button" size="lg" onClick={onAdd} className="min-h-12 rounded-pill">
            {added ? (
              <Check className="mr-2 size-4" aria-hidden />
            ) : (
              <Compass className="mr-2 size-4" aria-hidden />
            )}
            {added ? "Guardada en mi viaje" : "Agregar a mi viaje"}
          </Button>
          <Button asChild size="lg" variant="secondary" className="min-h-12 rounded-pill">
            <Link to="/alux">Personalizar con Alux</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function PreviewFooter() {
  return (
    <footer className="border-t border-border py-7">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-display text-xl">Valladolid.mx</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Continuidad territorial: Valladolid · Espita · Izamal · Oriente Maya de Yucatán.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/oriente-maya">Territorio</Link>
          <Link to="/experiencias">Experiencias</Link>
          <Link to="/arma-tu-viaje">Travel Plan</Link>
          <Link to="/alux">Alux</Link>
        </div>
      </div>
    </footer>
  );
}

function TuningPanel({
  value,
  onChange,
}: {
  value: TuningState;
  onChange: (next: TuningState) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof TuningState>(key: K, next: TuningState[K]) =>
    onChange({ ...value, [key]: next });
  const move = (key: SectionKey, delta: number) => {
    const order = [...value.order];
    const index = order.indexOf(key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    set("order", order);
  };
  return (
    <aside
      className="fixed bottom-4 right-4 z-50 w-[min(23rem,calc(100vw-2rem))]"
      aria-label="Configuración interna de la preview"
    >
      {open ? (
        <div className="max-h-[82vh] overflow-y-auto rounded-3xl border border-border bg-card/95 p-4 shadow-floating backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Afinar página principal · vista interna</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Rol local: Administración · useState local · sin persistencia.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-foreground">
            <strong>Editorial</strong> prioriza siempre texto sobre superficies sólidas de alto
            contraste; las fotografías acompañan, nunca sostienen párrafos.
          </p>
          <div className="mt-4 space-y-4">
            <PremiumPresentationControl
              value={value.direction}
              onChange={(next) => set("direction", next)}
            />
            <OptionGroup
              title="Hero"
              options={[
                ["editorial", "Split editorial"],
                ["cinematic", "Inmersivo + banda"],
              ]}
              active={value.heroVariant}
              onSelect={(next) => set("heroVariant", next as VisualDirection)}
            />
            <OptionGroup
              title="Layout"
              options={[
                ["asimetrica", "Asimétrica"],
                ["cuadricula", "Cuadrícula"],
                ["carrusel", "Tira"],
              ]}
              active={value.layout}
              onSelect={(next) => set("layout", next as CardLayout)}
            />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Secciones y orden
              </p>
              <ul className="mt-2 space-y-2">
                {value.order.map((key, index) => (
                  <li key={key} className="rounded-xl border border-border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <Toggle
                        label={SECTION_LABELS[key]}
                        checked={value.sections[key]}
                        onChange={(checked) =>
                          set("sections", { ...value.sections, [key]: checked })
                        }
                      />
                      <span className="flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Subir ${SECTION_LABELS[key]}`}
                          disabled={index === 0}
                          onClick={() => move(key, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Bajar ${SECTION_LABELS[key]}`}
                          disabled={index === value.order.length - 1}
                          onClick={() => move(key, 1)}
                        >
                          ↓
                        </Button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-12 rounded-pill shadow-floating"
        >
          <SlidersHorizontal className="mr-2 size-4" aria-hidden />
          Afinar página principal
        </Button>
      )}
    </aside>
  );
}

function OptionGroup({
  title,
  options,
  active,
  onSelect,
}: {
  title: string;
  options: readonly (readonly [string, string])[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={active === key ? "default" : "outline"}
            aria-pressed={active === key}
            onClick={() => onSelect(key)}
            className="min-h-11 rounded-xl whitespace-normal"
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="min-h-11 flex-1 justify-start rounded-lg px-2"
    >
      <span
        className={cn(
          "mr-2 grid size-5 place-items-center rounded border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background",
        )}
      >
        {checked ? <Check className="size-3" aria-hidden /> : null}
      </span>
      {label}
    </Button>
  );
}
