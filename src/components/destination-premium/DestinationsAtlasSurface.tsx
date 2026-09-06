/**
 * G8 · Atlas de Destinos del Oriente Maya — plantilla maestra responsive.
 *
 * Autoridad visual: el Home Premium aprobado. Esta superficie NO define
 * diseño propio: consume las piezas extraídas en
 * `@/components/home-premium/shared/PremiumShowcase` (hero editorial, head de
 * sección, barra de Alux, bloque Destinos y fila compacta), el `Container`
 * del Home y los mismos tokens. Header, footer, breadcrumb y botón flotante
 * viven en el shell global.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  ExternalLink,
  List,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type { MapRouteStatus } from "@/components/maps/InteractiveMap";

import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
import { TravelPlanBand } from "@/components/travel-plan/TravelPlanBand";
import { Container } from "@/components/layout/Container";
import {
  PremiumAluxBar,
  PremiumCompactRow,
  PremiumEditorialHero,
  PremiumSectionHead,
  PremiumShowcaseGrid,
  type PremiumShowcaseItem,
} from "@/components/home-premium/shared/PremiumShowcase";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIVE_BRAND } from "@/config/brand";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft/hooks";
import {
  PARTY_OPTIONS,
  compositionFromPartySize,
  type PartyComposition,
} from "@/lib/traveler/party-composition";
import { cn } from "@/lib/utils";
import type { Destination } from "@/types/territory";
import {
  ATLAS_INTEREST_LABELS,
  PUEBLOS_MAGICOS,
  TERRITORY_TYPE_LABELS,
  classifyInterests,
  classifyTerritoryType,
  formatProximity,
  proximityFrom,
  type AtlasInterest,
  type ProximityInfo,
  type TerritoryType,
} from "@/lib/destinations/atlas-taxonomy";
import {
  DESTINATIONS_ATLAS_CONTENT,
  type DestinationsAtlasContent,
  type DestinationsAtlasSectionKey,
} from "./destinations-atlas-content";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);

/** Medio del destino en el contrato editorial compartido. */
function destinationMedia(destination: Destination) {
  return destination.image_url ? { url: destination.image_url, alt: destination.name } : null;
}

/** Adaptador único destino → tarjeta compartida del Home. */
function toShowcaseItem(destination: Destination, meta?: string | null): PremiumShowcaseItem {
  return {
    key: destination.slug,
    name: destination.name,
    note: destination.tagline,
    media: destinationMedia(destination),
    to: "/oriente-maya/$destino",
    params: { destino: destination.slug },
    kicker: TERRITORY_TYPE_LABELS[classifyTerritoryType(destination)],
    meta: meta ?? null,
  };
}

export interface DestinationsAtlasSurfaceProps {
  destinations: readonly Destination[];
  content?: DestinationsAtlasContent;
  /** Fixtures de revisión (sólo previews noindex). */
  fixtureProximity?: Record<string, { km: number; minutes: number }>;
  fixtureNotice?: string | null;
}

type OriginMode = "valladolid" | "nearby" | "other";

