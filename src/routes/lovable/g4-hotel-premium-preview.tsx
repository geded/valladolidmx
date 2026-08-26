/**
 * G4-B · Vista previa visual de la Plantilla Premium de Hotel.
 *
 * Vista INTERNA, no indexable y sin persistencia. Caso visual
 * ficticio/acreditado: "Hacienda San Servacio Boutique".
 *
 * Reglas aplicadas:
 *  - Sólo medios gobernados existentes vía el proxy público estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas,
 *    sin subir, generar ni reemplazar imágenes.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`
 *    (`vmx.experience.map`). Prohibido otro sistema de mapas.
 *  - Todo el contenido (descripción, habitaciones, amenidades,
 *    políticas, contacto) está marcado como DEMO VISUAL. No hay
 *    precios, disponibilidad, reservas, reseñas ni distintivos
 *    inventados. Sin escrituras ni mutaciones de datos.
 *  - El panel "Afinar plantilla" es local (useState) y no persiste.
 *  - Conserva el lenguaje visual de G4-A (mismo sistema).
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  CalendarClock,
  Check,
  ChevronRight,
  Compass,
  Heart,
  Images,
  Lock,
  Mail,
  Map as MapIcon,
  MessageSquare,
  Phone,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  Wifi,
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
  toHotelPremiumVM,
  toPremiumSectionVM,
  type PremiumEntitySource,
} from "@/lib/omxds/presentation/vm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lovable/g4-hotel-premium-preview")({
  head: () => ({
    meta: [
      { title: "G4-B · Vista previa plantilla Premium de Hotel (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la plantilla premium de hotel de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4HotelPremiumPreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  cover: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio central con piscina estilo cenote y arcos de piedra en un hotel boutique colonial de Valladolid, Yucatán",
  },
  habitacion: {
    url: `${GOVERNED}/hotel-gallery-1.jpg`,
    alt: "Habitación colonial con vigas de madera, cama de hierro forjado y tina de piedra junto a ventana con vegetación tropical",
  },
  terraza: {
    url: `${GOVERNED}/hotel-gallery-2.jpg`,
    alt: "Terraza con vista a la torre de la catedral colonial de Valladolid al atardecer, con sillas tejidas y luces colgantes",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes y plataforma de madera cerca de Valladolid, Yucatán",
  },
  bici: {
    url: `${GOVERNED}/experience-gallery-2.jpg`,
    alt: "Tour en bicicleta por calles coloniales coloridas de Valladolid con fachadas ocre y terracota, balcones de hierro y adoquín",
  },
  restaurante: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y cenas iluminadas con velas frente a un cenote en Valladolid, Yucatán",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial colorida de Valladolid con fachadas pastel en terracota, ocre y amarillo, puertas de madera y buganvilia",
  },
} as const;

const HOTEL = {
  name: "Hacienda San Servacio Boutique",
  type: "Hotel boutique",
  location: "Centro Histórico de Valladolid",
  lat: 20.6889,
  lng: -88.2005,
} as const;

const GALLERY = [MEDIA.cover, MEDIA.habitacion, MEDIA.terraza] as const;

const ROOMS = [
  {
    id: "colonial",
    name: "Habitación Colonial",
    media: MEDIA.habitacion,
    capacity: "2 personas",
    bed: "1 cama king",
    features: ["Vigas originales", "Tina de piedra", "Patio interior"],
  },
  {
    id: "cenote",
    name: "Suite Cenote",
    media: MEDIA.cover,
    capacity: "2–3 personas",
    bed: "1 king + sofá cama",
    features: ["Vista a la alberca", "Terraza privada", "Hamaca yucateca"],
  },
  {
    id: "torre",
    name: "Suite Torre",
    media: MEDIA.terraza,
    capacity: "4 personas",
    bed: "2 camas queen",
    features: ["Vista a San Servacio", "Sala independiente", "Roof garden"],
  },
] as const;

const AMENITIES = [
  { icon: Wifi, label: "Wi-Fi en todo el hotel" },
  { icon: Sparkles, label: "Alberca estilo cenote" },
  { icon: UtensilsCrossed, label: "Desayuno yucateco" },
  { icon: BedDouble, label: "Aire acondicionado" },
  { icon: MapIcon, label: "Estacionamiento" },
  { icon: Users, label: "Accesibilidad en planta baja" },
] as const;

const POLICIES = [
  { label: "Check-in", value: "15:00 h" },
  { label: "Check-out", value: "12:00 h" },
  { label: "Recepción", value: "Atención 24 h" },
  { label: "Cancelación", value: "Flexible hasta 48 h antes" },
  { label: "Mascotas", value: "Permitidas bajo confirmación" },
  { label: "Menores", value: "Bienvenidos con cargo por persona extra" },
] as const;

const NEARBY = [
  {
    id: "cenote-zaci",
    name: "Cenote Zací",
    kind: "Qué hacer",
    distance: "600 m · 8 min a pie",
    media: MEDIA.cenote,
  },
  {
    id: "calzada-frailes",
    name: "Calzada de los Frailes",
    kind: "Experiencia",
    distance: "1.1 km · 15 min a pie",
    media: MEDIA.calle,
  },
  {
    id: "cocina-tradicional",
    name: "Cocina tradicional yucateca",
    kind: "Restaurante",
    distance: "400 m · 5 min a pie",
    media: MEDIA.restaurante,
  },
  {
    id: "tour-bici",
    name: "Recorrido en bicicleta por el centro",
    kind: "Experiencia",
    distance: "Salida desde el hotel",
    media: MEDIA.bici,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "single",
  heading: "Ubicación del hotel",
  center: { lat: HOTEL.lat, lng: HOTEL.lng, zoom: 15 },
  points: [
    {
      id: "hacienda-san-servacio",
      kind: "business",
      lat: HOTEL.lat,
      lng: HOTEL.lng,
      title: HOTEL.name,
      subtitle: `${HOTEL.type} · ${HOTEL.location}`,
      href: null,
      thumbUrl: null,
      badge: "Demo visual",
      priceLabel: null,
    },
    {
      id: "cenote-zaci",
      kind: "business",
      lat: 20.6907,
      lng: -88.1962,
      title: "Cenote Zací",
      subtitle: "Cenote urbano",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "calzada-frailes",
      kind: "business",
      lat: 20.6852,
      lng: -88.2072,
      title: "Calzada de los Frailes",
      subtitle: "Paseo colonial",
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

/* ------------------------------------------------------------------ *
 * Matriz de permisos (informativa, sin efectos).
 * ------------------------------------------------------------------ */
