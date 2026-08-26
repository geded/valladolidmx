/**
 * G4-D · Vista previa visual de la Plantilla Premium de Experiencia.
 *
 * Vista INTERNA, no indexable y sin persistencia. Caso visual
 * DEMO VISUAL: "Inframundo Maya" (Experiencia guiada · subtipo tour).
 *
 * Reglas aplicadas:
 *  - "Experiencia" es la familia pública canónica; "Tour" es sólo un
 *    subtipo editorial. No se crea navegación ni superficie paralela.
 *  - Sólo medios gobernados existentes vía el proxy público estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - DIRECCIÓN VISUAL (Editorial | Cinematográfico) y GALERÍA
 *    (Mosaico | Carrusel | Cuadrícula | Tira) son ejes independientes.
 *  - Sin rating, premios, reseñas, precio, disponibilidad, distintivos
 *    ni urgencia. Estados vacíos elegantes donde no hay acreditación.
 *  - El panel "Afinar plantilla" es local (useState) y no persiste.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Accessibility,
  ArrowRight,
  Check,
  Clock,
  Footprints,
  Languages,
  Lock,
  Map as MapIcon,
  MapPin,
  Minus,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PremiumPresentationControl, PremiumTerritorialBreadcrumb } from "@/components/premium";

export const Route = createFileRoute("/lovable/g4-experience-premium-preview")({
  head: () => ({
    meta: [
      { title: "G4-D · Vista previa plantilla Premium de Experiencia (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la plantilla premium de experiencia de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4ExperiencePremiumPreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  cover: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes y plataforma de madera cerca de Valladolid, Yucatán",
  },
  cavernas: {
    url: `${GOVERNED}/experience-gallery-1.jpg`,
    alt: "Interior de caverna de piedra caliza con estalactitas y haz de luz natural sobre el agua en la península de Yucatán",
  },
  selva: {
    url: `${GOVERNED}/experience-gallery-2.jpg`,
    alt: "Sendero de selva baja yucateca con vegetación densa y suelo de piedra caliza en el Oriente Maya de Yucatán",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial colorida de Valladolid con fachadas pastel en terracota, ocre y amarillo, puertas de madera y buganvilia",
  },
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, bancas, palmeras y arcadas coloniales de herradura en tonos ocre y crema",
  },
  restaurante: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y cenas iluminadas con velas frente a un cenote en Valladolid, Yucatán",
  },
  hotel: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio central con piscina estilo cenote y arcos de piedra en un hotel boutique colonial de Valladolid, Yucatán",
  },
} as const;

const EXPERIENCE = {
  name: "Inframundo Maya",
  eyebrow: "Experiencia guiada",
  subtype: "Subtipo editorial: tour",
  claim:
    "Un descenso documental a los cenotes que los mayas leyeron como puerta del Xibalbá, acompañado por guías del Oriente Maya de Yucatán.",
  duration: "4 h aprox. (demo)",
  meetingPoint: "Plaza principal de Valladolid · Portal de piedra (demo)",
  languages: "Español · Inglés (demo)",
  accessibility: "Accesibilidad parcial: escalinatas de piedra y superficies húmedas (demo)",
  difficulty: "Condición física media · nado opcional (demo)",
  lat: 20.6885,
  lng: -88.2011,
} as const;

const GALLERY = [MEDIA.cover, MEDIA.cavernas, MEDIA.selva, MEDIA.plaza, MEDIA.calle] as const;

const SUBNAV = [
  { key: "relato", label: "El relato" },
  { key: "practico", label: "Datos prácticos" },
  { key: "itinerario", label: "Itinerario" },
  { key: "galeria", label: "Galería" },
  { key: "mapa", label: "Punto de encuentro" },
  { key: "cerca", label: "Cerca de aquí" },
] as const;

const INCLUYE = [
  "Guía local acreditado por el operador",
  "Acceso a los cenotes del recorrido",
  "Equipo de seguridad y chaleco",
  "Agua y fruta de temporada",
] as const;

const NO_INCLUYE = [
  "Traslado desde otras ciudades",
  "Alimentos completos",
  "Propinas",
  "Equipo fotográfico subacuático",
] as const;

const ITINERARIO = [
  {
    step: "01",
    title: "Encuentro en la plaza",
    body: "El grupo se reúne en el centro histórico. El guía explica la lectura maya del inframundo y el cuidado del agua subterránea antes de salir.",
  },
  {
    step: "02",
    title: "Descenso al primer cenote",
    body: "Escalinata de piedra hacia una bóveda abierta. Tiempo para observar la luz, las raíces y la formación de la caverna.",
  },
  {
    step: "03",
    title: "Sendero de selva baja",
    body: "Tramo a pie entre vegetación seca. Se habla de la milpa, del uso ceremonial del cenote y de la vida del pueblo alrededor del agua.",
  },
  {
    step: "04",
    title: "Cenote cerrado y cierre del relato",
    body: "Última parada en una caverna con poca luz natural. Nado opcional y conversación final antes del regreso a Valladolid.",
  },
] as const;

const VARIANTES = [
  {
    name: "Salida de mañana",
    detail: "Luz cenital en el cenote abierto · grupo reducido",
  },
  {
    name: "Salida de tarde",
    detail: "Menos afluencia · cierre con atardecer en la plaza",
  },
  {
    name: "Versión privada",
    detail: "Ritmo propio · adaptable a movilidad reducida parcial",
  },
] as const;

const CERCANOS = [
  {
    name: "Cocina yucateca del centro",
    distance: "A unas cuadras del punto de encuentro",
    tagline: "Fuego lento y recado rojo tras el recorrido.",
    media: MEDIA.restaurante,
  },
  {
    name: "Calzada de los Frailes",
    distance: "Paseo desde la plaza principal",
    tagline: "Fachadas coloniales restauradas.",
    media: MEDIA.calle,
  },
  {
    name: "Hospedaje boutique del centro",
    distance: "Estancias cercanas al punto de encuentro",
    tagline: "Patios coloniales para quedarse una noche más.",
    media: MEDIA.hotel,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "single",
  heading: "Punto de encuentro y contexto territorial",
  center: { lat: EXPERIENCE.lat, lng: EXPERIENCE.lng, zoom: 15 },
  points: [
    {
      id: "experiencia-demo",
      kind: "business",
      lat: EXPERIENCE.lat,
      lng: EXPERIENCE.lng,
      title: EXPERIENCE.name,
      subtitle: EXPERIENCE.meetingPoint,
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
  ],
  capabilities: {
    showDistance: true,
    showDirections: true,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

const OWNER_CAN = [
  "Proponer relato, itinerario y duración",
  "Proponer idiomas, inclusiones y punto de encuentro",
  "Actualizar datos de contacto del operador",
  "Cargar imágenes para revisión",
  "Proponer variante visual y configuración de galería",
  "Guardar borrador y enviar a revisión",
] as const;

const OWNER_CANNOT = [
  "Publicar sin aprobación de Administración",
  "Editar código, contratos o seguridad",
  "Editar fichas o datos de terceros",
  "Añadir distintivos institucionales u oficiales",
] as const;

const ADMIN_CAN = [
  "Revisar, corregir, aprobar o rechazar propuestas",
  "Publicar o despublicar la experiencia",
  "Verificar taxonomía, destino y coordenadas",
  "Verificar derechos de imagen y SEO",
  "Definir estado Premium y distintivos acreditados",
] as const;

/* ------------------------------------------------------------------ */

