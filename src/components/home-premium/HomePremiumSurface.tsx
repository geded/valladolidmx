/**
 * G8-D · Home Premium G4 — superficie productiva compartida.
 *
 * Contiene las 12 secciones aprobadas (autoridad `HomePremiumBody`) y el
 * estado compartido rutas ↔ mapa ↔ Travel Plan. Es el MISMO componente que
 * consumen la preview G4, el fixture de validación, el canvas de Studio y el
 * renderer público. Prohibido mantener una copia aproximada por superficie.
 */
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Hotel,
  Landmark,
  MapPin,
  MessageCircle,
  Route as RouteIcon,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import { cn } from "@/lib/utils";
import {
  HOME_PREMIUM_DEFAULT_ORDER,
  HOME_PREMIUM_G4_CONTENT,
  type HomePremiumContent,
  type HomePremiumEditorial,
  type HomePremiumExperience,
  type HomePremiumMedia,
  type HomePremiumRoute,
  type HomePremiumSectionKey,
  type HomePremiumService,
} from "./home-premium-content";

export type HomePremiumLayout = "asimetrica" | "cuadricula" | "carrusel";
export type HomePremiumHeroVariant = "editorial" | "cinematic";

export interface HomePremiumSurfaceProps {
  content?: HomePremiumContent;
  heroVariant?: HomePremiumHeroVariant;
  layout?: HomePremiumLayout;
  sections?: Partial<Record<HomePremiumSectionKey, boolean>>;
  order?: HomePremiumSectionKey[];
}