const OWNER_CAPS = [
  "Descripción del hotel",
  "Datos de contacto",
  "Horarios y políticas",
  "Amenidades y servicios",
  "Habitaciones y características",
  "Imágenes propuestas",
  "Promociones",
  "Enlaces de solicitud",
  "Orden de las secciones permitidas",
  "Guardar borrador y enviar a revisión",
] as const;

const ADMIN_CAPS = [
  "Editar y corregir todo lo anterior",
  "Aprobar, rechazar y publicar",
  "Categoría y jerarquía territorial",
  "Verificación de ubicación",
  "Aprobación de imágenes y derechos",
  "SEO y canonical",
  "Estado Premium de la ficha",
  "Distintivos oficiales acreditados",
  "Bloqueo de secciones obligatorias",
  "Auditoría y restauración de versiones",
] as const;

const PROTECTED_CAPS = [
  "Código y estructura del sistema",
  "Reglas de seguridad",
  "Datos de otras empresas",
  "Distintivos no acreditados",
  "Contratos técnicos",
  "Publicación automática sin aprobación",
] as const;

/* ------------------------------------------------------------------ */

/**
 * Corrección conceptual vinculante:
 *  - DIRECCIÓN VISUAL (Editorial | Cinematográfico) = dirección de arte.
 *  - GALERÍA (Mosaico | Carrusel | Cuadrícula | Tira) = configuración
 *    independiente de la galería. "Mosaico" NO es sinónimo de Editorial.
 */
type VisualDirection = "editorial" | "cinematografico";
type GalleryLayout = "mosaico" | "carrusel" | "cuadricula" | "tira";
type RoleView = "visitante" | "propietario" | "administracion";

