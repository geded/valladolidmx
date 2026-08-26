/**
 * G4-E · Vista previa visual de la Plantilla Premium de Evento.
 *
 * Vista INTERNA, no indexable y sin persistencia. Caso visual
 * DEMO VISUAL: "Noche de Valladolid" (evento cultural ficticio).
 *
 * Reglas aplicadas:
 *  - Sólo medios gobernados existentes vía el proxy público estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - DIRECCIÓN VISUAL (Editorial | Cinematográfico) y GALERÍA
 *    (Mosaico | Carrusel | Cuadrícula | Tira) son ejes independientes.
 *  - El estado del evento (programado / finalizado / cancelado) es una
 *    simulación local: nunca implica disponibilidad, boletos ni venta.
 *  - Sin countdown, scarcity, rating, premios, boletos, precios, cupo ni
 *    certificaciones. Estados vacíos donde no hay acreditación.
 *  - El panel "Afinar plantilla" es local (useState) y no persiste.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Lock,
  Map as MapIcon,
  MapPin,
  Navigation,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import {
  PremiumBreadcrumb,
  PremiumGallery,
  PremiumHero,
  PremiumSection,
} from "@/components/premium";
import {
  toEventPremiumVM,
  toPremiumSectionVM,
  type PremiumEntitySource,
} from "@/lib/omxds/presentation/vm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lovable/g4-event-premium-preview")({
  head: () => ({
    meta: [
      { title: "G4-E · Vista previa plantilla Premium de Evento (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la plantilla premium de evento de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4EventPremiumPreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  cover: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, bancas, palmeras y arcadas coloniales de herradura en tonos ocre y crema",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial colorida de Valladolid con fachadas pastel en terracota, ocre y amarillo, puertas de madera y buganvilia",
  },
  fachada: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Vista del centro histórico de Valladolid, Yucatán, con arquitectura colonial en piedra caliza y luz cálida de tarde",
  },
  cocina: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y cenas iluminadas con velas frente a un cenote en Valladolid, Yucatán",
  },
  patio: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio central con piscina estilo cenote y arcos de piedra en un hotel boutique colonial de Valladolid, Yucatán",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes y plataforma de madera cerca de Valladolid, Yucatán",
  },
} as const;

const EVENT = {
  name: "Noche de Valladolid",
  eyebrow: "Evento cultural",
  category: "Categoría cultural: música tradicional y memoria del centro histórico (demo)",
  claim:
    "Una velada documental en el centro histórico: trova yucateca, oficios de la Calzada y lectura del patrimonio colonial al caer la tarde.",
  dateLabel: "Fecha por confirmar · ejemplo editorial (demo)",
  timeLabel: "19:00 h (demo)",
  duration: "3 h aprox. (demo)",
  venue: "Plaza principal de Valladolid · Kiosco central (demo)",
  address: "Centro histórico, Valladolid, Yucatán (demo)",
  accessibility: "Acceso a nivel de calle en la plaza; banquetas de piedra irregulares (demo)",
  organizer: "Organizador de ejemplo · ficha no acreditada (demo)",
  lat: 20.6892,
  lng: -88.2018,
} as const;

const GALLERY = [MEDIA.cover, MEDIA.calle, MEDIA.fachada, MEDIA.cocina, MEDIA.cenote] as const;

const SUBNAV = [
  { key: "relato", label: "El relato" },
  { key: "programa", label: "Programa" },
  { key: "galeria", label: "Galería" },
  { key: "mapa", label: "Sede" },
  { key: "practico", label: "Información práctica" },
  { key: "cerca", label: "Cerca de aquí" },
] as const;

const PROGRAMA = [
  {
    hour: "19:00",
    title: "Apertura en el kiosco",
    body: "Bienvenida y presentación del recorrido sonoro por la historia del centro histórico.",
  },
  {
    hour: "19:40",
    title: "Trova yucateca",
    body: "Repertorio tradicional interpretado en el kiosco, con lectura del origen de cada pieza.",
  },
  {
    hour: "20:30",
    title: "Oficios de la Calzada",
    body: "Muestra de oficios locales frente a las fachadas restauradas de la Calzada de los Frailes.",
  },
  {
    hour: "21:20",
    title: "Cierre bajo las arcadas",
    body: "Conversación final sobre conservación del patrimonio y despedida del público.",
  },
] as const;

const PRACTICO = [
  "Actividad al aire libre: se recomienda calzado cómodo.",
  "Punto de reunión señalizado en la plaza principal.",
  "Estacionamiento público a varias cuadras del centro histórico.",
  "Sin registro previo en esta vista: la ficha no está publicada.",
] as const;

const COMO_LLEGAR = [
  "A pie desde el centro histórico: acceso directo por las arcadas de la plaza.",
  "En coche: calles del cuadro central con sentido único y estacionamiento fuera de la plaza.",
  "Desde otros destinos del Oriente Maya: llegada por la carretera federal y entrada al centro.",
] as const;

const CERCANOS = [
  {
    name: "Cocina yucateca del centro",
    distance: "A unas cuadras de la sede",
    tagline: "Cena de fuego lento antes o después del programa.",
    media: MEDIA.cocina,
  },
  {
    name: "Calzada de los Frailes",
    distance: "Paseo desde la plaza principal",
    tagline: "Fachadas coloniales restauradas y oficios locales.",
    media: MEDIA.calle,
  },
  {
    name: "Hospedaje boutique del centro",
    distance: "Estancias cercanas a la sede",
    tagline: "Patios coloniales para quedarse una noche más.",
    media: MEDIA.patio,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "single",
  heading: "Sede del evento y contexto territorial",
  center: { lat: EVENT.lat, lng: EVENT.lng, zoom: 15 },
  points: [
    {
      id: "evento-demo",
      kind: "business",
      lat: EVENT.lat,
      lng: EVENT.lng,
      title: EVENT.name,
      subtitle: EVENT.venue,
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

const ORGANIZER_CAN = [
  "Proponer relato, descripción y categoría cultural",
  "Proponer programa por horarios, fecha y hora",
  "Proponer sede, dirección y accesibilidad",
  "Actualizar datos de contacto del organizador",
  "Cargar imágenes para revisión",
  "Proponer variante visual y configuración de galería",
  "Guardar borrador y enviar a revisión",
] as const;

const ORGANIZER_CANNOT = [
  "Publicar sin aprobación de Administración",
  "Editar código, contratos o seguridad",
  "Editar fichas o datos de terceros",
  "Añadir distintivos, premios o señales de confianza no acreditadas",
] as const;

const ADMIN_CAN = [
  "Revisar, corregir, aprobar o rechazar propuestas",
  "Publicar o despublicar el evento",
  "Verificar organizador, taxonomía y destino",
  "Verificar sede, coordenadas y derechos de imagen",
  "Verificar SEO y distintivos acreditados",
] as const;

/* ------------------------------------------------------------------ */

