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
import { useMemo } from "react";
import {
  Accessibility,
  CalendarDays,
  Clock,
  Compass,
  Heart,
  ImageOff,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { PremiumHero, PremiumTerritorialBreadcrumb } from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { cn } from "@/lib/utils";
import {
  PLACE_PREMIUM_DEMO_CONTENT,
  type PlacePremiumContent,
  type PlacePremiumMedia,
} from "./place-premium-content";

export interface PlacePremiumSurfaceProps {
  content?: PlacePremiumContent;
  presentation?: PremiumPresentation;
  className?: string;
}

export function PlacePremiumSurface({
  content = PLACE_PREMIUM_DEMO_CONTENT,
  presentation = "editorial",
  className,
}: PlacePremiumSurfaceProps) {
  const cinematic = presentation === "cinematic";

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
      /* Founder Review G8-Q2D-0 · zona segura inferior para que el dock de
         Alux nunca cubra contenido en ninguna dirección visual. */
      data-alux-safe-zone="true"
      className={cn("pb-24", className)}
    >
      <Container className="pt-6">
        <DemoNotice text={content.demoNotice} />
      </Container>

      {cinematic ? (
        <>
          {/* Breadcrumb territorial permanente: visible ANTES del hero y
              persistente al hacer scroll, igual que en Editorial. */}
          <div className="sticky top-0 z-20 mt-4 border-y border-border bg-background/90 backdrop-blur">
            <Container className="py-1.5">
              <PremiumTerritorialBreadcrumb crumbs={content.breadcrumbs} />
            </Container>
          </div>
          <div className="mt-4">
            <PremiumHero
              vm={{
                presentation: "cinematic",
                eyebrow: content.identity.eyebrow,
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
                primaryAction: { label: content.hero.primaryCta.label },
                secondaryAction: {
                  label: content.hero.secondaryCta.label,
                  href: content.hero.secondaryCta.href,
                },
              }}
            />
          </div>
          {content.hero.cover.url ? null : (
            <Container className="mt-3">
              <p className="text-xs text-muted-foreground">{content.hero.cover.credit}</p>
            </Container>
          )}
          <Container className="mt-8">
            <IdentityStrip content={content} dense />
          </Container>
          <Container className="mt-8">
            <EssentialsBand content={content} />
          </Container>
          <Container className="mt-10">
            <GalleryFilmstrip content={content} />
          </Container>
          <Container className="mt-14">
            <IntroCentered content={content} />
          </Container>
        </>

      ) : (
        <>
          <Container className="mt-4">
            <PremiumTerritorialBreadcrumb crumbs={content.breadcrumbs} />
          </Container>
          <Container className="mt-5">
            <HeroEditorial content={content} />
          </Container>
          <Container className="mt-10">
            <IdentityStrip content={content} />
          </Container>
          <Container className="mt-14">
            <IntroEditorial content={content} />
          </Container>
          <Container className="mt-14">
            <EssentialsPanel content={content} />
          </Container>
          <Container className="mt-14">
            <GalleryMosaic content={content} />
          </Container>
        </>
      )}

      <Container className="mt-16">
        <SectionHeading id="mapa-lugar" kicker="Ubicación" title={content.map.heading} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ExperienceMapBlock dto={mapDto} />
          <ul className="space-y-3 rounded-3xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
            {content.map.directions.map((line, index) => (
              <li key={`dir-${index}`} className="flex gap-2">
                <Compass className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {content.services.length ? (
        <Container className="mt-16">
          <SectionHeading id="servicios-lugar" kicker="Servicios" title="Servicios disponibles" />
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
        </Container>
      ) : null}

      {content.experiences.length ? (
        <Container className="mt-16">
          <SectionHeading
            id="experiencias-lugar"
            kicker="Planea tu visita"
            title="Experiencias y tours relacionados"
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
                    <h3 className="mt-2 font-serif text-xl leading-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {/* Eventos: sin contenido → el módulo se oculta por completo. */}
      {content.events.length ? (
        <Container className="mt-16">
          <SectionHeading id="eventos-lugar" kicker="Agenda" title="Eventos relacionados" />
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {content.events.map((item) => (
              <li key={item.id} className="rounded-3xl border border-border bg-card p-5">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                <h3 className="mt-2 font-serif text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {content.nearby.length ? (
        <Container className="mt-16">
          <SectionHeading id="cerca-lugar" kicker="Alrededor" title="Lugares cercanos" />
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
                    <h3 className="mt-1 truncate font-serif text-xl">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.tagline}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      <Container className="mt-16">
        <div
          className={cn(
            "grid gap-5",
            cinematic ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-2",
          )}
        >
          <section
            aria-labelledby="mi-viaje-title"
            className="rounded-3xl border border-primary/30 bg-primary/5 p-6"
          >
            <Heart className="size-5 text-primary" aria-hidden />
            <h2 id="mi-viaje-title" className="mt-3 font-serif text-2xl">
              {content.trip.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {content.trip.description}
            </p>
            <Button type="button" className="mt-5 min-h-11 rounded-pill">
              {content.trip.actionLabel}
            </Button>
          </section>

          <section
            aria-labelledby="alux-title"
            className="rounded-3xl border border-border bg-card p-6"
          >
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 id="alux-title" className="mt-3 font-serif text-2xl">
              {content.alux.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {content.alux.description}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {content.alux.prompts.map((prompt, index) => (
                <li key={`prompt-${index}`}>
                  <span className="inline-flex min-h-11 items-center rounded-pill border border-border bg-background px-4 text-sm">
                    {prompt}
                  </span>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" className="mt-5 min-h-11 rounded-pill">
              {content.alux.actionLabel}
            </Button>
          </section>
        </div>
      </Container>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DemoNotice({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs font-medium leading-5 text-foreground">
      {text}
    </p>
  );
}

function SectionHeading({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <header id={id}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</p>
      <h2 className="mt-2 text-balance font-serif text-3xl sm:text-4xl">{title}</h2>
    </header>
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

function IdentityStrip({
  content,
  dense = false,
}: {
  content: PlacePremiumContent;
  dense?: boolean;
}) {
  const rows = [
    { label: "Tipo", value: content.identity.typeLabel },
    { label: "Destino", value: content.identity.destinationLabel },
    { label: "Región", value: content.identity.regionLabel },
  ];
  return (
    <section
      aria-label="Identidad y clasificación"
      className={cn("rounded-3xl border border-border bg-card", dense ? "p-4" : "p-6")}
    >
      <dl className={cn("grid gap-4", dense ? "sm:grid-cols-3" : "sm:grid-cols-3")}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-1 font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HeroEditorial({ content }: { content: PlacePremiumContent }) {
  return (
    <section
      aria-label="Presentación del lugar"
      className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
    >
      <DemoImage media={content.hero.cover} className="aspect-[4/3] rounded-3xl lg:aspect-[5/4]" />
      <div className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {content.identity.eyebrow}
        </p>
        <h1 className="mt-3 text-balance font-serif text-4xl leading-[1.02] sm:text-5xl">
          {content.identity.title}
        </h1>
        <p className="mt-4 text-pretty leading-7 text-muted-foreground">
          {content.identity.subtitle}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Clasificación">
          {content.identity.badges.map((badge) => (
            <li
              key={badge}
              className="rounded-pill border border-border bg-background px-3 py-1 text-xs font-medium"
            >
              {badge}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" className="min-h-11 rounded-pill">
            {content.hero.primaryCta.label}
          </Button>
          <Button asChild variant="outline" className="min-h-11 rounded-pill">
            <a href={content.hero.secondaryCta.href}>{content.hero.secondaryCta.label}</a>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {content.hero.supporting.map((media, index) => (
            <DemoImage
              key={`media-`}
              media={media}
              className="aspect-[3/2] rounded-2xl"
            />
          ))}
        </div>
      </div>
    </section>
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
          <h2 id="intro-lugar-title" className="mt-2 text-balance font-serif text-3xl sm:text-4xl">
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
      <h2 id="intro-lugar-title" className="mt-2 text-balance font-serif text-3xl sm:text-4xl">
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
      <h2 id="esencial-lugar-title" className="mt-2 font-serif text-3xl">
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
            <dd className="mt-2 font-serif text-xl">{fact.value}</dd>
            {fact.hint ? <p className="mt-1 text-xs text-muted-foreground">{fact.hint}</p> : null}
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
            <p className="mt-1 font-serif text-lg leading-tight">{fact.value}</p>
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

function GalleryMosaic({ content }: { content: PlacePremiumContent }) {
  const [first, ...rest] = content.gallery.items;
  return (
    <section aria-labelledby="galeria-lugar-title">
      <SectionHeading
        id="galeria-lugar"
        kicker={content.gallery.kicker}
        title={content.gallery.title}
      />
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground" id="galeria-lugar-title">
        {content.gallery.note}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {first ? (
          <DemoImage
            media={first}
            className="aspect-[4/3] rounded-3xl sm:col-span-2 sm:row-span-2 lg:aspect-auto lg:h-full"
          />
        ) : null}
        {rest.map((media, index) => (
          <DemoImage
            key={`media-`}
            media={media}
            className="aspect-[4/3] rounded-3xl"
          />
        ))}
      </div>
    </section>
  );
}

function GalleryFilmstrip({ content }: { content: PlacePremiumContent }) {
  return (
    <section aria-labelledby="galeria-lugar-title">
      <SectionHeading
        id="galeria-lugar"
        kicker={content.gallery.kicker}
        title={content.gallery.title}
      />
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground" id="galeria-lugar-title">
        {content.gallery.note}
      </p>
      <ul className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {content.gallery.items.map((media, index) => (
          <li
            key={`media-`}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
          >
            <DemoImage media={media} className="aspect-[16/10] rounded-3xl" />
          </li>
        ))}
      </ul>
    </section>
  );
}
