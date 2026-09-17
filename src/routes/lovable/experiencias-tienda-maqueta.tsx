/**
 * MAQUETA de revisión — mejora localizada del explorador de Experiencias.
 *
 * Reutiliza la autoridad Premium, la marca y los controles existentes. Airbnb
 * sólo es referencia de facilidad para descubrir por destino y categoría.
 * No modifica `/experiencias`, datos CMS, reservaciones ni pagos.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Heart, List, Map, MapPin, Search, Star } from "lucide-react";

import sampleCenote from "@/assets/maqueta-experiencias/cenote.jpg";
import sampleCocina from "@/assets/maqueta-experiencias/cocina.jpg";
import sampleIzamal from "@/assets/maqueta-experiencias/izamal.jpg";
import sampleHamaca from "@/assets/maqueta-experiencias/hamaca.jpg";
import sampleConventos from "@/assets/maqueta-experiencias/conventos.jpg";
import sampleTemazcal from "@/assets/maqueta-experiencias/temazcal.jpg";
import sampleHero from "@/assets/maqueta-experiencias/hero.jpg";
import { PublicShell } from "@/components/discovery";
import {
  PremiumAluxBar,
  PremiumEditorialHero,
  PremiumSectionHead,
} from "@/components/home-premium/shared/PremiumShowcase";
import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
import { Button } from "@/components/ui/button";
import { askAluxWithPreferenceMemory } from "@/lib/alux/travel-preferences";
import { emitAluxSignal } from "@/lib/alux/signal-emitter";
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft/hooks";
import {
  PARTY_OPTIONS,
  compositionFromPartySize,
  type PartyComposition,
} from "@/lib/traveler/party-composition";
import { cn } from "@/lib/utils";

const PAGE_TITLE = "Maqueta de Experiencias · Valladolid.mx";
const PAGE_DESCRIPTION =
  "Maqueta interna del explorador de experiencias del Oriente Maya por destino y categoría.";

export const Route = createFileRoute("/lovable/experiencias-tienda-maqueta")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: Page,
});

const CATEGORIES = [
  { slug: "all", label: "Todas" },
  { slug: "cenotes", label: "Cenotes y naturaleza" },
  { slug: "cultura", label: "Cultura maya" },
  { slug: "gastronomia", label: "Gastronomía" },
  { slug: "tours", label: "Recorridos" },
  { slug: "bienestar", label: "Bienestar" },
  { slug: "artesanias", label: "Artesanías" },
] as const;

const DESTINATIONS = ["Todos los destinos", "Valladolid", "Izamal", "Espita", "Temozón"] as const;

type CategorySlug = (typeof CATEGORIES)[number]["slug"];
type Destination = (typeof DESTINATIONS)[number];

type Card = {
  id: string;
  title: string;
  place: Exclude<Destination, "Todos los destinos">;
  image: string;
  category: string;
  categorySlug: Exclude<CategorySlug, "all">;
  duration: string;
  languages: string;
  rating: string;
  reviews: number;
  price: number;
  badge?: string;
};

const CARDS: Card[] = [
  {
    id: "c1",
    title: "Nado al amanecer en cenote de bóveda",
    place: "Valladolid",
    image: sampleCenote,
    category: "Cenotes y naturaleza",
    categorySlug: "cenotes",
    duration: "3 h",
    languages: "Español · Inglés",
    rating: "4.9",
    reviews: 128,
    price: 890,
    badge: "Reserva en línea",
  },
  {
    id: "c2",
    title: "Cocina de humo con familia yucateca",
    place: "Temozón",
    image: sampleCocina,
    category: "Gastronomía",
    categorySlug: "gastronomia",
    duration: "4 h",
    languages: "Español",
    rating: "4.8",
    reviews: 74,
    price: 1250,
    badge: "Reserva en línea",
  },
  {
    id: "c3",
    title: "Caminata nocturna por la ciudad amarilla",
    place: "Izamal",
    image: sampleIzamal,
    category: "Cultura maya",
    categorySlug: "cultura",
    duration: "2 h",
    languages: "Español · Inglés · Francés",
    rating: "4.7",
    reviews: 41,
    price: 450,
    badge: "Reserva en línea",
  },
  {
    id: "c4",
    title: "Taller de urdido en hamaca de algodón",
    place: "Espita",
    image: sampleHamaca,
    category: "Artesanías",
    categorySlug: "artesanias",
    duration: "2.5 h",
    languages: "Español · Maya",
    rating: "5.0",
    reviews: 19,
    price: 620,
  },
  {
    id: "c5",
    title: "Ruta de conventos y cantera colonial",
    place: "Valladolid",
    image: sampleConventos,
    category: "Recorridos",
    categorySlug: "tours",
    duration: "5 h",
    languages: "Español · Inglés",
    rating: "4.6",
    reviews: 96,
    price: 1490,
    badge: "Reserva en línea",
  },
  {
    id: "c6",
    title: "Temazcal de cierre de viaje",
    place: "Valladolid",
    image: sampleTemazcal,
    category: "Bienestar",
    categorySlug: "bienestar",
    duration: "2 h",
    languages: "Español",
    rating: "4.9",
    reviews: 57,
    price: 980,
  },
];

function Page() {
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [category, setCategory] = useState<CategorySlug>("all");
  const [destination, setDestination] = useState<Destination>("Todos los destinos");
  const [party, setParty] = useState<PartyComposition | null>(null);
  const anonymousTrip = useAnonymousTrip();

  useEffect(() => {
    const travelers = anonymousTrip.trip?.travelerCount;
    if (!travelers || party) return;
    setParty(
      (travelers.children ?? 0) > 0
        ? "familiar"
        : compositionFromPartySize(travelers.adults + (travelers.children ?? 0)),
    );
  }, [anonymousTrip.trip?.travelerCount, party]);

  const filtered = useMemo(
    () =>
      CARDS.filter(
        (card) =>
          (category === "all" || card.categorySlug === category) &&
          (destination === "Todos los destinos" || card.place === destination),
      ),
    [category, destination],
  );

  const goToResults = () => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });

  const rememberContext = (
    kind: "territory_viewed" | "category_explored",
    key: string,
  ) => {
    void emitAluxSignal({
      kind,
      key,
      purpose: "continuity",
      context: {
        isAuthenticated: false,
        surface: "experiences-store-review",
        route: window.location.pathname,
      },
    });
  };

  const selectDestination = (value: Destination) => {
    setDestination(value);
    if (value !== "Todos los destinos") {
      rememberContext("territory_viewed", value.toLocaleLowerCase("es-MX"));
    }
  };

  const selectCategory = (value: CategorySlug) => {
    setCategory(value);
    if (value !== "all") rememberContext("category_explored", value);
  };

  const selectParty = (value: PartyComposition) => {
    const option = PARTY_OPTIONS.find((item) => item.value === value);
    if (!option) return;
    setParty(value);
    void anonymousTrip.setTravelerCount(
      value === "familiar"
        ? { adults: 2, children: 2 }
        : { adults: option.partySize, children: 0 },
    );
  };

  const askAlux = () => {
    const partyLabel = PARTY_OPTIONS.find((item) => item.value === party)?.label ?? null;
    const categoryLabel = CATEGORIES.find((item) => item.slug === category)?.label ?? null;
    const context = [
      destination !== "Todos los destinos" ? `Destino: ${destination}` : null,
      category !== "all" ? `Categoría: ${categoryLabel}` : null,
      partyLabel ? `Compañía: ${partyLabel}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    askAluxWithPreferenceMemory({
      surface: "experiences-store-review",
      ...(partyLabel ? { prompt: partyLabel } : {}),
      hint: buildAluxStageAwareHint(
        "Ayúdame a comparar experiencias publicadas y convertir las elegidas en una propuesta para el concierge humano.",
        context || undefined,
      ),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MaquetaBanner />
      <PublicShell
        crumbs={[{ label: "Experiencias", to: "/experiencias" }, { label: "Maqueta de revisión" }]}
        compactCrumbsOnMobile
      >
        <div className="flex flex-col gap-9">
          <PremiumEditorialHero
            eyebrow="Experiencias del Oriente Maya"
            title="Encuentra algo inolvidable para vivir"
            subtitle="Explora por destino o por lo que quieres hacer. Elige la fecha y reserva cuando estés listo."
            media={{
              url: sampleHero,
              alt: "Fotografía de muestra de una experiencia en un cenote del Oriente Maya",
            }}
            caption="Oriente Maya de Yucatán"
            searchSlot={
              <ExperienceSearch
                destination={destination}
                category={category}
                onDestination={selectDestination}
                onCategory={selectCategory}
                onSearch={goToResults}
              />
            }
          />

          <PremiumAluxBar
            question="¿Con quién vivirás esta experiencia?"
            selectedParty={party}
            onSelectParty={selectParty}
            onContinue={askAlux}
            continueLabel="Ver sugerencias de Alux"
          />

          <CategoryRail active={category} onSelect={selectCategory} />
          <DestinationRail active={destination} onSelect={selectDestination} />

          <section id="resultados" aria-labelledby="resultados-title" className="scroll-mt-32">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <PremiumSectionHead
                id="resultados-title"
                kicker="Explora y compara"
                title={`${filtered.length} ${filtered.length === 1 ? "experiencia" : "experiencias"} para ti`}
                description="Fotos grandes, información esencial y precio visible para decidir con facilidad."
              />
              <ViewSwitch view={view} onView={setView} />
            </div>
            {filtered.length === 0 ? (
              <EmptyResults onClear={() => { setCategory("all"); setDestination("Todos los destinos"); }} />
            ) : view === "lista" ? (
              <Results cards={filtered} />
            ) : (
              <MapView cards={filtered} />
            )}
          </section>

        </div>
      </PublicShell>
    </div>
  );
}

function MaquetaBanner() {
  return (
    <div className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Maqueta de revisión · contenido y fotografías de muestra · no publicada
        </p>
      </div>
    </div>
  );
}

function ExperienceSearch({
  destination,
  category,
  onDestination,
  onCategory,
  onSearch,
}: {
  destination: Destination;
  category: CategorySlug;
  onDestination: (value: Destination) => void;
  onCategory: (value: CategorySlug) => void;
  onSearch: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-2 shadow-elevated">
      <div className="grid gap-2 sm:grid-cols-2">
        <SearchSelect
          label="Destino"
          value={destination}
          onChange={(value) => onDestination(value as Destination)}
          options={DESTINATIONS.map((value) => ({ value, label: value }))}
        />
        <SearchSelect
          label="Categoría"
          value={category}
          onChange={(value) => onCategory(value as CategorySlug)}
          options={CATEGORIES.map((item) => ({ value: item.slug, label: item.label }))}
        />
        <label className="rounded-xl border border-border bg-card px-3 py-2">
          <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Fecha</span>
          <input
            type="date"
            aria-label="Fecha de la experiencia"
            className="mt-0.5 min-h-6 w-full bg-transparent text-sm outline-none"
          />
        </label>
        <SearchSelect
          label="Viajeros"
          value="2 personas"
          onChange={() => undefined}
          options={["1 persona", "2 personas", "3 personas", "4 personas", "5 o más"].map(
            (value) => ({ value, label: value }),
          )}
        />
      </div>
      <Button type="button" onClick={onSearch} className="mt-2 min-h-11 w-full rounded-pill">
        <Search aria-hidden />
        Buscar experiencias
      </Button>
    </div>
  );
}

function SearchSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-xl border border-border bg-card px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 min-h-6 w-full bg-transparent text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CategoryRail({
  active,
  onSelect,
}: {
  active: CategorySlug;
  onSelect: (slug: CategorySlug) => void;
}) {
  return (
    <section aria-labelledby="categorias-title">
      <PremiumSectionHead
        id="categorias-title"
        kicker="Qué quieres vivir"
        title="Explora por categoría"
      />
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {CATEGORIES.map((item) => {
          const selected = item.slug === active;
          return (
            <Button
              key={item.slug}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              onClick={() => onSelect(item.slug)}
              className={cn(
                "h-24 min-w-28 snap-start flex-col gap-2 rounded-xl border px-3 py-3 whitespace-normal",
                selected
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {item.slug === "all" ? (
                <span className="grid size-10 place-items-center rounded-full bg-selva/10 text-selva">
                  <Search className="size-5" aria-hidden />
                </span>
              ) : (
                <img
                  src={`/brand/category-icons/${item.slug}.png`}
                  alt=""
                  className="size-10 object-contain"
                />
              )}
              <span className="line-clamp-2 text-center text-xs leading-tight">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

function DestinationRail({
  active,
  onSelect,
}: {
  active: Destination;
  onSelect: (value: Destination) => void;
}) {
  return (
    <section aria-labelledby="destinos-title" className="border-y border-border py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-52">
          <p className="text-xs font-semibold uppercase text-primary">Dónde quieres ir</p>
          <h2 id="destinos-title" className="mt-1 font-display text-2xl">
            Explora por destino
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:ml-auto">
          {DESTINATIONS.map((value) => (
            <Button
              key={value}
              type="button"
              variant={active === value ? "default" : "outline"}
              aria-pressed={active === value}
              onClick={() => onSelect(value)}
              className="min-h-11 shrink-0 rounded-pill px-5"
            >
              {value !== "Todos los destinos" ? <MapPin aria-hidden /> : null}
              {value}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ViewSwitch({
  view,
  onView,
}: {
  view: "lista" | "mapa";
  onView: (value: "lista" | "mapa") => void;
}) {
  return (
    <div className="flex shrink-0 rounded-pill border border-border bg-card p-1" aria-label="Vista de resultados">
      <Button
        type="button"
        variant={view === "lista" ? "default" : "ghost"}
        size="sm"
        onClick={() => onView("lista")}
        className="rounded-pill px-4"
      >
        <List aria-hidden />
        Lista
      </Button>
      <Button
        type="button"
        variant={view === "mapa" ? "default" : "ghost"}
        size="sm"
        onClick={() => onView("mapa")}
        className="rounded-pill px-4"
      >
        <Map aria-hidden />
        Mapa
      </Button>
    </div>
  );
}

function Results({ cards }: { cards: readonly Card[] }) {
  return (
    <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <ExperienceCard key={card.id} card={card} />
      ))}
    </div>
  );
}

function ExperienceCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  return (
    <article className={cn("group min-w-0", compact && "grid grid-cols-[8rem_minmax(0,1fr)] gap-3")}>
      <div className={cn("relative overflow-hidden rounded-xl bg-muted", compact ? "h-32" : "aspect-[4/3]")}>
        <img
          src={card.image}
          alt={`Fotografía de muestra: ${card.title}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
          loading="lazy"
        />
        {card.badge && !compact ? (
          <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase shadow-soft">
            {card.badge}
          </span>
        ) : null}
        {!compact ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Guardar ${card.title} en Mi Viaje`}
            title="Guardar en Mi Viaje"
            className="absolute right-3 top-3 rounded-full bg-background/90"
          >
            <Heart aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className={cn("pt-3", compact && "flex min-w-0 flex-col justify-center pt-0")}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="truncate font-semibold text-primary">{card.place} · {card.category}</p>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium">
            <Star className="size-3 fill-current" aria-hidden /> {card.rating}
          </span>
        </div>
        <h3 className={cn("mt-1 line-clamp-2 font-display leading-snug", compact ? "text-base" : "text-lg")}>
          {card.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {card.duration} · {card.languages}
        </p>
        {!compact ? (
          <p className="mt-2 text-sm">
            <span className="font-semibold">${card.price.toLocaleString("es-MX")} MXN</span>
            <span className="text-muted-foreground"> por persona</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function MapView({ cards }: { cards: readonly Card[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {cards.slice(0, 4).map((card) => (
          <ExperienceCard key={card.id} card={card} compact />
        ))}
      </div>
      <div className="relative min-h-[32rem] overflow-hidden rounded-xl border border-border bg-caliza/50 shadow-soft">
        <div className="absolute inset-x-8 top-1/4 border-t border-selva/20" />
        <div className="absolute inset-x-12 top-2/3 border-t border-selva/20" />
        <div className="absolute inset-y-10 left-1/3 border-l border-selva/20" />
        <div className="absolute inset-y-16 right-1/4 border-l border-selva/20" />
        {[
          { position: "left-[18%] top-[20%]", price: "$890" },
          { position: "left-[55%] top-[38%]", price: "$1,250" },
          { position: "left-[31%] top-[67%]", price: "$450" },
          { position: "right-[12%] top-[57%]", price: "$1,490" },
        ].map((pin) => (
          <span
            key={pin.price}
            className={cn(
              "absolute inline-flex items-center gap-1 rounded-pill border border-border bg-background px-3 py-2 text-xs font-semibold shadow-elevated",
              pin.position,
            )}
          >
            <MapPin className="size-3.5 text-primary" aria-hidden />
            {pin.price}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="border-y border-border py-12 text-center">
      <h3 className="font-display text-2xl">Prueba otra combinación</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        No hay experiencias de muestra para ese destino y categoría.
      </p>
      <Button type="button" variant="outline" onClick={onClear} className="mt-5 rounded-pill">
        Ver todas las experiencias
      </Button>
    </div>
  );
}