type VisualDirection = PremiumPresentation;
type GalleryLayout = "mosaico" | "carrusel" | "cuadricula" | "tira";
type RoleView = "visitante" | "propietario" | "administracion";

interface TuningState {
  direction: VisualDirection;
  gallery: GalleryLayout;
  showStory: boolean;
  showItinerary: boolean;
  showGallery: boolean;
  showMap: boolean;
  showVariants: boolean;
  showNearby: boolean;
  role: RoleView;
}

function G4ExperiencePremiumPreview() {
  const [tuning, setTuning] = useState<TuningState>({
    direction: "editorial",
    gallery: "mosaico",
    showStory: true,
    showItinerary: true,
    showGallery: true,
    showMap: true,
    showVariants: true,
    showNearby: true,
    role: "visitante",
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PreviewRibbon />

      <Container className="pt-6">
        <TerritorialPath />
      </Container>

      <Container className="mt-5">
        {tuning.direction === "editorial" ? <HeroEditorial /> : <HeroCinematografico />}
      </Container>

      {tuning.role !== "visitante" ? (
        <Container className="mt-10">
          <PermissionMatrix role={tuning.role} />
        </Container>
      ) : null}

      <Container className="mt-10">
        <SubNav />
      </Container>

      {tuning.showStory ? (
        <Container className="mt-14">
          <Relato />
        </Container>
      ) : null}

      <Container className="mt-16">
        <Inclusiones />
      </Container>

      {tuning.showItinerary ? (
        <Container className="mt-16">
          <Itinerario />
        </Container>
      ) : null}

      {tuning.showGallery ? (
        <Container className="mt-16">
          <Galeria layout={tuning.gallery} />
        </Container>
      ) : null}

      {tuning.showMap ? (
        <Container className="mt-16">
          <section id="mapa">
            <ExperienceMapBlock dto={MAP_DTO} />
          </section>
        </Container>
      ) : null}

      {tuning.showVariants ? (
        <Container className="mt-16">
          <Variantes />
        </Container>
      ) : null}

      <Container className="mt-16">
        <EstadosVacios />
      </Container>

      {tuning.showNearby ? (
        <Container className="mt-16">
          <Cercanias />
        </Container>
      ) : null}

      <Container className="mt-16">
        <DemoNotice />
      </Container>

      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
  );
}

function PreviewRibbon() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Vista previa interna G4-D · Plantilla Premium de Experiencia — no indexable, sin persistencia.
      Contenido DEMO VISUAL: no representa datos publicados.
    </div>
  );
}

