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
import {
  HomePremiumRibbon,
  HomePremiumSurface,
} from "@/components/home-premium/HomePremiumSurface";
import {
  HOME_PREMIUM_G4_CONTENT,
  type HomePremiumContent,
} from "@/components/home-premium/home-premium-content";
import { cn } from "@/lib/utils";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PremiumPresentationControl } from "@/components/premium";
import { Hero } from "@/components/home/Hero";
import { RutasSection } from "@/components/home/RutasSection";
import { AluxPlannerBlock } from "@/components/experience-builder/blocks/alux-planner/AluxPlannerBlock";
import { DiscoveryNavigatorBlock } from "@/components/experience-builder/blocks/DiscoveryNavigatorBlock";
import type { DiscoveryNavigatorDTO } from "@/lib/discovery/discovery-navigator.functions";

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

const OFFICIAL_MEDIA_ORIGIN = "https://valladolidmx.lovable.app";
const GOVERNED = `${OFFICIAL_MEDIA_ORIGIN}/api/public/studio-media/governed/v1p1c`;
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

const HOME_DESTINATION_MEDIA = {
  valladolid: {
    url: `${OFFICIAL_MEDIA_ORIGIN}/api/public/studio-media/conceptual-preview/2026-09-01/home-valladolid-editorial-preview.webp`,
    alt: "Templo de San Servacio y centro histórico de Valladolid al atardecer",
  },
  izamal: {
    url: `${OFFICIAL_MEDIA_ORIGIN}/api/public/studio-media/conceptual-preview/2026-09-01/home-izamal-editorial-preview.webp`,
    alt: "Arquerías y convento amarillo de Izamal",
  },
  espita: {
    url: `${OFFICIAL_MEDIA_ORIGIN}/api/public/studio-media/conceptual-preview/2026-09-01/home-espita-editorial-preview.webp`,
    alt: "Iglesia histórica y plaza arbolada de Espita",
  },
  temozon: {
    url: `${OFFICIAL_MEDIA_ORIGIN}/api/public/studio-media/conceptual-preview/2026-09-01/home-temozon-editorial-preview.webp`,
    alt: "Cocina tradicional y artesanía de Temozón",
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
  center: { lat: 20.84, lng: -88.58, zoom: 9 },
  points: [
    {
      id: "valladolid",
      kind: "destination",
      lat: 20.6892,
      lng: -88.2018,
      title: "Valladolid",
      subtitle: "Inicio sugerido · Capital Turística del Oriente Maya de Yucatán",
      href: "/oriente-maya/valladolid",
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
      subtitle: "Pueblo Mágico · arquitectura y vida comunitaria",
      href: "/oriente-maya/espita",
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
      subtitle: "Pueblo Mágico · patrimonio de la ciudad amarilla",
      href: "/oriente-maya/izamal",
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
    staticFallback: false,
    allowInteractiveToggle: false,
  },
  emptyMessage: null,
};

export const HOME_PREMIUM_PREVIEW_CONTENT: HomePremiumContent = {
  ...HOME_PREMIUM_G4_CONTENT,
  hero: {
    ...HOME_PREMIUM_G4_CONTENT.hero,
    slides: [
      { media: HOME_DESTINATION_MEDIA.valladolid, caption: "Centro histórico de Valladolid" },
      { media: MEDIA.cenote, caption: "Cenotes del Oriente Maya de Yucatán" },
    ],
  },
  destinos: {
    ...HOME_PREMIUM_G4_CONTENT.destinos,
    items: [
      { name: "Valladolid", note: "Capital turística · punto de partida", media: HOME_DESTINATION_MEDIA.valladolid, puebloMagico: true, href: "/oriente-maya/valladolid" },
      { name: "Izamal", note: "Ciudad amarilla · patrimonio vivo", media: HOME_DESTINATION_MEDIA.izamal, puebloMagico: true, href: "/oriente-maya/izamal" },
      { name: "Espita", note: "Arquitectura y ritmo de pueblo", media: HOME_DESTINATION_MEDIA.espita, puebloMagico: true, href: "/oriente-maya/espita" },
      { name: "Temozón", note: "Gastronomía, artesanía y comunidad", media: HOME_DESTINATION_MEDIA.temozon, puebloMagico: false, href: "/oriente-maya/temozon" },
    ],
  },
  rutas: {
    ...HOME_PREMIUM_G4_CONTENT.rutas,
    items: ROUTES.map((route) => ({ ...route, sequence: [...route.sequence] })),
  },
  experiencias: {
    ...HOME_PREMIUM_G4_CONTENT.experiencias,
    items: EXPERIENCES.map((item, index) => ({
      ...item,
      href: index === 0 ? "/experiencias" : "/que-hacer",
    })),
  },
  servicios: {
    ...HOME_PREMIUM_G4_CONTENT.servicios,
    stays: STAYS.map((item) => ({ ...item, href: "/hoteles" })),
    food: FOOD.map((item) => ({ ...item, href: "/restaurantes" })),
  },
  eventos: {
    ...HOME_PREMIUM_G4_CONTENT.eventos,
    media: MEDIA.plaza,
    items: EVENTS.map((item) => ({ ...item, href: "/eventos" })),
  },
  queHacer: {
    ...HOME_PREMIUM_G4_CONTENT.queHacer,
    items: EDITORIAL.map((item) => ({ ...item, href: "/que-hacer" })),
  },
  mapa: { ...HOME_PREMIUM_G4_CONTENT.mapa, dto: MAP_DTO },
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
  "rutas",
  "pueblosMagicos",
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

  return (
    <div
      className="min-h-screen overflow-x-clip bg-background"
      data-premium-direction={tuning.direction}
    >
      <HomePremiumRibbon />
      {/* G8-D · autoridad visual única: la preview consume la misma superficie
          que el renderer del Experience Builder. */}
      <HomePremiumSurface
        content={HOME_PREMIUM_PREVIEW_CONTENT}
        heroVariant={tuning.heroVariant}
        layout={tuning.layout}
        sections={tuning.sections}
        order={tuning.order}
      />
      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
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
              onChange={(next) =>
                onChange({ ...value, direction: next, heroVariant: next })
              }
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

/* ------------------------------------------------------------------ *
 * G7-A · Fixture integrado (PEND-G7-F01)
 *
 * Monta los COMPONENTES PRODUCTIVOS reales — sin imitaciones, sin
 * persistencia, sin funciones de escritura y sin duplicar componentes —
 * para acreditar juntos `vmx.hero` (editorial-split),
 * `vmx.discovery.navigator` (bordados aprobados con curaduría manual),
 * `vmx.alux.planner` y `vmx.section.rutas`.
 * Los datos son literales locales usados exclusivamente como props.
 * ------------------------------------------------------------------ */

const G7_NAVIGATOR_DATA: DiscoveryNavigatorDTO = {
  scope: { kind: "destination", slug: "valladolid", label: "Valladolid" },
  categories: [
    { slug: "hoteles", label: "Hoteles", count: 39, href: "/hoteles?destino=valladolid" },
    { slug: "cenotes", label: "Cenotes", count: 14, href: "/cenotes?destino=valladolid" },
    {
      slug: "restaurantes",
      label: "Restaurantes",
      count: 30,
      href: "/restaurantes?destino=valladolid",
    },
    {
      slug: "experiencias",
      label: "Experiencias",
      count: 10,
      href: "/experiencias?destino=valladolid",
    },
    {
      slug: "zonas-arqueologicas",
      label: "Zonas arqueológicas",
      count: 4,
      href: "/zonas-arqueologicas?destino=valladolid",
    },
    {
      slug: "gastronomia",
      label: "Gastronomía",
      count: 18,
      href: "/gastronomia?destino=valladolid",
    },
    { slug: "cultura", label: "Cultura", count: 9, href: "/cultura?destino=valladolid" },
    { slug: "artesanias", label: "Artesanías", count: 12, href: "/artesanias?destino=valladolid" },
    { slug: "eventos", label: "Eventos", count: 6, href: "/eventos?destino=valladolid" },
    {
      slug: "vida-nocturna",
      label: "Vida nocturna",
      count: 5,
      href: "/vida-nocturna?destino=valladolid",
    },
  ],
  extensions: [],
};

/** Orden manual gobernado (incluye un slug inexistente: fail-closed). */
const G7_NAVIGATOR_ORDER = [
  { slug: "cenotes" },
  { slug: "hoteles" },
  { slug: "gastronomia" },
  { slug: "zonas-arqueologicas" },
  { slug: "experiencias" },
  { slug: "artesanias" },
  { slug: "cultura" },
  { slug: "restaurantes" },
  { slug: "categoria-inexistente" },
];

function G7IntegratedFixture() {
  return (
    <section data-g7-fixture="integrated" className="overflow-x-clip border-b border-border">
      <div className="border-y border-border bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
        G7-A · Fixture integrado de capacidades premium — componentes productivos, sin persistencia.
      </div>

      <Hero
        config={{
          variant: "editorial-split",
          media_side: "right",
          mobile_order: "media-first",
          text_safe_zone: "lg",
          eyebrow: "Despierta en Valladolid",
          title: "El Oriente Maya de Yucatán, contado como una historia editorial.",
          subtitle:
            "Cenotes, haciendas y cocina de humo a media hora del centro histórico de Valladolid.",
          background_images: [MEDIA.centro.url, MEDIA.calle.url],
          cta_label: "Arma tu viaje",
          cta_href: "/arma-tu-viaje",
          cta_secondary_label: "Explorar Valladolid",
          cta_secondary_href: "/oriente-maya/valladolid",
          show_search: false,
        }}
      />

      <Container className="py-10">
        <DiscoveryNavigatorBlock
          config={{
            title: "Explora Valladolid",
            variant: "grid",
            scope: "destination",
            manualDestinationSlug: "valladolid",
            categorySlugs: G7_NAVIGATOR_ORDER,
            hiddenSlugs: [{ slug: "restaurantes" }],
            maxItems: 8,
            ctaLabel: "Ver todo lo que ofrece Valladolid",
            ctaHref: "/oriente-maya/valladolid",
          }}
          previewData={G7_NAVIGATOR_DATA}
        />
      </Container>

      <AluxPlannerBlock
        config={{
          variant: "editorial",
          eyebrow: "Alux · copiloto de viaje",
          heading: "Cuéntame tu viaje y lo armamos juntos.",
          subheading:
            "Vista previa visual: la conversación real ocurre en Arma tu viaje, sin guardar nada aquí.",
          cta_label: "Arma tu viaje",
          cta_href: "/arma-tu-viaje",
          show_prompts: true,
          prompts: [
            { label: "Tengo medio día" },
            { label: "Viajo con niños" },
            { label: "Quiero cenotes tranquilos" },
            { label: "Cocina yucateca auténtica" },
          ],
        }}
      />

      <RutasSection
        config={{
          heading: "Rutas sugeridas",
          subheading: "Curaduría manual gobernada desde el constructor.",
          source: "manual",
          route_slugs: [
            { slug: "valladolid-ek-balam" },
            { slug: "pueblos-coloniales" },
            { slug: "costa-rosada" },
            { slug: "ruta-inexistente" },
          ],
          max_items: 3,
          columns: "3",
          show_stops: true,
        }}
      />
    </section>
  );
}
