import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Map as MapIcon, Palmtree, Search } from "lucide-react";

import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { Container } from "@/components/layout/Container";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrand } from "@/lib/brand/brand-context";
import { cn } from "@/lib/utils";
import type { Destination } from "@/types/territory";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((module) => ({ default: module.InteractiveMap })),
);

const PAGE_SIZE = 8;
const PUEBLOS_MAGICOS = new Set(["valladolid", "izamal", "espita"]);
const COASTAL = new Set(["el-cuyo", "las-coloradas", "rio-lagartos", "san-felipe"]);
function destinationFamily(destination: Destination): string {
  if (PUEBLOS_MAGICOS.has(destination.slug)) return "pueblos";
  if (COASTAL.has(destination.slug)) return "costa";
  const text =
    `${destination.name} ${destination.tagline} ${destination.highlights.join(" ")}`.toLowerCase();
  if (/cenote|agua|reserva|naturaleza|flamenco/.test(text)) return "naturaleza";
  if (/maya|arqueol|historia|cultura/.test(text)) return "cultura";
  return "territorio";
}

function orderedDestinations(destinations: Destination[]): Destination[] {
  const priority = [
    "valladolid",
    "izamal",
    "espita",
    "temozon",
    "uyama",
    "tizimin",
    "el-cuyo",
    "las-coloradas",
    "rio-lagartos",
    "ek-balam",
  ];
  return [...destinations].sort((a, b) => {
    const ai = priority.indexOf(a.slug);
    const bi = priority.indexOf(b.slug);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return a.name.localeCompare(b.name, "es");
  });
}

/**
 * Catálogo regional aprobado (IMG_0575), conectado a destinos reales.
 * La identidad proviene de ACTIVE_BRAND; el motor es reutilizable por otras marcas.
 */