interface TuningState {
  direction: VisualDirection;
  gallery: GalleryLayout;
  showDescription: boolean;
  showRooms: boolean;
  showAmenities: boolean;
  showMap: boolean;
  showPolicies: boolean;
  showNearby: boolean;
  role: RoleView;
}

function G4HotelPremiumPreview() {
  const [tuning, setTuning] = useState<TuningState>({
    direction: "editorial",
    gallery: "mosaico",
    showDescription: true,
    showRooms: true,
    showAmenities: true,
    showMap: true,
    showPolicies: true,
    showNearby: true,
    role: "visitante",
  });

  const presentation = tuning.direction === "editorial" ? "editorial" : "cinematic";
  const vm = toHotelPremiumVM(
    { ...HOTEL_SOURCE, actions: <HeroActions /> },
    { crumbTail: [{ label: "Hoteles" }, { label: HOTEL.name }] },
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

      <Container className="mt-12">
        <GallerySection layout={tuning.gallery} />
      </Container>

      {tuning.showDescription ? (
        <Container className="mt-14">
          <Descripcion />
        </Container>
      ) : null}

      {tuning.showRooms ? (
        <Container className="mt-16">
          <Habitaciones />
        </Container>
      ) : null}

      {tuning.showAmenities ? (
        <Container className="mt-16">
          <Amenidades />
        </Container>
      ) : null}

      {tuning.showMap ? (
        <Container className="mt-16">
          <ExperienceMapBlock dto={MAP_DTO} />
        </Container>
      ) : null}

      {tuning.showPolicies ? (
        <Container className="mt-16">
          <PoliticasYContacto />
        </Container>
      ) : null}

      <Container className="mt-16">
        <Confianza />
      </Container>

      {tuning.showNearby ? (
        <Container className="mt-16">
          <CercaDelHotel />
        </Container>
      ) : null}

      <Container className="mt-16">
        <CtaFinal />
      </Container>

      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
  );
}

function PreviewRibbon() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Vista previa interna G4-B · Plantilla Premium de Hotel — no indexable, sin persistencia. Caso
      visual ficticio; no modifica fichas reales, datos ni el CMS.
    </div>
  );
}

