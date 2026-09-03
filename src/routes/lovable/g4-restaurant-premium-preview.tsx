/**
 * G4-C · Vista previa visual de la Plantilla Premium de Restaurante.
 *
 * Vista INTERNA, no indexable y sin persistencia. Caso visual
 * DEMO VISUAL: "Cocina de Zací".
 *
 * Reglas aplicadas:
 *  - Sólo medios gobernados existentes vía el proxy público estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - Todo texto/dato es DEMO VISUAL. Sin rating, premios, reseñas,
 *    disponibilidad, reservas ni distintivos oficiales inventados.
 *  - DIRECCIÓN VISUAL (Editorial | Cinematográfico) y GALERÍA
 *    (Mosaico | Carrusel | Cuadrícula | Tira) son ejes independientes.
 *  - El panel "Afinar plantilla" es local (useState) y no persiste.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  Gift,
  Heart,
  Lock,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  Shield,
  SlidersHorizontal,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PremiumPresentationControl, PremiumTerritorialBreadcrumb } from "@/components/premium";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";

export const Route = createFileRoute("/lovable/g4-restaurant-premium-preview")({
  head: () => ({
    meta: [
      { title: "G4-C · Vista previa plantilla Premium de Restaurante (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la plantilla premium de restaurante de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4RestaurantPremiumPreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  cover: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y cenas iluminadas con velas frente a un cenote en Valladolid, Yucatán",
  },
  cochinita: {
    url: `${GOVERNED}/restaurant-gallery-1.jpg`,
    alt: "Cochinita pibil tradicional yucateca servida en plato de cerámica artesanal con cebolla morada, habanero y tortillas",
  },
  comedor: {
    url: `${GOVERNED}/restaurant-gallery-2.jpg`,
    alt: "Comedor interior colonial con patio central, columnas de piedra, mesas de madera y lámparas tejidas en Valladolid, Yucatán",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial colorida de Valladolid con fachadas pastel en terracota, ocre y amarillo, puertas de madera y buganvilia",
  },
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, bancas, palmeras y arcadas coloniales de herradura en tonos ocre y crema",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes y plataforma de madera cerca de Valladolid, Yucatán",
  },
  hotel: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio central con piscina estilo cenote y arcos de piedra en un hotel boutique colonial de Valladolid, Yucatán",
  },
} as const;

const RESTAURANT = {
  name: "Casa del Maíz · Cocina de Oriente",
  eyebrow: "Oriente Maya de Yucatán · Valladolid, Yucatán",
  claim: "Cocina yucateca contemporánea en una casona del barrio de Sisal",
  cuisine: "Yucateca contemporánea",
  schedule: "Desayuno · Comida · Cena",
  location: "Barrio de Sisal · Valladolid",
  lat: 20.6893,
  lng: -88.2018,
} as const;

const GALLERY = [MEDIA.cover, MEDIA.cochinita, MEDIA.comedor] as const;

const SPECIALTIES = [
  {
    name: "Sabores de la tierra",
    text: "Recetas tradicionales y producto local de temporada.",
    media: MEDIA.cochinita,
  },
  {
    name: "Del milpa",
    text: "El maíz como protagonista de la cocina de Oriente.",
    media: MEDIA.cover,
  },
  {
    name: "Algo dulce",
    text: "Postres inspirados en frutas y sabores de la región.",
    media: MEDIA.comedor,
  },
] as const;

const SUBNAV = [
  { key: "relato", label: "El relato" },
  { key: "galeria", label: "Galería" },
  { key: "mapa", label: "Ubicación" },
  { key: "servicios", label: "Servicios" },
  { key: "cerca", label: "Cerca de aquí" },
] as const;

const SERVICIOS = [
  "Desayuno",
  "Comida",
  "Cena",
  "Reservación recomendada",
  "Terraza al aire libre",
  "Opciones vegetarianas",
  "Accesible en planta baja",
  "Opciones sin gluten",
] as const;

const CERCANOS = [
  {
    name: "Cenote Zací",
    distance: "600 m · 8 min a pie",
    tagline: "Cenote urbano en pleno centro.",
    media: MEDIA.cenote,
  },
  {
    name: "Calzada de los Frailes",
    distance: "1.1 km · 14 min a pie",
    tagline: "Paseo colonial de fachadas restauradas.",
    media: MEDIA.calle,
  },
  {
    name: "Hospedaje boutique del centro",
    distance: "450 m · 6 min a pie",
    tagline: "Estancias coloniales a unas cuadras.",
    media: MEDIA.hotel,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "single",
  heading: "Dónde encontrarnos",
  center: { lat: RESTAURANT.lat, lng: RESTAURANT.lng, zoom: 16 },
  points: [
    {
      id: "restaurante-demo",
      kind: "business",
      lat: RESTAURANT.lat,
      lng: RESTAURANT.lng,
      title: RESTAURANT.name,
      subtitle: RESTAURANT.location,
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
  "Proponer dirección visual y configuración de galería",
  "Editar relato gastronómico, servicios y datos de contacto",
  "Cargar fotografía propia para revisión",
  "Enviar cambios a revisión editorial",
] as const;

const OWNER_CANNOT = [
  "Publicar sin aprobación de Administración",
  "Editar destino, inicio o superficies regionales",
  "Añadir distintivos institucionales u oficiales",
] as const;

const ADMIN_CAN = [
  "Revisar, aprobar, rechazar o devolver con notas",
  "Publicar o despublicar la ficha",
  "Definir plantilla, dirección visual y galería finales",
  "Gestionar distintivos institucionales acreditados",
] as const;

/* ------------------------------------------------------------------ */

