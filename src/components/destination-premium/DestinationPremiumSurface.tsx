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
 *  - Pueblo Mágico sólo como estado editorial en texto.
 *  - Este componente NO renderiza chrome global (header/footer/ribbon).
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Home,
  Hotel,
  Images,
  Map as MapIcon,
  Sparkles,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";
import { cn } from "@/lib/utils";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import { PremiumTerritorialBreadcrumb } from "@/components/premium";
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
  content?: DestinationPremiumContent;
  heroVariant?: DestinationHeroVariant;
  galleryLayout?: DestinationGalleryLayout;
  sections?: Partial<Record<DestinationPremiumSectionKey, boolean>>;
  /** Servicio activo inicial (clave de categoría). */
  initialService?: string;
  className?: string;
  /** Runtime productivo del CMS; sustituye las tarjetas ilustrativas G4. */
  renderServicePreview?: (service: DestinationPremiumService) => ReactNode;
  /** Acción canónica Guardar/Mi Viaje, inyectada sin duplicar su lógica. */
  heroAction?: ReactNode;
}

const SERVICE_ICONS: Record<string, LucideIcon> = {
  hoteles: Hotel,
  restaurantes: UtensilsCrossed,
  "que-hacer": Compass,
  "casas-de-vacaciones": Home,
  experiencias: Sparkles,
  eventos: CalendarDays,
  promociones: Tag,
};