function DemoTag({ children = "Demo visual" }: { children?: string }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * Fuente plana del caso DEMO. El runtime premium compartido
 * (`toHotelPremiumVM`) construye hero, galería y breadcrumb: este
 * preview ya no reimplementa ninguna de esas piezas.
 */
const HOTEL_SOURCE = {
  title: HOTEL.name,
  eyebrow: HOTEL.type,
  subtitle: "Una casona del siglo XVIII a dos calles de la catedral de San Servacio.",
  cover: MEDIA.cover,
  gallery: GALLERY,
  destination: { slug: "valladolid", label: "Valladolid" },
  badges: [
    { label: HOTEL.location, tone: "neutral" as const },
    { label: "Ficha en preparación", tone: "neutral" as const },
  ],
  facts: [
    {
      label: "Ubicación",
      value: HOTEL.location,
      icon: <Compass className="size-3.5" aria-hidden />,
    },
    {
      label: "Habitaciones",
      value: "12 llaves",
      icon: <BedDouble className="size-3.5" aria-hidden />,
    },
    {
      label: "Capacidad",
      value: "2 a 4 personas",
      icon: <Users className="size-3.5" aria-hidden />,
    },
  ],
} satisfies PremiumEntitySource;

function HeroActions() {
  return (
    <>
      <Button size="lg" className="rounded-pill px-6">
        Solicitar disponibilidad
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
      <Button size="lg" variant="outline" className="rounded-pill px-6">
        <Heart className="mr-2 size-4" aria-hidden />
        Agregar a mi viaje
      </Button>
    </>
  );
}

function GallerySection({ layout }: { layout: GalleryLayout }) {
  const vm = toHotelPremiumVM(HOTEL_SOURCE, { galleryLayout: layout });
  return (
    <PremiumSection
      vm={toPremiumSectionVM({
        id: "galeria-hotel",
        eyebrow: "Galería",
        title: "Espacios del hotel",
        action: (
          <Button variant="ghost" className="rounded-pill">
            <Images className="mr-2 size-4" aria-hidden />
            Ver todas
          </Button>
        ),
      })}
    >
      <PremiumGallery vm={vm.gallery} />
      <p className="mt-2 text-xs text-muted-foreground">
        Fotografías gobernadas existentes servidas por ruta pública estable. Sin URLs firmadas.
      </p>
    </PremiumSection>
  );
}

function Descripcion() {
  return (
    <section aria-labelledby="descripcion-hotel" className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">El hotel</p>
          <DemoTag>Contenido de demostración</DemoTag>
        </div>
        <h2 id="descripcion-hotel" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          Historia y propuesta de valor
        </h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/80">
          <p>
            Texto de demostración del preview, no dato publicado. La casona se organiza alrededor de
            un patio de arcos de piedra, con una alberca inspirada en los cenotes de la región y una
            terraza abierta a la torre de San Servacio.
          </p>
          <p>
            La propuesta combina hospitalidad yucateca, cocina de recado y un servicio de concierge
            que arma el día del huésped entre cenotes, zonas arqueológicas y talleres del centro
            histórico.
          </p>
        </div>
      </div>
      <img
        src={MEDIA.terraza.url}
        alt={MEDIA.terraza.alt}
        loading="lazy"
        className="h-full min-h-56 w-full rounded-3xl object-cover shadow-elevated"
      />
    </section>
  );
}

function Habitaciones() {
  return (
    <section aria-labelledby="habitaciones-hotel">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Hospedaje</p>
        <DemoTag>Datos demo · sin precios ni disponibilidad</DemoTag>
      </div>
      <h2 id="habitaciones-hotel" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Habitaciones
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROOMS.map((r) => (
          <article
            key={r.id}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <img
              src={r.media.url}
              alt={r.media.alt}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="font-serif text-lg">{r.name}</h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {r.capacity}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BedDouble className="size-3.5" aria-hidden />
                  {r.bed}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-foreground/80">
                {r.features.map((f) => (
                  <li key={f} className="inline-flex items-center gap-2">
                    <Check className="size-3.5 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-4 w-full rounded-pill">
                Solicitar disponibilidad
              </Button>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Tarjetas demostrativas de maquetación. No hay motor de reservas, tarifas ni inventario real
        en este preview.
      </p>
    </section>
  );
}

function Amenidades() {
  return (
    <section aria-labelledby="amenidades-hotel">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Servicios</p>
        <DemoTag>Ejemplos visuales · no acreditados</DemoTag>
      </div>
      <h2 id="amenidades-hotel" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Amenidades y servicios
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AMENITIES.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
            >
              <Icon className="size-4 text-primary" aria-hidden />
              <span className="text-sm">{a.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PoliticasYContacto() {
  return (
    <section aria-labelledby="politicas-hotel" className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Estancia</p>
          <DemoTag>Datos demo</DemoTag>
        </div>
        <h2 id="politicas-hotel" className="mt-2 font-serif text-3xl tracking-tight">
          Horarios y políticas
        </h2>
        <dl className="mt-5 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {POLICIES.map((p) => (
            <div key={p.label} className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-3.5" aria-hidden />
                {p.label}
              </dt>
              <dd className="text-sm text-foreground">{p.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Contacto</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">Cómo comunicarte</h2>
        <div className="mt-5 space-y-3">
          {[
            { icon: Phone, label: "Teléfono", value: "Se muestra al publicar la ficha" },
            { icon: Mail, label: "Correo", value: "Se muestra al publicar la ficha" },
            { icon: MessageSquare, label: "WhatsApp", value: "Se muestra al publicar la ficha" },
            { icon: MapIcon, label: "Dirección", value: HOTEL.location },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
              >
                <Icon className="size-4 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-sm">{c.value}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Sección demostrativa. No se guardan ni se inventan datos de contacto reales.
        </p>
      </div>
    </section>
  );
}

function Confianza() {
  return (
    <section aria-labelledby="confianza-hotel">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Confianza</p>
      <h2 id="confianza-hotel" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Opiniones y distintivos
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <Star className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-serif text-lg">Opiniones verificadas próximamente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No se muestran calificaciones, estrellas ni número de reseñas sin fuente gobernada.
          </p>
        </div>
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <Shield className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-serif text-lg">Distintivos acreditados próximamente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los distintivos oficiales sólo se muestran con archivo y derechos acreditados por
            Administración.
          </p>
        </div>
      </div>
    </section>
  );
}

function CercaDelHotel() {
  return (
    <section aria-labelledby="cerca-hotel">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Valladolid, centro del Oriente Maya
      </p>
      <h2 id="cerca-hotel" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Qué hacer cerca del hotel
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Experiencias, restaurantes y atractivos del micrositio de Valladolid. Contenido ilustrativo
        de maquetación.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NEARBY.map((n) => (
          <article
            key={n.id}
            className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <img
              src={n.media.url}
              alt={n.media.alt}
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{n.kind}</p>
              <h3 className="mt-1 font-serif text-lg">{n.name}</h3>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground/70">
                <Compass className="size-3.5" aria-hidden />
                {n.distance}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-elevated sm:p-10">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">
            ¿Te quedas en {HOTEL.name}?
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            En este preview no se procesan pagos ni reservas. Las acciones son ilustrativas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className="rounded-pill px-6">
            Solicitar disponibilidad
          </Button>
          <Button size="lg" variant="outline" className="rounded-pill px-6">
            <Heart className="mr-2 size-4" aria-hidden />
            Agregar a mi viaje
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Matriz visible de permisos + flujo editorial.
 * ------------------------------------------------------------------ */
function PermissionMatrix({ role }: { role: Exclude<RoleView, "visitante"> }) {
  const isOwner = role === "propietario";
  return (
    <section
      aria-label="Matriz de permisos"
      className="rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="size-4 text-primary" aria-hidden />
        <p className="text-sm font-medium">
          Vista simulada: {isOwner ? "Propietario del hotel" : "Administración Valladolid.mx"}
        </p>
        <DemoTag>Sólo informativo · sin efectos</DemoTag>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <CapsCard
          title="Propietario puede editar"
          items={OWNER_CAPS}
          highlighted={isOwner}
          tone="owner"
        />
        <CapsCard
          title="Administración puede hacer"
          items={ADMIN_CAPS}
          highlighted={!isOwner}
          tone="admin"
        />
        <CapsCard title="Protegido para ambos" items={PROTECTED_CAPS} tone="locked" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        {["Propietario edita", "Administración revisa", "Administración publica"].map((step, i) => (
          <span key={step} className="inline-flex items-center gap-2">
            {i > 0 ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden /> : null}
            <span className="rounded-pill border border-border bg-background px-3 py-1.5">
              {step}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

function CapsCard({
  title,
  items,
  highlighted = false,
  tone,
}: {
  title: string;
  items: readonly string[];
  highlighted?: boolean;
  tone: "owner" | "admin" | "locked";
}) {
  const Icon = tone === "locked" ? Lock : Check;
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft",
        highlighted ? "border-primary" : "border-border",
        tone === "locked" && "bg-muted/40",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Icon
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                tone === "locked" ? "text-muted-foreground" : "text-primary",
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
            {value.role === "visitante" ? (
              <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                La vista Visitante muestra únicamente el resultado limpio. Los controles de
                dirección visual y galería sólo aparecen para Propietario y Administración.
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
                  {value.role === "propietario" ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      El propietario propone la variante; Administración revisa, aprueba y publica.
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
              </>
            )}

            <Toggle
              label="Descripción"
              checked={value.showDescription}
              onChange={(v) => set("showDescription", v)}
            />
            <Toggle
              label="Habitaciones"
              checked={value.showRooms}
              onChange={(v) => set("showRooms", v)}
            />
            <Toggle
              label="Amenidades"
              checked={value.showAmenities}
              onChange={(v) => set("showAmenities", v)}
            />
            <Toggle label="Mapa" checked={value.showMap} onChange={(v) => set("showMap", v)} />
            <Toggle
              label="Políticas y contacto"
              checked={value.showPolicies}
              onChange={(v) => set("showPolicies", v)}
            />
            <Toggle
              label="Recomendaciones cercanas"
              checked={value.showNearby}
              onChange={(v) => set("showNearby", v)}
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vista simulada
              </p>
              <div className="mt-2 grid gap-2">
                {(
                  [
                    ["visitante", "Visitante"],
                    ["propietario", "Propietario del hotel"],
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
