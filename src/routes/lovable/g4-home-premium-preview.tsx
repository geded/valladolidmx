/**
 * G4-F · Visual North Star de la página principal de Valladolid.mx.
 *
 * Vista INTERNA, no indexable y sin persistencia. No sustituye ni edita
 * la Home pública (`src/routes/index.tsx`).
 *
 * Reglas aplicadas:
 *  - Sólo medios gobernados existentes vía el proxy público estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas.
 *  - DIRECCIÓN VISUAL (Editorial | Cinematográfica) y DISPOSICIÓN de
 *    destinos/tarjetas (Asimétrica | Cuadrícula | Carrusel) son ejes
 *    independientes.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - "Experiencias" es la única categoría; no se duplica como "Tours".
 *  - Travel Plan / Alux se referencian como entidades canónicas; no se
 *    crea ningún modelo de viaje paralelo.
 *  - Sin precios, reseñas, premios, disponibilidad ni distintivos no
 *    acreditados: estados vacíos honestos.
 *  - El panel "Afinar página principal" es local (useState), sólo
 *    visible en rol Administración y no persiste.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Compass,
  Landmark,
  Map as MapIcon,
  MapPin,
  Sparkles,
  SlidersHorizontal,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lovable/g4-home-premium-preview")({
  head: () => ({
    meta: [
      { title: "G4-F · Vista previa Home Premium (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la página principal premium de Valladolid.mx. No indexable, sin persistencia.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4HomePremiumPreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, bancas, palmeras y arcadas coloniales en tonos ocre y crema",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial de Valladolid con fachadas pastel en terracota y ocre, puertas de madera y buganvilia",
  },
  centro: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Centro histórico de Valladolid, Yucatán, con arquitectura colonial en piedra caliza y luz cálida de tarde",
  },
  cocina: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y mesas iluminadas con velas en Valladolid, Yucatán",
  },
  patio: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio central con piscina estilo cenote y arcos de piedra en un hotel boutique colonial de Valladolid, Yucatán",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza cerca de Valladolid, Yucatán",
  },
} as const;

type Media = (typeof MEDIA)[keyof typeof MEDIA];

const HERO_SLIDES = [
  {
    media: MEDIA.centro,
    caption: "Centro histórico al atardecer",
  },
  {
    media: MEDIA.cenote,
    caption: "Cenotes del Oriente Maya",
  },
] as const;

/* ------------------------------------------------------------------ *
 * Datos DEMO VISUAL (ninguno consulta backend).
 * ------------------------------------------------------------------ */
const DESTINOS = [
  {
    slug: "valladolid",
    name: "Valladolid",
    role: "Capital Turística del Oriente Maya",
    tagline:
      "Ciudad colonial de piedra caliza, cenotes urbanos y cocina yucateca de fuego lento.",
    media: MEDIA.centro,
    puebloMagico: true,
    demo: false,
  },
  {
    slug: "izamal",
    name: "Izamal",
    role: "La ciudad amarilla",
    tagline: "Conventos, basamentos mayas y calles ocre bajo el sol del oriente.",
    media: MEDIA.calle,
    puebloMagico: true,
    demo: true,
  },
  {
    slug: "espita",
    name: "Espita",
    role: "Pueblo de la Sultana del Oriente",
    tagline: "Vida tranquila, arquitectura tradicional y camino a la selva baja.",
    media: MEDIA.plaza,
    puebloMagico: true,
    demo: true,
  },
  {
    slug: "temozon",
    name: "Temozón",
    role: "Territorio de artesanía y sabor",
    tagline: "Talleres, mercados y ruta hacia las haciendas del oriente (demo visual).",
    media: MEDIA.cocina,
    puebloMagico: false,
    demo: true,
  },
  {
    slug: "tinum",
    name: "Tinum",
    role: "Puerta a la zona arqueológica",
    tagline: "Comunidades mayas y cenotes en el corredor hacia Chichén Itzá (demo visual).",
    media: MEDIA.cenote,
    puebloMagico: false,
    demo: true,
  },
  {
    slug: "uayma",
    name: "Uayma",
    role: "Templo barroco del oriente",
    tagline: "Fachada policromada y ritmo de pueblo a minutos de Valladolid (demo visual).",
    media: MEDIA.patio,
    puebloMagico: false,
    demo: true,
  },
] as const;