export function RegionDestinationsPremiumSurface({
  destinations,
  presentation = "editorial",
}: {
  destinations: Destination[];
  presentation?: "editorial" | "cinematic";
}) {
  const brand = useBrand();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [mapOpen, setMapOpen] = useState(false);
  const ordered = useMemo(() => orderedDestinations(destinations), [destinations]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return ordered.filter((destination) => {
      const matchesFamily = filter === "todos" || destinationFamily(destination) === filter;
      const haystack =
        `${destination.name} ${destination.tagline} ${destination.highlights.join(" ")}`.toLocaleLowerCase(
          "es",
        );
      return matchesFamily && (!needle || haystack.includes(needle));
    });
  }, [filter, ordered, query]);
  const shown = filtered.slice(0, visible);
  const mapped = filtered.filter(
    (destination) =>
      typeof destination.latitude === "number" && typeof destination.longitude === "number",
  );
  const heroDestination = ordered.find((destination) => destination.slug === "valladolid");
  const heroMedia = heroDestination?.image_url
    ? { src: heroDestination.image_url, alt: `Valladolid, punto de partida del Oriente Maya` }
    : null;
  // La variante cinematográfica exige un medio CMS acreditado. Sin él,
  // la misma autoridad resuelve una portada editorial completa y digna.
  const cinematic = presentation === "cinematic" && heroMedia !== null;

  return (
    <div className="pb-20" data-region-destinations="premium-approved">
      <Container className="pt-5">
        <section
          className={cn(
            "relative isolate overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft",
            cinematic
              ? "min-h-[34rem] md:min-h-[40rem] lg:min-h-[40rem]"
              : heroMedia
                ? "md:min-h-[40rem] lg:grid lg:min-h-[25rem] lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]"
                : "min-h-[24rem] bg-gradient-to-br from-card via-card to-secondary/55",
          )}
        >
          {cinematic ? (
            <img
              src={heroMedia!.src}
              alt={heroMedia!.alt}
              className="absolute inset-0 -z-20 size-full object-cover"
            />
          ) : null}
          {cinematic ? (
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/82 via-black/48 to-transparent" />
          ) : null}
          <div
            className={cn(
              "flex flex-col justify-center p-7 sm:p-10 lg:p-12",
              cinematic ? "text-white" : "text-foreground",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[.19em] text-primary">
              {brand.tagline}
            </p>
            <h1
              className={cn(
                "mt-4 max-w-3xl font-serif text-display-hero",
                cinematic ? "text-white" : "text-foreground",
              )}
            >
              Explora los destinos del Oriente Maya de Yucatán
            </h1>
            <div className="mt-5 h-1 w-20 rounded-full bg-primary" />
            <h2
              className={cn(
                "mt-5 font-serif text-xl sm:text-2xl",
                cinematic ? "text-white" : "text-foreground",
              )}
            >
              Valladolid, capital turística y punto de partida
            </h2>
            <p
              className={cn(
                "mt-3 max-w-2xl text-sm leading-6 sm:text-base",
                cinematic ? "text-white/85" : "text-muted-foreground",
              )}
            >
              Desde el corazón del Oriente Maya descubre pueblos con historia, tradiciones vivas,
              cenotes sagrados, costa y sabores únicos.
            </p>
          </div>
          {heroMedia ? (
            <div
              className={cn(
                "relative h-72 overflow-hidden md:h-80 lg:h-auto lg:min-h-full",
                cinematic && "hidden",
              )}
            >
              <img
                src={heroMedia.src}
                alt={heroMedia.alt}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/24 via-transparent to-transparent" />
            </div>
          ) : null}
        </section>

        <TourismAluxPanel
          className="relative z-10 mt-5"
          title="¿Qué lugares quieres conocer?"
          description="Te propongo una ruta según tus días, compañía e intereses; Valladolid funciona como base para descubrir la región sin convertir el viaje en una carrera."
          task="Ayúdame a descubrir destinos del Oriente Maya desde Valladolid y convertirlos en una ruta real."
          prompts={[
            "Pueblos Mágicos",
            "Cenotes y comunidades",
            "Historia y gastronomía",
            "Tengo un día",
          ]}
          compact
        />

        <section className="mt-5 rounded-3xl border border-border bg-card p-2 shadow-sm sm:p-3">
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <span className="sr-only">Buscar destino</span>
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Buscar destino, playa, cenote o cultura"
                className="min-h-11 rounded-full pl-11 text-sm sm:min-h-12"
              />
            </label>
            <div
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
              aria-label="Filtrar destinos"
              tabIndex={0}
            >
              {[
                ["todos", "Todos"],
                ["pueblos", "Pueblos Mágicos"],
                ["costa", "Costa"],
                ["naturaleza", "Naturaleza y cenotes"],
                ["cultura", "Cultura maya"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilter(key);
                    setVisible(PAGE_SIZE);
                  }}
                  aria-pressed={filter === key}
                  className={cn(
                    "h-10 shrink-0 rounded-full border px-3.5 text-[13px] sm:px-4 sm:text-sm",
                    filter === key
                      ? "border-selva bg-selva text-selva-foreground"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(26rem,.96fr)]">
          <section
            className="min-w-0 rounded-3xl border-border bg-transparent sm:border sm:bg-card sm:p-4 sm:shadow-sm"
            aria-labelledby="destination-list-heading"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Descubre el territorio
                </p>
                <h2 id="destination-list-heading" className="mt-1 font-serif text-2xl sm:text-3xl">
                  Destinos del Oriente Maya
                </h2>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {filtered.length} destinos
              </span>
            </div>

            <div className="mt-4 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((destination) => (
                <DestinationCard key={destination.slug} destination={destination} />
              ))}
            </div>
            {!shown.length ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No encontramos destinos con esos criterios.
              </div>
            ) : null}
            {visible < filtered.length ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-11 w-full rounded-full"
                onClick={() => setVisible((current) => current + PAGE_SIZE)}
              >
                Mostrar más destinos
              </Button>
            ) : null}
          </section>

          <section
            className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-4 xl:sticky xl:top-24 xl:self-start"
            aria-labelledby="territory-map-heading"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Mapa del territorio
                </p>
                <h2 id="territory-map-heading" className="truncate font-serif text-xl sm:text-2xl">
                  Valladolid conecta tu ruta
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen((current) => !current)}
                aria-expanded={mapOpen}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border px-3.5 text-[13px] font-semibold xl:hidden"
              >
                <MapIcon className="size-4 text-selva" />
                {mapOpen ? "Ocultar mapa" : "Ver mapa"}
              </button>
              <MapIcon className="hidden size-5 shrink-0 text-selva xl:block" />
            </div>
            <div className={cn("mt-3", mapOpen ? "block" : "hidden xl:block")}>
              {mapped.length ? (
                <Suspense
                  fallback={
                    <div className="h-[22rem] animate-pulse rounded-2xl bg-muted xl:h-[34rem]" />
                  }
                >
                  <InteractiveMap
                    lat={20.6896}
                    lng={-88.2011}
                    zoom={8}
                    markerTitle="Oriente Maya"
                    markers={mapped.map((destination) => ({
                      lat: destination.latitude as number,
                      lng: destination.longitude as number,
                      title: destination.name,
                      href: `/oriente-maya/${destination.slug}`,
                    }))}
                    className="h-[22rem] rounded-2xl xl:h-[34rem]"
                  />
                </Suspense>
              ) : (
                <div className="grid h-[18rem] place-items-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground xl:h-[28rem]">
                  El mapa aparecerá cuando los destinos tengan coordenadas verificadas.
                </div>
              )}
            </div>
            <div className="mt-3 rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground sm:p-4">
              <strong>Tu plan de viaje:</strong> guarda destinos y Alux los ordenará por tiempo,
              distancia y días disponibles.
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                Pueblos Mágicos del Oriente Maya
              </p>
              <h2 className="mt-1 font-serif text-2xl">Valladolid, Izamal y Espita</h2>
            </div>
            <Compass className="size-5 text-selva" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {ordered
              .filter((destination) => PUEBLOS_MAGICOS.has(destination.slug))
              .slice(0, 3)
              .map((destination) => (
                <Link
                  key={destination.slug}
                  to="/oriente-maya/$destino"
                  params={{ destino: destination.slug }}
                  className="group flex min-h-20 items-center gap-3 rounded-2xl border border-border p-3 hover:border-primary"
                >
                  <div className="size-14 overflow-hidden rounded-xl bg-muted">
                    {destination.image_url ? (
                      <img src={destination.image_url} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="font-serif text-lg">{destination.name}</strong>
                    <p className="text-xs text-muted-foreground">Pueblo Mágico</p>
                  </div>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
          </div>
        </section>
      </Container>
    </div>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <article className="group flex min-w-0 flex-col">
      <Link
        to="/oriente-maya/$destino"
        params={{ destino: destination.slug }}
        className="block min-w-0"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          {destination.image_url ? (
            <img
              src={destination.image_url}
              alt={destination.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center text-selva/55">
              <Compass className="size-10" />
            </div>
          )}
          {PUEBLOS_MAGICOS.has(destination.slug) ? (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[9px] font-semibold uppercase text-primary-foreground">
              Pueblo Mágico
            </span>
          ) : COASTAL.has(destination.slug) ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[9px] font-semibold uppercase text-selva">
              <Palmtree className="size-3" /> Costa
            </span>
          ) : null}
        </div>
        <div className="mt-2 min-w-0">
          <h3 className="truncate font-serif text-lg leading-tight">{destination.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {destination.tagline || "Descubre este destino del Oriente Maya de Yucatán."}
          </p>
        </div>
      </Link>
      <div className="mt-2">
        <AddToTravelPlanButton
          kind="destination"
          targetId={destination.id}
          title={destination.name}
          slug={destination.slug}
          imageUrl={destination.image_url}
          subtitle={destination.tagline}
          eligibilityMode="legacy"
          className="h-9 min-h-9 rounded-full px-3 text-xs"
        />
      </div>
    </article>
  );
}
