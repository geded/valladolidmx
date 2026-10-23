/**
 * G8-E · `DestinationPremiumSurface` — autoridad visual única del
 * Micrositio de Destino Premium G4.
 *
 * Extraída literalmente de la vista interna aprobada
 * `/lovable/g4-destination-microsite-preview`. La consumen, con el MISMO
 * componente y sin duplicar JSX:
 *  - la vista previa interna G4-A,
 *  - Studio (canvas y vista previa),
 *  - producción vía `CompositionRenderer` (`vmx.destination.premium-g4`).
 *
 * Reglas conservadas:
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - Iconografía de categorías exclusivamente con `CategoryNavGrid`
 *    (glifos bordados G6, fail-closed).
 *  - "Tours" no es categoría pública: subtipo interno de Experiencias.
 *  - Pueblo Mágico sólo desde el registro y la marca institucional acreditada.
 *  - Este componente NO renderiza chrome global (header/footer/ribbon).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Home,
  Hotel,
  Images,
  Map as MapIcon,
  MapPin,
  Search,
  Sparkles,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { ShareSheet } from "@/components/share/ShareSheet";
import { resolveCanonicalPath } from "@/lib/navigation/canonical-paths";
import { Container } from "@/components/layout/Container";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";
import { resolveMediaSource } from "@/lib/media/resolve-source";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import { PremiumTerritorialBreadcrumb } from "@/components/premium";
import { InstitutionalBadgesBlock } from "@/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock";
import {
  routeDurationLabel,
  routePublicPath,
  type EditorialRouteCardDTO,
} from "@/lib/routes-editorial/route-public-contract";
import { recordAluxSignal } from "@/lib/alux/memory-store";
import {
  DESTINATION_PREMIUM_G4_CONTENT,
  DESTINATION_PREMIUM_SECTION_ORDER,
  isPuebloMagico,
  type DestinationPremiumContent,
  type DestinationPremiumMedia,
  type DestinationPremiumSectionKey,
  type DestinationPremiumService,
} from "./destination-premium-content";

export type DestinationHeroVariant = "editorial" | "cinematic";
export type DestinationGalleryLayout = "mosaico" | "carrusel" | "cuadricula" | "tira";

export interface DestinationPremiumSurfaceProps {
  /**
   * Cuando el shell público ya emite la ruta territorial, la superficie
   * no debe duplicarla. Default `true` (Studio y previews aislados).
   */
  showBreadcrumbs?: boolean;
  content?: DestinationPremiumContent;
  heroVariant?: DestinationHeroVariant;
  galleryLayout?: DestinationGalleryLayout;
  sections?: Partial<Record<DestinationPremiumSectionKey, boolean>>;
  /**
   * Orden editable de secciones (Experience Builder). Ausente ⇒ orden
   * aprobado `DESTINATION_PREMIUM_SECTION_ORDER`. No cambia el diseño.
   */
  order?: readonly DestinationPremiumSectionKey[];
  /** Servicio activo inicial (clave de categoría). */
  initialService?: string;
  className?: string;
  /** Runtime productivo del CMS; sustituye las tarjetas ilustrativas G4. */
  renderServicePreview?: (service: DestinationPremiumService) => ReactNode;
  /**
   * En producción pública, cada categoría continúa por su URL territorial.
   * Studio y previews conservan por defecto la selección local aprobada.
   */
  serviceNavigation?: "preview" | "territorial";
  /** Enlaces canónicos resueltos contra categorías publicadas del CMS. */
  serviceHrefByKey?: Readonly<Record<string, string>>;
  /** Acción canónica Guardar/Mi Viaje, inyectada sin duplicar su lógica. */
  heroAction?: ReactNode;
  /** Rutas editoriales publicadas del CMS; nunca fixtures ni inferencias. */
  routes?: readonly EditorialRouteCardDTO[];
}

const SERVICE_ICONS: Record<string, LucideIcon> = {
  hoteles: Hotel,
  restaurantes: UtensilsCrossed,
  "que-hacer": Compass,
  "casas-de-vacaciones": Home,
  experiencias: Sparkles,
  eventos: CalendarDays,
  promociones: Tag,
  lugares: MapPin,
};

