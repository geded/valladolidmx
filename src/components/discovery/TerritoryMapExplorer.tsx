/**
 * TerritoryMapExplorer — Herramienta de reconocimiento territorial de
 * `/mapa`. Reutiliza el mapa oficial (`InteractiveMap`), el cálculo de
 * rutas ya integrado (`computeRoute`) y los destinos publicados del CMS.
 *
 * Diseño móvil primero: mapa persistente arriba, buscador + filtros,
 * lista compacta de destinos y barra fija con el recorrido reordenable.
 *
 * Reglas:
 *  - Cero datos inventados: si el proveedor no devuelve ruta, no se
 *    muestra distancia ni tiempo.
 *  - No es un mapa paralelo: la cartografía y los pines son los oficiales.
 *  - Sin precios, sin reservación. La acción es "Agregar a Mi Viaje".
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MapPin,
  Navigation,
  Clock,
  Route as RouteIcon,
  Search,
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { computeRoute } from "@/lib/maps/maps.functions";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import type { Destination } from "@/types/territory";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);

type Origin = { key: string; label: string; lat: number; lng: number };
/** El mapa nunca sale del estado de Yucatán. */
const YUCATAN_BOUNDS = { north: 21.75, south: 19.45, east: -87.35, west: -90.55 };

type LocatedDestination = Destination & { latitude: number; longitude: number };

const BASE_SLUG = "valladolid";

const BANDS = [
  { id: "all", label: "Todos", max: Infinity },
  { id: "30", label: "Hasta 30 min", max: 30 * 60 },
  { id: "60", label: "Hasta 1 h", max: 60 * 60 },
  { id: "120", label: "Hasta 2 h", max: 120 * 60 },
] as const;

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Recomendación de jornada a partir del tiempo real de traslado. */
function dayTripHint(seconds: number) {
  if (seconds <= 45 * 60) return "Ida y vuelta en el día, con tiempo de sobra";
  if (seconds <= 90 * 60) return "Ida y vuelta en el día, salida temprano";
  return "Conviene dormir allá o dedicarle el día completo";
}

