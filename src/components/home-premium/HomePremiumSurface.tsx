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
import { ACTIVE_BRAND } from "@/config/brand";

import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import { cn } from "@/lib/utils";
import { openAluxFloating } from "@/lib/alux/floating-bus";
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
  // Editorial y cinematográfica son variantes visuales del mismo sistema.
  // Nunca cambian jerarquía, orden ni geometría entre sí.
  const presentationOrder: HomePremiumSectionKey[] = order;

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
            <Container key={key} className="mt-8 lg:mt-12">
              <div data-cinematic-section={cinematic || undefined}>{renderSection(key)}</div>
            </Container>
          ) : null,
        )}

        <Container className="mt-8 lg:mt-12">
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
    <PremiumEditorialHero
      eyebrow={content.hero.eyebrow}
      title={content.hero.title}
      subtitle={content.hero.subtitle}
      media={slide.media}
      caption={slide.caption}
      searchSlot={<HeroSearch />}
    />
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
        <span className="absolute right-4 top-4 rounded-md bg-black/65 px-3 py-1.5 text-xs text-[#f7f3ea] backdrop-blur-sm">
          {slide.caption}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase text-primary">Oriente Maya de Yucatán</p>
          <h1 className="mt-2.5 max-w-4xl text-balance font-display text-4xl leading-[1.02] text-[#f7f3ea] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-[3.35rem]">
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

const SectionHead = PremiumSectionHead;


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
  return (
    <section id="rutas" aria-labelledby="routes-title">
      <SectionHead
        kicker={content.rutas.kicker}
        title={content.rutas.title}
        description={content.rutas.description}
        action={content.rutas.action}
      />
      <div className="grid grid-flow-col auto-cols-[84%] gap-3 overflow-x-auto pb-2 md:auto-cols-[31.5%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible lg:pb-0">
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
              <div className="p-3 lg:p-4">
                <p className="hidden text-sm leading-relaxed text-muted-foreground lg:block">
                  {route.description}
                </p>
                <ol
                  className="mt-4 hidden space-y-2 lg:block"
                  aria-label={`Paradas de ${route.title}`}
                >
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
                <div className="grid grid-cols-2 gap-2 lg:mt-5">
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
      />
      <PremiumShowcaseGrid
        items={items.slice(0, 4).map((destination) => ({
          key: destination.name,
          name: destination.name,
          note: destination.note,
          media: destination.media,
          to: destination.href ?? "/destinos",
        }))}
        onOpen={onOpen}
      />

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
      <div className="grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto pb-2 sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-3 md:overflow-visible md:pb-0">
        {pueblos.map((pueblo) => (
          <article
            key={pueblo.name}
            className="group relative h-[12.5rem] overflow-hidden rounded-2xl bg-[#071814] text-white shadow-elevated lg:h-[15rem]"
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
                Descubrir <ChevronRight className="size-3" />
              </span>
            </div>
          </article>
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
      <SectionHead
        kicker={content.experiencias.kicker}
        title={content.experiencias.title}
        description={content.experiencias.description}
        action={content.experiencias.action}
      />
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 lg:hidden">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.title}
              to={item.href}
              className="relative h-[15rem] w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl bg-[#071814] text-white sm:w-[46%]"
            >
              <EditorialMediaFrame
                media={item.media}
                label={item.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                <p className="text-[10px] font-semibold uppercase text-primary">{item.category}</p>
                <h3 className="mt-1 font-display text-2xl">{item.title}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-white/75">{item.summary}</p>
              </div>
            </Link>
          ) : null,
        )}
      </div>
      <div
        className={cn(
          "hidden gap-4 lg:grid lg:h-[30rem]",
          layout === "carrusel"
            ? "grid-flow-col auto-cols-[86%] overflow-x-auto pb-2 sm:auto-cols-[48%]"
            : "lg:grid-cols-[1.2fr_1fr]",
        )}
      >
        <article
          className={cn(
            "h-full overflow-hidden rounded-2xl border border-border bg-card",
            cinematic && "relative border-0 bg-[#071814] text-white shadow-elevated",
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
        <div className="grid min-h-0 grid-rows-3 gap-3">
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
      <div className="grid gap-5 md:grid-cols-[minmax(0,34%)_1fr] lg:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">{content.eventos.kicker}</p>
          <h2 id="events-title" className="mt-2 font-display text-3xl">
            {content.eventos.title}
          </h2>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {content.eventos.description}
          </p>
          <EditorialMediaFrame
            media={content.eventos.media}
            label={content.eventos.title}
            className="mt-4 aspect-[16/9] w-full rounded-2xl object-cover md:aspect-[4/3] lg:mt-5 lg:aspect-[16/10]"
          />
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {content.eventos.items.map((event, index) => (
            <li
              key={event.title}
              className="grid grid-cols-[2.5rem_1fr] items-center gap-3 py-3 lg:grid-cols-[3rem_1fr_auto] lg:py-5"
            >
              <span className="grid size-10 place-items-center rounded-full bg-secondary font-display text-lg">
                {index + 1}
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase text-primary">
                  {event.day} · {event.type}
                </p>
                <h3 className="mt-1 font-display text-xl">{event.title}</h3>
                <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{event.detail}</p>
              </div>
              {event.href ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden min-h-11 justify-self-start rounded-pill lg:inline-flex lg:justify-self-end"
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
      <div className="grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto pb-2 sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-3 md:overflow-visible md:pb-0">
        {content.queHacer.items.map((item: HomePremiumEditorial) =>
          item.href ? (
            <Link
              key={item.title}
              to={item.href}
              className="relative h-[12.5rem] overflow-hidden rounded-2xl bg-[#071814] text-white shadow-elevated lg:h-[15rem]"
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