function TerritorialPath() {
  return (
    <PremiumTerritorialBreadcrumb
      crumbs={[
        { label: "Inicio", href: "/" },
        { label: "Oriente Maya de Yucatán", href: "/oriente-maya" },
        { label: "Valladolid" },
        { label: "Experiencias" },
        { label: EXPERIENCE.name },
      ]}
    />
  );
}

function DemoTag() {
  return (
    <span className="inline-flex items-center rounded-pill border border-border bg-background/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      Demo visual
    </span>
  );
}

/** Panel editorial: eyebrow, nombre, propuesta de valor, datos prácticos y acciones. */
function HeroPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "max-w-xl"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          {EXPERIENCE.eyebrow}
        </span>
        <DemoTag />
      </div>

      <h1 className="mt-4 font-serif text-4xl leading-[1.06] tracking-tight text-foreground sm:text-5xl">
        {EXPERIENCE.name}
      </h1>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {EXPERIENCE.subtype}
      </p>
      <p className="mt-3 text-lg text-foreground/80">{EXPERIENCE.claim}</p>

      <dl className="mt-6 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Fact icon={Clock} label="Duración" value={EXPERIENCE.duration} />
        <Fact icon={MapPin} label="Punto de encuentro" value={EXPERIENCE.meetingPoint} />
        <Fact icon={Languages} label="Idiomas" value={EXPERIENCE.languages} />
        <Fact icon={Accessibility} label="Accesibilidad" value={EXPERIENCE.accessibility} />
        <Fact icon={Footprints} label="Condición física" value={EXPERIENCE.difficulty} />
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button size="lg" className="rounded-pill px-7">
          Consultar disponibilidad
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
        <Button size="lg" variant="outline" className="rounded-pill px-6">
          Agregar a mi viaje
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Acción dominante única. Esta vista no muestra precio, disponibilidad ni reserva.
      </p>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div>
        <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
        <dd className="text-foreground/90">{value}</dd>
      </div>
    </div>
  );
}

/** Composición documental asimétrica: fotografía protagonista + relato. */
function HeroEditorial() {
  return (
    <section className="grid gap-8 lg:grid-cols-3 lg:items-center">
      <div className="lg:col-span-2">
        <img
          src={MEDIA.cover.url}
          alt={MEDIA.cover.alt}
          loading="eager"
          className="h-[300px] w-full rounded-3xl object-cover shadow-elevated sm:h-[440px] lg:h-[580px]"
        />
      </div>
      <div className="lg:col-span-1">
        <HeroPanel />
      </div>
    </section>
  );
}

/** Imagen monumental con overlay contenido + banda práctica inmediatamente debajo. */
function HeroCinematografico() {
  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl shadow-floating">
        <img
          src={MEDIA.cover.url}
          alt={MEDIA.cover.alt}
          loading="eager"
          className="h-[440px] w-full object-cover sm:h-[600px]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10">
          <div className="rounded-3xl bg-background/88 p-6 backdrop-blur-md sm:max-w-lg sm:p-8">
            <HeroPanel compact />
          </div>
        </div>
      </div>
    </section>
  );
}