type SectionCard = {
  id: string;
  title: string;
  tagline: string;
  meta: string;
  media: Media;
  tone: "editorial" | "cinematografico";
};

const EXPERIENCIAS: SectionCard[] = [
  {
    id: "exp-1",
    title: "Inframundo Maya",
    tagline: "Descenso guiado a un cenote de caverna con lectura del paisaje kárstico.",
    meta: "Experiencia · Valladolid (demo visual)",
    media: MEDIA.cenote,
    tone: "cinematografico",
  },
  {
    id: "exp-2",
    title: "Caminata por la Calzada de los Frailes",
    tagline: "Recorrido documental por fachadas restauradas y oficios del centro.",
    meta: "Experiencia · Valladolid (demo visual)",
    media: MEDIA.calle,
    tone: "editorial",
  },
  {
    id: "exp-3",
    title: "Amanecer en la plaza",
    tagline: "Ruta temprana entre arcadas, mercado y cocina de humo.",
    meta: "Experiencia · Valladolid (demo visual)",
    media: MEDIA.plaza,
    tone: "editorial",
  },
];

const HOSPEDAJE: SectionCard[] = [
  {
    id: "hos-1",
    title: "Hacienda San Servacio",
    tagline: "Casona colonial con patio de arcos y piscina estilo cenote.",
    meta: "Hospedaje · Centro histórico (demo visual)",
    media: MEDIA.patio,
    tone: "cinematografico",
  },
  {
    id: "hos-2",
    title: "Casa de piedra en el centro",
    tagline: "Habitaciones frescas de muros gruesos a dos cuadras de la plaza.",
    meta: "Hospedaje · Valladolid (demo visual)",
    media: MEDIA.centro,
    tone: "editorial",
  },
];

const GASTRONOMIA: SectionCard[] = [
  {
    id: "gas-1",
    title: "Cocina de Zací",
    tagline: "Recetario yucateco de fuego lento en una terraza de arcos.",
    meta: "Gastronomía · Valladolid (demo visual)",
    media: MEDIA.cocina,
    tone: "editorial",
  },
  {
    id: "gas-2",
    title: "Mercado y cocinas de barrio",
    tagline: "Desayunos tradicionales, recado negro y sopa de lima.",
    meta: "Gastronomía · Valladolid (demo visual)",
    media: MEDIA.plaza,
    tone: "cinematografico",
  },
];

const EVENTOS: SectionCard[] = [
  {
    id: "eve-1",
    title: "Noche de Valladolid",
    tagline: "Velada de trova y memoria del centro histórico. Fecha por confirmar.",
    meta: "Evento cultural · programado (demo visual)",
    media: MEDIA.plaza,
    tone: "cinematografico",
  },
  {
    id: "eve-2",
    title: "Oficios de la Calzada",
    tagline: "Muestra de talleres frente a las fachadas restauradas.",
    meta: "Evento cultural · sin fecha acreditada (demo visual)",
    media: MEDIA.calle,
    tone: "editorial",
  },
];