type VisualDirection = "editorial" | "cinematografico";
type GalleryLayout = "mosaico" | "carrusel" | "cuadricula" | "tira";
type RoleView = "visitante" | "organizador" | "administracion";
type EventStatus = "programado" | "finalizado" | "cancelado";

const STATUS_META: Record<
  EventStatus,
  { label: string; note: string; className: string; primaryCta: string | null }
> = {
  programado: {
    label: "Programado",
    note: "Estado simulado localmente. No implica disponibilidad, boletos ni cupo.",
    className: "border-primary/30 bg-primary/10 text-primary",
    primaryCta: "Ver información del evento",
  },
  finalizado: {
    label: "Finalizado",
    note: "El evento se conserva por su valor editorial. No hay venta ni acción de compra.",
    className: "border-border bg-muted text-muted-foreground",
    primaryCta: "Explorar próximos eventos",
  },
  cancelado: {
    label: "Cancelado",
    note: "Sin acción de asistencia. La ficha permanece visible sólo como registro.",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    primaryCta: null,
  },
};

interface TuningState {
  direction: VisualDirection;
  gallery: GalleryLayout;
  status: EventStatus;
  showStory: boolean;
  showProgram: boolean;
  showGallery: boolean;
  showMap: boolean;
  showPractical: boolean;
  showNearby: boolean;
  role: RoleView;
}