export function DestinationsAtlasSurface({
  destinations,
  content = DESTINATIONS_ATLAS_CONTENT,
  fixtureProximity,
  fixtureNotice = null,
}: DestinationsAtlasSurfaceProps) {
  const enabled = (key: DestinationsAtlasSectionKey) => content.sections?.[key] !== false;
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<TerritoryType[]>([]);
  const [interest, setInterest] = useState<AtlasInterest | null>(null);
  const [onlyMagic, setOnlyMagic] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [origin, setOrigin] = useState<OriginMode>("valladolid");
  const [originSlug, setOriginSlug] = useState("valladolid");
  const [active, setActive] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"lista" | "mapa">("lista");
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [party, setParty] = useState<PartyComposition | null>(null);
  const trip = useAnonymousTrip();

  useEffect(() => {
    const count = trip.trip?.travelerCount;
    if (!count || party) return;
    setParty(
      (count.children ?? 0) > 0
        ? "familiar"
        : compositionFromPartySize(count.adults + (count.children ?? 0)),
    );
  }, [trip.trip?.travelerCount, party]);

  const list = useMemo(
    () => [...destinations].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [destinations],
  );
  const originDestination =
    origin === "other"
      ? (list.find((d) => d.slug === originSlug) ?? null)
      : (list.find((d) => d.slug === "valladolid") ?? null);

  const proximityOf = (destination: Destination): ProximityInfo | null => {
    const administered = proximityFrom(originDestination, destination);
    if (administered) return administered;
    const fixture = fixtureProximity?.[destination.slug];
    return fixture ? { ...fixture, source: "fixture" } : null;
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return list.filter((destination) => {
      if (onlyMagic && !PUEBLOS_MAGICOS.has(destination.slug)) return false;
      if (types.length && !types.includes(classifyTerritoryType(destination))) return false;
      if (interest && !classifyInterests(destination).includes(interest)) return false;
      if (maxMinutes) {
        const info = proximityOf(destination);
        if (destination.slug !== originDestination?.slug && (!info || info.minutes > maxMinutes))
          return false;
      }
      if (!needle) return true;
      return `${destination.name} ${destination.tagline} ${destination.highlights.join(" ")}`
        .toLocaleLowerCase("es")
        .includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, query, types, interest, onlyMagic, maxMinutes, originDestination?.slug]);

  const pageSize = content.grid.pageSize;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const featured = list.find((d) => d.slug === content.startHere.featuredSlug) ?? list[0] ?? null;
  const companions = useMemo(() => {
    const configured = content.startHere.companionSlugs
      .map((slug) => list.find((d) => d.slug === slug))
      .filter((d): d is Destination => Boolean(d));
    if (configured.length >= 3) return configured.slice(0, 3);
    const rest = list.filter(
      (d) => !PUEBLOS_MAGICOS.has(d.slug) && d.slug !== featured?.slug && !configured.includes(d),
    );
    const byDiversity: Destination[] = [];
    const seen = new Set<TerritoryType>();
    for (const destination of rest) {
      const type = classifyTerritoryType(destination);
      if (seen.has(type)) continue;
      seen.add(type);
      byDiversity.push(destination);
    }
    return [...configured, ...byDiversity, ...rest].slice(0, 3);
  }, [content.startHere.companionSlugs, list, featured?.slug]);

  const mapped = useMemo(
    () => filtered.filter((d) => typeof d.latitude === "number" && typeof d.longitude === "number"),
    [filtered],
  );
  const activeDestination = mapped.find((d) => d.slug === active) ?? null;

  /* ---------------- Recorrido: selección múltiple tarjeta ↔ marcador ------------- */
  const [stopSlugs, setStopSlugs] = useState<string[]>([]);
  const [routeStatus, setRouteStatus] = useState<MapRouteStatus | null>(null);
  const [optimizeRoute, setOptimizeRoute] = useState(false);

  const toggleStop = useCallback((slug: string) => {
    setStopSlugs((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
    setOptimizeRoute(false);
  }, []);

  const stops = useMemo(
    () =>
      stopSlugs
        .map((slug) => destinations.find((d) => d.slug === slug))
        .filter(
          (d): d is Destination =>
            Boolean(d) && typeof d?.latitude === "number" && typeof d?.longitude === "number",
        ),
    [stopSlugs, destinations],
  );

  const mapMarkers = useMemo(
    () =>
      mapped.map((destination) => ({
        lat: destination.latitude as number,
        lng: destination.longitude as number,
        title: destination.name,
        href: `/oriente-maya/${destination.slug}`,
        key: destination.slug,
        order: stopSlugs.indexOf(destination.slug) + 1 || null,
      })),
    [mapped, stopSlugs],
  );

  const routeStops = useMemo(
    () =>
      stops.length > 1
        ? stops.map((d) => ({
            lat: d.latitude as number,
            lng: d.longitude as number,
            key: d.slug,
          }))
        : undefined,
    [stops],
  );

  const handleRouteStatus = useCallback((status: MapRouteStatus) => {
    setRouteStatus(status);
    if (status.mode === "directions" && status.waypointOrder?.length) {
      setStopSlugs((current) => {
        if (current.length < 3) return current;
        const middle = current.slice(1, -1);
        const reordered = [
          current[0],
          ...status.waypointOrder!.map((i) => middle[i]).filter(Boolean),
          current[current.length - 1],
        ];
        return reordered.join("|") === current.join("|") ? current : reordered;
      });
      setOptimizeRoute(false);
    }
  }, []);

  const handleMarkerSelect = useCallback(
    (slug: string) => {
      setActive(slug);
      toggleStop(slug);
    },
    [toggleStop],
  );

  const googleMapsRouteUrl = useMemo(() => {
    if (stops.length < 2) return null;
    const coord = (d: Destination) => `${d.latitude},${d.longitude}`;
    const params = new URLSearchParams({
      api: "1",
      origin: coord(stops[0]),
      destination: coord(stops[stops.length - 1]),
      travelmode: "driving",
    });
    const waypoints = stops.slice(1, -1).map(coord).join("|");
    if (waypoints) params.set("waypoints", waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [stops]);

  const routeMetrics =
    routeStatus?.mode === "directions" && routeStatus.distanceMeters && routeStatus.durationSeconds
      ? `${Math.round(routeStatus.distanceMeters / 1000)} km · ${Math.round(
          routeStatus.durationSeconds / 60,
        )} min en auto`
      : null;

  const askAlux = (extra?: string) => {
    const preference = [
      selectedInterest ? `Interés: ${selectedInterest}` : null,
      selectedDuration ? `Tiempo disponible: ${selectedDuration}` : null,
      party ? `Compañía: ${PARTY_OPTIONS.find((o) => o.value === party)?.label ?? party}` : null,
      extra,
    ]
      .filter(Boolean)
      .join(". ");
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(
        "Ayúdame a elegir destinos del Oriente Maya desde Valladolid por afinidad y cercanía, y convertirlos en una ruta que pueda guardar en Mi Viaje.",
        preference || undefined,
      ),
    });
  };

  const section = (key: DestinationsAtlasSectionKey, node: React.ReactNode) =>
    enabled(key) ? node : null;

  return (
    <div className="pb-16" data-surface="destinations-atlas">
      {section(
        "hero",
        <Container className="pt-4 sm:pt-6">
          <PremiumEditorialHero
            eyebrow={content.hero.eyebrow}
            title={content.hero.title}
            subtitle={content.hero.description}
            media={content.hero.media}
            searchSlot={
              <label className="relative block rounded-pill bg-card shadow-soft">
                <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">{content.hero.searchPlaceholder}</span>
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={content.hero.searchPlaceholder}
                  className="min-h-14 rounded-pill border-border pl-12 text-base"
                />
              </label>
            }
          />
        </Container>,
      )}

      <Container className="mt-6 space-y-10 sm:mt-8 sm:space-y-14">
        {fixtureNotice ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            {fixtureNotice}
          </p>
        ) : null}

        {section(
          "alux",
          <section aria-label={`${ACTIVE_BRAND.conciergeName}, concierge IA`} className="space-y-3">
            <PremiumAluxBar
              question={content.alux.title}
              selectedParty={party}
              onSelectParty={(value) => {
                const option = PARTY_OPTIONS.find((o) => o.value === value);
                if (!option) return;
                setParty(value);
                void trip.setTravelerCount(
                  value === "familiar"
                    ? { adults: 2, children: 2 }
                    : { adults: option.partySize, children: 0 },
                );
              }}
              onContinue={() => askAlux()}
            />
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {content.alux.description}
              </p>
              <ChipRow
                legend="Intereses"
                options={content.alux.interests}
                value={selectedInterest}
                onChange={setSelectedInterest}
                className="mt-3"
              />
              <ChipRow
                legend="Tiempo disponible"
                options={content.alux.durations}
                value={selectedDuration}
                onChange={setSelectedDuration}
                className="mt-3"
              />
              <Button
                type="button"
                onClick={() => askAlux()}
                className="mt-4 min-h-11 w-full rounded-pill sm:w-auto"
              >
                <Sparkles className="mr-2 size-4" /> {content.alux.cta}
              </Button>
            </div>
          </section>,
        )}

        {featured
          ? section(
              "start_here",
              <section aria-labelledby="atlas-start-here">
                <SectionHead
                  kicker={content.startHere.kicker}
                  id="atlas-start-here"
                  title={content.startHere.title}
                  description={content.startHere.description}
                />
                <PremiumShowcaseGrid
                  items={[featured, ...companions].map((destination) =>
                    toShowcaseItem(destination),
                  )}
                />

                <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  {content.startHere.disclaimer}
                </p>
              </section>,
            )
          : null}

        {section(
          "explorer",
          <section aria-labelledby="atlas-explorer">
            <SectionHead
              kicker={content.explorer.kicker}
              id="atlas-explorer"
              title={content.explorer.title}
              description={content.explorer.description}
            />
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="group"
              aria-label="Origen de referencia"
            >
              {(
                [
                  ["valladolid", content.explorer.originLabels.valladolid],
                  ["nearby", content.explorer.originLabels.nearby],
                  ["other", content.explorer.originLabels.other],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={origin === key}
                  onClick={() => setOrigin(key)}
                  className={cn(
                    "min-h-11 rounded-pill border px-4 text-sm",
                    origin === key
                      ? "border-selva bg-selva text-selva-foreground"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
              {origin === "other" ? (
                <label className="min-h-11">
                  <span className="sr-only">Elegir destino de origen</span>
                  <select
                    value={originSlug}
                    onChange={(event) => setOriginSlug(event.target.value)}
                    className="min-h-11 rounded-pill border border-border bg-background px-4 text-sm"
                  >
                    {list.map((destination) => (
                      <option key={destination.slug} value={destination.slug}>
                        {destination.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {origin === "nearby" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Alux puede usar tu ubicación sólo si tú la compartes; mientras tanto mostramos las
                distancias desde Valladolid.
              </p>
            ) : null}

            <div
              className="mt-4 flex gap-2 lg:hidden"
              role="group"
              aria-label="Vista del explorador"
            >
              {(["lista", "mapa"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={mobileView === view}
                  onClick={() => setMobileView(view)}
                  className={cn(
                    "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill border px-4 text-sm",
                    mobileView === view
                      ? "border-selva bg-selva text-selva-foreground"
                      : "border-border bg-background",
                  )}
                >
                  {view === "lista" ? <List className="size-4" /> : <MapIcon className="size-4" />}
                  {view === "lista" ? "Lista" : "Mapa"}
                </button>
              ))}
            </div>

            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.9fr)]">
              <div className={cn("min-w-0 space-y-3", mobileView === "mapa" && "hidden lg:block")}>
                {filtered.slice(0, 6).map((destination) => (
                  <AtlasCard
                    key={destination.slug}
                    destination={destination}
                    proximity={proximityOf(destination)}
                    layout="row"
                    active={active === destination.slug}
                    onFocus={() => setActive(destination.slug)}
                    stopOrder={stopSlugs.indexOf(destination.slug) + 1 || null}
                    onToggleStop={() => toggleStop(destination.slug)}
                  />
                ))}
                {!filtered.length ? (
                  <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {content.grid.emptyMessage}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-soft lg:sticky lg:top-24 lg:self-start",
                  mobileView === "lista" && "hidden lg:block",
                )}
              >
                {mapped.length ? (
                  <Suspense
                    fallback={
                      <div className="h-[22rem] animate-pulse rounded-2xl bg-muted lg:h-[30rem]" />
                    }
                  >
                    <InteractiveMap
                      lat={activeDestination?.latitude ?? 20.6896}
                      lng={activeDestination?.longitude ?? -88.2011}
                      zoom={activeDestination ? 11 : 8}
                      markerTitle={activeDestination?.name ?? "Oriente Maya"}
                      markers={mapMarkers}
                      routeStops={routeStops}
                      optimizeRoute={optimizeRoute}
                      onRouteStatus={handleRouteStatus}
                      onMarkerSelect={handleMarkerSelect}
                      className="h-[26rem] w-full rounded-2xl lg:h-[30rem]"
                    />
                  </Suspense>
                ) : (
                  <div className="grid h-[22rem] place-items-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground lg:h-[30rem]">
                    El mapa aparecerá cuando los destinos tengan coordenadas verificadas en CMS.
                  </div>
                )}

                {/* Tarjetas deslizables bajo el mapa (móvil): añadir/quitar paradas. */}
                {mapped.length ? (
                  <div
                    className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 lg:hidden"
                    aria-label="Destinos del mapa"
                  >
                    {mapped.slice(0, 8).map((destination) => {
                      const order = stopSlugs.indexOf(destination.slug) + 1 || null;
                      const info = proximityOf(destination);
                      return (
                        <div
                          key={destination.slug}
                          className="w-[15rem] shrink-0 snap-start space-y-2"
                          onFocus={() => setActive(destination.slug)}
                        >
                          <PremiumCompactRow
                            item={toShowcaseItem(destination, info ? formatProximity(info) : null)}
                            active={active === destination.slug}
                            onFocus={() => setActive(destination.slug)}
                          />
                          <Button
                            type="button"
                            variant={order ? "default" : "outline"}
                            className="min-h-11 w-full rounded-pill"
                            aria-pressed={Boolean(order)}
                            onClick={() => toggleStop(destination.slug)}
                          >
                            {order ? (
                              <>
                                <Check className="mr-2 size-4" aria-hidden /> Parada {order}
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 size-4" aria-hidden /> Agregar
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Panel de recorrido: orden de paradas y acciones canónicas. */}
                {stops.length ? (
                  <div id="atlas-ruta" className="mt-3 rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg">Tu recorrido</h3>
                      <span className="text-xs text-muted-foreground">
                        {stops.length} {stops.length === 1 ? "destino" : "destinos"}
                      </span>
                    </div>
                    {routeMetrics ? (
                      <p className="mt-1 text-xs text-muted-foreground">{routeMetrics}</p>
                    ) : null}
                    {routeStatus?.mode === "approximate" ? (
                      <p className="mt-1 rounded-xl bg-muted p-2 text-xs text-muted-foreground">
                        Trazo aproximado entre coordenadas del CMS: el servicio de rutas por
                        carretera no está autorizado en este entorno
                        {routeStatus.providerStatus ? ` (${routeStatus.providerStatus})` : ""}. No
                        mostramos kilometraje ni tiempos de carretera.
                      </p>
                    ) : null}
                    <ol className="mt-3 space-y-2">
                      {stops.map((destination, index) => (
                        <li
                          key={destination.slug}
                          className="flex min-w-0 items-center gap-2 rounded-xl bg-secondary/60 p-2"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-selva text-xs font-semibold text-selva-foreground">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {destination.name}
                          </span>
                          <AddToTravelPlanButton
                            kind="destination"
                            targetId={destination.id}
                            title={destination.name}
                            slug={destination.slug}
                            imageUrl={destination.image_url ?? null}
                            subtitle={destination.tagline}
                            eligibilityMode="legacy"
                            className="min-h-11 rounded-pill"
                          />
                          <button
                            type="button"
                            onClick={() => toggleStop(destination.slug)}
                            aria-label={`Quitar ${destination.name} del recorrido`}
                            className="grid size-11 shrink-0 place-items-center rounded-full border border-border"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {routeStatus?.mode === "directions" && stops.length > 2 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 rounded-pill"
                          onClick={() => setOptimizeRoute(true)}
                        >
                          <Wand2 className="mr-2 size-4" aria-hidden /> Optimizar recorrido
                        </Button>
                      ) : null}
                      {googleMapsRouteUrl ? (
                        <Button asChild variant="secondary" className="min-h-11 rounded-pill">
                          <a href={googleMapsRouteUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 size-4" aria-hidden /> Abrir en Google
                            Maps
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 rounded-pill"
                        onClick={() =>
                          askAlux(`Recorrido propuesto: ${stops.map((d) => d.name).join(" · ")}`)
                        }
                      >
                        <Sparkles className="mr-2 size-4" aria-hidden /> Revisar con{" "}
                        {ACTIVE_BRAND.conciergeName}
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {ACTIVE_BRAND.conciergeName} puede sugerir paradas; tú confirmas cada destino
                      antes de guardarlo en Mi Viaje.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Toca un marcador o “Agregar” para armar un recorrido con varios destinos.
                  </p>
                )}
              </div>
            </div>

            {/* Barra inferior móvil: acceso rápido al recorrido en curso. */}
            {stops.length ? (
              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
                <Button
                  type="button"
                  className="min-h-11 w-full rounded-pill"
                  onClick={() => {
                    setMobileView("mapa");
                    document
                      .getElementById("atlas-ruta")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  Ver ruta · {stops.length} {stops.length === 1 ? "destino" : "destinos"}
                </Button>
              </div>
            ) : null}
          </section>,
        )}

        {section(
          "grid",
          <section aria-labelledby="atlas-grid">
            <SectionHead
              kicker={content.grid.kicker}
              id="atlas-grid"
              title={content.grid.title}
              description={content.grid.description}
            />
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtros de destinos">
              {(Object.keys(TERRITORY_TYPE_LABELS) as TerritoryType[]).map((type) => (
                <FilterChip
                  key={type}
                  label={TERRITORY_TYPE_LABELS[type]}
                  active={types.includes(type)}
                  onClick={() => {
                    setPage(1);
                    setTypes((current) =>
                      current.includes(type)
                        ? current.filter((value) => value !== type)
                        : [...current, type],
                    );
                  }}
                />
              ))}
              <FilterChip
                label="Pueblo Mágico"
                active={onlyMagic}
                onClick={() => {
                  setPage(1);
                  setOnlyMagic((value) => !value);
                }}
              />
              {(Object.keys(ATLAS_INTEREST_LABELS) as AtlasInterest[]).map((key) => (
                <FilterChip
                  key={key}
                  label={ATLAS_INTEREST_LABELS[key]}
                  active={interest === key}
                  onClick={() => {
                    setPage(1);
                    setInterest((current) => (current === key ? null : key));
                  }}
                />
              ))}
              {[45, 90].map((minutes) => (
                <FilterChip
                  key={minutes}
                  label={`Hasta ${minutes} min`}
                  active={maxMinutes === minutes}
                  onClick={() => {
                    setPage(1);
                    setMaxMinutes((current) => (current === minutes ? null : minutes));
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {filtered.length} destino{filtered.length === 1 ? "" : "s"} disponibles
            </p>

            <div className="mt-4 space-y-3 sm:hidden">
              {paged.map((destination) => (
                <AtlasCard
                  key={destination.slug}
                  destination={destination}
                  proximity={proximityOf(destination)}
                  layout="row"
                />
              ))}
            </div>
            <div className="mt-4 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((destination) => (
                <AtlasCard
                  key={destination.slug}
                  destination={destination}
                  proximity={proximityOf(destination)}
                  layout="card"
                />
              ))}
            </div>
            {!paged.length ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {content.grid.emptyMessage}
              </p>
            ) : null}
            {pages > 1 ? (
              <nav
                aria-label="Paginación de destinos"
                className="mt-6 flex flex-wrap items-center justify-center gap-2"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-pill"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Anterior
                </Button>
                {Array.from({ length: pages }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-current={value === currentPage ? "page" : undefined}
                    onClick={() => setPage(value)}
                    className={cn(
                      "size-11 rounded-pill border text-sm",
                      value === currentPage
                        ? "border-selva bg-selva text-selva-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    {value}
                  </button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-pill"
                  disabled={currentPage === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Siguiente
                </Button>
              </nav>
            ) : null}
          </section>,
        )}

        {section(
          "routes",
          <section aria-labelledby="atlas-routes">
            <SectionHead
              kicker={content.routes.kicker}
              id="atlas-routes"
              title={content.routes.title}
              description={content.routes.description}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {content.routes.items.map((route) => (
                <article
                  key={route.id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-soft"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
                    {route.duration}
                  </p>
                  <h3 className="mt-1 font-display text-xl">{route.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{route.description}</p>
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-foreground">
                    {route.stops.map((stop) => (
                      <li key={stop} className="rounded-pill bg-secondary px-3 py-1">
                        {stop}
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 min-h-11 rounded-pill"
                    onClick={() => askAlux(`Ruta sugerida: ${route.title}`)}
                  >
                    Personalizar con {ACTIVE_BRAND.conciergeName}
                  </Button>
                </article>
              ))}
            </div>
          </section>,
        )}

        {section(
          "time_blocks",
          <section aria-labelledby="atlas-time">
            <SectionHead
              kicker={content.timeBlocks.kicker}
              id="atlas-time"
              title={content.timeBlocks.title}
              description={content.timeBlocks.description}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {content.timeBlocks.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedDuration(item.label);
                    askAlux(`Tengo ${item.label.toLocaleLowerCase("es")}`);
                  }}
                  className="min-h-11 rounded-2xl border border-border bg-card p-4 text-left shadow-soft hover:border-primary"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
                    {item.label}
                  </p>
                  <h3 className="mt-1 font-display text-lg">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </button>
              ))}
            </div>
          </section>,
        )}

        {section(
          "final_cta",
          <TravelPlanBand
            titleId="atlas-cta"
            eyebrow={ACTIVE_BRAND.conciergeName}
            title={content.finalCta.title}
            summary={content.finalCta.description}
            primary={{ label: content.finalCta.primaryLabel, onClick: () => askAlux() }}
            secondary={{ label: content.finalCta.secondaryLabel, to: "/mi-viaje" }}
          />,
        )}
      </Container>
    </div>
  );
}

const SectionHead = PremiumSectionHead;

function ChipRow({
  legend,
  options,
  value,
  onChange,
  className,
}: {
  legend: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
        {legend}
      </legend>
      <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-11 shrink-0 snap-start rounded-pill border px-4 text-sm",
              value === option
                ? "border-selva bg-selva text-selva-foreground"
                : "border-border bg-background text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-pill border px-4 text-sm",
        active
          ? "border-selva bg-selva text-selva-foreground"
          : "border-border bg-background text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Tarjeta del Atlas — misma geometría, radios y tipografía que las tarjetas
 * del Home (fila compacta y tarjeta vertical). Añade sólo lo propio del
 * atlas: distintivo Pueblo Mágico, cercanía administrada y Mi Viaje.
 */
function AtlasCard({
  destination,
  proximity,
  layout,
  active = false,
  onFocus,
  stopOrder = null,
  onToggleStop,
}: {
  destination: Destination;
  proximity: ProximityInfo | null;
  layout: "card" | "row";
  active?: boolean;
  onFocus?: () => void;
  /** Posición dentro del recorrido seleccionado (1..n) o `null`. */
  stopOrder?: number | null;
  onToggleStop?: () => void;
}) {
  const type = TERRITORY_TYPE_LABELS[classifyTerritoryType(destination)];
  const magic = PUEBLOS_MAGICOS.has(destination.slug);
  const proximityLabel = proximity ? formatProximity(proximity) : null;

  return (
    <article
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={onFocus}
      className={cn(
        "group flex min-w-0 overflow-hidden rounded-2xl border bg-card",
        active ? "border-primary shadow-elevated" : "border-border",
        layout === "row" ? "grid grid-cols-[7rem_1fr] sm:grid-cols-[10rem_1fr]" : "flex-col",
      )}
    >
      <Link
        to="/oriente-maya/$destino"
        params={{ destino: destination.slug }}
        className={cn("relative block overflow-hidden bg-muted", layout === "card" && "h-44")}
        aria-label={`Descubrir ${destination.name}`}
      >
        <EditorialMediaFrame
          media={destinationMedia(destination)}
          label={destination.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {magic ? (
          <span className="absolute left-2 top-2 rounded-pill bg-primary px-2 py-1 text-[9px] font-semibold uppercase text-primary-foreground">
            Pueblo Mágico
          </span>
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase text-primary">{type}</p>
        <h3 className="mt-1 font-display text-xl">
          <Link to="/oriente-maya/$destino" params={{ destino: destination.slug }}>
            {destination.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {destination.tagline}
        </p>
        {proximityLabel ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-foreground">
            <MapPin className="size-3.5 text-selva" /> {proximityLabel}
            {proximity?.source === "fixture" ? (
              <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Datos de prueba
              </span>
            ) : null}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col gap-2">
          <Button asChild className="min-h-11 rounded-pill">
            <Link to="/oriente-maya/$destino" params={{ destino: destination.slug }}>
              Descubrir
            </Link>
          </Button>
          {onToggleStop ? (
            <Button
              type="button"
              variant={stopOrder ? "default" : "outline"}
              aria-pressed={Boolean(stopOrder)}
              onClick={(event) => {
                event.stopPropagation();
                onToggleStop();
              }}
              className="min-h-11 rounded-pill"
            >
              {stopOrder ? (
                <>
                  <Check className="mr-2 size-4" aria-hidden /> Parada {stopOrder}
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" aria-hidden /> Agregar al recorrido
                </>
              )}
            </Button>
          ) : null}
          <AddToTravelPlanButton
            kind="destination"
            targetId={destination.id}
            title={destination.name}
            slug={destination.slug}
            imageUrl={destination.image_url ?? null}
            subtitle={destination.tagline}
            eligibilityMode="legacy"
            className="min-h-11 rounded-pill"
          />
        </div>
      </div>
    </article>
  );
}
