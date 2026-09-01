import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Compass, Map, MapPin, Palmtree, Search, Sparkles } from "lucide-react";
import { AluxMark } from "@/components/alux/AluxMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/layout/Container";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import type { Destination } from "@/types/territory";
import { cn } from "@/lib/utils";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((module) => ({ default: module.InteractiveMap })),
);

const PAGE_SIZE = 8;
const PUEBLOS_MAGICOS = new Set(["valladolid", "izamal", "espita"]);
const COASTAL = new Set(["el-cuyo", "las-coloradas", "rio-lagartos", "san-felipe"]);
const HERO_SLIDES = [
  {
    src: "/media/preview-generated/oriente-maya-hero-territorio-v1.webp",
    alt: "Vista conceptual de Valladolid y el territorio verde del Oriente Maya al amanecer",
    label: "Valladolid · punto de partida",
  },
  {
    src: "/media/preview-generated/oriente-maya-hero-naturaleza-v1.webp",
    alt: "Escena conceptual de exploración en un cenote del Oriente Maya",
    label: "Naturaleza · cenotes y aventura",
  },
  {
    src: "/media/preview-generated/oriente-maya-hero-cultura-v1.webp",
    alt: "Escena conceptual de bordado artesanal y cultura maya viva",
    label: "Cultura maya · comunidad viva",
  },
] as const;

function categoryOf(destination: Destination) {
  if (PUEBLOS_MAGICOS.has(destination.slug)) return "pueblos";
  if (COASTAL.has(destination.slug)) return "costa";
  const text =
    `${destination.name} ${destination.tagline} ${destination.highlights.join(" ")}`.toLowerCase();
  if (/cenote|agua|reserva|naturaleza|flamenco/.test(text)) return "naturaleza";
  if (/maya|arqueol|historia|cultura/.test(text)) return "cultura";
  return "territorio";
}

function balanced(destinations: Destination[]) {
  const priority = [
    "valladolid",
    "izamal",
    "espita",
    "el-cuyo",
    "las-coloradas",
    "rio-lagartos",
    "ek-balam",
    "temozon",
  ];
  return [...destinations].sort((a, b) => {
    const ai = priority.indexOf(a.slug);
    const bi = priority.indexOf(b.slug);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return a.name.localeCompare(b.name, "es");
  });
}