const QUE_HACER = [
  {
    id: "qh-1",
    kicker: "Ensayo visual",
    title: "Leer una ciudad de piedra caliza",
    body: "Cómo mirar una fachada colonial, qué cuenta un dintel y por qué el centro de Valladolid conserva su trazado original.",
    media: MEDIA.centro,
  },
  {
    id: "qh-2",
    kicker: "Guía editorial",
    title: "Tres días en el Oriente Maya",
    body: "Un itinerario pausado entre cenotes, pueblos y cocina tradicional, pensado para viajar sin prisa.",
    media: MEDIA.calle,
  },
  {
    id: "qh-3",
    kicker: "Territorio",
    title: "El agua bajo el suelo",
    body: "Qué es un cenote, cómo se formó la red subterránea de Yucatán y qué significó para la vida maya.",
    media: MEDIA.cenote,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "multi",
  heading: "Visión territorial del Oriente Maya de Yucatán",
  center: { lat: 20.72, lng: -88.3, zoom: 10 },
  points: [
    {
      id: "valladolid",
      kind: "destination",
      lat: 20.6892,
      lng: -88.2018,
      title: "Valladolid",
      subtitle: "Capital Turística del Oriente Maya",
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
      subtitle: "Pueblo Mágico (demo visual)",
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
      subtitle: "Pueblo Mágico (demo visual)",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "temozon",
      kind: "destination",
      lat: 20.8047,
      lng: -88.2003,
      title: "Temozón",
      subtitle: "Destino del oriente (demo visual)",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
  ],
  capabilities: {
    showDistance: true,
    showDirections: false,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

/* ------------------------------------------------------------------ */

type VisualDirection = "editorial" | "cinematografica";
type CardLayout = "asimetrica" | "cuadricula" | "carrusel";
type RoleView = "visitante" | "administracion";

interface TuningState {
  role: RoleView;
  direction: VisualDirection;
  heroVariant: VisualDirection;
  layout: CardLayout;
  showDestinos: boolean;
  showValladolid: boolean;
  showExperiencias: boolean;
  showHospedaje: boolean;
  showGastronomia: boolean;
  showEventos: boolean;
  showQueHacer: boolean;
  showAlux: boolean;
  showMapa: boolean;
  /** Orden visual simulado de las secciones premium. */
  order: SectionKey[];
}

type SectionKey =
  | "experiencias"
  | "hospedaje"
  | "gastronomia"
  | "eventos"
  | "queHacer";

const SECTION_LABEL: Record<SectionKey, string> = {
  experiencias: "Experiencias",
  hospedaje: "Hospedaje",
  gastronomia: "Gastronomía",
  eventos: "Eventos",
  queHacer: "Qué hacer",
};

const DEFAULT_ORDER: SectionKey[] = [
  "experiencias",
  "hospedaje",
  "gastronomia",
  "eventos",
  "queHacer",
];

function G4HomePremiumPreview() {
  const [tuning, setTuning] = useState<TuningState>({
    role: "visitante",
    direction: "editorial",
    heroVariant: "cinematografica",
    layout: "asimetrica",
    showDestinos: true,
    showValladolid: true,
    showExperiencias: true,
    showHospedaje: true,
    showGastronomia: true,
    showEventos: true,
    showQueHacer: true,
    showAlux: true,
    showMapa: true,
    order: DEFAULT_ORDER,
  });

  const sectionEnabled: Record<SectionKey, boolean> = {
    experiencias: tuning.showExperiencias,
    hospedaje: tuning.showHospedaje,
    gastronomia: tuning.showGastronomia,
    eventos: tuning.showEventos,
    queHacer: tuning.showQueHacer,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PreviewRibbon />
      <PreviewHeader />

      <Container className="pt-6">
        {tuning.heroVariant === "cinematografica" ? (
          <HeroCinematografico />
        ) : (
          <HeroEditorial />
        )}
      </Container>

      {tuning.showDestinos ? (
        <Container className="mt-16">
          <DestinosSection layout={tuning.layout} direction={tuning.direction} />
        </Container>
      ) : null}

      {tuning.showValladolid ? (
        <Container className="mt-16">
          <ValladolidEditorial />
        </Container>
      ) : null}

      {tuning.order.map((key) =>
        sectionEnabled[key] ? (
          <Container key={key} className="mt-16">
            <PremiumSection sectionKey={key} layout={tuning.layout} />
          </Container>
        ) : null,
      )}

      {tuning.showAlux ? (
        <Container className="mt-16">
          <AluxBand />
        </Container>
      ) : null}

      {tuning.showMapa ? (
        <Container className="mt-16">
          <section id="mapa-territorial">
            <ExperienceMapBlock dto={MAP_DTO} />
          </section>
        </Container>
      ) : null}

      <Container className="mt-16">
        <EstadosVacios />
      </Container>

      <Container className="mt-16">
        <PreviewFooter />
      </Container>

      {tuning.role === "administracion" ? null : null}
      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

function PreviewRibbon() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Vista previa interna G4-F · Página principal premium — no indexable, sin persistencia. El
      contenido marcado DEMO VISUAL no representa datos publicados.
    </div>
  );
}

function PreviewHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold tracking-tight">Valladolid.mx</span>
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            Oriente Maya
          </span>
        </Link>
        <nav aria-label="Navegación de la vista previa" className="hidden gap-1 md:flex">
          {(
            [
              ["/oriente-maya", "Oriente Maya"],
              ["/experiencias", "Experiencias"],
              ["/hoteles", "Hospedaje"],
              ["/restaurantes", "Gastronomía"],
              ["/eventos", "Eventos"],
              ["/que-hacer", "Qué hacer"],
            ] as const
          ).map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className="rounded-pill px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Button asChild size="sm" className="rounded-pill">
          <Link to="/arma-tu-viaje">Arma tu viaje</Link>
        </Button>
      </Container>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

function HeroTexts({ inverted }: { inverted?: boolean }) {
  return (
    <div className={cn("max-w-2xl", inverted && "text-primary-foreground")}>
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.2em]",
          inverted ? "text-primary-foreground/80" : "text-primary",
        )}
      >
        Destination Operating System
      </p>
      <h1 className="mt-3 text-balance font-serif text-4xl leading-[1.05] md:text-5xl lg:text-6xl">
        Valladolid, Capital Turística del Oriente Maya de Yucatán
      </h1>
      <p
        className={cn(
          "mt-5 max-w-xl text-base leading-relaxed md:text-lg",
          inverted ? "text-primary-foreground/85" : "text-muted-foreground",
        )}
      >
        Descubre el territorio con criterio: destinos, experiencias, hospedaje y cocina verificados
        por la plataforma, y una planeación que se arma contigo, no con anuncios.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild size="lg" className="rounded-pill">
          <Link to="/oriente-maya">
            Explorar Oriente Maya
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant={inverted ? "secondary" : "outline"}
          className="rounded-pill"
        >
          <Link to="/arma-tu-viaje">Arma tu viaje</Link>
        </Button>
      </div>
    </div>
  );
}

function HeroSlideSwitcher({
  index,
  onChange,
  inverted,
}: {
  index: number;
  onChange: (i: number) => void;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {HERO_SLIDES.map((slide, i) => (
        <button
          key={slide.caption}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`Mostrar imagen: ${slide.caption}`}
          aria-pressed={i === index}
          className={cn(
            "h-1.5 rounded-pill transition-all",
            i === index ? "w-8" : "w-4 opacity-50",
            inverted ? "bg-primary-foreground" : "bg-foreground",
          )}
        />
      ))}
      <span
        className={cn(
          "ml-2 text-[11px]",
          inverted ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {HERO_SLIDES[index].caption}
      </span>
    </div>
  );
}

function HeroCinematografico() {
  const [index, setIndex] = useState(0);
  const slide = HERO_SLIDES[index];
  return (
    <section className="relative overflow-hidden rounded-3xl">
      <img
        src={slide.media.url}
        alt={slide.media.alt}
        loading="eager"
        className="h-[68vh] min-h-[420px] w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/45 to-foreground/10"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-12">
        <HeroTexts inverted />
        <div className="mt-8">
          <HeroSlideSwitcher index={index} onChange={setIndex} inverted />
        </div>
      </div>
    </section>
  );
}

function HeroEditorial() {
  const [index, setIndex] = useState(0);
  const slide = HERO_SLIDES[index];
  return (
    <section className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <div>
        <HeroTexts />
        <div className="mt-8">
          <HeroSlideSwitcher index={index} onChange={setIndex} />
        </div>
      </div>
      <figure className="overflow-hidden rounded-3xl border border-border">
        <img
          src={slide.media.url}
          alt={slide.media.alt}
          loading="eager"
          className="h-[52vh] min-h-[340px] w-full object-cover"
        />
        <figcaption className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          {slide.caption} · fotografía gobernada de la plataforma
        </figcaption>
      </figure>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Piezas comunes
 * ------------------------------------------------------------------ */

function SectionHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-balance font-serif text-2xl md:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          {action.label}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

function DemoTag() {
  return (
    <span className="inline-flex items-center rounded-pill border border-border bg-background/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      Demo visual
    </span>
  );
}

function PuebloMagicoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
      <Landmark className="size-3" aria-hidden />
      Pueblo Mágico
    </span>
  );
}

function layoutClasses(layout: CardLayout) {
  if (layout === "carrusel") {
    return "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2";
  }
  if (layout === "cuadricula") {
    return "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
  }
  return "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
}

function itemClasses(layout: CardLayout, index: number) {
  if (layout === "carrusel") return "w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[32%]";
  if (layout === "asimetrica" && index === 0) return "sm:col-span-2 lg:row-span-2";
  return "";
}

function MediaCard({
  media,
  title,
  meta,
  tagline,
  tone,
  tall,
  badges,
}: {
  media: Media;
  title: string;
  meta: string;
  tagline: string;
  tone: VisualDirection;
  tall?: boolean;
  badges?: React.ReactNode;
}) {
  if (tone === "cinematografica") {
    return (
      <article className="group relative overflow-hidden rounded-3xl border border-border">
        <img
          src={media.url}
          alt={media.alt}
          loading="lazy"
          className={cn("w-full object-cover", tall ? "h-[26rem]" : "h-64")}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5 text-primary-foreground">
          {badges ? <div className="mb-2 flex flex-wrap gap-2">{badges}</div> : null}
          <h3 className="font-serif text-xl">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary-foreground/75">
            {meta}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-primary-foreground/90">{tagline}</p>
        </div>
      </article>
    );
  }
  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card">
      <img
        src={media.url}
        alt={media.alt}
        loading="lazy"
        className={cn("w-full object-cover", tall ? "h-72" : "h-52")}
      />
      <div className="p-5">
        {badges ? <div className="mb-2 flex flex-wrap gap-2">{badges}</div> : null}
        <h3 className="font-serif text-xl">{title}</h3>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{meta}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tagline}</p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Entrada territorial
 * ------------------------------------------------------------------ */

function DestinosSection({
  layout,
  direction,
}: {
  layout: CardLayout;
  direction: VisualDirection;
}) {
  return (
    <section aria-labelledby="destinos-title">
      <SectionHead
        eyebrow="Territorio"
        title="Descubre el Oriente Maya de Yucatán"
        description="Un corredor de pueblos, cenotes y ciudades coloniales con Valladolid como capital turística. Cada destino abre su propio micrositio."
        action={{ to: "/oriente-maya", label: "Ver todos los destinos" }}
      />
      <div className={layoutClasses(layout)}>
        {DESTINOS.map((d, i) => (
          <div key={d.slug} className={itemClasses(layout, i)}>
            <MediaCard
              media={d.media}
              title={d.name}
              meta={d.role}
              tagline={d.tagline}
              tone={i === 0 && layout === "asimetrica" ? "cinematografica" : direction}
              tall={i === 0 && layout === "asimetrica"}
              badges={
                <>
                  {d.puebloMagico ? <PuebloMagicoBadge /> : null}
                  {d.demo ? <DemoTag /> : null}
                </>
              }
            />
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        Valladolid, Izamal y Espita son Pueblos Mágicos. Aquí se muestra únicamente un distintivo
        textual sobrio: el logotipo oficial del programa requiere un asset acreditado con derechos
        verificados y no se recrea ni se aproxima gráficamente. Los demás destinos aparecen como
        demo visual y no afirman acreditación alguna.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Bloque editorial de Valladolid
 * ------------------------------------------------------------------ */

function ValladolidEditorial() {
  return (
    <section
      aria-labelledby="valladolid-title"
      className="grid gap-8 rounded-3xl border border-border bg-card p-6 md:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center"
    >
      <figure className="overflow-hidden rounded-3xl">
        <img
          src={MEDIA.calle.url}
          alt={MEDIA.calle.alt}
          loading="lazy"
          className="h-80 w-full object-cover"
        />
      </figure>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Capital turística
        </p>
        <h2 id="valladolid-title" className="mt-2 text-balance font-serif text-3xl">
          Valladolid, punto de partida del oriente
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Fundada sobre la antigua Zací, Valladolid conserva un trazado colonial legible a pie:
          arcadas, conventos y casas de muros gruesos que enfrían el mediodía. Desde aquí se
          alcanzan los cenotes del corredor, los pueblos del oriente y las cocinas donde el recado
          se sigue moliendo en casa.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          El micrositio de la ciudad reúne su relato, sus empresas verificadas y su mapa
          territorial, y conecta con el resto del Oriente Maya sin perder el contexto.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-pill">
            <Link to="/oriente-maya/$destino" params={{ destino: "valladolid" }}>
              Abrir micrositio de Valladolid
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-pill">
            <Link to="/oriente-maya">Continuar por el territorio</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Secciones premium
 * ------------------------------------------------------------------ */

const SECTION_META: Record<
  SectionKey,
  { eyebrow: string; title: string; description: string; icon: typeof Compass }
> = {
  experiencias: {
    eyebrow: "Experiencias",
    title: "Vive el territorio con quien lo conoce",
    description:
      "Cenotes, caminatas documentales y recorridos de oficio. Una sola categoría: Experiencias.",
    icon: Compass,
  },
  hospedaje: {
    eyebrow: "Hospedaje",
    title: "Dormir dentro de la ciudad colonial",
    description: "Casonas, patios y habitaciones de muros gruesos en el centro histórico.",
    icon: MapPin,
  },
  gastronomia: {
    eyebrow: "Gastronomía",
    title: "Cocina yucateca de fuego lento",
    description: "Recetarios de casa, mercados y terrazas de arcos.",
    icon: UtensilsCrossed,
  },
  eventos: {
    eyebrow: "Eventos",
    title: "Agenda cultural del oriente",
    description: "Programas culturales del destino. Sin boletos ni disponibilidad simulada.",
    icon: CalendarDays,
  },
  queHacer: {
    eyebrow: "Qué hacer",
    title: "Inspiración editorial para leer el destino",
    description:
      "Ensayos y guías del equipo editorial. No duplica Experiencias: aquí se contextualiza, allá se reserva.",
    icon: Sparkles,
  },
};

function PremiumSection({ sectionKey, layout }: { sectionKey: SectionKey; layout: CardLayout }) {
  const meta = SECTION_META[sectionKey];

  if (sectionKey === "queHacer") {
    return (
      <section aria-label={meta.eyebrow}>
        <SectionHead
          eyebrow={meta.eyebrow}
          title={meta.title}
          description={meta.description}
          action={{ to: "/que-hacer", label: "Ver inspiración" }}
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {QUE_HACER.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-border bg-card"
            >
              <img
                src={item.media.url}
                alt={item.media.alt}
                loading="lazy"
                className="h-44 w-full object-cover"
              />
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  {item.kicker}
                </p>
                <h3 className="mt-2 font-serif text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <p className="mt-3 text-[11px] text-muted-foreground">Contenido demo visual.</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const items =
    sectionKey === "experiencias"
      ? EXPERIENCIAS
      : sectionKey === "hospedaje"
        ? HOSPEDAJE
        : sectionKey === "gastronomia"
          ? GASTRONOMIA
          : EVENTOS;

  const action =
    sectionKey === "experiencias"
      ? { to: "/experiencias", label: "Ver experiencias" }
      : sectionKey === "hospedaje"
        ? { to: "/hoteles", label: "Ver hospedaje" }
        : sectionKey === "gastronomia"
          ? { to: "/restaurantes", label: "Ver gastronomía" }
          : { to: "/eventos", label: "Ver agenda" };

  return (
    <section aria-label={meta.eyebrow}>
      <SectionHead
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        action={action}
      />
      <div className={layoutClasses(layout)}>
        {items.map((item, i) => (
          <div key={item.id} className={itemClasses(layout, i)}>
            <MediaCard
              media={item.media}
              title={item.title}
              meta={item.meta}
              tagline={item.tagline}
              tone={item.tone === "cinematografico" ? "cinematografica" : "editorial"}
              tall={layout === "asimetrica" && i === 0}
              badges={<DemoTag />}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Sin precios, calificaciones ni disponibilidad: esta preview no consulta datos publicados.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Alux + Travel Plan
 * ------------------------------------------------------------------ */

function AluxBand() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-muted/40">
      <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            Planea con Alux
          </p>
          <h2 className="mt-2 text-balance font-serif text-3xl">
            Tu copiloto de viaje del Oriente Maya
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Alux acompaña primero y pregunta después: sugiere qué ver según dónde estás y cuánto
            tiempo tienes, y guarda todo en tu Travel Plan, la única entidad de viaje de la
            plataforma. No se crea ningún itinerario paralelo.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-foreground/85">
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Recomendaciones con contexto territorial y explicación del porqué.
            </li>
            <li className="flex items-start gap-2">
              <MapIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Todo lo que guardas se ordena en tu Travel Plan por día y por destino.
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="rounded-pill">
              <Link to="/arma-tu-viaje">Arma tu viaje</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-pill">
              <Link to="/alux">Hablar con Alux</Link>
            </Button>
          </div>
        </div>
        <figure className="overflow-hidden rounded-3xl">
          <img
            src={MEDIA.cenote.url}
            alt={MEDIA.cenote.alt}
            loading="lazy"
            className="h-72 w-full object-cover"
          />
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Estados vacíos honestos
 * ------------------------------------------------------------------ */

const EMPTY_STATES = [
  {
    title: "Precios",
    body: "No se muestran tarifas: ninguna ficha de esta preview tiene precio publicado y verificado.",
  },
  {
    title: "Reseñas",
    body: "Sin reseñas: la plataforma sólo publica opiniones con origen verificable.",
  },
  {
    title: "Disponibilidad",
    body: "Sin calendario ni cupo: la disponibilidad requiere conexión con el proveedor.",
  },
  {
    title: "Premios y distintivos",
    body: "Sólo se declara el distintivo textual de Pueblo Mágico donde corresponde. Cualquier otro reconocimiento requiere acreditación documental.",
  },
] as const;

function EstadosVacios() {
  return (
    <section aria-label="Estados vacíos">
      <SectionHead
        eyebrow="Transparencia"
        title="Lo que aún no podemos afirmar"
        description="La Home premium no inventa señales de confianza. Cada bloque sin acreditación se muestra vacío y explicado."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EMPTY_STATES.map((e) => (
          <div
            key={e.title}
            className="rounded-2xl border border-dashed border-border bg-muted/30 p-4"
          >
            <p className="text-sm font-medium">{e.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{e.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Footer
 * ------------------------------------------------------------------ */

function PreviewFooter() {
  return (
    <footer className="rounded-3xl border border-border bg-card p-6 md:p-10">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <p className="font-serif text-lg">Valladolid.mx</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Sistema operativo turístico del Oriente Maya de Yucatán. Vista previa interna: ningún
            enlace de esta página publica ni modifica contenido.
          </p>
        </div>
        <FooterColumn
          title="Territorio"
          links={[
            ["/oriente-maya", "Oriente Maya"],
            ["/mapa", "Mapa territorial"],
          ]}
        />
        <FooterColumn
          title="Descubrir"
          links={[
            ["/experiencias", "Experiencias"],
            ["/hoteles", "Hospedaje"],
            ["/restaurantes", "Gastronomía"],
            ["/eventos", "Eventos"],
          ]}
        />
        <FooterColumn
          title="Planear"
          links={[
            ["/arma-tu-viaje", "Arma tu viaje"],
            ["/alux", "Alux"],
            ["/empresas", "Empresas del destino"],
          ]}
        />
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-foreground/80 hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Panel local "Afinar página principal" (sin persistencia).
 * ------------------------------------------------------------------ */

function TuningPanel({
  value,
  onChange,
}: {
  value: TuningState;
  onChange: (v: TuningState) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof TuningState>(k: K, v: TuningState[K]) =>
    onChange({ ...value, [k]: v });

  const move = (key: SectionKey, delta: number) => {
    const order = [...value.order];
    const i = order.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set("order", order);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))]">
      {open ? (
        <div className="max-h-[80vh] overflow-y-auto rounded-3xl border border-border bg-card/95 p-4 shadow-floating backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Afinar página principal · vista interna</p>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Simulación local: no persiste, no escribe en el CMS ni en la base de datos y no altera
            la Home pública.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vista simulada
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["visitante", "Visitante"],
                    ["administracion", "Administración"],
                  ] as const
                ).map(([key, label]) => (
                  <OptionButton
                    key={key}
                    label={label}
                    active={value.role === key}
                    onClick={() => set("role", key)}
                  />
                ))}
              </div>
            </div>

            {value.role === "visitante" ? (
              <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                El visitante sólo ve la variante publicada. Cambia a Administración para simular
                dirección visual, disposición, secciones y orden.
              </p>
            ) : (
              <>
                <OptionGroup
                  title="Dirección visual global"
                  options={[
                    ["editorial", "Editorial documental"],
                    ["cinematografica", "Cinematográfica"],
                  ]}
                  active={value.direction}
                  onSelect={(v) => set("direction", v as VisualDirection)}
                />

                <OptionGroup
                  title="Variante del hero"
                  options={[
                    ["editorial", "Editorial"],
                    ["cinematografica", "Cinematográfica"],
                  ]}
                  active={value.heroVariant}
                  onSelect={(v) => set("heroVariant", v as VisualDirection)}
                />

                <OptionGroup
                  title="Disposición de destinos y tarjetas"
                  options={[
                    ["asimetrica", "Asimétrica editorial"],
                    ["cuadricula", "Cuadrícula"],
                    ["carrusel", "Carrusel / tira"],
                  ]}
                  active={value.layout}
                  onSelect={(v) => set("layout", v as CardLayout)}
                />

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Orden visual simulado
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {value.order.map((key, i) => (
                      <li
                        key={key}
                        className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-2 text-xs"
                      >
                        <span>{SECTION_LABEL[key]}</span>
                        <span className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Subir ${SECTION_LABEL[key]}`}
                            disabled={i === 0}
                            onClick={() => move(key, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Bajar ${SECTION_LABEL[key]}`}
                            disabled={i === value.order.length - 1}
                            onClick={() => move(key, 1)}
                          >
                            ↓
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Secciones de la preview
                  </p>
                  <Toggle
                    label="Entrada territorial"
                    checked={value.showDestinos}
                    onChange={(v) => set("showDestinos", v)}
                  />
                  <Toggle
                    label="Bloque editorial Valladolid"
                    checked={value.showValladolid}
                    onChange={(v) => set("showValladolid", v)}
                  />
                  <Toggle
                    label="Experiencias"
                    checked={value.showExperiencias}
                    onChange={(v) => set("showExperiencias", v)}
                  />
                  <Toggle
                    label="Hospedaje"
                    checked={value.showHospedaje}
                    onChange={(v) => set("showHospedaje", v)}
                  />
                  <Toggle
                    label="Gastronomía"
                    checked={value.showGastronomia}
                    onChange={(v) => set("showGastronomia", v)}
                  />
                  <Toggle
                    label="Eventos"
                    checked={value.showEventos}
                    onChange={(v) => set("showEventos", v)}
                  />
                  <Toggle
                    label="Qué hacer"
                    checked={value.showQueHacer}
                    onChange={(v) => set("showQueHacer", v)}
                  />
                  <Toggle
                    label="Planea con Alux"
                    checked={value.showAlux}
                    onChange={(v) => set("showAlux", v)}
                  />
                  <Toggle
                    label="Mapa territorial"
                    checked={value.showMapa}
                    onChange={(v) => set("showMapa", v)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <Button className="rounded-pill shadow-floating" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="mr-2 size-4" aria-hidden />
          Afinar página principal
        </Button>
      )}
    </div>
  );
}

function OptionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border px-3 py-2 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {label}
    </button>
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map(([key, label]) => (
          <OptionButton
            key={key}
            label={label}
            active={active === key}
            onClick={() => onSelect(key)}
          />
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
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-3 py-2 text-xs hover:bg-accent"
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 w-9 items-center rounded-pill p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-pill bg-background transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