function G4EventPremiumPreview() {
  const [tuning, setTuning] = useState<TuningState>({
    direction: "editorial",
    gallery: "mosaico",
    status: "programado",
    showStory: true,
    showProgram: true,
    showGallery: true,
    showMap: true,
    showPractical: true,
    showNearby: true,
    role: "visitante",
  });

  const presentation = tuning.direction === "editorial" ? "editorial" : "cinematic";
  const vm = toEventPremiumVM(
    { ...buildEventSource(tuning.status), actions: <HeroActions status={tuning.status} /> },
    { crumbTail: [{ label: "Eventos" }, { label: EVENT.name }] },
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <PreviewRibbon />

      <Container className="pt-6">
        <PremiumBreadcrumb crumbs={vm.crumbs} />
      </Container>

      <Container className="mt-5">
        <PremiumHero vm={vm.hero} presentation={presentation} />
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

      {tuning.showProgram ? (
        <Container className="mt-16">
          <Programa />
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

      {tuning.showPractical ? (
        <Container className="mt-16">
          <InformacionPractica />
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
      Vista previa interna G4-E · Plantilla Premium de Evento — no indexable, sin persistencia.
      Contenido DEMO VISUAL: el evento es ficticio y no representa datos publicados.
    </div>
  );
}

/**
 * Fuente plana del caso DEMO por estado del evento. Hero, galería y
 * breadcrumb los construye el runtime premium compartido.
 */
function buildEventSource(status: EventStatus): PremiumEntitySource {
  const meta = STATUS_META[status];
  return {
    title: EVENT.name,
    eyebrow: EVENT.eyebrow,
    subtitle: EVENT.claim,
    cover: MEDIA.cover,
    gallery: GALLERY,
    destination: { slug: "valladolid", label: "Valladolid" },
    badges: [
      { label: meta.label, tone: "primary" as const },
      { label: EVENT.category, tone: "neutral" as const },
      { label: "Demo visual", tone: "neutral" as const },
    ],
    facts: [
      {
        label: "Fecha",
        value: EVENT.dateLabel,
        icon: <CalendarDays className="size-3.5 text-primary" aria-hidden />,
      },
      {
        label: "Hora y duración",
        value: `${EVENT.timeLabel} · ${EVENT.duration}`,
        icon: <Clock className="size-3.5 text-primary" aria-hidden />,
      },
      {
        label: "Sede",
        value: EVENT.venue,
        icon: <MapPin className="size-3.5 text-primary" aria-hidden />,
      },
      {
        label: "Dirección",
        value: EVENT.address,
        icon: <Building2 className="size-3.5 text-primary" aria-hidden />,
      },
      {
        label: "Accesibilidad",
        value: EVENT.accessibility,
        icon: <Accessibility className="size-3.5 text-primary" aria-hidden />,
      },
      {
        label: "Organizador",
        value: EVENT.organizer,
        icon: <Users className="size-3.5 text-primary" aria-hidden />,
      },
    ],
  };
}

/** Acciones del hero, condicionadas por el estado del evento. */
function HeroActions({ status }: { status: EventStatus }) {
  const meta = STATUS_META[status];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {meta.primaryCta ? (
          <Button size="lg" className="rounded-pill px-7">
            {meta.primaryCta}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        ) : null}
        {status === "programado" ? (
          <Button size="lg" variant="outline" className="rounded-pill px-6">
            Agregar a mi viaje
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {meta.note} Esta vista no muestra boletos, precios, cupo ni compra.
      </p>
    </div>
  );
}

function SubNav() {
  return (
    <nav
      aria-label="Secciones del evento"
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
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Descripción</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          El centro histórico como escenario, contado por quien lo habita
        </h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/80">
          <p>
            Al caer la tarde, la plaza cambia de ritmo: la piedra devuelve el calor del día y las
            arcadas se llenan de conversación. Esta velada propone escuchar ese momento con calma,
            acompañada por música tradicional y por los oficios que sostienen al centro.
          </p>
          <p>
            No hay espectáculo masivo ni escenografía: hay una lectura documental del patrimonio de
            Valladolid, pensada para quien quiere entender el lugar antes de fotografiarlo.
          </p>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          DEMO VISUAL · texto ilustrativo, evento ficticio no publicado
        </p>
      </div>
      <img
        src={MEDIA.fachada.url}
        alt={MEDIA.fachada.alt}
        loading="lazy"
        className="h-72 w-full rounded-3xl object-cover shadow-soft lg:h-full"
      />
    </section>
  );
}

function Programa() {
  return (
    <section id="programa">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Programa por horarios
      </p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Agenda de la velada</h2>
      <ol className="mt-6 space-y-5 border-l border-border pl-6">
        {PROGRAMA.map((slot) => (
          <li key={slot.hour} className="relative">
            <span
              className="absolute -left-[3.1rem] mt-0.5 inline-flex w-12 justify-end text-xs font-medium tabular-nums text-primary"
              aria-hidden
            >
              {slot.hour}
            </span>
            <h3 className="font-serif text-xl tracking-tight">{slot.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">{slot.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        DEMO VISUAL · horarios ilustrativos, sin compromiso ni disponibilidad
      </p>
    </section>
  );
}

function Galeria({ layout }: { layout: GalleryLayout }) {
  const vm = toEventPremiumVM(buildEventSource("programado"), { galleryLayout: layout });
  return (
    <PremiumSection
      vm={toPremiumSectionVM({
        id: "galeria",
        eyebrow: "Galería",
        title: "La plaza, la piedra y la tarde",
      })}
    >
      <PremiumGallery vm={vm.gallery} />
    </PremiumSection>
  );
}

function InformacionPractica() {
  return (
    <section id="practico" className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Información práctica
        </p>
        <ul className="mt-4 space-y-2.5">
          {PRACTICO.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/85">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Cómo llegar
        </p>
        <ul className="mt-4 space-y-2.5">
          {COMO_LLEGAR.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/85">
              <Navigation className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:col-span-2">
        DEMO VISUAL · indicaciones ilustrativas
      </p>
    </section>
  );
}

function EstadosVacios() {
  const bloques = [
    {
      title: "Boletos",
      body: "Esta vista no gestiona boletos ni acceso. Cuando exista información acreditada, se mostrará con su origen.",
    },
    {
      title: "Reseñas",
      body: "Todavía no hay reseñas verificadas para este evento. No se muestran valoraciones sin acreditación.",
    },
    {
      title: "Distintivos y premios",
      body: "No hay distintivos institucionales ni reconocimientos acreditados para esta ficha.",
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
      Todo el contenido de esta vista es DEMO VISUAL para evaluación de plantilla. "Noche de
      Valladolid" es un evento ficticio: no existe, no tiene fecha vigente y no hay boletos,
      precios, cupo, countdown, rating, premios, certificaciones ni distintivos oficiales. No se
      escribe ni se lee información de negocio real, y nada de lo mostrado está publicado.
    </p>
  );
}

function PermissionMatrix({ role }: { role: Exclude<RoleView, "visitante"> }) {
  const isOrganizer = role === "organizador";
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-primary" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Matriz de permisos · {isOrganizer ? "Organizador" : "Administración"}
        </p>
      </div>
      <h2 className="mt-1 font-serif text-xl tracking-tight">
        Organizador edita → Administración revisa → Administración publica
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <PermissionList
          title="Puede hacer"
          items={isOrganizer ? ORGANIZER_CAN : ADMIN_CAN}
          tone="ok"
        />
        {isOrganizer ? (
          <PermissionList title="No puede hacer" items={ORGANIZER_CANNOT} tone="blocked" />
        ) : (
          <PermissionList
            title="Siempre protegido"
            items={[
              "Código, seguridad y contratos",
              "Datos de terceros",
              "Publicación automática: nunca",
              "Señales de confianza no acreditadas",
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
                    ["organizador", "Organizador"],
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
                dirección visual, galería y estado sólo aparecen para Organizador y Administración.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Dirección visual
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["editorial", "Editorial"],
                        ["cinematografico", "Cinematográfico"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set("direction", key)}
                        aria-pressed={value.direction === key}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs transition-colors",
                          value.direction === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {value.role === "organizador" ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      El organizador propone la variante; Administración revisa, aprueba y publica.
                      Nada se publica automáticamente.
                    </p>
                  ) : null}
                </div>

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

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Estado del evento (simulación local)
                  </p>
                  <div className="mt-2 grid gap-2">
                    {(
                      [
                        ["programado", "Programado"],
                        ["finalizado", "Finalizado"],
                        ["cancelado", "Cancelado"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set("status", key)}
                        aria-pressed={value.status === key}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs transition-colors",
                          value.status === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    El estado no consulta ni escribe datos: sólo cambia la acción dominante de la
                    plantilla.
                  </p>
                </div>
              </>
            )}

            <Toggle
              label="Relato documental"
              checked={value.showStory}
              onChange={(v) => set("showStory", v)}
            />
            <Toggle
              label="Programa"
              checked={value.showProgram}
              onChange={(v) => set("showProgram", v)}
            />
            <Toggle
              label="Galería"
              checked={value.showGallery}
              onChange={(v) => set("showGallery", v)}
            />
            <Toggle
              label="Mapa de sede"
              checked={value.showMap}
              onChange={(v) => set("showMap", v)}
            />
            <Toggle
              label="Información práctica"
              checked={value.showPractical}
              onChange={(v) => set("showPractical", v)}
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
