/**
 * G8-D · Home Premium G4 — superficie productiva compartida.
 *
 * Contiene las 12 secciones aprobadas (autoridad `HomePremiumBody`) y el
 * estado compartido rutas ↔ mapa ↔ Travel Plan. Es el MISMO componente que
 * consumen la preview G4, el fixture de validación, el canvas de Studio y el
 * renderer público. Prohibido mantener una copia aproximada por superficie.
 */
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Container } from "@/components/layout/Container";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { TourismCategoryIcon } from "@/components/omxds/TourismCategoryIcon";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import {
  BusinessImpressionTracker,
  TrackClick,
} from "@/components/visibility/BusinessEventTrackers";
import { useHeroAutoplay } from "@/components/premium/use-hero-autoplay";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSearchPill } from "@/components/home/HeroSearchPill";
import { ACTIVE_BRAND } from "@/config/brand";
import { payloadOccursOnDate } from "@/lib/events/recurrence";
import type { HomePremiumEvent } from "./home-premium-content";

import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import { PremiumAluxBar } from "./shared/PremiumShowcase";
import { TravelPlanBand } from "@/components/travel-plan/TravelPlanBand";
import { cn } from "@/lib/utils";
import { MERIDA_TIME_ZONE, meridaDate, meridaToday } from "@/lib/time/merida";

import { openAluxFloating, onAluxMapFocus } from "@/lib/alux/floating-bus";
import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
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

const ALUX_ROUTE_SUMMARY_MAX = 1000;

function buildAluxRouteSummary(route: HomePremiumRoute): string {
  const metadata = `Duración: ${route.duration}. Estilo: ${route.vibe}.`;
  if (metadata.length >= ALUX_ROUTE_SUMMARY_MAX) {
    return `${metadata.slice(0, ALUX_ROUTE_SUMMARY_MAX - 1).trimEnd()}…`;
  }

  const label = " Descripción: ";
  const available = ALUX_ROUTE_SUMMARY_MAX - metadata.length - label.length;
  if (available <= 0 || !route.description.trim()) return metadata;
  const description = route.description.trim();
  const boundedDescription =
    description.length > available
      ? `${description.slice(0, Math.max(0, available - 1)).trimEnd()}…`
      : description;
  return `${metadata}${label}${boundedDescription}`;
}

/** Resumen turístico legible que ve el viajero en el dock (sin texto técnico). */
function buildRouteFacts(route: HomePremiumRoute): string[] {
  const facts: string[] = [];
  if (route.duration?.trim()) facts.push(route.duration.trim());
  if (Number.isFinite(route.stops) && route.stops > 0) {
    facts.push(`${route.stops} ${route.stops === 1 ? "parada" : "paradas"}`);
  }
  if (route.vibe?.trim()) facts.push(route.vibe.trim());
  const first = route.sequence?.[0];
  const last = route.sequence?.[route.sequence.length - 1];
  if (first && last && first !== last) facts.push(`${first} → ${last}`);
  else if (first) facts.push(first);
  return facts;
}