export function DestinationPremiumSurface({
  content = DESTINATION_PREMIUM_G4_CONTENT,
  heroVariant = "editorial",
  galleryLayout = "mosaico",
  sections,
  initialService,
  className,
  renderServicePreview,
  heroAction,
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
        href: null,
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
      <Container className="pt-6">
        <PremiumTerritorialBreadcrumb crumbs={content.breadcrumbs} />
      </Container>

      {DESTINATION_PREMIUM_SECTION_ORDER.map((key) => {
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
              <Container key={key} className="mt-12">
                <ServiciosStrip
                  content={content}
                  active={activeService}
                  onSelect={setActiveService}
                />
              </Container>
            );
          case "descubre":
            return (
              <Container key={key} className="mt-14">
                <DescubreDestino content={content} />
              </Container>
            );
          case "gallery":
            return (
              <Container key={key} className="mt-14">
                <GaleriaEditorial content={content} layout={galleryLayout} />
              </Container>
            );
          case "servicePreview":
            return service ? (
              <Container key={key} className="mt-14">
                {renderServicePreview ? renderServicePreview(service) : <ServicioPreview content={content} service={service} />}
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
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EditorialStatus({ content }: { content: DestinationPremiumContent }) {
  if (!content.hero.statusBadge || !isPuebloMagico(content.slug)) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
      {content.hero.statusBadge}
      <span className="sr-only">(estado editorial provisional en texto; sin logotipo oficial)</span>
    </span>
  );
}

function HeroCopy({
  content,
  compact = false,
  heroAction,
}: {
  content: DestinationPremiumContent;
  compact?: boolean;
  heroAction?: ReactNode;
}) {
  return (
    <div className={compact ? "" : "max-w-2xl"}>
      <div className="flex flex-wrap items-center gap-2">
        <EditorialStatus content={content} />
        <span className="rounded-pill border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {content.hero.regionBadge}
        </span>
      </div>
      <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        {content.hero.title}
      </h1>
      <p className="mt-3 text-lg text-foreground/80 sm:text-xl">{content.hero.subtitle}</p>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">{content.hero.description}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" className="rounded-pill px-6" asChild>
          <a href={content.hero.primaryCta.href}>
            {content.hero.primaryCta.label}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </a>
        </Button>
        <Button size="lg" variant="outline" className="rounded-pill px-6" asChild>
          <a href={content.hero.secondaryCta.href}>
            <Images className="mr-2 size-4" aria-hidden />
            {content.hero.secondaryCta.label}
          </a>
        </Button>
        {heroAction}
      </div>
    </div>
  );
}

function HeroEditorial({ content, heroAction }: { content: DestinationPremiumContent; heroAction?: ReactNode }) {
  const [a, b] = content.hero.supporting;
  const hasCover = Boolean(content.hero.cover.url);
  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <HeroCopy content={content} heroAction={heroAction} />
      <div data-destination-media={hasCover ? "g8-m1" : "editorial-neutral"} className="grid grid-cols-2 gap-3 sm:gap-4">
        <EditorialMediaFrame
          media={content.hero.cover}
          label={content.hero.title}
          loading="eager"
          className="col-span-2 h-56 w-full rounded-3xl object-cover shadow-elevated sm:h-72"
          markerClassName="shadow-soft"
        />
        {[a, b].filter(Boolean).map((m, index) => (
          <EditorialMediaFrame
            key={(m as DestinationPremiumMedia).url || `neutral-${index}`}
            media={m as DestinationPremiumMedia}
            className="h-36 w-full rounded-2xl object-cover shadow-soft sm:h-44"
          />
        ))}
      </div>
    </section>
  );
}

function HeroCinematografico({ content, heroAction }: { content: DestinationPremiumContent; heroAction?: ReactNode }) {
  if (!content.hero.cover.url) return <HeroEditorial content={content} heroAction={heroAction} />;
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-floating">
      <img
        src={content.hero.cover.url}
        alt={content.hero.cover.alt}
        loading="eager"
        className="h-[420px] w-full object-cover sm:h-[520px]"
      />
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
}: {
  content: DestinationPremiumContent;
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <section aria-label="Servicios del micrositio">
      <CategoryNavGrid
        items={content.services.map((s) => ({
          slug: s.key,
          label: s.label,
          countLabel: s.hint,
        }))}
        mode="select"
        activeSlug={active}
        onSelect={onSelect}
        showCounts={false}
        variant="standard"
        desktopColumnsClassName="lg:grid-cols-6"
      />
      {content.servicesNote ? (
        <p className="mt-2 text-xs text-muted-foreground">{content.servicesNote}</p>
      ) : null}
    </section>
  );
}

function DescubreDestino({ content }: { content: DestinationPremiumContent }) {
  const [lead, ...rest] = content.descubre.media.filter((item) => Boolean(item.url));
  return (
    <section aria-labelledby="descubre-destino" className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {content.descubre.kicker}
        </p>
        <h2 id="descubre-destino" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          {content.descubre.title}
        </h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/80">
          {content.descubre.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {lead ? (
          <img
            src={lead.url}
            alt={lead.alt}
            loading="lazy"
            className="col-span-2 h-48 w-full rounded-2xl object-cover shadow-soft"
          />
        ) : null}
        {rest.slice(0, 2).map((m) => (
          <img
            key={m.url}
            src={m.url}
            alt={m.alt}
            loading="lazy"
            className="h-40 w-full rounded-2xl object-cover shadow-soft"
          />
        ))}
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
            <img
              key={m.url + i}
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
        <ul className="mt-5 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
          {items.map((m, i) => (
            <li key={m.url + i} className="w-[78%] shrink-0 snap-center sm:w-[42%]">
              <img
                src={m.url}
                alt={m.alt}
                loading="lazy"
                className="h-60 w-full rounded-3xl object-cover shadow-soft"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {layout === "cuadricula" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {items.map((m, i) => (
            <img
              key={m.url + i}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className="h-48 w-full rounded-3xl object-cover shadow-soft"
            />
          ))}
        </div>
      ) : null}

      {layout === "tira" ? (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {items.map((m, i) => (
            <img
              key={m.url + i}
              src={m.url}
              alt={m.alt}
              loading="lazy"
              className="h-24 w-full rounded-2xl object-cover shadow-soft sm:h-28"
            />
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
              label={service.title}
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
  if (content.nearby.items.length === 0) return null;
  return (
    <section aria-labelledby="cerca-del-destino">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {content.nearby.kicker}
      </p>
      <h2 id="cerca-del-destino" className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
        {content.nearby.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{content.nearby.description}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {content.nearby.items.map((d) => (
          <article
            key={d.slug}
            className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <div className="relative">
              <EditorialMediaFrame
                media={d.media}
                label={d.name}
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
