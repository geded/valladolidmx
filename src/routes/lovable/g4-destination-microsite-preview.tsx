/**
 * G4-A · Vista previa visual del micrositio de destino (Valladolid).
 *
 * Vista INTERNA, no indexable y no persistente. Sirve exclusivamente
 * para que el Founder evalúe y afine la imagen premium del micrositio
 * ANTES de tocar cualquier página pública.
 *
 * Reglas aplicadas:
 *  - Sólo medios gobernados existentes vía el proxy público estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas,
 *    sin imágenes nuevas.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`
 *    (`vmx.experience.map`). Prohibido otro sistema de mapas.
 *  - "Tours" NO es categoría pública: permanece como subtipo interno
 *    de Experiencias.
 *  - Pueblo Mágico se muestra sólo como estado editorial en texto.
 *    No se dibuja ni se reinterpreta el logotipo oficial.
 *  - El panel "Afinar micrositio" es local (useState). No persiste en
 *    base de datos ni modifica el CMS.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  Home,
  ChevronRight,
  Hotel,
  Images,
  Map as MapIcon,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lovable/g4-destination-microsite-preview")({
  head: () => ({
    meta: [
      { title: "G4-A · Vista previa micrositio Valladolid (interna)" },
      {
        name: "description",
        content: "Vista previa interna del micrositio premium de Valladolid. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4DestinationMicrositePreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  cover: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Torre de la catedral de San Servacio en tonos amarillo y blanco sobre la plaza central de Valladolid, Yucatán al atardecer dorado",
  },
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, bancas, palmeras y arcadas coloniales de herradura en tonos ocre y crema",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial colorida de Valladolid con fachadas pastel en terracota, ocre y amarillo, puertas de madera y buganvilia",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes y plataforma de madera cerca de Valladolid, Yucatán",
  },
  piramide: {
    url: `${GOVERNED}/experience-gallery-1.jpg`,
    alt: "Templo pirámide maya cubierto de vegetación con piedras talladas y selva de fondo bajo la luz dorada de la mañana",
  },
  bici: {
    url: `${GOVERNED}/experience-gallery-2.jpg`,
    alt: "Tour en bicicleta por calles coloniales coloridas de Valladolid con fachadas ocre y terracota, balcones de hierro y adoquín",
  },
  hotel: {
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
  restaurante: {
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
} as const;

/** Destinos con estado editorial Pueblo Mágico reconocido. */
const PUEBLOS_MAGICOS = ["valladolid", "izamal", "espita"] as const;
const isPuebloMagico = (slug: string) =>
  (PUEBLOS_MAGICOS as readonly string[]).includes(slug);

/* ------------------------------------------------------------------ *
 * Servicios del micrositio. Tours NO aparece: subtipo de Experiencias.
 * ------------------------------------------------------------------ */
const SERVICIOS = [
  { key: "hoteles", label: "Hoteles", hint: "Dónde dormir", icon: Hotel, media: MEDIA.hotel },
  {
    key: "restaurantes",
    label: "Restaurantes",
    hint: "Dónde comer",
    icon: UtensilsCrossed,
    media: MEDIA.restaurante,
  },
  { key: "que-hacer", label: "Qué hacer", hint: "Planes del día", icon: Compass, media: MEDIA.plaza },
  {
    key: "casas-de-vacaciones",
    label: "Casas de vacaciones",
    hint: "Estancias completas",
    icon: Home,
    media: MEDIA.habitacion,
  },
  {
    key: "experiencias",
    label: "Experiencias",
    hint: "Tours, cenotes y cultura viva",
    icon: Sparkles,
    media: MEDIA.cenote,
  },
  {
    key: "eventos",
    label: "Eventos",
    hint: "Qué pasa esta semana",
    icon: CalendarDays,
    media: MEDIA.terraza,
  },
  {
    key: "promociones",
    label: "Promociones",
    hint: "Ofertas verificadas",
    icon: Tag,
    media: MEDIA.cochinita,
  },
] as const;

