/**
 * G8-Q2D-0 · `PlacePremiumSurface` — propuesta visual (aún NO productiva)
 * de la ficha reusable `premium-entity-place`, variante `zona-arqueologica`.
 *
 * ⚠️ Fase de diseño y validación visual. Este componente:
 *  - es render-only (recibe su contenido por props, no lee ni escribe datos);
 *  - no está registrado como plantilla ni conectado a rutas públicas;
 *  - no renderiza chrome global (Header/Footer los aporta `__root`);
 *  - deriva su lenguaje visual del kit premium ya aprobado
 *    (`@/components/premium`), del mapa oficial `ExperienceMapBlock` y de
 *    los medios gobernados G8-M1.
 *
 * Ofrece dos direcciones reales que cambian estructura y jerarquía del DOM:
 *  - `editorial`: lectura tipo revista territorial (historia primero).
 *  - `cinematic`: hero fotográfico dominante y contenido progresivo.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  Accessibility,
  CalendarDays,
  Clock,
  Compass,
  Heart,
  ImageOff,
  Share2,
  Ticket,
} from "lucide-react";
import { ShareSheet } from "@/components/share/ShareSheet";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import { BusinessLocationBlock } from "@/components/maps/BusinessLocationBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { PremiumHero, PremiumTerritorialBreadcrumb } from "@/components/premium";
import {
  DEFAULT_PREMIUM_PRESENTATION,
  type PremiumPresentation,
} from "@/lib/omxds/presentation/presentation";
import { cn } from "@/lib/utils";
import {
  PLACE_PREMIUM_DEMO_CONTENT,
  type PlacePremiumContent,
  type PlacePremiumMedia,
} from "./place-premium-content";
import {
  PLACE_PREMIUM_COPY_DEFAULTS,
  fillPlaceCopy,
  type PlacePremiumCopy,
} from "./place-premium-copy";

export interface PlacePremiumSurfaceProps {
  content?: PlacePremiumContent;
  presentation?: PremiumPresentation;
  /** G8-Q2D-A · variante cerrada de la familia (informativa para QA/Studio). */
  variant?: string;
  /** G8-Q2D-A · aviso del constructor cuando aplica el fallback de medios. */
  builderNotice?: string | null;
  /** G8-Q2D-B · aviso de preview administrativa (“Borrador · no publicado”). */
  draftNotice?: string | null;
  /**
   * G4-PLACES · panel Alux contextual (TourismAluxPanel) inyectado por la
   * ruta. La superficie sigue siendo render-only: sólo lo posiciona.
   */
  aluxSlot?: ReactNode;
  /** Lote 3J.1 · Acción real de Mi Viaje (persistencia por ID canónico). */
  tripSlot?: ReactNode;
  /** Botón oficial "Guardar" (favoritos) del lugar. */
  saveSlot?: ReactNode;
  /**
   * G4-PLACES · cuando la ruta ya renderiza el breadcrumb territorial
   * compartido (`PublicShell`), la superficie no debe duplicarlo.
   */
  showBreadcrumbs?: boolean;
  /**
   * G8-Q2D-C · Textos de sección editables desde el Experience Builder.
   * Ausente o parcial ⇒ se conservan los textos aprobados.
   */
  copy?: PlacePremiumCopy;
  className?: string;
}

