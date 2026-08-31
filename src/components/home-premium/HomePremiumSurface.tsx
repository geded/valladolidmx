/**
 * G8-D · Home Premium G4 — superficie productiva compartida.
 *
 * Contiene las 12 secciones aprobadas (autoridad `HomePremiumBody`) y el
 * estado compartido rutas ↔ mapa ↔ Travel Plan. Es el MISMO componente que
 * consumen la preview G4, el fixture de validación, el canvas de Studio y el
 * renderer público. Prohibido mantener una copia aproximada por superficie.
 */
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
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
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSearchPill } from "@/components/home/HeroSearchPill";

import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import { cn } from "@/lib/utils";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { recordAluxSignal } from "@/lib/alux/memory-store";
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft/hooks";
import {
  PARTY_OPTIONS,
  compositionFromPartySize,
  type PartyComposition,
} from "@/lib/traveler/party-composition";
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
  const cinematic = heroVariant === "cinematic";
  const routes = content.rutas.items;
  const [selectedRoute, setSelectedRoute] = useState<string>(routes[0]?.id ?? "");
  const [selectedPrompt, setSelectedPrompt] = useState(content.alux.prompts[0] ?? "");
  const anonymousTrip = useAnonymousTrip();
  const [selectedParty, setSelectedParty] = useState<PartyComposition | null>(null);
  const [added, setAdded] = useState(false);
  const [openedMicrosite, setOpenedMicrosite] = useState<string | null>(null);

  useEffect(() => {
    const count = anonymousTrip.trip?.travelerCount;
    if (!count || selectedParty) return;
    setSelectedParty(
      (count.children ?? 0) > 0
        ? "familiar"
        : compositionFromPartySize(count.adults + (count.children ?? 0)),
    );
  }, [anonymousTrip.trip?.travelerCount, selectedParty]);

  const selectParty = (party: PartyComposition) => {
    const option = PARTY_OPTIONS.find((item) => item.value === party);
    if (!option) return;
    setSelectedParty(party);
    void anonymousTrip.setTravelerCount(
      party === "familiar" ? { adults: 2, children: 2 } : { adults: option.partySize, children: 0 },
    );
  };

  const selectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    const keyByPrompt: Record<string, string> = {
      "Tengo medio día": "medio-dia",
      "Quiero cenotes y gastronomía": "cenotes-gastronomia",
      "Busco cultura viva": "cultura-viva",
      "Viajo en pareja": "romantico",
    };
    recordAluxSignal({
      kind: "category_explored",
      key: keyByPrompt[prompt] ?? prompt.toLocaleLowerCase("es-MX").replace(/\s+/g, "-"),
      at: Date.now(),
      purpose: "personalization",
    });
  };

  const enabled = (key: HomePremiumSectionKey) => sections?.[key] !== false;
  const presentationOrder: HomePremiumSectionKey[] = cinematic
    ? [
        "destinos",
        "experiencias",
        "rutas",
        "pueblosMagicos",
        "eventos",
        "servicios",
        "mapa",
        "queHacer",
      ]
    : order;

  const renderSection = (key: HomePremiumSectionKey) => {
    if (key === "destinos")
      return (
        <DestinationsSection
          content={content}
          layout={layout}
          cinematic={cinematic}
          opened={openedMicrosite}
          onOpen={setOpenedMicrosite}
        />
      );
    if (key === "pueblosMagicos")
      return (
        <PueblosMagicosSection
          content={content}
          onCreateRoute={() => setSelectedRoute("pueblos")}
        />
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
    if (key === "experiencias")
      return <ExperiencesSection content={content} layout={layout} cinematic={cinematic} />;
    if (key === "servicios") return <ServicesSection content={content} />;
    if (key === "eventos") return <EventsSection content={content} />;
    if (key === "queHacer") return <EditorialSection content={content} cinematic={cinematic} />;
    return <MapSection content={content} selectedRoute={selectedRoute} />;
  };

  return (
    <>
      <main data-home-presentation={heroVariant}>
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
            className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
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
            onSelectPrompt={selectPrompt}
            selectedParty={selectedParty}
            onSelectParty={selectParty}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
            added={added}
            onAdd={() => setAdded(true)}
          />
        </Container>

        {presentationOrder.map((key) =>
          enabled(key) ? (
            <Container key={key} className="mt-10 sm:mt-12">
              <div data-cinematic-section={cinematic || undefined}>{renderSection(key)}</div>
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
  return <SiteHeader variant="solid" />;
}

export function HomePremiumFooter() {
  return <SiteFooter />;
}

/* ------------------------------------------------------------------ *
 * Piezas compartidas
 * ------------------------------------------------------------------ */

function HeroSearch() {
  return (
    <HeroSearchPill
      destinoLabel="Destino"
      destinoPlaceholder="¿A dónde quieres ir?"
      categoriaLabel="Categoría"
      categoriaPlaceholder="¿Qué quieres descubrir?"
      submitLabel="Buscar"
      maxWidth="full"
    />
  );
}

function useHeroAutoplay(slides: number, setIndex: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    if (slides < 2 || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current: number) => (current + 1) % slides);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [setIndex, slides]);
}

function HeroEditorial({ content }: { content: HomePremiumContent }) {
  const [index, setIndex] = useState(0);
  useHeroAutoplay(content.hero.slides.length, setIndex);
  const slide = content.hero.slides[index] ?? content.hero.slides[0];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid lg:grid-cols-[minmax(0,43%)_minmax(0,57%)]">
        <div className="flex flex-col justify-center bg-card p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase text-primary">{content.hero.eyebrow}</p>
          <h1 className="mt-2.5 text-balance font-display text-4xl leading-[1.02] sm:text-5xl lg:text-[3.35rem]">
            {content.hero.title}
          </h1>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-6 text-muted-foreground">
            {content.hero.subtitle}
          </p>
          <div className="mt-5">
            <HeroSearch />
          </div>
        </div>
        <figure className="relative min-h-[21rem] overflow-hidden lg:min-h-[32rem]">
          <EditorialMediaFrame
            media={slide.media}
            label={content.hero.title}
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
  useHeroAutoplay(content.hero.slides.length, setIndex);
  const slide = content.hero.slides[index] ?? content.hero.slides[0];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative min-h-[27rem] sm:min-h-[32rem]">
        <EditorialMediaFrame
          media={slide.media}
          label={content.hero.title}
          loading="eager"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/55 to-foreground/10"
          aria-hidden
        />
        <span className="absolute right-4 top-4 rounded-md bg-black/65 px-3 py-1.5 text-xs text-[#f7f3ea] backdrop-blur-sm">
          {slide.caption}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase text-primary">Oriente Maya de Yucatán</p>
          <h1 className="mt-2.5 max-w-4xl text-balance font-display text-4xl leading-[1.02] text-[#f7f3ea] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-[3.35rem]">
            {content.hero.title}
          </h1>
        </div>
      </div>
      <div className="grid gap-4 bg-card p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <p className="max-w-2xl text-[0.95rem] leading-6 text-muted-foreground">
          {content.hero.subtitle}
        </p>
        <HeroSearch />
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
  selectedParty,
  onSelectParty,
  selectedRoute,
  onSelectRoute,
  added,
  onAdd,
}: {
  content: HomePremiumContent;
  selectedPrompt: string;
  onSelectPrompt: (value: string) => void;
  selectedParty: PartyComposition | null;
  onSelectParty: (value: PartyComposition) => void;
  selectedRoute: string;
  onSelectRoute: (value: string) => void;
  added: boolean;
  onAdd: () => void;
}) {
  const routes = content.rutas.items;
  const suggested = routes.find((route) => route.id === selectedRoute) ?? routes[0];
  const openAlux = () => {
    if (!suggested) return;
    onSelectRoute(suggested.id);
    openAluxFloating({
      reason: "manual",
      hint: `${selectedPrompt}. ${
        selectedParty
          ? `Composición del viaje: ${PARTY_OPTIONS.find((item) => item.value === selectedParty)?.label}. `
          : ""
      }Ruta sugerida: ${suggested.title}. ${suggested.description}`,
    });
  };
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
          <p className="mt-6 text-xs font-semibold uppercase text-selva-foreground/80">
            ¿Con quién viajas?
          </p>
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="group"
            aria-label="Composición del viaje"
          >
            {PARTY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selectedParty === option.value ? "default" : "secondary"}
                aria-pressed={selectedParty === option.value}
                onClick={() => onSelectParty(option.value)}
                className="min-h-11 rounded-pill"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Propuesta construida sobre destinos publicados
            </span>
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
            <Button type="button" onClick={openAlux} className="min-h-11 rounded-pill">
              <MessageCircle className="mr-2 size-4" aria-hidden />
              Personalizar con Alux
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onAdd}
              className="min-h-11 rounded-pill"
            >
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
                <EditorialMediaFrame
                  media={route.media}
                  label={route.title}
                  className="h-full min-h-32 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
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
  cinematic,
  opened,
  onOpen,
}: {
  content: HomePremiumContent;
  layout: HomePremiumLayout;
  cinematic: boolean;
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
              : "sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {content.destinos.items.map((destination) => {
          return (
            <article
              key={destination.name}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
                cinematic &&
                  "relative min-h-[20rem] justify-end border-0 bg-[#071814] text-[#f7f3ea] shadow-elevated sm:min-h-[22rem]",
              )}
            >
              <div className={cn("relative", cinematic && "absolute inset-0")}>
                <EditorialMediaFrame
                  media={destination.media}
                  label={destination.name}
                  className={cn(
                    "w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.02]",
                    cinematic ? "h-full" : "aspect-[4/3]",
                  )}
                />
                {cinematic ? (
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "absolute left-3 top-3 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase shadow-soft",
                    cinematic
                      ? "border border-white/25 bg-black/35 text-white backdrop-blur-sm"
                      : "bg-card text-card-foreground",
                  )}
                >
                  {destination.puebloMagico ? "Pueblo Mágico" : "Destino"}
                </span>
              </div>
              <div
                className={cn(
                  "flex flex-1 flex-col p-4",
                  cinematic && "relative z-10 justify-end p-5",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cn("font-display text-2xl", cinematic && "text-3xl text-white")}>
                    {destination.name}
                  </h3>
                  {destination.puebloMagico ? (
                    <span
                      className={cn(
                        "rounded-pill border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        cinematic
                          ? "border-white/25 bg-white/10 text-white/85"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      Pueblo Mágico
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-1 text-sm leading-relaxed text-muted-foreground",
                    cinematic && "text-white/80",
                  )}
                >
                  {destination.note}
                </p>
                {destination.href ? (
                  <Button
                    asChild
                    variant="outline"
                    className={cn(
                      "mt-4 min-h-11 rounded-pill",
                      cinematic &&
                        "border-white/45 bg-black/25 text-white hover:bg-white hover:text-[#071814]",
                    )}
                  >
                    <Link to={destination.href} onClick={() => onOpen(destination.name)}>
                      <Landmark className="mr-2 size-4" aria-hidden />
                      Ver micrositio
                    </Link>
                  </Button>
                ) : null}
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
            <EditorialMediaFrame
              media={pueblo.media}
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
  cinematic,
}: {
  content: HomePremiumContent;
  layout: HomePremiumLayout;
  cinematic: boolean;
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
        <article
          className={cn(
            "overflow-hidden rounded-2xl border border-border bg-card",
            cinematic && "relative min-h-[30rem] border-0 bg-[#071814] text-white shadow-elevated",
          )}
        >
          <EditorialMediaFrame
            media={featured.media}
            label={featured.title}
            className={cn(
              "aspect-[16/9] w-full object-cover",
              cinematic && "absolute inset-0 h-full",
            )}
          />
          {cinematic ? (
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
              aria-hidden
            />
          ) : null}
          <div className={cn("p-5", cinematic && "absolute inset-x-0 bottom-0 z-10")}>
            <div className="flex flex-wrap gap-2">
              <span className={cn("text-xs text-muted-foreground", cinematic && "text-white/75")}>
                {featured.category}
              </span>
            </div>
            <h3 className="mt-3 font-display text-3xl">{featured.title}</h3>
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed text-muted-foreground",
                cinematic && "text-white/80",
              )}
            >
              {featured.summary}
            </p>
            {featured.href ? (
              <Button
                asChild
                variant="outline"
                className={cn(
                  "mt-4 min-h-11 rounded-pill",
                  cinematic &&
                    "border-white/45 bg-black/25 text-white hover:bg-white hover:text-[#071814]",
                )}
              >
                <Link to={featured.href}>Explorar experiencia</Link>
              </Button>
            ) : null}
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
  item: {
    title: string;
    category: string;
    summary: string;
    media: HomePremiumMedia;
    href: string | null;
  };
}) {
  if (!item.href) return null;
  return (
    <Link
      to={item.href}
      className="grid min-h-36 grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[10rem_1fr]"
    >
      <EditorialMediaFrame
        media={item.media}
        label={item.title}
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
    </Link>
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
            <EditorialMediaFrame
              media={item.media}
              label={item.title}
              className="h-full min-h-40 w-full object-cover"
            />
            <div className="min-w-0 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">
                {item.destination} · {item.category}
              </p>
              <h4 className="mt-1 font-display text-xl">{item.title}</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
              {item.href ? (
                <Button asChild variant="link" className="mt-2 h-auto min-h-11 p-0">
                  <Link to={item.href}>
                    Ver ficha <ArrowRight className="ml-1 size-3" aria-hidden />
                  </Link>
                </Button>
              ) : null}
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
          <EditorialMediaFrame
            media={content.eventos.media}
            label={content.eventos.title}
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
              {event.href ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="min-h-11 justify-self-start rounded-pill sm:justify-self-end"
                >
                  <Link to={event.href}>Ver agenda</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EditorialSection({
  content,
  cinematic,
}: {
  content: HomePremiumContent;
  cinematic: boolean;
}) {
  return (
    <section aria-labelledby="editorial-title">
      <SectionHead
        kicker={content.queHacer.kicker}
        title={content.queHacer.title}
        description={content.queHacer.description}
        action={content.queHacer.action}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {content.queHacer.items.map((item: HomePremiumEditorial) =>
          item.href ? (
            <Link
              key={item.title}
              to={item.href}
              className={cn(
                "grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card md:block",
                cinematic &&
                  "relative min-h-[24rem] border-0 bg-[#071814] text-white shadow-elevated",
              )}
            >
              <EditorialMediaFrame
                media={item.media}
                label={item.title}
                className={cn(
                  "h-full min-h-40 w-full object-cover md:aspect-[4/3] md:h-auto",
                  cinematic && "absolute inset-0 h-full min-h-0 md:h-full",
                )}
              />
              {cinematic ? (
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                  aria-hidden
                />
              ) : null}
              <div
                className={cn(
                  "p-4",
                  cinematic && "relative z-10 flex h-full flex-col justify-end self-end",
                )}
              >
                <p className="text-[10px] font-semibold uppercase text-primary">{item.kicker}</p>
                <h3 className="mt-1 font-display text-xl">{item.title}</h3>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed text-muted-foreground",
                    cinematic && "text-white/80",
                  )}
                >
                  {item.body}
                </p>
              </div>
            </Link>
          ) : null,
        )}
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
  const route =
    content.rutas.items.find((item) => item.id === selectedRoute) ?? content.rutas.items[0];
  const normalizeLabel = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("es-MX");
  const pointByTitle = new Map(
    content.mapa.dto.points
      .filter((point) => point.kind === "destination")
      .map((point) => [normalizeLabel(point.title), point]),
  );
  const routePoints = (route?.sequence ?? [])
    .map((title) => pointByTitle.get(normalizeLabel(title)))
    .filter((point): point is NonNullable<typeof point> => Boolean(point));
  const mapDto = {
    ...content.mapa.dto,
    center: null,
    points: routePoints.length >= 2 ? routePoints : content.mapa.dto.points,
  };
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
          <p className="text-[10px] font-semibold uppercase text-primary">Ruta activa</p>
          <p className="mt-1 font-display text-lg">{route?.title}</p>
          <p className="text-xs text-muted-foreground">
            {route?.duration} · {route?.stops} paradas
          </p>
        </div>
      </div>
      <ExperienceMapBlock
        dto={mapDto}
        interactiveOnly
        immersive
        connectByRoad={routePoints.length >= 2}
      />
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
  const route =
    content.rutas.items.find((item) => item.id === selectedRoute) ?? content.rutas.items[0];
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