/** Acciones rápidas que alimentan el Alux conversacional existente. */
const ROUTE_QUICK_ACTIONS = [
  "Hacerla más tranquila",
  "Cambiar una parada",
  "Más naturaleza",
  "Para ir con niños",
  "Ajustar días",
  "Ver otras opciones",
] as const;

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
  /* Secuencia propuesta por Alux para el mapa existente (títulos canónicos). */
  const [proposalSequence, setProposalSequence] = useState<readonly string[] | null>(null);
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

  /* El dock de Alux puede pedir enfocar la ruta en el mapa YA EXISTENTE del
     Home (`#mapa`). No se crea otro mapa: sólo se selecciona y se desplaza. */
  useEffect(() => {
    return onAluxMapFocus((payload) => {
      const id = payload.entityRef?.startsWith("route:")
        ? payload.entityRef.slice("route:".length)
        : null;
      if (id && routes.some((route) => route.id === id)) setSelectedRoute(id);
      setProposalSequence(
        payload.variant === "proposal" && payload.sequenceTitles?.length
          ? payload.sequenceTitles
          : null,
      );
      if (typeof document === "undefined") return;
      const target = document.getElementById(payload.anchor ?? "mapa");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [routes]);

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
  // Editorial y cinematográfica son variantes visuales del mismo sistema.
  // Nunca cambian jerarquía, orden ni geometría entre sí.
  const presentationOrder: HomePremiumSectionKey[] = order;
  const renderSection = (key: HomePremiumSectionKey) => {
    if (key === "hero")
      return (
        <Container className="pt-4 sm:pt-6" data-eb-section="hero">
          {heroVariant === "editorial" ? (
            <HeroEditorial content={content} />
          ) : (
            <HeroCinematic content={content} />
          )}
        </Container>
      );
    if (key === "alux")
      return (
        <Container className="mt-6 sm:mt-8" data-home-journey="alux" data-eb-section="alux">
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
      );
    if (key === "categorias")
      return (
        <div data-eb-section="categorias">
          <Container className="mt-6 sm:mt-8" data-home-journey="experiencias-access">
            <a
              href="/experiencias"
              className="group flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-soft ring-focus sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <TourismCategoryIcon slug="experiencias" variant="standard" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                    {content.experiencias.kicker}
                  </span>
                  <span className="block text-base font-semibold sm:truncate sm:text-lg">
                    {content.experiencias.title}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {content.experiencias.description}
                  </span>
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft">
                {content.experiencias.action}
              </span>
            </a>
          </Container>
          <Container className="mt-6 sm:mt-8" data-home-journey="categories">
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
        </div>
      );
    if (key === "travelPlan")
      return (
        <Container
          className="mt-8 lg:mt-12"
          data-home-journey="travel-plan"
          data-eb-section="travelPlan"
        >
          <TravelPlanClose
            content={content}
            selectedRoute={selectedRoute}
            added={added}
            onAdd={() => setAdded(true)}
          />
        </Container>
      );
    if (key === "destinos")
      return (
        <Container
          className="mt-8 lg:mt-12"
          data-home-journey="territory"
          data-eb-section="destinos"
        >
          <div data-cinematic-section={cinematic || undefined}>
            <DestinationsSection
              content={content}
              layout={layout}
              cinematic={cinematic}
              opened={openedMicrosite}
              onOpen={setOpenedMicrosite}
            />
          </div>
        </Container>
      );
    if (key === "pueblosMagicos")
      return (
        <Container className="mt-8 lg:mt-12" data-eb-section="pueblosMagicos">
          <div data-cinematic-section={cinematic || undefined}>
            <PueblosMagicosSection
              content={content}
              onCreateRoute={() => setSelectedRoute("pueblos")}
            />
          </div>
        </Container>
      );
    if (key === "rutas")
      return (
        <Container className="mt-8 lg:mt-12" data-home-journey="routes" data-eb-section="rutas">
          <div data-cinematic-section={cinematic || undefined}>
            <RoutesSection
              content={content}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              onAdd={() => setAdded(true)}
            />
          </div>
        </Container>
      );
    if (key === "experiencias")
      return (
        <Container
          className="mt-8 lg:mt-12"
          data-home-journey="experiencias"
          data-eb-section="experiencias"
        >
          <div data-cinematic-section={cinematic || undefined}>
            <ExperiencesSection content={content} layout={layout} cinematic={cinematic} />
          </div>
        </Container>
      );
    if (key === "servicios")
      return (
        <Container className="mt-8 lg:mt-12" data-eb-section="servicios">
          <div data-cinematic-section={cinematic || undefined}>
            <ServicesSection content={content} />
          </div>
        </Container>
      );
    if (key === "eventos")
      return (
        <Container className="mt-8 lg:mt-12" data-home-journey="eventos" data-eb-section="eventos">
          <div data-cinematic-section={cinematic || undefined}>
            <EventsSection content={content} />
          </div>
        </Container>
      );
    if (key === "queHacer")
      return (
        <Container className="mt-8 lg:mt-12" data-eb-section="queHacer">
          <div data-cinematic-section={cinematic || undefined}>
            <EditorialSection content={content} cinematic={cinematic} />
          </div>
        </Container>
      );
    return (
      <Container className="mt-8 lg:mt-12" data-home-journey="mapa" data-eb-section="mapa">
        <div data-cinematic-section={cinematic || undefined}>
          <MapSection
            content={content}
            selectedRoute={selectedRoute}
            proposalSequence={proposalSequence}
          />
        </div>
      </Container>
    );
  };

  return (
    <>
      <main data-home-presentation={heroVariant}>
        {presentationOrder.map((key) =>
          enabled(key) ? <Fragment key={key}>{renderSection(key)}</Fragment> : null,
        )}
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
      destinoPlaceholder="¿Dónde empezamos?"
      categoriaLabel="Categoría"
      categoriaPlaceholder="¿Qué quieres descubrir?"
      submitLabel="Buscar"
      maxWidth="full"
    />
  );
}

function HeroEditorial({ content }: { content: HomePremiumContent }) {
  const [index, setIndex] = useState(0);
  useHeroAutoplay(content.hero.slides.length, setIndex);
  const slide = content.hero.slides[index] ?? content.hero.slides[0];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid lg:grid-cols-[minmax(0,43%)_minmax(0,57%)]">
        <div className="flex flex-col justify-center bg-card p-5 sm:p-7 lg:p-10">
          <p className="text-xs font-semibold uppercase text-primary">{content.hero.eyebrow}</p>
          <h1 className="mt-2.5 text-balance font-display text-3xl leading-[1.02] sm:text-4xl lg:text-[3.35rem]">
            {content.hero.title}
          </h1>
          <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-5 text-muted-foreground lg:mt-4 lg:text-[0.95rem] lg:leading-6">
            {content.hero.subtitle}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-selva">
            {ACTIVE_BRAND.discoveryPromise}
          </p>
          <div className="mt-5">
            <HeroSearch />
          </div>
        </div>
        <figure className="relative min-h-[16rem] overflow-hidden sm:min-h-[20rem] lg:min-h-[32rem]">
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
      <div className="relative min-h-[23rem] sm:min-h-[28rem] lg:min-h-[32rem]">
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
        <span className="absolute right-4 top-4 rounded-md bg-black/65 px-3 py-1.5 text-xs text-[var(--background)] backdrop-blur-sm">
          {slide.caption}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase text-primary">Oriente Maya de Yucatán</p>
          <h1 className="mt-2.5 max-w-4xl text-balance font-display text-4xl leading-[1.02] text-[var(--background)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-[3.35rem]">
            {content.hero.title}
          </h1>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {ACTIVE_BRAND.discoveryPromise}
          </p>
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
  actionHref,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: string;
  actionHref?: string;
}) {
  const actionContent = (
    <>
      {action}
      <ChevronRight className="size-4" aria-hidden />
    </>
  );
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase text-primary">{kicker}</p>
        <h2 className="mt-1.5 text-balance font-display text-2xl sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        actionHref ? (
          <Link
            to={actionHref}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground"
          >
            {actionContent}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
            {actionContent}
          </span>
        )
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
      hint: buildAluxStageAwareHint(
        `Ayúdame a convertir esta propuesta en un viaje real. Ruta sugerida: ${suggested.title}. ${suggested.description}`,
        `${selectedPrompt}. ${
          selectedParty
            ? `Composición del viaje: ${PARTY_OPTIONS.find((item) => item.value === selectedParty)?.label}.`
            : ""
        }`,
      ),
    });
  };
  return (
    <PremiumAluxBar
      question="¿Cómo viajas hoy?"
      selectedParty={selectedParty}
      onSelectParty={onSelectParty}
      onContinue={openAlux}
    />
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
  // Reutiliza el mapa YA EXISTENTE del Home (`#mapa`): la tarjeta sólo
  // selecciona la ruta activa y desplaza suavemente hasta esa sección.
  const focusExistingMap = (routeId: string) => {
    onSelectRoute(routeId);
    if (typeof document === "undefined") return;
    const target = document.getElementById("mapa");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="rutas" aria-labelledby="routes-title">
      <SectionHead
        kicker={content.rutas.kicker}
        title={content.rutas.title}
        description={content.rutas.description}
        action={content.rutas.action}
        actionHref={content.rutas.actionHref}
      />
      <div
        className="grid snap-x snap-mandatory grid-flow-col auto-cols-[78%] items-stretch gap-3 overflow-x-auto pb-3 sm:auto-cols-[48%] md:auto-cols-[38%] xl:grid-flow-row xl:grid-cols-4 xl:gap-4 xl:overflow-visible xl:pb-0"
        tabIndex={0}
        aria-label="Rutas recomendadas"
      >
        {content.rutas.items.map((route: HomePremiumRoute, index: number) => {
          const active = route.id === selectedRoute;
          return (
            <article
              key={route.id}
              data-eb-card={index}
              className={cn(
                "flex h-full min-w-0 snap-start flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition",
                active ? "border-primary shadow-elevated" : "border-border",
              )}
            >

              <div className="relative aspect-[16/11] overflow-hidden">
                <EditorialMediaFrame
                  media={route.media}
                  label={route.title}
                  className="size-full object-cover"
                />
                {active ? (
                  <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-soft">
                    Seleccionada
                  </span>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                <h3 className="min-w-0 truncate font-display text-[15px] leading-tight sm:text-base">
                  {route.href ? (
                    <Link to={route.href} className="underline-offset-4 hover:underline">
                      {route.title}
                    </Link>
                  ) : (
                    route.title
                  )}
                </h3>
                <p className="min-w-0 text-[11px] text-muted-foreground sm:text-xs">
                  {route.duration} · {route.stops} paradas · {route.vibe}
                </p>
                {route.description ? (
                  <p className="text-xs leading-snug text-muted-foreground">{route.description}</p>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                  <button
                    type="button"
                    onClick={() => focusExistingMap(route.id)}
                    className="inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-pill px-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground sm:text-xs"
                  >
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{content.rutas.selectLabel}</span>
                  </button>
                  {route.href ? (
                    <Button
                      asChild
                      size="sm"
                      variant={active ? "default" : "secondary"}
                      className="h-9 shrink-0 gap-1.5 rounded-pill px-3 text-[11px] sm:text-xs"
                    >
                      <Link to={route.href} aria-label={`Ver la ruta ${route.title}`}>
                        <RouteIcon className="size-3.5" aria-hidden />
                        <span>Ver ruta</span>
                      </Link>
                    </Button>
                  ) : null}
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
  const items = content.destinos.items;
  const featured = items[0];
  if (!featured) return null;
  return (
    <section id="destinos" aria-labelledby="destinations-title">
      <SectionHead
        kicker={content.destinos.kicker}
        title={content.destinos.title}
        description={content.destinos.description}
        action={content.destinos.action}
        actionHref={content.destinos.actionHref}
      />
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 lg:hidden">
        {items.slice(0, 4).map((destination, index) => (
          <Link
            key={destination.name}
            data-eb-card={index}
            to={destination.href ?? "/destinos"}
            onClick={() => onOpen(destination.name)}
            className="group relative h-[15rem] w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl bg-[var(--brand-territory-deep)] text-white shadow-soft sm:w-[46%]"
          >

            <EditorialMediaFrame
              media={destination.media}
              label={destination.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">
                {index === 0 ? "Punto de partida" : "Destino"}
              </p>
              <h3 className="mt-1 font-display text-2xl">{destination.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-white/75">{destination.note}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden gap-4 lg:grid lg:h-[30rem] lg:grid-cols-[1.2fr_1fr]">
        <Link
          data-eb-card={0}
          to={featured.href ?? "/destinos"}

          onClick={() => onOpen(featured.name)}
          className="group relative min-h-0 overflow-hidden rounded-2xl bg-[var(--brand-territory-deep)] text-white shadow-elevated"
        >
          <EditorialMediaFrame
            media={featured.media}
            label={featured.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-5">
            <h3 className="font-display text-3xl">{featured.name}</h3>
            <p className="mt-2 text-sm text-white/80">{featured.note}</p>
            <span className="mt-3 inline-flex text-sm font-semibold">
              Ver destino <ChevronRight className="size-4" />
            </span>
          </div>
        </Link>
        <div className="grid grid-rows-3 gap-3">
          {items.slice(1, 4).map((destination, index) => (
            <Link
              key={destination.name}
              data-eb-card={index + 1}
              to={destination.href ?? "/destinos"}

              onClick={() => onOpen(destination.name)}
              className="grid min-h-0 grid-cols-[42%_1fr] overflow-hidden rounded-2xl border border-border bg-card"
            >
              <EditorialMediaFrame
                media={destination.media}
                label={destination.name}
                className="h-full w-full object-cover"
              />
              <div className="flex min-w-0 flex-col justify-center p-4">
                <p className="text-[10px] font-semibold uppercase text-primary">Destino</p>
                <h3 className="mt-1 font-display text-xl">{destination.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {destination.note}
                </p>
                <span className="mt-2 inline-flex items-center text-xs font-semibold">
                  Ver destino <ChevronRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
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
        actionHref={content.pueblosMagicos.actionHref}
      />
      <div
        className="grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto pb-2 sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-3 md:overflow-visible md:pb-0"
        tabIndex={0}
        aria-label="Pueblos Mágicos"
      >
        {pueblos.map((pueblo) => (
          <Link
            key={pueblo.name}
            to={pueblo.href ?? "/oriente-maya"}
            className="group relative h-[12.5rem] overflow-hidden rounded-2xl bg-[var(--brand-territory-deep)] text-white shadow-elevated lg:h-[15rem]"
          >
            <EditorialMediaFrame
              media={pueblo.media}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">Pueblo Mágico</p>
              <h3 className="mt-1 font-display text-xl">{pueblo.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-white/80">{pueblo.note}</p>
              <span className="mt-2 inline-flex items-center text-xs font-semibold">
                {content.pueblosMagicos.ctaLabel} <ChevronRight className="size-3" />
              </span>
            </div>
          </Link>
        ))}
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
      {items.map((item) => (
        <BusinessImpressionTracker
          key={`impression-${item.title}`}
          businessId={item.businessId ?? null}
          surface="home"
          rail="experiencias"
          entityKind="experience"
          entityId={item.businessId ?? null}
        />
      ))}
      <SectionHead
        kicker={content.experiencias.kicker}
        title={content.experiencias.title}
        description={content.experiencias.description}
        action={content.experiencias.action}
        actionHref={content.experiencias.actionHref}
      />
      <div
        className="flex snap-x gap-3 overflow-x-auto pb-2 lg:hidden"
        tabIndex={0}
        aria-label="Experiencias recomendadas"
      >
        {items.map((item, index) =>
          item.href ? (
            <TrackClick
              key={item.title}
              businessId={item.businessId ?? null}
              surface="home"
              rail="experiencias"
              eventType="click_card"
              entityKind="experience"
              entityId={item.businessId ?? null}
            >
              <Link
                data-eb-card={index}
                to={item.href}
                className="relative h-[15rem] w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl bg-[var(--brand-territory-deep)] text-white sm:w-[46%]"
              >

                <EditorialMediaFrame
                  media={item.media}
                  label={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                  <p className="text-[10px] font-semibold uppercase text-primary">
                    {item.category}
                  </p>
                  <h3 className="mt-1 font-display text-2xl">{item.title}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-white/75">{item.summary}</p>
                </div>
              </Link>
            </TrackClick>
          ) : null,
        )}
      </div>
      <div
        className={cn(
          "hidden gap-4 lg:grid",
          layout === "carrusel"
            ? "grid-flow-col auto-cols-[86%] overflow-x-auto pb-2 sm:auto-cols-[48%] lg:h-[30rem]"
            : "lg:min-h-[30rem] lg:grid-cols-[1.2fr_1fr]",
        )}
      >
        <article
          className={cn(
            "h-full overflow-hidden rounded-2xl border border-border bg-card",
            cinematic &&
              "relative border-0 bg-[var(--brand-territory-deep)] text-white shadow-elevated",
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
              <TrackClick
                businessId={featured.businessId ?? null}
                surface="home"
                rail="experiencias"
                eventType="click_card"
                entityKind="experience"
                entityId={featured.businessId ?? null}
              >
                <Button
                  asChild
                  variant="outline"
                  className={cn(
                    "mt-4 min-h-11 rounded-pill",
                    cinematic &&
                      "border-white/45 bg-black/25 text-white hover:bg-card hover:text-[var(--brand-territory-deep)]",
                  )}
                >
                  <Link to={featured.href}>Explorar experiencia</Link>
                </Button>
              </TrackClick>
            ) : null}
          </div>
        </article>
        <div className="grid min-h-0 auto-rows-[minmax(9rem,auto)] gap-3">
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
    businessId?: string | null;
    title: string;
    category: string;
    summary: string;
    media: HomePremiumMedia;
    href: string | null;
  };
}) {
  if (!item.href) return null;
  return (
    <TrackClick
      businessId={item.businessId ?? null}
      surface="home"
      rail="experiencias"
      eventType="click_card"
      entityKind="experience"
      entityId={item.businessId ?? null}
    >
      <BusinessImpressionTracker
        businessId={item.businessId ?? null}
        surface="home"
        rail="experiencias"
        entityKind="experience"
        entityId={item.businessId ?? null}
      />
      <Link
        to={item.href}
        className="grid h-full min-h-36 grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[10rem_1fr] lg:min-h-0"
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
    </TrackClick>
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
      <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
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
            className="grid grid-cols-[6rem_1fr] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[11rem_1fr]"
          >
            <BusinessImpressionTracker
              businessId={item.businessId ?? null}
              surface="home"
              rail="servicios"
              entityKind="business"
              entityId={item.businessId ?? null}
            />
            <EditorialMediaFrame
              media={item.media}
              label={item.title}
              className="h-full min-h-28 w-full object-cover lg:min-h-40"
            />
            <div className="min-w-0 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">
                {item.destination} · {item.category}
              </p>
              <h4 className="mt-1 font-display text-xl">{item.title}</h4>
              <p className="mt-2 hidden text-xs leading-relaxed text-muted-foreground lg:block">
                {item.summary}
              </p>
              {item.href ? (
                <TrackClick
                  businessId={item.businessId ?? null}
                  surface="home"
                  rail="servicios"
                  eventType="click_card"
                  entityKind="business"
                  entityId={item.businessId ?? null}
                >
                  <Button asChild variant="link" className="mt-2 h-auto min-h-11 p-0">
                    <Link to={item.href}>
                      Ver ficha <ArrowRight className="ml-1 size-3" aria-hidden />
                    </Link>
                  </Button>
                </TrackClick>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const EVENTS_PAGE_SIZE = 5;

/** Día calendario del evento en la hora del destino (nunca la del aparato). */
function meridaDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MERIDA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

function calendarDateFromKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function calendarKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function EventsSection({ content }: { content: HomePremiumContent }) {
  const hasMedia = content.eventos.media.url.trim().length > 0;
  const [mode, setMode] = useState<"today" | "date" | "month">("today");
  const [dateFilter, setDateFilter] = useState(meridaToday);
  const [page, setPage] = useState(0);

  const items = content.eventos.items;
  const todayKey = meridaToday();
  const queryKey = dateFilter || todayKey;
  // Un evento recurrente ocurre en muchos días: la coincidencia se resuelve
  // con la misma autoridad de recurrencia del CMS, no con su próxima función.
  const occursOn = (event: HomePremiumEvent, dayKey: string): boolean => {
    if (event.recurrence) return payloadOccursOnDate(event.recurrence, dayKey);
    return meridaDayKey(event.startsAt) === dayKey;
  };
  const occursInMonth = (event: HomePremiumEvent, monthKey: string): boolean => {
    if (!event.recurrence) return meridaDayKey(event.startsAt)?.slice(0, 7) === monthKey;
    const [year, month] = monthKey.split("-").map(Number);
    if (!year || !month) return false;
    const days = new Date(year, month, 0).getDate();
    for (let day = 1; day <= days; day += 1) {
      if (payloadOccursOnDate(event.recurrence, `${monthKey}-${String(day).padStart(2, "0")}`)) {
        return true;
      }
    }
    return false;
  };
  const filtered = items.filter((event) => {
    if (mode === "today") return occursOn(event, todayKey);
    if (mode === "date") return occursOn(event, queryKey);
    return occursInMonth(event, queryKey.slice(0, 7));
  });
  // La fecha mostrada es la de la consulta cuando el evento se repite.
  const labelDateFor = (event: HomePremiumEvent): string | null => {
    if (event.recurrence && mode !== "month") {
      const key = mode === "today" ? todayKey : queryKey;
      return meridaDate(`${key}T12:00:00.000Z`) ?? null;
    }
    return meridaDate(event.startsAt) ?? null;
  };
  const pageCount = Math.max(1, Math.ceil(filtered.length / EVENTS_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * EVENTS_PAGE_SIZE, (safePage + 1) * EVENTS_PAGE_SIZE);

  return (
    <section
      aria-labelledby="events-title"
      className="rounded-3xl border border-border bg-card p-5 sm:p-8"
    >
      <div
        className={cn(
          "grid gap-5 lg:gap-6",
          hasMedia ? "md:grid-cols-[minmax(0,34%)_1fr]" : "md:grid-cols-1",
        )}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {content.eventos.kicker}
          </p>
          <h2 id="events-title" className="mt-1.5 font-display text-2xl lg:text-3xl">
            {content.eventos.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {content.eventos.description}
          </p>
          {hasMedia ? (
            <EditorialMediaFrame
              media={content.eventos.media}
              label={content.eventos.title}
              className="mt-4 aspect-[16/9] w-full rounded-2xl object-cover md:aspect-[4/3] lg:mt-5 lg:aspect-[16/10]"
            />
          ) : null}
          <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-1 lg:grid-cols-[auto_auto_auto] lg:gap-2">
            <Button
              type="button"
              variant={mode === "today" ? "default" : "outline"}
              className="h-10 w-full justify-center rounded-pill px-2 text-xs font-semibold sm:px-5 lg:w-auto"
              onClick={() => {
                setMode("today");
                setPage(0);
              }}
            >
              Hoy
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={mode === "date" ? "default" : "outline"}
                  className="h-10 w-full justify-center gap-2 rounded-pill px-2 text-xs font-semibold sm:px-5 lg:w-auto"
                  onClick={() => {
                    setMode("date");
                    setPage(0);
                  }}
                >
                  <span className="hidden sm:inline">Buscar por fecha</span>
                  <CalendarDays className="size-4 shrink-0" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto rounded-3xl border border-border/70 bg-popover p-0 shadow-elevated"
                align="start"
                sideOffset={10}
              >
                <Calendar
                  mode="single"
                  locale={es}
                  selected={calendarDateFromKey(queryKey)}
                  onSelect={(date) => {
                    if (!date) return;
                    setDateFilter(calendarKeyFromDate(date));
                    setMode("date");
                    setPage(0);
                  }}
                  defaultMonth={calendarDateFromKey(queryKey)}
                  className="pointer-events-auto rounded-3xl bg-popover p-4 [--cell-size:2.35rem]"
                  classNames={{
                    caption_label: "select-none text-sm font-semibold capitalize tracking-tight",
                    weekday:
                      "flex-1 select-none text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground",
                    day: "group/day relative aspect-square h-full w-full select-none p-0 text-center",
                    today: "rounded-full ring-1 ring-primary/40",
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant={mode === "month" ? "default" : "outline"}
              className="h-10 w-full justify-center rounded-pill px-2 text-xs font-semibold sm:px-5 lg:w-auto"
              onClick={() => {
                setMode("month");
                setPage(0);
              }}
            >
              <span className="sm:hidden">Mes</span>
              <span className="hidden sm:inline">Eventos del mes</span>
            </Button>
          </div>
        </div>
        <div>
          <ol className="divide-y divide-border border-y border-border">
            {visible.map((event, index) => (
              <li
                key={`${event.title}-${index}`}
                className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 lg:py-3.5"
              >
                {event.media?.url ? (
                  /* H3·A4 · La miniatura de agenda usa la familia `thumbnail`
                     del pipeline: mismo encuadre aprobado, bytes mínimos. */
                  <EditorialMediaFrame
                    media={{ ...event.media, alt: event.media.alt || event.title }}
                    label={event.title}
                    context="thumbnail"
                    sizes="48px"
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-muted-foreground"
                  >
                    <CalendarDays className="size-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {[labelDateFor(event) ?? event.day, event.type].filter(Boolean).join(" · ")}
                  </p>
                  <h3 className="mt-0.5 truncate text-[15px] font-semibold leading-snug">
                    {event.title}
                  </h3>
                  <p className="mt-0.5 hidden text-[13px] text-muted-foreground lg:block">
                    {event.detail}
                  </p>
                </div>
                {event.href ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="min-h-11 shrink-0 justify-self-end rounded-pill px-3 text-xs lg:px-4"
                  >
                    <Link to={event.href}>Ver agenda</Link>
                  </Button>
                ) : null}
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">
                {mode === "today"
                  ? "No hay eventos publicados para hoy."
                  : mode === "date"
                    ? "No hay eventos publicados para esa fecha."
                    : "No hay eventos publicados durante ese mes."}
              </li>
            ) : null}
          </ol>
          {filtered.length > EVENTS_PAGE_SIZE ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 rounded-pill text-xs"
                disabled={safePage === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Anterior
              </Button>
              <p className="text-xs text-muted-foreground">
                Página {safePage + 1} de {pageCount}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 rounded-pill text-xs"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </div>
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
        actionHref={content.queHacer.actionHref}
      />
      <div
        className="grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto pb-2 sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-3 md:overflow-visible md:pb-0"
        tabIndex={0}
        aria-label="Qué hacer en el territorio"
      >
        {content.queHacer.items.map((item: HomePremiumEditorial) =>
          item.href ? (
            <Link
              key={item.title}
              to={item.href}
              className="relative h-[12.5rem] overflow-hidden rounded-2xl bg-[var(--brand-territory-deep)] text-white shadow-elevated lg:h-[15rem]"
            >
              <EditorialMediaFrame
                media={item.media}
                label={item.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                <p className="text-[10px] font-semibold uppercase text-primary">{item.kicker}</p>
                <h3 className="mt-1 font-display text-xl">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">
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

/**
 * Lote 3L · Resumen de ruta sólo con los datos realmente presentes en el CMS
 * (título · duración · N paradas). Devuelve "" cuando no hay ruta o ningún
 * dato confirmado, para que ninguna superficie imprima "undefined".
 */
function describeRoute(
  route: HomePremiumContent["rutas"]["items"][number] | undefined,
  withTitle = true,
): string {
  if (!route) return "";
  const parts: string[] = [];
  if (withTitle && route.title?.trim()) parts.push(route.title.trim());
  if (route.duration?.trim()) parts.push(route.duration.trim());
  if (Number.isFinite(route.stops) && route.stops > 0) {
    parts.push(`${route.stops} ${route.stops === 1 ? "parada" : "paradas"}`);
  }
  return parts.join(" · ");
}

function MapSection({
  content,
  selectedRoute,
  proposalSequence,
}: {
  content: HomePremiumContent;
  selectedRoute: string;
  /* Secuencia propuesta por Alux (títulos canónicos). Sólo se representa con
     puntos ya publicados del mismo mapa; nunca se inventan coordenadas. */
  proposalSequence?: readonly string[] | null;
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
  const proposalPoints = (proposalSequence ?? [])
    .map((title) => pointByTitle.get(normalizeLabel(title)))
    .filter((point): point is NonNullable<typeof point> => Boolean(point));
  const showingProposal = proposalPoints.length >= 2;
  /* Las paradas reales publicadas de la ruta (lugares, empresas y destinos)
     mandan sobre la lista de destinos: así el mapa dibuja el recorrido
     completo y no sólo el origen y el destino final. */
  const stopPoints = (route?.stopPoints ?? []).map((point) => ({
    ...point,
    thumbUrl: null,
    badge: null,
    priceLabel: null,
  }));
  const routePoints = showingProposal
    ? proposalPoints
    : stopPoints.length >= 2
      ? stopPoints
      : (route?.sequence ?? [])
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
          <h2 id="map-title" className="mt-1.5 font-display text-base sm:text-lg">
            {content.mapa.title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {content.mapa.description}
          </p>
        </div>
        {route ? (
          <div className="rounded-xl bg-muted p-4">
            <p className="text-[10px] font-semibold uppercase text-primary">
              {showingProposal ? "Tu propuesta con Alux" : "Ruta activa"}
            </p>
            <p className="mt-1 font-display text-lg">{route.title}</p>
            <p className="text-xs text-muted-foreground">{describeRoute(route, false)}</p>
          </div>
        ) : null}
      </div>
      <div className="max-h-[18rem] overflow-hidden rounded-2xl sm:max-h-[25rem] lg:max-h-none">
        <ExperienceMapBlock
          dto={mapDto}
          interactiveOnly
          immersive
          connectByRoad={routePoints.length >= 2}
        />
      </div>
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
  // Lote 3G.2 · Mi Viaje pasa a ayuda contextual secundaria mediante la
  // autoridad compartida TravelPlanBand (sólo presentación).
  // Lote 3L · sin rutas publicadas en el CMS `route` es undefined: se omite el
  // prefijo en vez de imprimir "undefined · undefined · undefined paradas".
  const routeSummary = describeRoute(route);
  const aluxNote =
    "Alux puede ajustar el orden según tus intereses sin crear otro modelo de itinerario.";
  return (
    <TravelPlanBand
      titleId="home-travel-plan"
      eyebrow={content.travelPlan.eyebrow}
      title={content.travelPlan.title}
      summary={routeSummary ? `${routeSummary}. ${aluxNote}` : aluxNote}
      primary={{
        label: added ? content.travelPlan.ctaAddedLabel : content.travelPlan.ctaAddLabel,
        onClick: onAdd,
        done: added,
      }}
      secondary={{ label: content.travelPlan.ctaAluxLabel, to: "/alux" }}
    />
  );
}
