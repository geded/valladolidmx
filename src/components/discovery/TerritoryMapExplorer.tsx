/**
 * TerritoryMapExplorer — Herramienta de reconocimiento territorial de
 * `/mapa`. Reutiliza el mapa oficial (`InteractiveMap`), el cálculo de
 * rutas ya integrado (`computeRoute`) y los destinos publicados del CMS.
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
import { MapPin, Navigation, Clock, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeRoute } from "@/lib/maps/maps.functions";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import type { Destination } from "@/types/territory";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);

type Origin = { key: string; label: string; lat: number; lng: number };

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

function hasCoords(d: Destination): d is Destination & { latitude: number; longitude: number } {
  return typeof d.latitude === "number" && typeof d.longitude === "number";
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
  const [selected, setSelected] = useState<string | null>(null);

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
    const filtered =
      max === Infinity
        ? rows
        : rows.filter((r) => typeof r.durationSeconds === "number" && r.durationSeconds <= max);
    return filtered
      .slice()
      .sort((a, b) => (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity));
  }, [rows, band]);

  if (!origin || located.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El mapa territorial se está actualizando. Vuelve en unos minutos.
      </p>
    );
  }

  const selectedDestination = visible.find((r) => r.destination.slug === selected)?.destination;
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

  const center = selectedDestination
    ? {
        lat: (origin.lat + selectedDestination.latitude) / 2,
        lng: (origin.lng + selectedDestination.longitude) / 2,
        zoom: 10,
      }
    : { lat: origin.lat, lng: origin.lng, zoom: 9 };

  return (
    <div className="space-y-8">
      {/* Controles: origen y franja de tiempo */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Salgo desde
          </span>
          {located.map((d) => (
            <button
              key={d.slug}
              type="button"
              onClick={() => {
                setOriginKey(d.slug);
                setSelected(null);
              }}
              className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                originKey === d.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {d.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (location) setOriginKey("me");
              else request();
            }}
            className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
              originKey === "me"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {location ? "Mi ubicación" : "Usar mi ubicación"}
          </button>
          {status === "denied" ? (
            <span className="text-xs text-muted-foreground">
              Activa el permiso de ubicación para usar esta opción.
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tiempo de traslado
          </span>
          {BANDS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBand(b.id)}
              className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
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

      {/* Mapa territorial */}
      <Suspense
        fallback={<div className="h-[360px] w-full animate-pulse rounded-2xl bg-muted md:h-[480px]" />}
      >
        <InteractiveMap
          lat={center.lat}
          lng={center.lng}
          zoom={center.zoom}
          markerTitle={origin.label}
          markers={markers}
          onMarkerSelect={(key) => setSelected(key)}
          {...(selectedDestination
            ? {
                routeStops: [
                  { lat: origin.lat, lng: origin.lng, key: origin.key },
                  {
                    lat: selectedDestination.latitude,
                    lng: selectedDestination.longitude,
                    key: selectedDestination.slug,
                  },
                ],
              }
            : {})}
          className="h-[360px] w-full rounded-2xl border border-border md:h-[480px]"
        />
      </Suspense>
      <p className="text-xs text-muted-foreground">
        {selectedDestination
          ? `Camino de ${origin.label} a ${selectedDestination.name}. Elige otro destino para ver su ruta.`
          : "Elige un destino de la lista para dibujar el camino desde tu punto de partida."}
      </p>

      {/* Distancias y tiempos */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-foreground">
          Distancias y tiempos desde {origin.label}
        </h2>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún destino cae en esa franja de tiempo. Prueba con un rango mayor.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((row) => {
              const d = row.destination;
              const isSelected = selected === d.slug;
              return (
                <li
                  key={d.slug}
                  className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft transition-colors ${
                    isSelected ? "border-primary" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(isSelected ? null : d.slug)}
                    className="text-left"
                  >
                    <p className="font-serif text-base font-semibold text-foreground">{d.name}</p>
                    {d.tagline ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.tagline}</p>
                    ) : null}
                  </button>

                  {row.loading ? (
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  ) : typeof row.distanceMeters === "number" &&
                    typeof row.durationSeconds === "number" ? (
                    <div className="space-y-1">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <RouteIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          {formatDistance(row.distanceMeters)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          {formatDuration(row.durationSeconds)} en auto
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayTripHint(row.durationSeconds)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Distancia no disponible por ahora.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2">
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
                </li>
              );
            })}
          </ul>
        )}
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
    </div>
  );
}