const CERCANOS = [
  {
    slug: "chichen-itza",
    name: "Chichén Itzá",
    distance: "45 km · 40 min",
    tagline: "Maravilla del mundo y observatorio maya.",
    media: MEDIA.piramide,
  },
  {
    slug: "ek-balam",
    name: "Ek' Balam",
    distance: "28 km · 30 min",
    tagline: "La ciudad del jaguar negro y su cenote Xcanché.",
    media: MEDIA.bici,
  },
  {
    slug: "cenotes",
    name: "Ruta de cenotes",
    distance: "5–25 km",
    tagline: "Zací, Suytun, Oxman y Xkeken en un mismo día.",
    media: MEDIA.cenote,
  },
  {
    slug: "izamal",
    name: "Izamal",
    distance: "75 km · 1 h 10",
    tagline: "La ciudad amarilla, tres culturas en una plaza.",
    media: MEDIA.calle,
  },
  {
    slug: "rio-lagartos",
    name: "Río Lagartos y Las Coloradas",
    distance: "105 km · 1 h 40",
    tagline: "Flamencos, manglar y lagunas rosadas.",
    media: MEDIA.comedor,
  },
] as const;

const MAP_DTO: ExperienceMapDTO = {
  variant: "cluster",
  heading: "Explora Valladolid y su territorio",
  center: { lat: 20.6896, lng: -88.2011, zoom: 13 },
  points: [
    {
      id: "valladolid-centro",
      kind: "destination",
      lat: 20.6896,
      lng: -88.2011,
      title: "Centro histórico de Valladolid",
      subtitle: "Parque Francisco Cantón · San Servacio",
      href: null,
      thumbUrl: null,
      badge: "Pueblo Mágico",
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
    {
      id: "convento-sisal",
      kind: "business",
      lat: 20.6836,
      lng: -88.2098,
      title: "Convento de San Bernardino de Sisal",
      subtitle: "Patrimonio · s. XVI",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "ek-balam",
      kind: "destination",
      lat: 20.8917,
      lng: -88.1347,
      title: "Ek' Balam",
      subtitle: "Zona arqueológica",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "chichen-itza",
      kind: "destination",
      lat: 20.6843,
      lng: -88.5678,
      title: "Chichén Itzá",
      subtitle: "Patrimonio de la Humanidad",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
  ],
  capabilities: {
    showDistance: true,
    showDirections: true,
    clustering: true,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

/* ------------------------------------------------------------------ */

type HeroVariant = "mosaico" | "cinematografico";

interface TuningState {
  hero: HeroVariant;
  showDescription: boolean;
  showMap: boolean;
  showNearby: boolean;
}

function G4DestinationMicrositePreview() {
  const [tuning, setTuning] = useState<TuningState>({
    hero: "mosaico",
    showDescription: true,
    showMap: true,
    showNearby: true,
  });
  const [activeService, setActiveService] = useState<string>("hoteles");

  const service = useMemo(
    () => SERVICIOS.find((s) => s.key === activeService) ?? SERVICIOS[0],
    [activeService],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <PreviewRibbon />

      <Container className="pt-6">
        <TerritorialPath />
      </Container>

      <Container className="mt-5">
        {tuning.hero === "mosaico" ? <HeroMosaico /> : <HeroCinematografico />}
      </Container>

      <Container className="mt-12">
        <ServiciosStrip active={activeService} onSelect={setActiveService} />
      </Container>

      {tuning.showDescription ? (
        <Container className="mt-14">
          <DescubreValladolid />
        </Container>
      ) : null}

      <Container className="mt-14">
        <ServicioPreview service={service} />
      </Container>

      {tuning.showMap ? (
        <Container className="mt-16">
          <ExperienceMapBlock dto={MAP_DTO} />
        </Container>
      ) : null}

      {tuning.showNearby ? (
        <Container className="mt-16">
          <CercaDeValladolid />
        </Container>
      ) : null}

      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
  );
}

function PreviewRibbon() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Vista previa interna G4-A · Micrositio de destino (Valladolid) — no indexable, sin
      persistencia. No modifica páginas públicas ni el CMS.
    </div>
  );
}

function TerritorialPath() {
  return (
    <nav aria-label="Ruta territorial" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <Link to="/" className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground">
            Inicio
          </Link>
        </li>
        <ChevronRight className="size-3.5 opacity-50" aria-hidden />
        <li>
          <Link
            to="/oriente-maya"
            className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
          >
            Oriente Maya
          </Link>
        </li>
        <ChevronRight className="size-3.5 opacity-50" aria-hidden />
        <li aria-current="page" className="font-medium text-foreground">
          Valladolid
        </li>
      </ol>
    </nav>
  );
}

function EditorialStatus() {
  if (!isPuebloMagico("valladolid")) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
      Pueblo Mágico
      <span className="sr-only">
        (estado editorial provisional en texto; sin logotipo oficial)
      </span>
    </span>
  );
}

function HeroCopy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "max-w-2xl"}>
      <div className="flex flex-wrap items-center gap-2">
        <EditorialStatus />
        <span className="rounded-pill border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Oriente Maya · Yucatán
        </span>
      </div>
      <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        Valladolid
      </h1>
      <p className="mt-3 text-lg text-foreground/80 sm:text-xl">
        Capital Turística del Oriente Maya de Yucatán
      </p>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        Despierta aquí. Descubre desde Valladolid todo el Oriente Maya.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" className="rounded-pill px-6">
          Arma tu viaje
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
        <Button size="lg" variant="outline" className="rounded-pill px-6">
          <Images className="mr-2 size-4" aria-hidden />
          Ver galería
        </Button>
      </div>
    </div>
  );
}

