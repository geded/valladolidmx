import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Map as MapIcon, MapPin, Palmtree, Search } from "lucide-react";

import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { Container } from "@/components/layout/Container";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIVE_BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import type { Destination } from "@/types/territory";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((module) => ({ default: module.InteractiveMap })),
);

const PAGE_SIZE = 8;
const PUEBLOS_MAGICOS = new Set(["valladolid", "izamal", "espita"]);
const COASTAL = new Set(["el-cuyo", "las-coloradas", "rio-lagartos", "san-felipe"]);
const HERO_MEDIA = [
  {
    src: "/api/public/studio-media/conceptual-preview/2026-09-01/oriente-maya-hero-territorio-v1.webp",
    alt: "Valladolid como puerta de entrada al Oriente Maya",
  },
  {
    src: "/api/public/studio-media/conceptual-preview/2026-09-01/oriente-maya-hero-naturaleza-v1.webp",
    alt: "Naturaleza y cenotes del Oriente Maya",
  },
  {
    src: "/api/public/studio-media/conceptual-preview/2026-09-01/oriente-maya-hero-cultura-v1.webp",
    alt: "Cultura maya viva del oriente de Yucatán",
  },
] as const;

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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(
      () => setHeroIndex((value) => (value + 1) % HERO_MEDIA.length),
      6800,
    );
    return () => window.clearInterval(timer);
  }, []);
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
    : HERO_MEDIA[heroIndex];
  const cinematic = presentation === "cinematic";

  return (
    <main className="pb-20" data-region-destinations="premium-approved">
      <Container className="pt-5">
        <section
          className={cn(
            "relative isolate overflow-hidden rounded-[2rem] border border-border bg-selva shadow-soft",
            cinematic
              ? "min-h-[34rem]"
              : "lg:grid lg:min-h-[25rem] lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]",
          )}
        >
          {cinematic ? (
            <img
              src={heroMedia.src}
              alt={heroMedia.alt}
              className="absolute inset-0 -z-20 size-full object-cover"
            />
          ) : null}
          {cinematic ? (
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/82 via-black/48 to-transparent" />
          ) : null}
          <div className="flex flex-col justify-center p-7 text-selva-foreground sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[.19em] text-primary">
              {ACTIVE_BRAND.tagline}
            </p>
            <h1 className="mt-4 max-w-3xl text-balance font-serif text-4xl leading-[1.02] text-selva-foreground sm:text-5xl lg:text-6xl">
              Explora los destinos del Oriente Maya de Yucatán
            </h1>
            <div className="mt-5 h-1 w-20 rounded-full bg-primary" />
            <h2 className="mt-5 font-serif text-xl text-selva-foreground sm:text-2xl">
              Valladolid, capital turística y punto de partida
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-selva-foreground/78 sm:text-base">
              Desde el corazón del Oriente Maya descubre pueblos con historia, tradiciones vivas,
              cenotes sagrados, costa y sabores únicos.
            </p>
          </div>
          <div
            className={cn("relative min-h-72 overflow-hidden lg:min-h-full", cinematic && "hidden")}
          >
            <img
              src={heroMedia.src}
              alt={heroMedia.alt}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/24 via-transparent to-transparent" />
            {!heroDestination?.image_url ? (
              <span className="absolute bottom-4 left-4 rounded-full bg-background/90 px-3 py-1 text-[10px] text-foreground backdrop-blur">
                Visual conceptual temporal · reemplazable en Medios
              </span>
            ) : null}
          </div>
        </section>

        <TourismAluxPanel
          className="relative z-10 -mt-3"
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

        <section className="mt-5 rounded-3xl border border-border bg-card p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
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
                className="min-h-12 rounded-full pl-11"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar destinos">
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
                    "min-h-11 shrink-0 rounded-full border px-4 text-sm",
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
            className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm"
            aria-labelledby="destination-list-heading"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Descubre el territorio
                </p>
                <h2 id="destination-list-heading" className="mt-1 font-serif text-3xl">
                  Destinos del Oriente Maya
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">{filtered.length} destinos</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((destination, index) => (
                <DestinationCard key={destination.slug} destination={destination} index={index} />
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
            className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm xl:sticky xl:top-24 xl:self-start"
            aria-labelledby="territory-map-heading"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Mapa del territorio
                </p>
                <h2 id="territory-map-heading" className="font-serif text-2xl">
                  Valladolid conecta tu ruta
                </h2>
              </div>
              <MapIcon className="size-5 text-selva" />
            </div>
            {mapped.length ? (
              <Suspense fallback={<div className="h-[34rem] animate-pulse rounded-2xl bg-muted" />}>
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
                  className="h-[34rem] rounded-2xl"
                />
              </Suspense>
            ) : (
              <div className="grid h-[28rem] place-items-center rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
                El mapa aparecerá cuando los destinos tengan coordenadas verificadas.
              </div>
            )}
            <div className="mt-3 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
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
    </main>
  );
}

function DestinationCard({ destination, index }: { destination: Destination; index: number }) {
  const isFeatured = index === 0;
  return (
    <article
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background",
        isFeatured && "sm:row-span-2 lg:col-span-1",
      )}
    >
      <Link to="/oriente-maya/$destino" params={{ destino: destination.slug }} className="block">
        <div className={cn("relative overflow-hidden bg-muted", isFeatured ? "h-64" : "h-40")}>
          {destination.image_url ? (
            <img
              src={destination.image_url}
              alt={destination.name}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center text-selva/55">
              <Compass className="size-10" />
            </div>
          )}
          <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-selva text-xs font-bold text-selva-foreground">
            {index + 1}
          </span>
          {PUEBLOS_MAGICOS.has(destination.slug) ? (
            <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[9px] font-semibold uppercase text-primary-foreground">
              Pueblo Mágico
            </span>
          ) : null}
          {COASTAL.has(destination.slug) ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[9px] font-semibold uppercase text-selva">
              <Palmtree className="size-3" /> Costa
            </span>
          ) : null}
        </div>
        <div className="p-3">
          <h3 className="font-serif text-xl">{destination.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {destination.tagline || "Descubre este destino del Oriente Maya de Yucatán."}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-selva">
            Descubrir destino <MapPin className="size-3.5" />
          </span>
        </div>
      </Link>
      <div className="mt-auto border-t border-border p-3">
        <AddToTravelPlanButton
          kind="destination"
          targetId={destination.id}
          title={destination.name}
          slug={destination.slug}
          imageUrl={destination.image_url}
          subtitle={destination.tagline}
          eligibilityMode="legacy"
          className="min-h-11 rounded-full"
        />
      </div>
    </article>
  );
}