export function PlacePremiumSurface({
  content = PLACE_PREMIUM_DEMO_CONTENT,
  presentation = "editorial",
  variant,
  builderNotice = null,
  draftNotice = null,
  aluxSlot = null,
  tripSlot = null,
  saveSlot = null,
  showBreadcrumbs = true,
  copy = PLACE_PREMIUM_COPY_DEFAULTS,
  className,
}: PlacePremiumSurfaceProps) {
  const cinematic = presentation === "cinematic";
  /* G8-Q2D-B · con datos reales toda sección sin contenido se oculta:
     jamás se rellena con fixtures ni con datos de otro lugar. */
  const hasIntro = content.intro.paragraphs.length > 0;
  const hasEssentials =
    content.essentials.facts.length > 0 ||
    content.essentials.recommendations.length > 0 ||
    content.essentials.accessibility.length > 0;
  /* Galería: mismo bloque oficial `vmx.experience.gallery` (variante mosaico)
     que las fichas de hotel, restaurante y casa de vacaciones. Sólo medios
     publicados en CMS; sin fotografías no se renderiza nada. */
  const galleryItems = content.gallery.items
    .filter((media) => Boolean(media.url))
    .map((media) => ({
      kind: "image" as const,
      url: media.url as string,
      alt: media.alt || content.identity.title,
    }));
  const galleryDto =
    galleryItems.length >= 2
      ? {
          variant: "mosaic" as const,
          heading: fillPlaceCopy(copy.galleryHeading, content.identity.title),
          subheading: null,
          items: galleryItems,
          maxVisible: 5,
          aspect: "landscape" as const,
          ariaLabel: `Galería de ${content.identity.title}`,
          capabilities: {
            lightbox: true,
            captions: false,
            video: false,
            panorama360: false,
            model3d: false,
            ar: false,
            ugc: false,
          },
        }
      : null;
  const hasMap = content.map.points.length > 0 || content.map.directions.length > 0;
  /* Destino y, cuando el dato real la declara, subzona del destino. */
  /* Paridad con hotel/restaurante/casa: el eyebrow es corto (una sola
     etiqueta). Destino y zona ya viven en el breadcrumb y en IdentityStrip. */
  const heroEyebrow = content.identity.eyebrow;

  /* "Qué hay cerca": empresas publicadas cuya ubicación real (CMS) está a
     pocos metros. Se agrupan por intención de viaje; un grupo sin datos
     simplemente no se renderiza. Nunca se infiere por texto. */
  const nearbyGroups = useMemo(() => {
    const definitions = [
      { key: "comer", id: "cerca-comer", heading: copy.nearbyGroupComer },
      { key: "dormir", id: "cerca-dormir", heading: copy.nearbyGroupDormir },
      { key: "hacer", id: "cerca-hacer", heading: copy.nearbyGroupHacer },
      { key: "comprar", id: "cerca-comprar", heading: copy.nearbyGroupComprar },
      { key: "otros", id: "cerca-otros", heading: copy.nearbyGroupOtros },
    ] as const;
    return definitions
      .map((definition) => ({
        id: definition.id,
        entityKind: "business" as const,
        heading: definition.heading,
        items: content.nearbyBusinesses
          .filter((business) => business.groupKey === definition.key)
          .map((business) => ({
            id: business.id,
            kind: "business" as const,
            title: business.title,
            subtitle: business.categoryLabel,
            description: business.tagline,
            href: business.href,
            imageUrl: business.imageUrl,
            imageAlt: business.imageAlt,
            location: {
              label: business.categoryLabel ?? content.identity.destinationLabel,
              distanceKm: business.distanceKm,
            },
            categorySlug: business.categorySlug,
          })),
      }))
      .filter((group) => group.items.length > 0);
  }, [content.nearbyBusinesses, content.identity.destinationLabel, copy]);

  /* Ubicación: mismo bloque oficial que hotel, restaurante y casa. */
  const primaryPoint = content.map.points[0] ?? null;
  const placeAddressLine =
    content.essentials.facts.find((f) => f.key === "address")?.value ?? null;

  const mapDto: ExperienceMapDTO = useMemo(
    () => ({
      variant: "cluster",
      /* El encabezado ya lo aporta `SectionHeading`: el bloque de mapa no
         debe repetirlo (paridad con el resto de fichas Premium). */
      heading: null,

      center: content.map.center,
      points: content.map.points.map((p) => ({
        id: p.id,
        kind: p.kind,
        lat: p.lat,
        lng: p.lng,
        title: p.title,
        subtitle: p.subtitle,
        href: null,
        thumbUrl: null,
        badge: p.badge,
        priceLabel: null,
      })),
      capabilities: {
        showDistance: true,
        showDirections: true,
        clustering: false,
        syncList: false,
        staticFallback: true,
        allowInteractiveToggle: true,
      },
      emptyMessage: null,
    }),
    [content.map],
  );

  return (
    <div
      data-place-presentation={presentation}
      data-place-variant={variant ?? undefined}
      /* Founder Review G8-Q2D-0 · zona segura inferior para que el dock de
         Alux nunca cubra contenido en ninguna dirección visual. */
      data-alux-safe-zone="true"
      className={cn("pb-24", className)}
    >
      <PlaceContainer className="pt-3 sm:pt-6">
        {content.demoNotice ? <DemoNotice text={content.demoNotice} /> : null}
        {draftNotice ? (
          <p
            data-place-draft-notice="true"
            role="status"
            className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-xs font-semibold leading-5 text-foreground"
          >
            {draftNotice}
          </p>
        ) : null}
        {builderNotice ? (
          <p
            data-place-media-fallback="true"
            role="status"
            className="mt-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-foreground"
          >
            {builderNotice}
          </p>
        ) : null}
      </PlaceContainer>

      {showBreadcrumbs ? (
        <PlaceContainer className="mt-4">
          <PremiumTerritorialBreadcrumb crumbs={content.breadcrumbs} compactOnMobile />
        </PlaceContainer>
      ) : null}

      {/* Hero: misma familia y proporción aprobadas en las fichas Premium
          de hotel y restaurante (`PremiumHero`, presentación editorial).
          No existe hero propio de Lugares ni selector visible de
          dirección visual. */}
      <PlaceContainer className="mt-2 sm:mt-3">
        <PremiumHero
          layout="entity"
          vm={{

            presentation: DEFAULT_PREMIUM_PRESENTATION,
            eyebrow: heroEyebrow,
            title: content.identity.title,
            description: content.identity.subtitle,
            media: content.hero.cover.url
              ? {
                  url: content.hero.cover.url,
                  alt: content.hero.cover.alt,
                  credit: content.hero.cover.credit,
                }
              : null,
            badges: content.identity.badges.map((label) => ({ label })),
          }}
        />
      </PlaceContainer>
      {/* Paridad exacta con hotel, restaurante y casa: bajo el encabezado se
          emiten compartir y la acción de Mi Viaje. "Cómo llegar" pertenece al
          bloque oficial de ubicación. */}
      <PlaceContainer className="mt-4 flex flex-wrap justify-end gap-2">
        <PlaceShareButton title={content.identity.title} />
        {saveSlot}
        {tripSlot ?? (
          <Button
            type="button"
            onClick={() => {
              document
                .getElementById("place-trip-action")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            {content.hero.primaryCta.label}
          </Button>
        )}
      </PlaceContainer>
      {content.hero.cover.url ? null : (
        <PlaceContainer className="mt-3">
          <p className="text-xs text-muted-foreground">{content.hero.cover.credit}</p>
        </PlaceContainer>
      )}


      {aluxSlot ? <PlaceContainer className="mt-5 sm:mt-6">{aluxSlot}</PlaceContainer> : null}
      {/* Paridad con hotel, restaurante y casa: la fotografía encabeza la
          lectura, justo después del encabezado y antes del relato. */}
      {galleryDto ? (
        <PlaceContainer id="galeria" data-eb-anchor className="mt-6 scroll-mt-24 sm:mt-8">
          <ExperienceGallery dto={galleryDto} />
        </PlaceContainer>
      ) : null}

      {hasIntro ? (
        <PlaceContainer className="mt-8 sm:mt-12">
          {cinematic ? <IntroCentered content={content} /> : <IntroEditorial content={content} />}
        </PlaceContainer>
      ) : null}
      {hasEssentials ? (
        <PlaceContainer className="mt-8 sm:mt-12">
          {cinematic ? <EssentialsBand content={content} /> : <EssentialsPanel content={content} />}
        </PlaceContainer>
      ) : null}

      {hasMap ? (
        <PlaceContainer className="mt-10 sm:mt-16" id="mapa-lugar">
          {/* Paridad exacta con hotel, restaurante y casa: se reutiliza el
              bloque oficial de ubicación (mapa a todo lo ancho, distancia y
              "Cómo llegar" debajo). Sin superficie de mapa paralela. */}
          <div className="space-y-5">
            {primaryPoint ? (
              <BusinessLocationBlock
                lat={primaryPoint.lat}
                lng={primaryPoint.lng}
                name={content.identity.title}
                addressLine1={placeAddressLine}
                heading={content.map.heading}
                presentation="premium"
                layout="stacked"
              />
            ) : content.map.points.length ? (
              <ExperienceMapBlock dto={mapDto} />
            ) : null}
            {content.map.directions.length ? (
              <ul className="grid gap-3 rounded-3xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                {content.map.directions.map((line, index) => (
                  <li key={`dir-${index}`} className="flex gap-2">
                    <Compass className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

        </PlaceContainer>
      ) : null}

      {content.services.length ? (
        <PlaceContainer className="mt-10 sm:mt-16">
          <SectionHeading
            id="servicios-lugar"
            kicker={copy.servicesKicker}
            title={copy.servicesTitle}
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {content.services.map((service) => (
              <li
                key={service.key}
                className="rounded-3xl border border-border bg-card p-5 shadow-soft"
              >
                <p className="font-medium">{service.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{service.hint}</p>
              </li>
            ))}
          </ul>
        </PlaceContainer>
      ) : null}

      {content.experiences.length ? (
        <PlaceContainer className="mt-10 sm:mt-16">
          <SectionHeading
            id="experiencias-lugar"
            kicker={copy.experiencesKicker}
            title={copy.experiencesTitle}
          />
          <ul
            className={cn(
              "mt-6 grid gap-5",
              cinematic ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
            )}
          >
            {content.experiences.map((item) => (
              <li key={item.id}>
                <article className="h-full overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                  <DemoImage media={item.media} className="aspect-[4/3]" />
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-2 text-base font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </PlaceContainer>
      ) : null}

      {/* Eventos: sin contenido → el módulo se oculta por completo. */}
      {content.events.length ? (
        <PlaceContainer className="mt-10 sm:mt-16">
          <SectionHeading
            id="eventos-lugar"
            kicker={copy.eventsKicker}
            title={copy.eventsTitle}
          />
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {content.events.map((item) => (
              <li key={item.id} className="rounded-3xl border border-border bg-card p-5">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </PlaceContainer>
      ) : null}

      {nearbyGroups.length ? (
        <PlaceContainer className="mt-10 sm:mt-16">
          <ExperienceRelatedCollectionBlock
            config={{
              source: "manual",
              entityKind: "business",
              variant: "carousel",
              columns: 4,
              density: "compact",
              heading: fillPlaceCopy(copy.nearbyBusinessesHeading, content.identity.title),
              subheading: copy.nearbyBusinessesSubheading,
              ariaLabel: `Qué hay cerca de ${content.identity.title}`,
              groups: nearbyGroups,
              capabilities: {
                showPrice: false,
                showDate: false,
                showKindBadge: false,
                showFavorite: false,
                showSecondaryAction: false,
                showDistance: true,
              },
            }}
          />
        </PlaceContainer>
      ) : null}

      {content.nearby.length ? (
        <PlaceContainer className="mt-10 sm:mt-16">
          <SectionHeading
            id="cerca-lugar"
            kicker={copy.nearbyPlacesKicker}
            title={copy.nearbyPlacesTitle}
          />
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {content.nearby.map((item) => (
              <li key={item.id}>
                <article className="flex h-full gap-4 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-soft">
                  <DemoImage
                    media={item.media}
                    className="size-24 shrink-0 rounded-2xl sm:size-28"
                    captionHidden
                  />
                  <div className="min-w-0 py-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {item.distance}
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.tagline}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </PlaceContainer>
      ) : null}

      <PlaceContainer className="mt-10 sm:mt-16">
        <div
          className={cn(
            "grid gap-5",
            /* Alux vive en el módulo compartido (`aluxSlot`) y en el
               botón flotante global: la ficha no lo duplica. */
            "lg:grid-cols-1",
          )}
        >
          <section
            aria-labelledby="mi-viaje-title"
            className="rounded-3xl border border-primary/30 bg-primary/5 p-6"
          >
            <Heart className="size-5 text-primary" aria-hidden />
            <h2 id="mi-viaje-title" className="mt-3 text-xl font-semibold tracking-tight">
              {content.trip.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {content.trip.description}
            </p>
            {tripSlot ? (
              <div id="place-trip-action" className="mt-5">
                {tripSlot}
              </div>
            ) : (
              <Button type="button" className="mt-5 min-h-11 rounded-pill">
                {content.trip.actionLabel}
              </Button>
            )}
          </section>
        </div>
      </PlaceContainer>

      {/* Zona segura: reserva vertical para el dock flotante de Alux
          (incluye el área segura del dispositivo). Ningún contenido de la
          ficha queda cubierto en móvil ni en escritorio. */}
      <div
        aria-hidden
        data-alux-safe-zone-spacer="true"
        className="h-[calc(6.5rem+env(safe-area-inset-bottom))] lg:h-24"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * PlaceContainer — mismo gutter que las fichas de hotel, restaurante y casa
 * (`max-w-7xl px-5 sm:px-8 lg:px-12`). Un solo margen para toda la
 * plataforma: no hay contenedor propio de Lugares.
 */
function PlaceContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Container className={cn("px-5 sm:px-8 lg:px-12", className)} {...props} />;
}

function DemoNotice({ text }: { text: string }) {
  return (
    <p className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] font-medium leading-4 text-foreground sm:rounded-2xl sm:px-4 sm:py-3 sm:text-xs sm:leading-5">
      {text}
    </p>
  );
}

/* Tipografía de sección idéntica a las fichas de hotel, restaurante y casa
   (`ExperienceInfoGrid`/`BusinessLocationBlock`): título sobrio, sin escala
   editorial mayor que el resto de la plataforma. */
function SectionHeading({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <header id={id}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {kicker}
      </p>
      <h2 className="mt-1.5 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
    </header>
  );
}

/* Compartir: mismo patrón que la ficha de empresa (Web Share + ShareSheet). */
function PlaceShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Compartir lugar"
        className="rounded-pill border border-border bg-background shadow-soft"
      >
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </Button>
      <ShareSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        url={typeof window !== "undefined" ? window.location.href : ""}
        text="Descubre este lugar en el Oriente Maya."
        heading="Compartir lugar"
      />
    </>
  );
}

function DemoImage({
  media,
  className,
  captionHidden = false,
}: {
  media: PlacePremiumMedia;
  className?: string;
  captionHidden?: boolean;
}) {
  if (!media.url) {
    return (
      <figure
        data-place-media="placeholder"
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden border border-dashed border-border bg-gradient-to-br from-muted via-muted/70 to-accent/30 p-4 text-center",
          className,
        )}
      >
        <ImageOff className="size-6 text-muted-foreground" aria-hidden />
        {media.placeholderLabel ? (
          <p className="mt-2 text-xs font-medium text-muted-foreground">{media.placeholderLabel}</p>
        ) : null}
        <figcaption
          className={cn(
            "mt-1 text-[10px] leading-tight text-muted-foreground",
            captionHidden && "sr-only",
          )}
        >
          {media.credit}
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className={cn("relative overflow-hidden bg-muted", className)}>
      <img src={media.url} alt={media.alt} className="size-full object-cover" loading="lazy" />
      {captionHidden ? (
        <figcaption className="sr-only">{media.credit}</figcaption>
      ) : (
        <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] leading-tight text-white">
          {media.credit}
        </figcaption>
      )}
    </figure>
  );
}

function IntroEditorial({ content }: { content: PlacePremiumContent }) {
  return (
    <section aria-labelledby="intro-lugar-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-14">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {content.intro.kicker}
          </p>
          <h2 id="intro-lugar-title" className="mt-2 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
            {content.intro.title}
          </h2>
          <blockquote className="mt-6 border-l-2 border-primary/50 pl-4 font-serif text-lg italic leading-7 text-muted-foreground">
            {content.intro.pullQuote}
          </blockquote>
        </header>
        <div className="min-w-0 space-y-6">
          {content.intro.paragraphs.map((paragraph, index) => (
            <div key={`intro-${index}`} className="space-y-6">
              <p className="text-pretty text-base leading-8">{paragraph}</p>
              {content.intro.media[index] ? (
                <DemoImage
                  media={content.intro.media[index]!}
                  className="aspect-[16/9] rounded-3xl"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntroCentered({ content }: { content: PlacePremiumContent }) {
  return (
    <section aria-labelledby="intro-lugar-title" className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {content.intro.kicker}
      </p>
      <h2 id="intro-lugar-title" className="mt-2 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
        {content.intro.title}
      </h2>
      <div className="mt-6 space-y-5 text-left">
        {content.intro.paragraphs.map((paragraph, index) => (
          <p key={`intro-c-${index}`} className="text-pretty leading-7 text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function EssentialsPanel({ content }: { content: PlacePremiumContent }) {
  return (
    <section
      aria-labelledby="esencial-lugar-title"
      className="rounded-3xl border border-border bg-card p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {content.essentials.kicker}
      </p>
      <h2 id="esencial-lugar-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
        {content.essentials.title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {content.essentials.description}
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {content.essentials.facts.map((fact) => (
          <div key={fact.key} className="rounded-2xl border border-border bg-background p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {fact.label}
            </dt>
            <dd className="mt-2 text-base font-semibold">
              {fact.value}
              {fact.hint ? (
                <span className="mt-1 block font-sans text-xs text-muted-foreground">
                  {fact.hint}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <EssentialList
          title="Recomendaciones"
          icon={<Ticket className="size-4 text-primary" aria-hidden />}
          items={content.essentials.recommendations}
        />
        <EssentialList
          title="Accesibilidad"
          icon={<Accessibility className="size-4 text-primary" aria-hidden />}
          items={content.essentials.accessibility}
        />
      </div>
    </section>
  );
}

function EssentialsBand({ content }: { content: PlacePremiumContent }) {
  return (
    <section aria-labelledby="esencial-lugar-title" className="space-y-5">
      <h2 id="esencial-lugar-title" className="sr-only">
        {content.essentials.title}
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {content.essentials.facts.map((fact) => (
          <li
            key={fact.key}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {fact.label}
            </p>
            <p className="mt-1 text-base font-semibold leading-snug">{fact.value}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <EssentialList
          title="Recomendaciones"
          icon={<Ticket className="size-4 text-primary" aria-hidden />}
          items={content.essentials.recommendations}
          compact
        />
        <EssentialList
          title="Accesibilidad"
          icon={<Accessibility className="size-4 text-primary" aria-hidden />}
          items={content.essentials.accessibility}
          compact
        />
      </div>
    </section>
  );
}

function EssentialList({
  title,
  icon,
  items,
  compact = false,
}: {
  title: string;
  icon: React.ReactNode;
  items: readonly string[];
  compact?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className={cn("rounded-2xl border border-border bg-background", compact ? "p-4" : "p-5")}>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item, index) => (
          <li key={`item-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}