function hasCoords(d: Destination): d is LocatedDestination {
  return typeof d.latitude === "number" && typeof d.longitude === "number";
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface TerritoryMapExplorerProps {
  destinations: readonly Destination[];
}

export function TerritoryMapExplorer({ destinations }: TerritoryMapExplorerProps) {
  const located = useMemo(() => destinations.filter(hasCoords), [destinations]);
  const base = useMemo(
    () => located.find((d) => d.slug === BASE_SLUG) ?? located[0] ?? null,
    [located],
  );

  const { location, status, request } = useVisitorGeolocation();
  const [originKey, setOriginKey] = useState<string>(BASE_SLUG);
  const [band, setBand] = useState<(typeof BANDS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  /** Recorrido: paradas elegidas, en el orden definido por el visitante. */
  const [selected, setSelected] = useState<string[]>([]);
  const [routeOpen, setRouteOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const toggleStop = (slug: string) =>
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const moveStop = (slug: string, delta: number) =>
    setSelected((prev) => {
      const from = prev.indexOf(slug);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]!);
      return next;
    });

  const dropOn = (slug: string) =>
    setSelected((prev) => {
      if (!dragging || dragging === slug) return prev;
      const from = prev.indexOf(dragging);
      const to = prev.indexOf(slug);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]!);
      return next;
    });

  const origin: Origin | null = useMemo(() => {
    if (originKey === "me" && location) {
      return { key: "me", label: "Mi ubicación", lat: location.lat, lng: location.lng };
    }
    const d = located.find((x) => x.slug === originKey) ?? base;
    if (!d) return null;
    return { key: d.slug, label: d.name, lat: d.latitude, lng: d.longitude };
  }, [originKey, location, located, base]);

  const targets = useMemo(
    () => located.filter((d) => !origin || d.slug !== origin.key),
    [located, origin],
  );

  const fn = useServerFn(computeRoute);
  const routes = useQueries({
    queries: targets.map((d) => ({
      queryKey: ["maps", "territory-route", origin?.key, d.slug],
      enabled: Boolean(origin),
      staleTime: 1000 * 60 * 60 * 24,
      queryFn: () =>
        fn({
          data: {
            originLat: origin!.lat,
            originLng: origin!.lng,
            destLat: d.latitude,
            destLng: d.longitude,
            travelMode: "DRIVE" as const,
          },
        }),
    })),
  });

  const rows = useMemo(
    () =>
      targets.map((d, i) => {
        const r = routes[i]?.data;
        return {
          destination: d,
          loading: routes[i]?.isLoading ?? false,
          distanceMeters: r?.ok ? r.distanceMeters : null,
          durationSeconds: r?.ok ? r.durationSeconds : null,
        };
      }),
    [targets, routes],
  );

  const visible = useMemo(() => {
    const max = BANDS.find((b) => b.id === band)?.max ?? Infinity;
    const q = normalize(query.trim());
    const filtered = rows.filter((r) => {
      const inBand =
        max === Infinity ||
        (typeof r.durationSeconds === "number" && r.durationSeconds <= max);
      const inQuery =
        !q ||
        normalize(r.destination.name).includes(q) ||
        normalize(r.destination.tagline ?? "").includes(q);
      return inBand && inQuery;
    });
    return filtered
      .slice()
      .sort((a, b) => (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity));
  }, [rows, band, query]);

  if (!origin || located.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El mapa territorial se está actualizando. Vuelve en unos minutos.
      </p>
    );
  }

  const stops = selected
    .map((slug) => located.find((d) => d.slug === slug))
    .filter((d): d is LocatedDestination => Boolean(d));

  const last = stops[stops.length - 1];
  const googleRouteUrl = last
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}` +
      `&destination=${last.latitude},${last.longitude}` +
      (stops.length > 1
        ? `&waypoints=${stops
            .slice(0, -1)
            .map((s) => `${s.latitude},${s.longitude}`)
            .join("|")}`
        : "") +
      `&travelmode=driving`
    : null;

  const markers = [
    { lat: origin.lat, lng: origin.lng, title: `${origin.label} · punto de partida`, href: null },
    ...visible.map((r) => ({
      lat: r.destination.latitude,
      lng: r.destination.longitude,
      title: r.destination.name,
      href: null,
      key: r.destination.slug,
    })),
  ];

  const center = stops.length
    ? {
        lat: (origin.lat + stops.reduce((a, s) => a + s.latitude, 0) / stops.length) / 2,
        lng: (origin.lng + stops.reduce((a, s) => a + s.longitude, 0) / stops.length) / 2,
        zoom: stops.length > 1 ? 10 : 12,
      }
    : { lat: origin.lat, lng: origin.lng, zoom: 11 };

  /** Encuadre cercano: se ajusta a las paradas marcadas, no a todo el territorio. */
  const fitPoints = stops.length
    ? [
        { lat: origin.lat, lng: origin.lng },
        ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      ]
    : undefined;



  /** Panel del recorrido, reutilizado en escritorio y en la hoja móvil. */
  const routePanel = (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sales desde <span className="font-medium text-foreground">{origin.label}</span>. Arrastra o
        usa las flechas para cambiar el orden.
      </p>
      {stops.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no marcas destinos. Toca un pin del mapa o el botón <strong>+</strong> de la lista.
        </p>
      ) : (
        <ol className="space-y-2">
          {stops.map((s, i) => (
            <li
              key={s.slug}
              draggable
              onDragStart={() => setDragging(s.slug)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                dropOn(s.slug);
                setDragging(null);
              }}
              onDragEnd={() => setDragging(null)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{s.name}</span>
              <button
                type="button"
                onClick={() => moveStop(s.slug, -1)}
                disabled={i === 0}
                aria-label={`Subir ${s.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => moveStop(s.slug, 1)}
                disabled={i === stops.length - 1}
                aria-label={`Bajar ${s.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => toggleStop(s.slug)}
                aria-label={`Quitar ${s.name} del recorrido`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
      {stops.length ? (
        <div className="flex flex-wrap gap-2">
          {googleRouteUrl ? (
            <Button asChild size="sm" variant="secondary" className="rounded-pill">
              <a href={googleRouteUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-1 h-3.5 w-3.5" aria-hidden />
                Abrir recorrido completo
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" className="rounded-pill">
            <Link to="/arma-tu-viaje" search={{ destination: origin.key, from: "mapa" as const }}>
              Llevarlo a Arma tu Viaje
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            Limpiar recorrido
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Buscador, filtros y lista compacta */}
        <div className="order-2 space-y-4 lg:order-1">
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar destino"
                aria-label="Buscar destino"
                className="rounded-pill pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="mapa-origen"
                className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Salgo de
              </label>
              <select
                id="mapa-origen"
                value={originKey}
                onChange={(e) => {
                  setOriginKey(e.target.value);
                  setSelected([]);
                }}
                className="min-w-0 flex-1 rounded-pill border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {located.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
                {location ? <option value="me">Mi ubicación</option> : null}
              </select>
              {!location ? (
                <button
                  type="button"
                  onClick={() => request()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-border bg-card px-3 py-2 text-xs text-foreground"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Mi ubicación
                </button>
              ) : null}
            </div>
            {status === "denied" ? (
              <p className="text-xs text-muted-foreground">
                Activa el permiso de ubicación para usar esa opción.
              </p>
            ) : null}

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {BANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBand(b.id)}
                  className={`shrink-0 rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                    band === b.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <h2 className="font-serif text-lg font-semibold text-foreground">
            {visible.length} destino{visible.length === 1 ? "" : "s"} desde {origin.label}
          </h2>

          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún destino coincide. Prueba con otro nombre o una franja de tiempo mayor.
            </p>
          ) : (
            <ul className="max-h-none space-y-2 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
              {visible.map((row) => {
                const d = row.destination;
                const stopIndex = selected.indexOf(d.slug);
                const isSelected = stopIndex >= 0;
                return (
                  <li
                    key={d.slug}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft ${
                      isSelected ? "border-primary" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStop(d.slug)}
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected
                          ? `Quitar ${d.name} del recorrido`
                          : `Marcar ${d.name} en el recorrido`
                      }
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-xs">{stopIndex + 1}</span>
                      ) : (
                        <Plus className="h-4 w-4" aria-hidden />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-semibold text-foreground">
                        {d.name}
                      </p>
                      {row.loading ? (
                        <span className="mt-1 block h-3 w-24 animate-pulse rounded bg-muted" />
                      ) : typeof row.distanceMeters === "number" &&
                        typeof row.durationSeconds === "number" ? (
                        <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            {formatDuration(row.durationSeconds)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <RouteIcon className="h-3 w-3" aria-hidden />
                            {formatDistance(row.distanceMeters)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Distancia no disponible</p>
                      )}
                    </div>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button size="sm" variant="ghost" className="rounded-pill">
                          Ver
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle className="font-serif">{d.name}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4 pt-2">
                          {d.tagline ? (
                            <p className="text-sm text-muted-foreground">{d.tagline}</p>
                          ) : null}
                          {typeof row.durationSeconds === "number" &&
                          typeof row.distanceMeters === "number" ? (
                            <div className="space-y-1">
                              <p className="text-sm text-foreground">
                                {formatDistance(row.distanceMeters)} ·{" "}
                                {formatDuration(row.durationSeconds)} en auto desde {origin.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {dayTripHint(row.durationSeconds)}
                              </p>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className="rounded-pill"
                              onClick={() => toggleStop(d.slug)}
                            >
                              {isSelected ? (
                                <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                              )}
                              {isSelected ? "En tu recorrido" : "Marcar en la ruta"}
                            </Button>
                            <Button asChild size="sm" variant="secondary" className="rounded-pill">
                              <Link to="/oriente-maya/$destino" params={{ destino: d.slug }}>
                                Ver destino
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="rounded-pill">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${d.latitude},${d.longitude}&travelmode=driving`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Navigation className="mr-1 h-3.5 w-3.5" aria-hidden />
                                Cómo llegar
                              </a>
                            </Button>
                            <AddToTravelPlanButton
                              kind="destination"
                              targetId={d.id}
                              title={d.name}
                              slug={d.slug}
                              subtitle={d.tagline ?? null}
                              eligibilityMode="legacy"
                            />
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Mapa persistente */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-20">
            <Suspense
              fallback={
                <div className="h-[58vh] min-h-[380px] w-full animate-pulse rounded-2xl bg-muted lg:h-[560px]" />
              }
            >
              <InteractiveMap
                lat={center.lat}
                lng={center.lng}
                zoom={center.zoom}
                markerTitle={origin.label}
                markers={markers}
                onMarkerSelect={(key) => toggleStop(key)}
                {...(stops.length
                  ? {
                      routeStops: [
                        { lat: origin.lat, lng: origin.lng, key: origin.key },
                        ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude, key: s.slug })),
                      ],
                    }
                  : {})}
                {...(fitPoints ? { fitPoints, fitPadding: 48 } : {})}
                restriction={YUCATAN_BOUNDS}
                minZoom={8}
                className="h-[58vh] min-h-[380px] w-full rounded-2xl border border-border lg:h-[560px]"
              />
            </Suspense>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Toca un pin para marcarlo o quitarlo del recorrido.
              </p>
              {googleRouteUrl ? (
                <Button asChild size="sm" variant="secondary" className="rounded-pill">
                  <a href={googleRouteUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Abrir recorrido completo
                  </a>
                </Button>
              ) : null}
            </div>


            {/* Recorrido en escritorio */}
            <div className="mt-4 hidden rounded-2xl border border-border bg-card p-4 lg:block">
              <p className="mb-2 font-serif text-base font-semibold text-foreground">
                Tu recorrido{stops.length ? ` · ${stops.length}` : ""}
              </p>
              {routePanel}
            </div>
          </div>
        </div>
      </div>

      {/* Puente con Arma tu Viaje */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-base font-semibold text-foreground">
            ¿Quieres encadenar varios destinos?
          </p>
          <p className="text-sm text-muted-foreground">
            Arma tu Viaje ordena tus destinos por cercanía y tu concierge humano revisa el
            expediente.
          </p>
        </div>
        <Button asChild className="rounded-pill">
          <Link to="/arma-tu-viaje" search={{ destination: origin.key, from: "mapa" as const }}>
            Armar una ruta con estos destinos
          </Link>
        </Button>
      </div>

      {/* Barra fija del recorrido en celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <Sheet open={routeOpen} onOpenChange={setRouteOpen}>
          <div className="flex items-center gap-3 pr-28">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                Tu recorrido · {stops.length} parada{stops.length === 1 ? "" : "s"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Desde {origin.label}
                {stops.length ? ` → ${stops.map((s) => s.name).join(" → ")}` : ""}
              </p>
            </div>
            <SheetTrigger asChild>
              <Button size="sm" className="shrink-0 rounded-pill" disabled={stops.length === 0}>
                Ver ruta
              </Button>
            </SheetTrigger>
          </div>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif">Tu recorrido</SheetTitle>
            </SheetHeader>
            <div className="pt-2">{routePanel}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