export function HomePremiumSurface({
  content = HOME_PREMIUM_G4_CONTENT,
  heroVariant = "editorial",
  layout = "asimetrica",
  sections,
  order = HOME_PREMIUM_DEFAULT_ORDER,
}: HomePremiumSurfaceProps) {
  const routes = content.rutas.items;
  const [selectedRoute, setSelectedRoute] = useState<string>(routes[0]?.id ?? "");
  const [selectedPrompt, setSelectedPrompt] = useState(content.alux.prompts[0] ?? "");
  const [added, setAdded] = useState(false);
  const [openedMicrosite, setOpenedMicrosite] = useState<string | null>(null);

  const enabled = (key: HomePremiumSectionKey) => sections?.[key] !== false;

  const renderSection = (key: HomePremiumSectionKey) => {
    if (key === "destinos")
      return (
        <DestinationsSection
          content={content}
          layout={layout}
          opened={openedMicrosite}
          onOpen={setOpenedMicrosite}
        />
      );
    if (key === "pueblosMagicos")
      return (
        <PueblosMagicosSection content={content} onCreateRoute={() => setSelectedRoute("pueblos")} />
      );
    if (key === "rutas")
      return (
        <RoutesSection
          content={content}
          selectedRoute={selectedRoute}
          onSelectRoute={setSelectedRoute}
          onAdd={() => setAdded(true)}
        />
      );
    if (key === "experiencias") return <ExperiencesSection content={content} layout={layout} />;
    if (key === "servicios") return <ServicesSection content={content} />;
    if (key === "eventos") return <EventsSection content={content} />;
    if (key === "queHacer") return <EditorialSection content={content} />;
    return <MapSection content={content} selectedRoute={selectedRoute} />;
  };

  return (
    <>
      <main>
        <Container className="pt-4 sm:pt-6">
          {heroVariant === "editorial" ? (
            <HeroEditorial content={content} />
          ) : (
            <HeroCinematic content={content} />
          )}
        </Container>

        <Container className="mt-6 sm:mt-8">
          {/* G6-S1 · adopción de la autoridad única de iconografía turística */}
          <section
            aria-label={content.categorias.heading}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <h2 className="mb-4 text-base font-semibold">{content.categorias.heading}</h2>
            <CategoryNavGrid
              items={content.categorias.items}
              variant="standard"
              mode="navigate"
              showCounts={false}
              desktopColumnsClassName="lg:grid-cols-6"
            />
          </section>
        </Container>

        <Container className="mt-6 sm:mt-8">
          <AluxPlanner
            content={content}
            selectedPrompt={selectedPrompt}
            onSelectPrompt={setSelectedPrompt}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
            added={added}
            onAdd={() => setAdded(true)}
          />
        </Container>

        {order.map((key) =>
          enabled(key) ? (
            <Container key={key} className="mt-10 sm:mt-12">
              {renderSection(key)}
            </Container>
          ) : null,
        )}

        <Container className="mt-10 sm:mt-12">
          <TravelPlanClose
            content={content}
            selectedRoute={selectedRoute}
            added={added}
            onAdd={() => setAdded(true)}
          />
        </Container>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Chrome premium (ribbon / header / footer)
 * ------------------------------------------------------------------ */

export function HomePremiumRibbon({ label }: { label?: string }) {
  return (
    <div className="border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-xs text-warning-foreground">
      {label ??
        "Vista interna G4-F · DEMO VISUAL · no indexable · sin persistencia · producción intacta"}
    </div>
  );
}

export function HomePremiumHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-lg font-semibold">Valladolid.mx</span>
          <span className="hidden text-[10px] uppercase text-muted-foreground sm:inline">
            Oriente Maya de Yucatán
          </span>
        </Link>
        <nav
          aria-label="Navegación de la vista previa"
          className="hidden items-center gap-1 lg:flex"
        >
          {[
            ["#rutas", "Rutas"],
            ["#destinos", "Destinos"],
            ["#experiencias", "Experiencias"],
            ["#mapa", "Mapa"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-pill px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <Button asChild size="sm" className="rounded-pill">
          <Link to="/arma-tu-viaje">Arma tu viaje</Link>
        </Button>
      </Container>
    </header>
  );
}

export function HomePremiumFooter() {
  return (
    <footer className="border-t border-border py-7">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-display text-xl">Valladolid.mx</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Continuidad territorial: Valladolid · Espita · Izamal · Oriente Maya de Yucatán.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/oriente-maya">Territorio</Link>
          <Link to="/experiencias">Experiencias</Link>
          <Link to="/arma-tu-viaje">Travel Plan</Link>
          <Link to="/alux">Alux</Link>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 * Piezas compartidas
 * ------------------------------------------------------------------ */

function HeroSlideControl({
  content,
  index,
  onChange,
  inverted = false,
}: {
  content: HomePremiumContent;
  index: number;
  onChange: (value: number) => void;
  inverted?: boolean;
}) {
  const slides = content.hero.slides;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Seleccionar imagen del hero">
      {slides.map((slide, itemIndex) => (
        <Button
          key={slide.caption}
          type="button"
          size="sm"
          variant={itemIndex === index ? "default" : "outline"}
          onClick={() => onChange(itemIndex)}
          aria-pressed={itemIndex === index}
          className={cn(
            "min-h-11 rounded-pill px-4",
            inverted &&
              itemIndex !== index &&
              "border-primary-foreground/50 bg-foreground/40 text-primary-foreground hover:bg-foreground/60",
          )}
        >
          {itemIndex + 1} de {slides.length}
        </Button>
      ))}
      <span
        className={cn("text-xs", inverted ? "text-primary-foreground/85" : "text-muted-foreground")}
      >
        {slides[index]?.caption}
      </span>
    </div>
  );
}

function HeroActions({ content }: { content: HomePremiumContent }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button asChild size="lg" className="min-h-12 rounded-pill">
        <Link to={content.hero.primaryCta.to}>
          {content.hero.primaryCta.label} <ArrowRight className="ml-2 size-4" aria-hidden />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="min-h-12 rounded-pill">
        <Link to={content.hero.secondaryCta.to}>{content.hero.secondaryCta.label}</Link>
      </Button>
    </div>
  );
}

function HeroEditorial({ content }: { content: HomePremiumContent }) {
  const [index, setIndex] = useState(0);
  const slide = content.hero.slides[index] ?? content.hero.slides[0];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        <div className="flex flex-col justify-center bg-card p-6 sm:p-9 lg:p-12">
          <p className="text-xs font-semibold uppercase text-primary">{content.hero.eyebrow}</p>
          <h1 className="mt-3 text-balance font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            {content.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {content.hero.subtitle}
          </p>
          <div className="mt-7">
            <HeroActions content={content} />
          </div>
          <div className="mt-7 border-t border-border pt-5">
            <HeroSlideControl content={content} index={index} onChange={setIndex} />
          </div>
        </div>
        <figure className="relative min-h-[22rem] overflow-hidden lg:min-h-[38rem]">
          <img
            src={slide.media.url}
            alt={slide.media.alt}
            loading="eager"
            className="absolute inset-0 size-full object-cover"
          />
          <figcaption className="absolute bottom-4 left-4 rounded-md bg-foreground/85 px-3 py-2 text-xs text-background">
            {slide.caption}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function HeroCinematic({ content }: { content: HomePremiumContent }) {
  const [index, setIndex] = useState(0);
  const slide = content.hero.slides[index] ?? content.hero.slides[0];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative min-h-[28rem] sm:min-h-[36rem]">
        <img
          src={slide.media.url}
          alt={slide.media.alt}
          loading="eager"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/55 to-foreground/10"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase text-primary">Oriente Maya de Yucatán</p>
          <h1 className="mt-3 max-w-4xl text-balance font-display text-4xl leading-tight text-primary-foreground sm:text-6xl">
            {content.hero.title}
          </h1>
          <div className="mt-5">
            <HeroSlideControl content={content} index={index} onChange={setIndex} inverted />
          </div>
        </div>
      </div>
      <div className="grid gap-5 bg-card p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {content.hero.subtitle}
        </p>
        <HeroActions content={content} />
      </div>
    </section>
  );
}

function SectionHead({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase text-primary">{kicker}</p>
        <h2 className="mt-2 text-balance font-display text-3xl sm:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

function DemoTag() {
  return (
    <span className="inline-flex rounded-pill border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
      Demo visual
    </span>
  );
}

function Stat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted p-3 text-center text-xs font-medium text-foreground [&_svg]:mx-auto [&_svg]:mb-1 [&_svg]:size-4 [&_svg]:text-primary">
      <span aria-hidden>{icon}</span>
      <span className="block break-words">{label}</span>
    </div>
  );
}

function AluxPlanner({
  content,
  selectedPrompt,
  onSelectPrompt,
  selectedRoute,
  onSelectRoute,
  added,
  onAdd,
}: {
  content: HomePremiumContent;
  selectedPrompt: string;
  onSelectPrompt: (value: string) => void;
  selectedRoute: string;
  onSelectRoute: (value: string) => void;
  added: boolean;
  onAdd: () => void;
}) {
  const routes = content.rutas.items;
  const suggested = routes.find((route) => route.id === selectedRoute) ?? routes[0];
  return (
    <section
      aria-labelledby="alux-title"
      className="overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-soft"
    >
      <div className="grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        <div className="bg-selva p-6 text-selva-foreground sm:p-8">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <p className="text-xs font-semibold uppercase">{content.alux.eyebrow}</p>
          </div>
          <h2 id="alux-title" className="mt-3 font-display text-3xl">
            {content.alux.heading}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-selva-foreground/80">
            {content.alux.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {content.alux.prompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                size="sm"
                variant={selectedPrompt === prompt ? "default" : "secondary"}
                onClick={() => onSelectPrompt(prompt)}
                className="min-h-11 rounded-pill whitespace-normal text-left"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
        <div className="p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DemoTag />
            <span className="text-xs text-muted-foreground">Respuesta contextual simulada</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Para “{selectedPrompt}”, empezaría por:
          </p>
          <h3 className="mt-1 font-display text-2xl">{suggested?.title}</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Clock3 />} label={suggested?.duration ?? ""} />
            <Stat icon={<MapPin />} label={`${suggested?.stops ?? 0} paradas`} />
            <Stat icon={<RouteIcon />} label="Orden sugerido" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Propongo iniciar en el centro, continuar por la parada que requiere más luz de día y
            cerrar cerca de opciones de comida. La distancia y tiempos reales se confirmarían con
            datos acreditados.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              onClick={() => suggested && onSelectRoute(suggested.id)}
              className="min-h-11 rounded-pill"
            >
              <MessageCircle className="mr-2 size-4" aria-hidden />
              Personalizar con Alux
            </Button>
            <Button type="button" variant="outline" onClick={onAdd} className="min-h-11 rounded-pill">
              {added ? (
                <Check className="mr-2 size-4" aria-hidden />
              ) : (
                <Compass className="mr-2 size-4" aria-hidden />
              )}
              {added ? "Ruta agregada" : "Agregar ruta a mi viaje"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoutesSection({
  content,
  selectedRoute,
  onSelectRoute,
  onAdd,
}: {
  content: HomePremiumContent;
  selectedRoute: string;
  onSelectRoute: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <section id="rutas" aria-labelledby="routes-title">
      <SectionHead
        kicker={content.rutas.kicker}
        title={content.rutas.title}
        description={content.rutas.description}
        action={content.rutas.action}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {content.rutas.items.map((route: HomePremiumRoute) => {
          const active = route.id === selectedRoute;
          return (
            <article
              key={route.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card",
                active ? "border-primary shadow-elevated" : "border-border",
              )}
            >
              <div className="grid grid-cols-[7rem_1fr] border-b border-border">
                <img
                  src={route.media.url}
                  alt={route.media.alt}
                  loading="lazy"
                  className="h-full min-h-32 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <DemoTag />
                    {active ? (
                      <span className="rounded-pill bg-primary/15 px-2 py-1 text-[10px] font-semibold text-foreground">
                        Seleccionada
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-display text-xl">{route.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {route.duration} · {route.stops} paradas · {route.vibe}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{route.description}</p>
                <ol className="mt-4 space-y-2" aria-label={`Paradas de ${route.title}`}>
                  {route.sequence.map((stop, index) => (
                    <li key={stop} className="flex items-center gap-3 text-sm">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-semibold">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">{stop}</span>
                      {index < route.sequence.length - 1 ? (
                        <span className="h-px w-5 bg-primary" aria-hidden />
                      ) : null}
                    </li>
                  ))}
                </ol>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() => onSelectRoute(route.id)}
                    className="min-h-11 rounded-pill"
                  >
                    Ver ruta
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      onSelectRoute(route.id);
                      onAdd();
                    }}
                    className="min-h-11 rounded-pill whitespace-normal"
                  >
                    Personalizar con Alux
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DestinationsSection({
  content,
  layout,
  opened,
  onOpen,
}: {
  content: HomePremiumContent;
  layout: HomePremiumLayout;
  opened: string | null;
  onOpen: (value: string) => void;
}) {
  return (
    <section id="destinos" aria-labelledby="destinations-title">
      <SectionHead
        kicker={content.destinos.kicker}
        title={content.destinos.title}
        description={content.destinos.description}
        action={content.destinos.action}
      />
      <div
        className={cn(
          "grid gap-3",
          layout === "cuadricula"
            ? "sm:grid-cols-2"
            : layout === "carrusel"
              ? "grid-flow-col auto-cols-[85%] overflow-x-auto pb-2 sm:auto-cols-[45%] lg:auto-cols-[32%]"
              : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {content.destinos.items.map((destination, index) => {
          const wide = layout === "asimetrica" && index === 0;
          return (
            <article
              key={destination.name}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
                wide && "sm:col-span-2 lg:col-span-2",
              )}
            >
              <div className="relative">
                <img
                  src={destination.media.url}
                  alt={destination.media.alt}
                  loading="lazy"
                  className={cn(
                    "w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.02]",
                    wide ? "aspect-[16/9]" : "aspect-[4/3]",
                  )}
                />
                <span className="absolute left-3 top-3 rounded-pill bg-card px-2.5 py-1 text-[10px] font-semibold uppercase text-card-foreground shadow-soft">
                  {destination.demo ? "Demo visual" : "Capital turística"}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-2xl">{destination.name}</h3>
                  {destination.puebloMagico ? (
                    <span className="rounded-pill border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      Pueblo Mágico
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {destination.note}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpen(destination.name)}
                  className="mt-4 min-h-11 rounded-pill"
                >
                  {opened === destination.name ? (
                    <Check className="mr-2 size-4" aria-hidden />
                  ) : (
                    <Landmark className="mr-2 size-4" aria-hidden />
                  )}
                  {opened === destination.name ? "Micrositio abierto (demo)" : "Ver micrositio"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {content.destinos.disclaimer}
      </p>
    </section>
  );
}

function PueblosMagicosSection({
  content,
  onCreateRoute,
}: {
  content: HomePremiumContent;
  onCreateRoute: () => void;
}) {
  const pueblos = content.destinos.items.filter((destination) => destination.puebloMagico);
  return (
    <section id="pueblos-magicos" aria-labelledby="pueblos-title">
      <SectionHead
        kicker={content.pueblosMagicos.kicker}
        title={content.pueblosMagicos.title}
        description={content.pueblosMagicos.description}
        action={content.pueblosMagicos.action}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {pueblos.map((pueblo) => (
          <article
            key={pueblo.name}
            className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3"
          >
            <img
              src={pueblo.media.url}
              alt={pueblo.media.alt}
              loading="lazy"
              className="size-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <span className="rounded-pill border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Pueblo Mágico
              </span>
              <h3 className="mt-1 font-display text-xl">{pueblo.name}</h3>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {pueblo.note}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.pueblosMagicos.badgeNote}
        </p>
        <Button type="button" onClick={onCreateRoute} className="min-h-11 rounded-pill">
          <RouteIcon className="mr-2 size-4" aria-hidden />
          {content.pueblosMagicos.ctaLabel}
        </Button>
      </div>
    </section>
  );
}

function ExperiencesSection({
  content,
  layout,
}: {
  content: HomePremiumContent;
  layout: HomePremiumLayout;
}) {
  const items = content.experiencias.items;
  const featured = items[0];
  if (!featured) return null;
  return (
    <section id="experiencias" aria-labelledby="experiences-title">
      <SectionHead
        kicker={content.experiencias.kicker}
        title={content.experiencias.title}
        description={content.experiencias.description}
        action={content.experiencias.action}
      />
      <div
        className={cn(
          "grid gap-4",
          layout === "carrusel"
            ? "grid-flow-col auto-cols-[86%] overflow-x-auto pb-2 sm:auto-cols-[48%]"
            : "lg:grid-cols-[1.2fr_1fr]",
        )}
      >
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={featured.media.url}
            alt={featured.media.alt}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              <DemoTag />
              <span className="text-xs text-muted-foreground">{featured.category}</span>
            </div>
            <h3 className="mt-3 font-display text-3xl">{featured.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{featured.summary}</p>
            <Button type="button" variant="outline" className="mt-4 min-h-11 rounded-pill">
              Explorar experiencia
            </Button>
          </div>
        </article>
        <div className="grid gap-3">
          {items.slice(1).map((item: HomePremiumExperience) => (
            <CompactMediaRow key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CompactMediaRow({
  item,
}: {
  item: { title: string; category: string; summary: string; media: HomePremiumMedia };
}) {
  return (
    <article className="grid min-h-36 grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[10rem_1fr]">
      <img
        src={item.media.url}
        alt={item.media.alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="flex min-w-0 flex-col justify-center p-4">
        <p className="text-[10px] font-semibold uppercase text-primary">{item.category}</p>
        <h3 className="mt-1 font-display text-xl">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.summary}
        </p>
        <span className="mt-2 inline-flex items-center text-xs font-semibold">
          Ver detalle <ChevronRight className="size-3" aria-hidden />
        </span>
      </div>
    </article>
  );
}

function ServicesSection({ content }: { content: HomePremiumContent }) {
  return (
    <section aria-labelledby="services-title">
      <SectionHead
        kicker={content.servicios.kicker}
        title={content.servicios.title}
        description={content.servicios.description}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ServiceColumn
          icon={<Hotel />}
          title={content.servicios.staysTitle}
          items={content.servicios.stays}
        />
        <ServiceColumn
          icon={<UtensilsCrossed />}
          title={content.servicios.foodTitle}
          items={content.servicios.food}
        />
      </div>
    </section>
  );
}

function ServiceColumn({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: HomePremiumService[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-primary">
        <span aria-hidden>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[11rem_1fr]"
          >
            <img
              src={item.media.url}
              alt={item.media.alt}
              loading="lazy"
              className="h-full min-h-40 w-full object-cover"
            />
            <div className="min-w-0 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">
                {item.destination} · {item.category}
              </p>
              <h4 className="mt-1 font-display text-xl">{item.title}</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
              <Button type="button" variant="link" className="mt-2 h-auto min-h-11 p-0">
                Ver ficha <ArrowRight className="ml-1 size-3" aria-hidden />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EventsSection({ content }: { content: HomePremiumContent }) {
  return (
    <section
      aria-labelledby="events-title"
      className="rounded-3xl border border-border bg-card p-5 sm:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,34%)_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">{content.eventos.kicker}</p>
          <h2 id="events-title" className="mt-2 font-display text-3xl">
            {content.eventos.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {content.eventos.description}
          </p>
          <img
            src={content.eventos.media.url}
            alt={content.eventos.media.alt}
            loading="lazy"
            className="mt-5 aspect-[16/10] w-full rounded-2xl object-cover"
          />
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {content.eventos.items.map((event, index) => (
            <li
              key={event.title}
              className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
            >
              <span className="grid size-10 place-items-center rounded-full bg-secondary font-display text-lg">
                {index + 1}
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase text-primary">
                  {event.day} · {event.type}
                </p>
                <h3 className="mt-1 font-display text-xl">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 justify-self-start rounded-pill sm:justify-self-end"
              >
                Ver agenda
              </Button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EditorialSection({ content }: { content: HomePremiumContent }) {
  return (
    <section aria-labelledby="editorial-title">
      <SectionHead
        kicker={content.queHacer.kicker}
        title={content.queHacer.title}
        description={content.queHacer.description}
        action={content.queHacer.action}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {content.queHacer.items.map((item: HomePremiumEditorial) => (
          <article
            key={item.title}
            className="grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card md:block"
          >
            <img
              src={item.media.url}
              alt={item.media.alt}
              loading="lazy"
              className="h-full min-h-40 w-full object-cover md:aspect-[4/3] md:h-auto"
            />
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">{item.kicker}</p>
              <h3 className="mt-1 font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MapSection({
  content,
  selectedRoute,
}: {
  content: HomePremiumContent;
  selectedRoute: string;
}) {
  const route = content.rutas.items.find((item) => item.id === selectedRoute) ?? content.rutas.items[0];
  return (
    <section
      id="mapa"
      aria-labelledby="map-title"
      className="rounded-3xl border border-border bg-card p-4 sm:p-7"
    >
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">{content.mapa.kicker}</p>
          <h2 id="map-title" className="mt-2 font-display text-3xl sm:text-4xl">
            {content.mapa.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {content.mapa.description}
          </p>
        </div>
        <div className="rounded-xl bg-muted p-4">
          <p className="text-[10px] font-semibold uppercase text-primary">Ruta activa · demo</p>
          <p className="mt-1 font-display text-lg">{route?.title}</p>
          <p className="text-xs text-muted-foreground">
            {route?.duration} · {route?.stops} paradas
          </p>
        </div>
      </div>
      <ExperienceMapBlock dto={content.mapa.dto} />
    </section>
  );
}

function TravelPlanClose({
  content,
  selectedRoute,
  added,
  onAdd,
}: {
  content: HomePremiumContent;
  selectedRoute: string;
  added: boolean;
  onAdd: () => void;
}) {
  const route = content.rutas.items.find((item) => item.id === selectedRoute) ?? content.rutas.items[0];
  return (
    <section className="overflow-hidden rounded-3xl bg-selva text-selva-foreground">
      <div className="grid gap-6 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" aria-hidden />
            <p className="text-xs font-semibold uppercase">{content.travelPlan.eyebrow}</p>
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">{content.travelPlan.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-selva-foreground/80">
            {route?.title} · {route?.duration} · {route?.stops} paradas. Alux puede ajustar el orden
            según tus intereses sin crear otro modelo de itinerario.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button type="button" size="lg" onClick={onAdd} className="min-h-12 rounded-pill">
            {added ? (
              <Check className="mr-2 size-4" aria-hidden />
            ) : (
              <Compass className="mr-2 size-4" aria-hidden />
            )}
            {added ? content.travelPlan.ctaAddedLabel : content.travelPlan.ctaAddLabel}
          </Button>
          <Button asChild size="lg" variant="secondary" className="min-h-12 rounded-pill">
            <Link to="/alux">{content.travelPlan.ctaAluxLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