function HeroMosaico() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <HeroCopy />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <img
          src={MEDIA.cover.url}
          alt={MEDIA.cover.alt}
          loading="eager"
          className="col-span-2 h-56 w-full rounded-3xl object-cover shadow-elevated sm:h-72"
        />
        <img
          src={MEDIA.plaza.url}
          alt={MEDIA.plaza.alt}
          loading="lazy"
          className="h-36 w-full rounded-2xl object-cover shadow-soft sm:h-44"
        />
        <img
          src={MEDIA.calle.url}
          alt={MEDIA.calle.alt}
          loading="lazy"
          className="h-36 w-full rounded-2xl object-cover shadow-soft sm:h-44"
        />
      </div>
    </section>
  );
}

function HeroCinematografico() {
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-floating">
      <img
        src={MEDIA.cover.url}
        alt={MEDIA.cover.alt}
        loading="eager"
        className="h-[420px] w-full object-cover sm:h-[520px]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
        <div className="rounded-3xl bg-background/85 p-6 backdrop-blur-md sm:max-w-xl sm:p-8">
          <HeroCopy compact />
        </div>
      </div>
    </section>
  );
}

function ServiciosStrip({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <section aria-label="Servicios del micrositio">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {SERVICIOS.map((s) => {
          const Icon = s.icon;
          const on = s.key === active;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelect(s.key)}
              aria-pressed={on}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-pill border px-4 py-2.5 text-sm transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {s.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tours forma parte de Experiencias (subtipo interno); no es una categoría pública
        independiente.
      </p>
    </section>
  );
}

function DescubreValladolid() {
  return (
    <section aria-labelledby="descubre-valladolid" className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">El destino</p>
        <h2 id="descubre-valladolid" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          Descubre Valladolid
        </h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/80">
          <p>
            Fundada en 1543 sobre el asentamiento maya de Zací, Valladolid conserva un centro
            histórico de calles empedradas, casonas de arcos de herradura y fachadas en ocre,
            terracota y añil. Su plaza principal, custodiada por la catedral de San Servacio y el
            Parque Francisco Cantón, sigue siendo el corazón social de la ciudad al caer la tarde.
          </p>
          <p>
            La cocina yucateca se vive aquí en su versión más honesta: cochinita pibil de horno de
            tierra, lomitos de Valladolid, longaniza ahumada y xtabentún. A pocos minutos del centro
            se abren los cenotes Zací, Suytun, Oxman y Xkeken, y en su territorio conviven talleres
            de bordado, comunidades mayas vivas y haciendas henequeneras.
          </p>
          <p>
            Por su ubicación, Valladolid es la base natural para recorrer el Oriente Maya: Chichén
            Itzá, Ek' Balam, Izamal, Río Lagartos y Las Coloradas están al alcance de una jornada.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <img
          src={MEDIA.calle.url}
          alt={MEDIA.calle.alt}
          loading="lazy"
          className="col-span-2 h-48 w-full rounded-2xl object-cover shadow-soft"
        />
        <img
          src={MEDIA.cochinita.url}
          alt={MEDIA.cochinita.alt}
          loading="lazy"
          className="h-40 w-full rounded-2xl object-cover shadow-soft"
        />
        <img
          src={MEDIA.cenote.url}
          alt={MEDIA.cenote.alt}
          loading="lazy"
          className="h-40 w-full rounded-2xl object-cover shadow-soft"
        />
      </div>
    </section>
  );
}

function ServicioPreview({ service }: { service: (typeof SERVICIOS)[number] }) {
  const Icon = service.icon;
  return (
    <section aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {service.hint}
          </p>
          <h2 className="mt-1 font-serif text-2xl tracking-tight sm:text-3xl">
            {service.label} en Valladolid
          </h2>
        </div>
        <Button variant="ghost" className="rounded-pill">
          Ver todo
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <article
            key={i}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <img
              src={service.media.url}
              alt={service.media.alt}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5" aria-hidden />
                {service.label}
              </div>
              <h3 className="mt-1.5 font-medium">Ficha de ejemplo {i + 1}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Contenido ilustrativo de maquetación. No representa datos publicados.
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CercaDeValladolid() {
  return (
    <section aria-labelledby="cerca-de-valladolid">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Oriente Maya</p>
      <h2 id="cerca-de-valladolid" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        Cerca de Valladolid
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Desde aquí se alcanza el resto del territorio en menos de dos horas.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CERCANOS.map((d) => (
          <article
            key={d.slug}
            className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <div className="relative">
              <img
                src={d.media.url}
                alt={d.media.alt}
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {isPuebloMagico(d.slug) ? (
                <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                  Pueblo Mágico
                </span>
              ) : null}
            </div>
            <div className="p-4">
              <h3 className="font-serif text-lg">{d.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.tagline}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground/70">
                <MapIcon className="size-3.5" aria-hidden />
                {d.distance}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

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
    <div className="fixed bottom-4 right-4 z-50 w-[min(20rem,calc(100vw-2rem))]">
      {open ? (
        <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-floating backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Afinar micrositio</p>
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
                Hero
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["mosaico", "Mosaico editorial"],
                    ["cinematografico", "Cinematográfico"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("hero", key)}
                    aria-pressed={value.hero === key}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-xs transition-colors",
                      value.hero === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Toggle
              label="Descripción del destino"
              checked={value.showDescription}
              onChange={(v) => set("showDescription", v)}
            />
            <Toggle label="Mapa" checked={value.showMap} onChange={(v) => set("showMap", v)} />
            <Toggle
              label="Destinos cercanos"
              checked={value.showNearby}
              onChange={(v) => set("showNearby", v)}
            />
          </div>
        </div>
      ) : (
        <Button className="rounded-pill shadow-floating" onClick={() => setOpen(true)}>
          <Building2 className="mr-2 size-4" aria-hidden />
          Afinar micrositio
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