type VisualDirection = PremiumPresentation;
type GalleryLayout = "mosaico" | "carrusel" | "cuadricula" | "tira";
type RoleView = "visitante" | "propietario" | "administracion";

interface TuningState {
  direction: VisualDirection;
  gallery: GalleryLayout;
  showStory: boolean;
  showGallery: boolean;
  showMap: boolean;
  showServices: boolean;
  showNearby: boolean;
  role: RoleView;
}

function G4RestaurantPremiumPreview() {
  const [tuning, setTuning] = useState<TuningState>({
    direction: "editorial",
    gallery: "mosaico",
    showStory: true,
    showGallery: true,
    showMap: true,
    showServices: true,
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

      <Container className="mt-6">
        <TourismAluxPanel
          title="¿Qué tipo de experiencia gastronómica buscas?"
          description="Cuéntame la ocasión y te ayudaré a elegir mesa, horario y lugares cercanos para completar tu recorrido."
          task={`Ayúdame a decidir si ${RESTAURANT.name} es adecuado para mi visita a Valladolid.`}
          prompts={["Cena romántica", "En familia", "Cocina tradicional", "Algo especial"]}
          className="border-selva/20 bg-selva/[0.06] ring-1 ring-selva/5"
          compact
        />
      </Container>

      {tuning.role !== "visitante" ? (
        <Container className="mt-10">
          <PermissionMatrix role={tuning.role} />
        </Container>
      ) : null}

      {tuning.showStory ? (
        <Container className="mt-14">
          <Relato />
        </Container>
      ) : null}

      {tuning.showGallery ? (
        <Container className="mt-16">
          <Galeria layout={tuning.gallery} />
        </Container>
      ) : null}

      <Container className="mt-16">
        <MenuEspecialidades />
      </Container>

      <Container className="mt-16">
        <AmbienteYOcasiones />
      </Container>

      {tuning.showMap ? (
        <Container className="mt-16">
          <section id="mapa">
            <ExperienceMapBlock dto={MAP_DTO} />
          </section>
        </Container>
      ) : null}

      {tuning.showServices ? (
        <Container className="mt-16">
          <Servicios />
        </Container>
      ) : null}

      <Container className="mt-16">
        <PoliticasYContacto />
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
      Vista previa interna G4-C · Plantilla Premium de Restaurante — no indexable, sin persistencia.
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
        { label: "Restaurantes" },
        { label: RESTAURANT.name },
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

/** Panel editorial: eyebrow, nombre, propuesta, datos prácticos y una sola acción dominante. */
function HeroPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "max-w-xl"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          {RESTAURANT.eyebrow}
        </span>
        <DemoTag />
      </div>

      <h1 className="mt-4 font-serif text-4xl leading-[1.06] tracking-tight text-foreground sm:text-5xl">
        {RESTAURANT.name}
      </h1>
      <p className="mt-3 text-lg text-foreground/80">{RESTAURANT.claim}</p>

      <dl className="mt-6 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Fact icon={UtensilsCrossed} label="Cocina" value={RESTAURANT.cuisine} />
        <Fact icon={Clock} label="Horario" value={RESTAURANT.schedule} />
        <Fact icon={MapPin} label="Ubicación" value={RESTAURANT.location} />
      </dl>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="w-full rounded-pill px-7 sm:w-auto">
          Reservar mesa
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
        <Button size="lg" variant="outline" className="w-full rounded-pill px-7 sm:w-auto">
          <Heart className="mr-2 size-4" aria-hidden />
          Agregar a mi viaje
        </Button>
      </div>
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

/** Hero editorial compartido: móvil prioriza imagen; desktop equilibra relato y galería. */
function HeroEditorial() {
  return (
    <section className="grid gap-7 overflow-hidden rounded-[2rem] border border-border bg-card p-5 shadow-elevated sm:p-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:p-9">
      <div className="order-2 lg:order-1">
        <HeroPanel />
      </div>
      <div className="order-1 grid grid-cols-2 gap-3 sm:gap-4 lg:order-2">
        <img
          src={MEDIA.cover.url}
          alt={MEDIA.cover.alt}
          loading="eager"
          className="col-span-2 h-56 w-full rounded-3xl object-cover shadow-elevated sm:h-72 lg:h-80"
        />
        <img
          src={MEDIA.cochinita.url}
          alt={MEDIA.cochinita.alt}
          loading="lazy"
          className="hidden h-36 w-full rounded-2xl object-cover shadow-soft sm:block sm:h-44"
        />
        <img
          src={MEDIA.comedor.url}
          alt={MEDIA.comedor.alt}
          loading="lazy"
          className="hidden h-36 w-full rounded-2xl object-cover shadow-soft sm:block sm:h-44"
        />
      </div>
    </section>
  );
}

/** Variante cinematográfica equivalente dentro de la misma plantilla. */
function HeroCinematografico() {
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-floating">
      <img
        src={MEDIA.cover.url}
        alt={MEDIA.cover.alt}
        loading="eager"
        className="h-[440px] w-full object-cover sm:h-[560px]"
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
    </section>
  );
}

function SubNav() {
  return (
    <nav
      aria-label="Secciones de la ficha"
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
          Propuesta gastronómica
        </p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          Fuego lento, recado rojo y huerto propio
        </h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/80">
          <p>
            La casona conserva su patio original, sus columnas de piedra y un horno de tierra que se
            enciende de madrugada. La carta cambia con la temporada y con lo que llega del mercado
            municipal, a cinco cuadras de la mesa.
          </p>
          <p>
            El recado rojo se muele en casa, la tortilla se hace a mano y el habanero se sirve
            aparte. Es cocina yucateca sin adornos: pocas piezas, tiempos largos y producto de la
            región.
          </p>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          DEMO VISUAL · texto ilustrativo, no publicado
        </p>
      </div>
      <img
        src={MEDIA.cochinita.url}
        alt={MEDIA.cochinita.alt}
        loading="lazy"
        className="h-72 w-full rounded-3xl object-cover shadow-soft lg:h-full"
      />
    </section>
  );
}

function Galeria({ layout }: { layout: GalleryLayout }) {
  return (
    <section id="galeria" aria-labelledby="galeria-restaurante">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Galería</p>
          <h2
            id="galeria-restaurante"
            className="mt-1 font-serif text-2xl tracking-tight sm:text-3xl"
          >
            La casa, la mesa y el barrio
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
          {GALLERY.map((m, i) => (
            <li key={m.url} className="w-[78%] shrink-0 snap-center sm:w-[42%]">
              <img
                src={m.url}
                alt={m.alt}
                loading="lazy"
                className="h-60 w-full rounded-3xl object-cover shadow-soft"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {i + 1} / {GALLERY.length}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {layout === "cuadricula" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {GALLERY.map((m) => (
            <img
              key={m.url}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className="h-52 w-full rounded-3xl object-cover shadow-soft"
            />
          ))}
        </div>
      ) : null}

      {layout === "tira" ? (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {GALLERY.map((m) => (
            <img
              key={m.url}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className="h-24 w-full rounded-2xl object-cover shadow-soft sm:h-28"
            />
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs text-muted-foreground">
        Fotografías gobernadas existentes servidas por ruta pública estable. Sin URLs firmadas.
      </p>
    </section>
  );
}

function MenuEspecialidades() {
  return (
    <section aria-labelledby="menu-especialidades">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">La cocina</p>
      <h2 id="menu-especialidades" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Menú y especialidades
      </h2>
      <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {SPECIALTIES.map((item) => (
          <article
            key={item.name}
            className="w-[82%] shrink-0 snap-center overflow-hidden rounded-3xl border border-border bg-card shadow-soft sm:w-auto"
          >
            <img
              src={item.media.url}
              alt={item.media.alt}
              loading="lazy"
              className="h-40 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="font-serif text-xl">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Demo visual · sin precios
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AmbienteYOcasiones() {
  const occasions = [
    { icon: Heart, label: "Romántico" },
    { icon: Users, label: "En familia" },
    { icon: UtensilsCrossed, label: "Amigable" },
    { icon: Gift, label: "Celebraciones" },
  ] as const;
  return (
    <section
      aria-labelledby="ambiente-ocasiones"
      className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
    >
      <h2 id="ambiente-ocasiones" className="font-serif text-2xl tracking-tight">
        Ambiente y ocasiones
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {occasions.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-muted/45 p-3 text-center"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            <span className="mt-2 text-sm">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Servicios() {
  return (
    <section id="servicios">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Servicios</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">Lo que encuentras en la casa</h2>
        <ul className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {SERVICIOS.map((s) => (
            <li
              key={s}
              className="flex min-h-16 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-sm text-foreground/85 shadow-soft"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          DEMO VISUAL · listado ilustrativo
        </p>
      </div>
    </section>
  );
}

function PoliticasYContacto() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <details open className="group rounded-3xl border border-border bg-card p-5 shadow-soft">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-serif text-2xl">
          Políticas <CalendarCheck className="size-5 text-primary" aria-hidden />
        </summary>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>Reservaciones: recomendadas.</li>
          <li>Cancelaciones: consultar las políticas al reservar.</li>
          <li>Condiciones especiales: sujetas a confirmación.</li>
        </ul>
      </details>
      <details open className="group rounded-3xl border border-border bg-card p-5 shadow-soft">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-serif text-2xl">
          Contacto <Phone className="size-5 text-primary" aria-hidden />
        </summary>
        <ul className="mt-4 space-y-3 text-sm text-foreground/85">
          <li className="flex items-center gap-2.5">
            <Phone className="size-4 text-primary" aria-hidden /> Teléfono de contacto (demo)
          </li>
          <li className="flex items-center gap-2.5">
            <Mail className="size-4 text-primary" aria-hidden /> Correo de contacto (demo)
          </li>
          <li className="flex items-center gap-2.5">
            <MapIcon className="size-4 text-primary" aria-hidden /> {RESTAURANT.location}
          </li>
        </ul>
        <Button variant="outline" className="mt-5 w-full rounded-pill">
          Enviar mensaje
        </Button>
      </details>
    </section>
  );
}

function Cercanias() {
  return (
    <section id="cerca">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Cerca de aquí</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">A pie desde la mesa</h2>
      <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {CERCANOS.map((c) => (
          <article
            key={c.name}
            className="w-[72%] shrink-0 snap-center overflow-hidden rounded-3xl border border-border bg-card shadow-soft sm:w-auto"
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
      premios, reseñas, disponibilidad, reservas ni distintivos oficiales. No se escribe ni se lee
      información de negocio real, y nada de lo mostrado está publicado.
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
          Matriz de permisos · {isOwner ? "Propietario" : "Administración"}
        </p>
      </div>
      <h2 className="mt-1 font-serif text-xl tracking-tight">
        {isOwner
          ? "El propietario propone; Administración aprueba y publica"
          : "Administración revisa, aprueba y publica"}
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <PermissionList
          title={isOwner ? "Puede hacer" : "Puede hacer"}
          items={isOwner ? OWNER_CAN : ADMIN_CAN}
          tone="ok"
        />
        {isOwner ? (
          <PermissionList title="No puede hacer" items={OWNER_CANNOT} tone="blocked" />
        ) : (
          <PermissionList
            title="Flujo editorial"
            items={[
              "Borrador del propietario",
              "Envío a revisión",
              "Revisión editorial de Administración",
              "Publicación manual: nunca automática",
            ]}
            tone="ok"
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
                    ["propietario", "Propietario del restaurante"],
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
                      ? "El propietario propone la variante; Administración revisa, aprueba y publica. Nada se publica automáticamente."
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
              label="Relato gastronómico"
              checked={value.showStory}
              onChange={(v) => set("showStory", v)}
            />
            <Toggle
              label="Galería"
              checked={value.showGallery}
              onChange={(v) => set("showGallery", v)}
            />
            <Toggle label="Mapa" checked={value.showMap} onChange={(v) => set("showMap", v)} />
            <Toggle
              label="Servicios y contacto"
              checked={value.showServices}
              onChange={(v) => set("showServices", v)}
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