export function DestinationPremiumSurface({
  showBreadcrumbs = true,
  content = DESTINATION_PREMIUM_G4_CONTENT,
  heroVariant = "editorial",
  galleryLayout = "mosaico",
  sections,
  order = DESTINATION_PREMIUM_SECTION_ORDER,
  initialService,
  className,
  renderServicePreview,
  serviceNavigation = "preview",
  serviceHrefByKey = {},
  heroAction,
  routes = [],
}: DestinationPremiumSurfaceProps) {
  const visible = (key: DestinationPremiumSectionKey) => sections?.[key] !== false;
  const [activeService, setActiveService] = useState<string>(
    initialService ?? content.services[0]?.key ?? "hoteles",
  );

  const service = useMemo(
    () => content.services.find((s) => s.key === activeService) ?? content.services[0],
    [content.services, activeService],
  );

  const mapDto: ExperienceMapDTO = useMemo(
    () => ({
      variant: "cluster",
      heading: content.map.heading,
      center: content.map.center,
      points: content.map.points.map((p) => ({
        id: p.id,
        kind: p.kind,
        lat: p.lat,
        lng: p.lng,
        title: p.title,
        subtitle: p.subtitle,
        href: p.href ?? null,
        thumbUrl: null,
        badge: p.badge,
        priceLabel: null,
      })),
      capabilities: {
        showDistance: true,
        showDirections: true,
        clustering: true,
        syncList: false,
        staticFallback: true,
        allowInteractiveToggle: true,
      },
      emptyMessage: null,
    }),
    [content.map],
  );

  return (
    <div className={cn("pb-24", className)}>
      {showBreadcrumbs ? (
        <Container className="pt-6">
          <PremiumTerritorialBreadcrumb crumbs={content.breadcrumbs} compactOnMobile />
        </Container>
      ) : null}

      {order.map((key) => {
        // Marcador de sección para el Experience Builder. No altera el render
        // público: sólo permite seleccionar y reordenar la sección aprobada.
        const node = ((): React.ReactNode => {
          if (!visible(key)) return null;
          switch (key) {
            case "hero":
              return (
                <Container key={key} className="mt-5">
                  {heroVariant === "cinematic" ? (
                    <HeroCinematografico content={content} heroAction={heroAction} />
                  ) : (
                    <HeroEditorial content={content} heroAction={heroAction} />
                  )}
                </Container>
              );
            case "services":
              return (
                <div key={key}>
                  <Container className="mt-8">
                    <AluxDestinationGuide content={content} />
                  </Container>
                  <Container className="mt-8">
                    <ServiciosStrip
                      content={content}
                      active={activeService}
                      onSelect={setActiveService}
                      navigation={serviceNavigation}
                      hrefByKey={serviceHrefByKey}
                    />
                  </Container>
                </div>
              );
            case "descubre": {
              // Sin párrafos propios y sin medios la sección sólo aportaba
              // espacio en blanco: no se renderiza.
              const hasDescubreText = content.descubre.paragraphs.some((p) => p.trim().length > 0);
              const hasDescubreMedia = content.descubre.media.some((m) => Boolean(m.url));
              if (!hasDescubreText && !hasDescubreMedia) return null;
              return (
                <Container key={key} className={heroVariant === "editorial" ? "mt-8" : "mt-14"}>
                  <DescubreDestino content={content} compactTop={heroVariant === "editorial"} />
                </Container>
              );
            }
            case "gallery": {
              // Sin fotografías propias la galería sólo aportaba espacio en blanco.
              const hasGalleryMedia = content.gallery.items.some((m) => Boolean(m.url));
              if (!hasGalleryMedia) return null;
              // Portada editorial tipo Airbnb: todas las fotografías ya viven en
              // "Ver todas las fotos"; no se repite una segunda galería suelta.
              if (heroVariant !== "cinematic") return null;
              return (
                <Container key={key} className="mt-14">
                  <GaleriaEditorial content={content} layout={galleryLayout} />
                </Container>
              );
            }
            case "servicePreview":
              return service ? (
                <Container key={key} className="mt-14">
                  {renderServicePreview ? (
                    renderServicePreview(service)
                  ) : (
                    <ServicioPreview content={content} service={service} />
                  )}
                </Container>
              ) : null;
            case "routes":
              return routes.length > 0 ? (
                <Container key={key} className="mt-14">
                  <DestinationRoutes content={content} routes={routes} />
                </Container>
              ) : null;
            case "map":
              return (
                <Container key={key} className="mt-16">
                  <ExperienceMapBlock dto={mapDto} />
                </Container>
              );
            case "nearby":
              return (
                <Container key={key} className="mt-16">
                  <CercaDelDestino content={content} />
                </Container>
              );
            default:
              return null;
          }
        })();
        return node ? (
          <div key={key} data-eb-section={key}>
            {node}
          </div>
        ) : null;
      })}
    </div>
  );
}