export function RegionDestinationsPremiumSurface({
  destinations,
}: {
  destinations: Destination[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setHeroSlide((current) => (current + 1) % HERO_SLIDES.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);
  const ordered = useMemo(() => balanced(destinations), [destinations]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return ordered.filter((destination) => {
      const matchesFilter = filter === "todos" || categoryOf(destination) === filter;
      const haystack =
        `${destination.name} ${destination.tagline} ${destination.highlights.join(" ")}`.toLocaleLowerCase(
          "es",
        );
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [filter, ordered, query]);
  const shown = filtered.slice(0, visible);
  const points = filtered.filter(
    (destination) =>
      typeof destination.latitude === "number" && typeof destination.longitude === "number",
  );

  const openCopilot = () =>
    openAluxFloating({
      reason: "manual",
      hint: "Ayúdame a descubrir el Oriente Maya desde Valladolid. Primero determina con mi perfil y Mi Viaje si estoy planeando o ya estoy en destino. Si no puedes saberlo, pregúntamelo. Solicita ubicación sólo si ya estoy en la región y quiero opciones cercanas.",
    });

  return (
    <main className="pb-24" data-region-destinations="premium">
      <section className="border-b border-border bg-background">
        <Container className="py-5 sm:py-6">
          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] bg-selva shadow-soft sm:min-h-[560px]">
            {HERO_SLIDES.map((slide, index) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={index === heroSlide ? slide.alt : ""}
                aria-hidden={index !== heroSlide}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
                  index === heroSlide ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,29,22,.94)_0%,rgba(5,29,22,.78)_44%,rgba(5,29,22,.2)_76%,rgba(5,29,22,.08)_100%)]" />
            <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-6 text-white sm:min-h-[560px] sm:p-10 lg:p-12">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Oriente Maya de Yucatán
                </p>
                <h1 className="mt-3 text-balance font-serif text-4xl leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                  Despierta en Valladolid y descubre el Oriente Maya de Yucatán
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                  Pueblos con historia, costa, cenotes, naturaleza y cultura maya para convertir
                  cada noche en Valladolid en un nuevo día de exploración.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-end">
                <div>
                  <p className="text-xs font-medium text-white/75">
                    {HERO_SLIDES[heroSlide].label}
                  </p>
                  <div className="mt-3 flex gap-2" role="group" aria-label="Imágenes destacadas">
                    {HERO_SLIDES.map((slide, index) => (
                      <button
                        key={slide.src}
                        type="button"
                        onClick={() => setHeroSlide(index)}
                        aria-label={`Mostrar ${slide.label}`}
                        aria-pressed={heroSlide === index}
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          heroSlide === index ? "w-9 bg-primary" : "w-2.5 bg-white/60",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/20 bg-selva/85 p-4 shadow-floating backdrop-blur-md sm:p-5">
                  <div className="flex items-center gap-3">
                    <AluxMark family="avatar" size={44} decorative />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Alux · copiloto
                      </p>
                      <p className="font-serif text-xl text-white">¿Planeando o ya estás aquí?</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">
                    Adapto rutas a tus fechas, noches, compañía e intereses. Sólo pediré ubicación
                    cuando estés en la región y la cercanía aporte valor.
                  </p>
                  <Button
                    type="button"
                    className="mt-4 min-h-11 w-full rounded-pill"
                    onClick={openCopilot}
                  >
                    <Sparkles className="mr-2 size-4" />
                    Planear con Alux
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="pt-8">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Buscar destino, playa, cenote o cultura"
              className="min-h-12 rounded-pill pl-11"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar destinos">
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
                  "min-h-11 shrink-0 rounded-pill border px-4 text-sm",
                  filter === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
          <section aria-labelledby="destinations-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Hasta 20 motivos para quedarte más días
                </p>
                <h2 id="destinations-heading" className="mt-2 font-serif text-3xl">
                  Destinos del Oriente Maya
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">{filtered.length} destinos</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {shown.map((destination, index) => (
                <Link
                  key={destination.slug}
                  to="/oriente-maya/$destino"
                  params={{ destino: destination.slug }}
                  className={cn(
                    "group overflow-hidden rounded-3xl border border-border bg-card shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    index === 0 && "sm:row-span-2",
                  )}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden bg-[radial-gradient(circle_at_70%_20%,hsl(var(--primary)/.22),transparent_35%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--card)))]",
                      index === 0 ? "h-64 sm:h-[28rem]" : "h-44",
                    )}
                  >
                    {destination.image_url ? (
                      <img
                        src={destination.image_url}
                        alt={destination.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary/70">
                        <Compass className="size-12" aria-hidden />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-selva text-xs font-bold text-selva-foreground">
                      {index + 1}
                    </span>
                    {PUEBLOS_MAGICOS.has(destination.slug) ? (
                      <span className="absolute right-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase text-primary">
                        Pueblo Mágico
                      </span>
                    ) : null}
                    {COASTAL.has(destination.slug) ? (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-pill bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase text-primary">
                        <Palmtree className="size-3" />
                        Costa
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-xl">{destination.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {destination.tagline || "Descubre este destino del Oriente Maya de Yucatán."}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Descubrir destino <MapPin className="size-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {shown.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-border p-8 text-center">
                <p className="font-medium">No encontramos destinos con esos criterios.</p>
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setQuery("");
                    setFilter("todos");
                  }}
                >
                  Ver todos los destinos
                </button>
              </div>
            ) : null}
            {visible < filtered.length ? (
              <Button
                type="button"
                variant="outline"
                className="mt-5 min-h-12 w-full rounded-pill"
                onClick={() => setVisible((value) => value + PAGE_SIZE)}
              >
                Mostrar más destinos
              </Button>
            ) : null}
          </section>

          <section aria-labelledby="territory-map" className="xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Mapa del territorio
                  </p>
                  <h2 id="territory-map" className="font-serif text-2xl">
                    Ubica cada experiencia
                  </h2>
                </div>
                <Map className="size-5 text-primary" />
              </div>
              {points.length ? (
                <Suspense
                  fallback={<div className="h-[540px] animate-pulse rounded-2xl bg-muted" />}
                >
                  <InteractiveMap
                    lat={20.6896}
                    lng={-88.2011}
                    zoom={8}
                    markerTitle="Oriente Maya"
                    markers={points.map((destination) => ({
                      lat: destination.latitude as number,
                      lng: destination.longitude as number,
                      title: destination.name,
                      href: `/oriente-maya/${destination.slug}`,
                    }))}
                    className="h-[540px] rounded-2xl"
                  />
                </Suspense>
              ) : (
                <div className="grid h-[420px] place-items-center rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
                  El mapa aparecerá al publicar las coordenadas acreditadas de los destinos.
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Valladolid es el punto de partida. Selecciona un destino para abrir su micrositio y
                construir una ruta.
              </p>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