function SubNav() {
  return (
    <nav
      aria-label="Secciones de la experiencia"
      className="flex gap-2 overflow-x-auto border-y border-border py-3"
    >
      {SUBNAV.map((s) => (
        <a
          key={s.key}
          href={`#${s.key}`}
          className="shrink-0 rounded-pill px-4 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

function Relato() {
  return (
    <section id="relato" className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Propuesta de valor
        </p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          El agua que sostiene a Valladolid, contada por quien vive de ella
        </h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/80">
          <p>
            El Oriente Maya de Yucatán no tiene ríos en la superficie: toda su agua corre bajo la
            piedra caliza. Esta experiencia sigue ese recorrido subterráneo y explica por qué los
            cenotes fueron leídos como umbral del inframundo y, al mismo tiempo, como despensa de
            vida.
          </p>
          <p>
            El grupo camina, escucha y observa. No hay espectáculo ni escenografía: hay una lectura
            documental del territorio, con guías del propio destino y tiempos pensados para mirar
            despacio.
          </p>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          DEMO VISUAL · texto ilustrativo, no publicado
        </p>
      </div>
      <img
        src={MEDIA.cavernas.url}
        alt={MEDIA.cavernas.alt}
        loading="lazy"
        className="h-72 w-full rounded-3xl object-cover shadow-soft lg:h-full"
      />
    </section>
  );
}

function Inclusiones() {
  return (
    <section id="practico" className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Qué incluye</p>
        <ul className="mt-4 space-y-2.5">
          {INCLUYE.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/85">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Qué no incluye
        </p>
        <ul className="mt-4 space-y-2.5">
          {NO_INCLUYE.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/85">
              <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:col-span-2">
        DEMO VISUAL · listados ilustrativos
      </p>
    </section>
  );
}

function Itinerario() {
  return (
    <section id="itinerario">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Itinerario narrativo
      </p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Cuatro etapas a pie</h2>
      <ol className="mt-6 space-y-5 border-l border-border pl-6">
        {ITINERARIO.map((etapa) => (
          <li key={etapa.step} className="relative">
            <span
              className="absolute -left-[1.9rem] mt-1 inline-flex size-6 items-center justify-center rounded-pill bg-primary text-[10px] font-medium text-primary-foreground"
              aria-hidden
            >
              {etapa.step}
            </span>
            <h3 className="font-serif text-xl tracking-tight">{etapa.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">{etapa.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        DEMO VISUAL · secuencia ilustrativa, sin horarios comprometidos
      </p>
    </section>
  );
}

function Galeria({ layout }: { layout: GalleryLayout }) {
  return (
    <section id="galeria" aria-labelledby="galeria-experiencia">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Galería</p>
          <h2
            id="galeria-experiencia"
            className="mt-1 font-serif text-2xl tracking-tight sm:text-3xl"
          >
            El agua, la piedra y el camino
          </h2>
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
          {layout}
        </span>
      </div>

      {layout === "mosaico" ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GALLERY.map((m, i) => (
            <img
              key={m.url}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className={cn(
                "w-full rounded-3xl object-cover shadow-soft",
                i === 0 ? "col-span-2 row-span-2 h-64 sm:h-[21rem]" : "h-32 sm:h-40",
              )}
            />
          ))}
        </div>
      ) : null}

      {layout === "carrusel" ? (
        <ul className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
          {GALLERY.map((m) => (
            <li key={m.url} className="w-[78%] shrink-0 snap-center sm:w-[46%] lg:w-[32%]">
              <img
                src={m.url}
                alt={m.alt}
                loading="lazy"
                className="h-64 w-full rounded-3xl object-cover shadow-soft sm:h-72"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {layout === "cuadricula" ? (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {GALLERY.map((m) => (
            <img
              key={m.url}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className="h-40 w-full rounded-3xl object-cover shadow-soft sm:h-52"
            />
          ))}
        </div>
      ) : null}

      {layout === "tira" ? (
        <div className="mt-5 grid grid-cols-5 gap-2">
          {GALLERY.map((m) => (
            <img
              key={m.url}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className="h-20 w-full rounded-2xl object-cover shadow-soft sm:h-28"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Variantes() {
  return (
    <section>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Variantes y salidas
      </p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Formas de vivir el recorrido
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {VARIANTES.map((v) => (
          <article
            key={v.name}
            className="rounded-3xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-4" aria-hidden />
              <h3 className="font-medium text-foreground">{v.name}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{v.detail}</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Sin disponibilidad publicada
            </p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        DEMO VISUAL · demostración de composición, sin calendario ni cupos
      </p>
    </section>
  );
}

function EstadosVacios() {
  const bloques = [
    {
      title: "Reseñas",
      body: "Todavía no hay reseñas verificadas para esta experiencia. Cuando existan, se mostrarán con su origen acreditado.",
    },
    {
      title: "Disponibilidad",
      body: "La disponibilidad no está publicada en esta vista. La consulta se atiende por el operador.",
    },
    {
      title: "Distintivos",
      body: "No hay distintivos institucionales acreditados para esta ficha. No se muestran sellos sin verificación.",
    },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {bloques.map((b) => (
        <div key={b.title} className="rounded-3xl border border-dashed border-border p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {b.title}
          </p>
          <p className="mt-2 text-sm text-foreground/75">{b.body}</p>
        </div>
      ))}
    </section>
  );
}

function Cercanias() {
  return (
    <section id="cerca">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Cerca de aquí</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Recomendaciones del micrositio de Valladolid
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {CERCANOS.map((c) => (
          <article
            key={c.name}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <img
              src={c.media.url}
              alt={c.media.alt}
              loading="lazy"
              className="h-40 w-full object-cover"
            />
            <div className="p-4">
              <h3 className="font-medium">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapIcon className="size-3.5" aria-hidden />
                {c.distance}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DemoNotice() {
  return (
    <p className="rounded-3xl border border-dashed border-border p-5 text-xs text-muted-foreground">
      Todo el contenido de esta vista es DEMO VISUAL para evaluación de plantilla. No hay rating,
      premios, reseñas, precio, disponibilidad, certificaciones ni distintivos oficiales. No se
      escribe ni se lee información de negocio real, y nada de lo mostrado está publicado.
    </p>
  );
}

function PermissionMatrix({ role }: { role: Exclude<RoleView, "visitante"> }) {
  const isOwner = role === "propietario";
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-primary" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Matriz de permisos · {isOwner ? "Propietario / operador" : "Administración"}
        </p>
      </div>
      <h2 className="mt-1 font-serif text-xl tracking-tight">
        Propietario edita → Administración revisa → Administración publica
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <PermissionList title="Puede hacer" items={isOwner ? OWNER_CAN : ADMIN_CAN} tone="ok" />
        {isOwner ? (
          <PermissionList title="No puede hacer" items={OWNER_CANNOT} tone="blocked" />
        ) : (
          <PermissionList
            title="Siempre protegido"
            items={[
              "Código, seguridad y contratos",
              "Datos de terceros",
              "Publicación automática: nunca",
            ]}
            tone="blocked"
          />
        )}
      </div>
    </section>
  );
}

function PermissionList({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "ok" | "blocked";
}) {
  const Icon = tone === "ok" ? Check : Lock;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-foreground/85">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "ok" ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Panel local "Afinar plantilla" (sin persistencia).
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

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(21rem,calc(100vw-2rem))]">
      {open ? (
        <div className="max-h-[80vh] overflow-y-auto rounded-3xl border border-border bg-card/95 p-4 shadow-floating backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Afinar plantilla</p>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sólo evaluación visual. No guarda nada en base de datos ni en el CMS.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vista simulada
              </p>
              <div className="mt-2 grid gap-2">
                {(
                  [
                    ["visitante", "Visitante"],
                    ["propietario", "Propietario / operador"],
                    ["administracion", "Administración Valladolid.mx"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("role", key)}
                    aria-pressed={value.role === key}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-xs transition-colors",
                      value.role === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {value.role === "visitante" ? (
              <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                La vista Visitante muestra únicamente el resultado limpio. Los controles de
                dirección visual y galería sólo aparecen para Propietario y Administración.
              </p>
            ) : (
              <>
                <PremiumPresentationControl
                  value={value.direction}
                  onChange={(next) => set("direction", next)}
                  note={
                    value.role === "propietario"
                      ? "El operador propone la variante; Administración revisa, aprueba y publica. Nada se publica automáticamente."
                      : undefined
                  }
                />

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Galería
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["mosaico", "Mosaico"],
                        ["carrusel", "Carrusel"],
                        ["cuadricula", "Cuadrícula"],
                        ["tira", "Tira"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set("gallery", key)}
                        aria-pressed={value.gallery === key}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs transition-colors",
                          value.gallery === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Toggle
              label="Relato documental"
              checked={value.showStory}
              onChange={(v) => set("showStory", v)}
            />
            <Toggle
              label="Itinerario"
              checked={value.showItinerary}
              onChange={(v) => set("showItinerary", v)}
            />
            <Toggle
              label="Galería"
              checked={value.showGallery}
              onChange={(v) => set("showGallery", v)}
            />
            <Toggle label="Mapa" checked={value.showMap} onChange={(v) => set("showMap", v)} />
            <Toggle
              label="Variantes y salidas"
              checked={value.showVariants}
              onChange={(v) => set("showVariants", v)}
            />
            <Toggle
              label="Cerca de aquí"
              checked={value.showNearby}
              onChange={(v) => set("showNearby", v)}
            />
          </div>
        </div>
      ) : (
        <Button className="rounded-pill shadow-floating" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="mr-2 size-4" aria-hidden />
          Afinar plantilla
        </Button>
      )}
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