function DestinationRoutes({
  content,
  routes,
}: {
  content: DestinationPremiumContent;
  routes: readonly EditorialRouteCardDTO[];
}) {
  const belongsHere = (route: EditorialRouteCardDTO) =>
    route.originDestinationSlug === content.slug || route.destinationSlugs.includes(content.slug);
  const local = routes.filter(belongsHere).slice(0, 3);
  const nearby = routes.filter((route) => !belongsHere(route)).slice(0, 3);

  const group = (
    id: string,
    kicker: string,
    title: string,
    description: string,
    items: readonly EditorialRouteCardDTO[],
  ) =>
    items.length > 0 ? (
      <section aria-labelledby={id} className="mt-10 first:mt-0">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{kicker}</p>
        <h2 id={id} className="mt-2 font-serif text-xl leading-snug sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto pb-2 pr-4 [scrollbar-width:thin] [&>a]:w-60 [&>a]:max-w-[calc(100%-1rem)] [&>a]:shrink-0 [&>a]:snap-start">
          {items.map((route) => (
            <Link
              key={route.id}
              to={routePublicPath(route.slug)}
              onClick={() =>
                recordAluxSignal({
                  kind: "entity_viewed",
                  key: `route:${route.slug}`,
                  at: Date.now(),
                  purpose: "personalization",
                })
              }
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {route.coverUrl ? (
                <EditorialMediaFrame
                  media={{ url: route.coverUrl, alt: route.coverAlt ?? route.name, asset: route.coverAsset }}
                  label={route.name}
                  className="aspect-video w-full shrink-0 object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : null}
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {route.originDestinationLabel ?? "Oriente Maya de Yucatán"}
                </p>
                <h3 className="mt-1 font-serif text-base font-semibold leading-snug">{route.name}</h3>
                {route.summary ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{route.summary}</p>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {[
                    routeDurationLabel(route),
                    route.stopCount ? `${route.stopCount} paradas` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div data-destination-routes="cms-published">
      {group(
        "rutas-del-destino",
        "Explora con intención",
        `Rutas para vivir ${content.hero.title}`,
        "Itinerarios publicados que parten de este destino o lo incluyen entre sus paradas.",
        local,
      )}
      {group(
        "rutas-cercanas",
        "Continúa por el territorio",
        `Sigue explorando: rutas en destinos cercanos a ${content.hero.title}`,
        "Descubre otros recorridos publicados y continúa tu viaje por el Oriente Maya de Yucatán.",
        nearby,
      )}
    </div>
  );
}

function AluxDestinationGuide({ content }: { content: DestinationPremiumContent }) {
  return (
    <TourismAluxPanel
      title={`Explora ${content.hero.title} según tu momento`}
      description="Cuéntame si estás planeando venir o si ya estás aquí. Usaré fechas, compañía y guardados; la ubicación sólo cuando estés en la región y la autorices."
      task={`Ayúdame a explorar ${content.hero.title} usando el contexto real de Mi Viaje.`}
      prompts={["Estoy planeando", "Ya estoy aquí", "Viajo en pareja", "Viajo en familia"]}
    />
  );
}

/* ------------------------------------------------------------------ */

function DestinationIdentity({ content }: { content: DestinationPremiumContent }) {
  const items = [
    ...(content.hero.statusBadge && isPuebloMagico(content.slug)
      ? [
          {
            kind: "pueblo-magico" as const,
            slug: `pueblo-magico:${content.slug}`,
            source: "destination" as const,
          },
        ]
      : []),
    {
      kind: "oriente-maya" as const,
      slug: `oriente-maya:${content.slug}`,
      source: "destination" as const,
    },
  ];
  return (
    <InstitutionalBadgesBlock
      className="w-auto [&>ul]:justify-center"
      navigationHrefs={{
        "pueblo-magico": `${resolveCanonicalPath({ kind: "region", slug: "oriente-maya" })}?destination=${encodeURIComponent(content.slug)}#pueblos-magicos`,
        "oriente-maya": `${resolveCanonicalPath({ kind: "region", slug: "oriente-maya" })}?destination=${encodeURIComponent(content.slug)}`,
      }}
      config={{
        source: "destination",
        subjectSlug: content.slug,
        variant: "soft",
        size: "md",
        layout: "strip",
        items,
        ariaLabel: `Identidad institucional de ${content.hero.title}`,
        capabilities: { showLabel: true, showTooltip: true, mobileVisibleMax: 3 },
      }}
    />
  );
}

function HeroCopy({
  content,
  compact = false,
  distributed = false,
  heroAction,
}: {
  content: DestinationPremiumContent;
  compact?: boolean;
  distributed?: boolean;
  heroAction?: ReactNode;
}) {
  return (
    <div className={cn(compact ? "min-w-0" : "max-w-2xl", !distributed && "text-center")}>
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
      <DestinationIdentity content={content} />
      <Button variant="ghost" size="sm" className="h-8 rounded-pill px-3 text-xs font-medium" asChild>
        <Link to="/arma-tu-viaje" search={{ destination: content.slug, destinationLabel: content.hero.title }}>
          {content.hero.primaryCta.label}<ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </Link>
      </Button>
      </div>
      <div className={cn("mt-3", distributed && "grid min-w-0 gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:gap-x-10")}>
      <div className="min-w-0">
      <h1 className="text-balance font-serif text-3xl leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-[3.1rem]">
        {content.hero.title}
      </h1>
      <p className="mt-2.5 text-base text-foreground/80 sm:text-lg">{content.hero.subtitle}</p>
      {content.hero.description ? (
        <p className={cn("mt-3 line-clamp-3 max-w-xl text-sm leading-6 text-muted-foreground", !distributed && "mx-auto")}>
          {content.hero.description}
        </p>
      ) : null}
      </div>
      {/* Acciones compactas y armonizadas con el entorno (paridad con Home). */}
      <div className={cn("flex min-w-0 flex-wrap items-center gap-1 gap-y-2", distributed ? "justify-start sm:shrink-0 sm:flex-nowrap sm:justify-end max-sm:[&>a]:min-h-11 max-sm:[&>button]:min-h-11 max-sm:[&>a]:px-1 max-sm:[&>button]:px-1 max-sm:[&>a]:text-xs max-sm:[&>button]:text-xs max-sm:[&>a]:gap-1 max-sm:[&>button]:gap-1 max-sm:[&>a_svg]:mr-0 max-sm:[&>button_svg]:mr-0 max-sm:[&>a_svg]:size-3.5 max-sm:[&>button_svg]:size-3.5" : "mt-4 justify-center")}>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 rounded-pill px-3 text-[13px] text-foreground/70 hover:text-foreground sm:h-10 sm:text-sm"
          asChild
        >
          <a href={content.hero.secondaryCta.href}>
            <Images className="mr-1.5 size-4" aria-hidden />
            {content.hero.secondaryCta.label}
          </a>
        </Button>
        <DestinationShareButton title={content.hero.title} />
        {heroAction}
      </div>
      </div>
    </div>
  );
}

/* Compartir destino: mismo patrón oficial (ShareSheet) que lugares y empresas. */
function DestinationShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-9 rounded-pill px-3 text-[13px] text-foreground/70 hover:text-foreground sm:h-10 sm:text-sm"
      >
        <Share2 className="mr-1.5 size-4" aria-hidden />
        Compartir
      </Button>
      <ShareSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        url={typeof window !== "undefined" ? window.location.href : ""}
        text="Descubre este destino del Oriente Maya."
        heading="Compartir destino"
      />
    </>
  );
}

function HeroEditorial({
  content,
  heroAction,
}: {
  content: DestinationPremiumContent;
  heroAction?: ReactNode;
}) {
  const hasCover = Boolean(content.hero.cover.url);
  const slides = [content.hero.cover, ...content.hero.supporting].filter((m) =>
    Boolean(m?.url),
  ) as DestinationPremiumMedia[];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const total = slides.length;
  const mosaic = slides.slice(0, 5);
  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  return (
    // Portada tipo Airbnb: la fotografía manda; título y acciones debajo.
    <section aria-label={`Fotografías y presentación de ${content.hero.title}`}>
      <div data-destination-media={hasCover ? "g8-m1" : "editorial-neutral"}>
        {total === 0 ? (
          <EditorialMediaFrame
            media={null}
            label={content.hero.title}
            className="h-60 w-full rounded-3xl sm:h-96"
            markerClassName="shadow-soft"
          />
        ) : (
          <>
            {/* Móvil: deslizable a todo el ancho con contador. */}
            <div className="relative -mx-4 sm:hidden">
              <ul
                className="flex snap-x snap-mandatory overflow-x-auto"
                aria-label={`Fotografías de ${content.hero.title}`}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
                }}
              >
                {slides.map((m, i) => (
                  <li key={(m.url || "s") + i} className="w-full shrink-0 snap-center">
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => openAt(i)}
                      aria-label={`Ampliar fotografía ${i + 1} de ${total}`}
                    >
                      <EditorialMediaFrame
                        media={m}
                        label={content.hero.title}
                        loading={i === 0 ? "eager" : "lazy"}
                        context="hero"
                        sizes="100vw"
                        className="h-72 w-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
              {total > 1 ? (
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-foreground/70 px-2 py-1 text-xs font-semibold text-background">
                  {Math.min(index, total - 1) + 1} / {total}
                </span>
              ) : null}
            </div>
            {/* Tableta y escritorio: mosaico de hasta 5 fotografías. */}
            <div
              className={cn(
                "relative hidden gap-2 overflow-hidden rounded-3xl sm:grid sm:h-[22rem] lg:h-[28rem]",
                mosaic.length >= 5
                  ? "sm:grid-cols-4 sm:grid-rows-2"
                  : mosaic.length >= 3
                    ? "sm:grid-cols-3 sm:grid-rows-2"
                    : mosaic.length === 2
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-1",
              )}
            >
              {mosaic.map((m, i) => (
                <button
                  key={(m.url || "m") + i}
                  type="button"
                  onClick={() => openAt(i)}
                  aria-label={`Ampliar fotografía ${i + 1} de ${total}`}
                  className={cn(
                    "group relative min-h-0 overflow-hidden ring-focus",
                    i === 0 && mosaic.length >= 3 && "col-span-2 row-span-2",
                    i === 0 && mosaic.length === 3 && "col-span-2",
                  )}
                >
                  <EditorialMediaFrame
                    media={m}
                    label={content.hero.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : undefined}
                    context="hero"
                    sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
                    className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </button>
              ))}
              {total > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openAt(0)}
                  className="absolute bottom-4 right-4 bg-background"
                >
                  <Images className="size-4" aria-hidden />
                  Ver todas las fotos ({total})
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
      <div className="mt-5 sm:mt-6">
        <HeroCopy content={content} compact distributed heroAction={heroAction} />
        {total > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openAt(0)}
            className="mt-3 sm:hidden"
          >
            <Images className="size-4" aria-hidden />
            Ver las {total} fotos
          </Button>
        ) : null}
      </div>
      <DestinationPhotoLightbox
        title={content.hero.title}
        slides={slides}
        open={open}
        index={index}
        onIndex={setIndex}
        onOpenChange={setOpen}
      />
    </section>
  );
}

function DestinationPhotoLightbox({
  title,
  slides,
  open,
  index,
  onIndex,
  onOpenChange,
}: {
  title: string;
  slides: DestinationPremiumMedia[];
  open: boolean;
  index: number;
  onIndex: (i: number) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const total = slides.length;
  const i = Math.min(Math.max(0, index), Math.max(0, total - 1));
  const current = slides[i];
  const go = (d: number) => onIndex((i + d + total) % total);
  const [touchX, setTouchX] = useState<number | null>(null);
  if (!current) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl gap-3 p-3 sm:p-5"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <DialogTitle className="font-serif text-lg">
          {title} · {i + 1} / {total}
        </DialogTitle>
        <div
          className="relative overflow-hidden rounded-2xl bg-muted"
          onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const end = e.changedTouches[0]?.clientX;
            if (touchX != null && end != null && Math.abs(end - touchX) > 40) go(end < touchX ? 1 : -1);
            setTouchX(null);
          }}
        >
          <EditorialMediaFrame
            key={current.url + i}
            media={current}
            label={title}
            loading="eager"
            context="gallery"
            sizes="(min-width: 1024px) 64rem, 100vw"
            className="h-[42dvh] w-full object-contain sm:h-[62dvh]"
          />
          {total > 1 ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Fotografía anterior"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Fotografía siguiente"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90"
              >
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
        {total > 1 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas">
            {slides.map((m, j) => (
              <li key={(m.url || "t") + j} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onIndex(j)}
                  aria-label={`Ver fotografía ${j + 1}`}
                  aria-current={j === i}
                  className={cn(
                    "block overflow-hidden rounded-lg ring-focus transition",
                    j === i ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
                  )}
                >
                  <EditorialMediaFrame
                    media={m}
                    label={title}
                    context="gallery"
                    sizes="5rem"
                    loading="eager"
                    className="h-14 w-20 object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HeroCinematografico({
  content,
  heroAction,
}: {
  content: DestinationPremiumContent;
  heroAction?: ReactNode;
}) {
  if (!content.hero.cover.url) return <HeroEditorial content={content} heroAction={heroAction} />;
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-floating">
      <picture className="contents">{resolveMediaSource(content.hero.cover.asset, { fallbackUrl: content.hero.cover.url, context: "hero", sizes: "100vw" }).sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />)}<img src={resolveMediaSource(content.hero.cover.asset, { fallbackUrl: content.hero.cover.url, context: "hero" }).src}
        alt={content.hero.cover.alt}
        loading="eager"
        className="h-[420px] w-full object-cover sm:h-[520px]"
      /></picture>
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
        <div className="rounded-3xl bg-background/85 p-6 backdrop-blur-md sm:max-w-xl sm:p-8">
          <HeroCopy content={content} compact heroAction={heroAction} />
        </div>
      </div>
    </section>
  );
}

function ServiciosStrip({
  content,
  active,
  onSelect,
  navigation,
  hrefByKey,
}: {
  content: DestinationPremiumContent;
  active: string;
  onSelect: (key: string) => void;
  navigation: "preview" | "territorial";
  hrefByKey: Readonly<Record<string, string>>;
}) {
  const navigates = navigation === "territorial";
  const services = navigates
    ? content.services.filter((service) => hrefByKey[service.key])
    : content.services;
  return (
    <section aria-label="Servicios del micrositio">
      <CategoryNavGrid
        items={services.map((s) => ({
          slug: s.key,
          label: s.label,
          countLabel: s.hint,
          href: navigates ? hrefByKey[s.key] : null,
        }))}
        mode={navigates ? "navigate" : "select"}
        activeSlug={navigates ? null : active}
        onSelect={navigates ? undefined : onSelect}
        showCounts={false}
        variant="standard"
        desktopColumnsClassName={services.length > 6 ? "lg:grid-cols-4" : "lg:grid-cols-6"}
      />
      {content.servicesNote ? (
        <p className="mt-2 text-xs text-muted-foreground">{content.servicesNote}</p>
      ) : null}
    </section>
  );
}

function DescubreDestino({ content, compactTop = false }: { content: DestinationPremiumContent; compactTop?: boolean }) {
  const [lead] = content.descubre.media.filter((item) => Boolean(item.url));
  const hasMedia = Boolean(lead);
  return (
    <section
      aria-labelledby="descubre-destino"
      className={cn(
        "border-y border-border",
        compactTop ? "pb-10 pt-8 sm:pb-14" : "py-10 sm:py-14",
        hasMedia ? "grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-12" : "grid gap-8",
      )}
    >
      {hasMedia ? (
        <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-5">
          <EditorialMediaFrame
            media={lead}
            label={content.hero.title}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-elevated sm:aspect-[16/9] lg:aspect-[4/3]"
          />
        </div>
      ) : null}
      <div className={hasMedia ? "min-w-0 lg:col-span-7" : "max-w-3xl"}>
        <div className="flex items-center gap-3">
          <span className="h-px w-8 shrink-0 bg-primary" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {content.descubre.kicker}
          </p>
        </div>
        <h2
          id="descubre-destino"
          className="mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl"
        >
          {content.descubre.title}
        </h2>
        <div className="mt-5 max-w-[68ch] space-y-4 text-base leading-relaxed text-foreground/80 sm:text-lg">
          {content.descubre.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function GaleriaEditorial({
  content,
  layout,
}: {
  content: DestinationPremiumContent;
  layout: DestinationGalleryLayout;
}) {
  const items = content.gallery.items;
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="galeria-destino">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {content.gallery.kicker}
          </p>
          <h2 id="galeria-destino" className="mt-1 font-serif text-2xl tracking-tight sm:text-3xl">
            {content.gallery.title}
          </h2>
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
          {layout}
        </span>
      </div>

      {layout === "mosaico" ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((m, i) => (
            <picture key={m.url + i} className="contents">{resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery", sizes: "100vw" }).sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />)}<img 
              src={resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery" }).src}
              alt={m.alt}
              loading="lazy"
              className={cn(
                "w-full rounded-3xl object-cover shadow-soft",
                i === 0 ? "col-span-2 row-span-2 h-64 sm:h-[21rem]" : "h-32 sm:h-40",
              )}
            /></picture>
          ))}
        </div>
      ) : null}

      {layout === "carrusel" ? (
        <ul
          className="mt-5 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
          tabIndex={0}
          aria-label="Galería del destino"
        >
          {items.map((m, i) => (
            <li key={m.url + i} className="w-[78%] shrink-0 snap-center sm:w-[42%]">
              <picture className="contents">{resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery", sizes: "100vw" }).sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />)}<img src={resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery" }).src}
                alt={m.alt}
                loading="lazy"
                className="h-60 w-full rounded-3xl object-cover shadow-soft"
              /></picture>
            </li>
          ))}
        </ul>
      ) : null}

      {layout === "cuadricula" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {items.map((m, i) => (
            <picture key={m.url + i} className="contents">{resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery", sizes: "100vw" }).sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />)}<img 
              src={resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery" }).src}
              alt={m.alt}
              loading="lazy"
              className="h-48 w-full rounded-3xl object-cover shadow-soft"
            /></picture>
          ))}
        </div>
      ) : null}

      {layout === "tira" ? (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {items.map((m, i) => (
            <picture key={m.url + i} className="contents">{resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery", sizes: "100vw" }).sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />)}<img 
              src={resolveMediaSource(m.asset, { fallbackUrl: m.url, context: "gallery" }).src}
              alt={m.alt}
              loading="lazy"
              className="h-24 w-full rounded-2xl object-cover shadow-soft sm:h-28"
            /></picture>
          ))}
        </div>
      ) : null}

      {content.gallery.note ? (
        <p className="mt-2 text-xs text-muted-foreground">{content.gallery.note}</p>
      ) : null}
    </section>
  );
}

function ServicioPreview({
  content,
  service,
}: {
  content: DestinationPremiumContent;
  service: DestinationPremiumService;
}) {
  const Icon = SERVICE_ICONS[service.key] ?? Compass;
  if (!service.media.url) return null;
  return (
    <section aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {service.hint}
          </p>
          <h2 className="mt-1 font-serif text-2xl tracking-tight sm:text-3xl">
            {service.label} en {content.hero.title}
          </h2>
        </div>
        <Button variant="ghost" className="rounded-pill">
          {content.servicePreview.actionLabel}
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <article
            key={i}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <EditorialMediaFrame
              media={service.media}
              label={service.label}
              className="h-44 w-full object-cover"
            />
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5" aria-hidden />
                {service.label}
              </div>
              <h3 className="mt-1.5 font-medium">
                {content.servicePreview.cardTitlePrefix} {i + 1}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {content.servicePreview.cardBody}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CercaDelDestino({ content }: { content: DestinationPremiumContent }) {
  const regionalCatalog = content.slug === "oriente-maya";
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(8);
  if (content.nearby.items.length === 0) return null;
  const filtered = content.nearby.items.filter((item) => {
    const needle = query.trim().toLocaleLowerCase("es-MX");
    if (!needle) return true;
    return `${item.name} ${item.tagline}`.toLocaleLowerCase("es-MX").includes(needle);
  });
  const shown = regionalCatalog ? filtered.slice(0, visible) : filtered;
  return (
    <section aria-labelledby="cerca-del-destino">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {content.nearby.kicker}
      </p>
      <h2 id="cerca-del-destino" className={cn("mt-2 font-serif", regionalCatalog ? "text-3xl tracking-tight sm:text-4xl" : "text-xl leading-snug sm:text-2xl")}>
        {content.nearby.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{content.nearby.description}</p>
      {regionalCatalog ? (
        <div className="relative mt-5 max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(8);
            }}
            placeholder="Buscar destino, costa, cenote o cultura"
            className="min-h-12 w-full rounded-pill border border-border bg-background pl-11 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ) : null}
      <div className={regionalCatalog ? "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto pb-2 pr-4 [scrollbar-width:thin] [&>a]:w-60 [&>a]:max-w-[calc(100%-1rem)] [&>a]:shrink-0 [&>a]:snap-start [&>article]:w-60 [&>article]:max-w-[calc(100%-1rem)] [&>article]:shrink-0 [&>article]:snap-start"}>
        {shown.map((d) => {
          const card = (
            <article
              key={d.slug}
              className={cn("group min-w-0 overflow-hidden border border-border bg-card shadow-soft", regionalCatalog ? "rounded-3xl" : "h-full rounded-2xl")}
            >
              <div className="relative">
                <EditorialMediaFrame
                  media={d.media}
                  label={d.name}
                  className={cn("w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]", regionalCatalog ? "h-44" : "aspect-video")}
                />
                {isPuebloMagico(d.slug) ? (
                  <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                    Pueblo Mágico
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <h3 className={cn("font-serif", regionalCatalog ? "text-lg" : "text-base font-semibold leading-snug")}>{d.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d.tagline}</p>
                {d.distance ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground/70">
                    <MapIcon className="size-3.5" aria-hidden />
                    {d.distance}
                  </p>
                ) : null}
              </div>
            </article>
          );
          return d.href ? (
            <Link
              key={d.slug}
              to={d.href}
              className={cn("block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", regionalCatalog ? "rounded-3xl" : "rounded-2xl")}
            >
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>
      {regionalCatalog && shown.length < filtered.length ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-pill"
            onClick={() => setVisible((count) => count + 8)}
          >
            Mostrar más destinos
          </Button>
        </div>
      ) : null}
      {regionalCatalog && filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No encontramos destinos con esa búsqueda. Prueba con otra palabra.
        </p>
      ) : null}
    </section>
  );
}
