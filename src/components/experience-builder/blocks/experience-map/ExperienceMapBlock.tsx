/**
 * U-VISUAL · V4 — ExperienceMapBlock (Presentación oficial).
 *
 * Orquesta las 4 variantes del bloque `vmx.experience.map`. Reusa la
 * infraestructura existente:
 *  - `StaticMap`      → SSR-safe / fallback / SEO.
 *  - `InteractiveMap` → Google Maps JS bajo demanda.
 *  - `DistanceBadge`  → distancia + tiempo desde el visitante.
 *
 * Founder Discovery Principle: responde "dónde está", "qué hay cerca",
 * "cómo llegar" y "qué puedo descubrir alrededor" con un único bloque.
 *
 * 1.1.0 · Con muchos lugares (desde CLUSTER_MIN_MARKERS) el mapa
 * interactivo junta pines cercanos en burbujas con número, ofrece un filtro
 * por familia encima del mapa (cuando hay 2 o más) y la lista muestra sólo
 * lo que se ve en pantalla. El pin dorado del paquete nunca se agrupa.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, Map as MapIcon } from "lucide-react";
import { StaticMap } from "@/components/maps/StaticMap";
import { DistanceBadge } from "@/components/maps/DistanceBadge";
import { cn } from "@/lib/utils";
import type {
  ExperienceMapDTO,
  ExperienceMapPoint,
} from "@/lib/experience-builder/blocks/experience-map/types";
import { applyExperienceMapDefaults } from "@/lib/experience-builder/blocks/experience-map/defaults";
import {
  CLUSTER_MIN_MARKERS,
  MAP_PIN_CATEGORY_LABELS,
  MAP_PIN_CATEGORY_ORDER,
  pointInBounds,
  type MapPinCategory,
} from "@/lib/maps/marker-clusters";
import type { MapViewportBounds } from "@/components/maps/InteractiveMap";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((m) => ({
    default: m.InteractiveMap,
  })),
);

const LIST_PAGE_SIZE = 6;

function directionsHref(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

function computeCenter(points: ExperienceMapPoint[]) {
  if (!points.length) return null;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

export interface ExperienceMapBlockProps {
  dto: ExperienceMapDTO;
  className?: string;
  /** Abre Google Maps directamente y elimina el regreso al mapa estático. */
  interactiveOnly?: boolean;
  /** Presentación territorial amplia para superficies Premium. */
  immersive?: boolean;
  /** Dibuja el recorrido por carretera siguiendo el orden de los puntos. */
  connectByRoad?: boolean;
  /** Altura del mapa interactivo; por defecto la de la variante elegida. */
  mapHeightClassName?: string;
}

export function ExperienceMapBlock({
  dto: rawDto,
  className,
  interactiveOnly = false,
  immersive = false,
  connectByRoad = false,
  mapHeightClassName,
}: ExperienceMapBlockProps) {
  // C2.F1 · Piloto Render-Only. Normalizamos vía defaults render-only
  // (equivalente runtime a `schema.parse` para inputs válidos, ver
  // `scripts/experience-map-defaults.test.ts`). Sin Zod en el árbol público.
  const dto = useMemo(() => applyExperienceMapDefaults(rawDto), [rawDto]);
  const [interactive, setInteractive] = useState(interactiveOnly);
  const [activeId, setActiveId] = useState<string | null>(dto.points[0]?.id ?? null);
  const [listPage, setListPage] = useState(1);
  /* 1.1.0 · Muchos lugares: filtro por familia encima del mapa, burbujas con
     número y lista sincronizada con lo que se ve en el mapa interactivo. */
  const [category, setCategory] = useState<MapPinCategory | "">("");
  const [viewport, setViewport] = useState<MapViewportBounds | null>(null);
  const categories = useMemo(() => {
    const present = new Set(
      dto.points.flatMap((p) => (p.category ? [p.category as MapPinCategory] : [])),
    );
    return MAP_PIN_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [dto.points]);
  const shownPoints = useMemo(
    () => (category ? dto.points.filter((p) => p.category === category) : dto.points),
    [category, dto.points],
  );
  const listPoints = useMemo(
    () =>
      interactive &&
      viewport &&
      !connectByRoad &&
      dto.variant !== "single" &&
      shownPoints.length >= CLUSTER_MIN_MARKERS
        ? shownPoints.filter((p) => pointInBounds(p, viewport))
        : shownPoints,
    [connectByRoad, dto.variant, interactive, shownPoints, viewport],
  );
  useEffect(() => {
    setListPage(1);
  }, [category, viewport]);

  const center = useMemo(() => {
    if (dto.center) return dto.center;
    const c = computeCenter(dto.points);
    return c ? { ...c, zoom: dto.variant === "single" ? 15 : 13 } : null;
  }, [dto.center, dto.points, dto.variant]);

  if (!center || dto.points.length === 0) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {dto.emptyMessage ?? "Ubicación no disponible por ahora."}
      </section>
    );
  }

  const primary =
    shownPoints.find((p) => p.id === activeId) ?? shownPoints[0] ?? dto.points[0]!;
  const isMulti = dto.variant !== "single";
  const labelOf = (idx: number) => String.fromCharCode(65 + (idx % 26));
  // Las rutas por carretera nunca agrupan: cada parada debe verse.
  const clustered = isMulti && !connectByRoad && shownPoints.length >= CLUSTER_MIN_MARKERS;
  // Lista paginada: evita una columna interminable en celular y tableta.
  const totalPages = Math.max(1, Math.ceil(listPoints.length / LIST_PAGE_SIZE));
  const safePage = Math.min(listPage, totalPages);
  const pageStart = (safePage - 1) * LIST_PAGE_SIZE;
  const pagePoints = listPoints.slice(pageStart, pageStart + LIST_PAGE_SIZE);
  const goToPage = (next: number) => {
    const n = Math.max(1, Math.min(totalPages, next));
    setListPage(n);
    const first = listPoints[(n - 1) * LIST_PAGE_SIZE];
    if (first) setActiveId(first.id);
  };

  return (
    <section className={cn("space-y-4", immersive && "space-y-5", className)}>
      {dto.heading ? (
        <h2 className="text-xl font-semibold text-foreground">{dto.heading}</h2>
      ) : null}

      {isMulti && categories.length > 1 ? (
        <div
          role="group"
          aria-label="Filtrar el mapa por tipo de lugar"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {(["", ...categories] as const).map((c) => {
            const active = category === c;
            const count = c ? dto.points.filter((p) => p.category === c).length : dto.points.length;
            return (
              <button
                key={c || "todos"}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50",
                )}
              >
                {c ? MAP_PIN_CATEGORY_LABELS[c] : "Todo"}{" "}
                <span className="font-normal opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-6",
          immersive
            ? "lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
            : "lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start",
        )}
      >
        <div className="min-w-0 space-y-3">
          {interactive && (dto.capabilities.allowInteractiveToggle || interactiveOnly) ? (
            <Suspense
              fallback={<div className="h-[420px] w-full animate-pulse rounded-2xl bg-muted" />}
            >
              <InteractiveMap
                lat={center.lat}
                lng={center.lng}
                zoom={center.zoom ?? 14}
                markerTitle={primary.title}
                connectByRoad={connectByRoad}
                markers={shownPoints.map((p) => ({
                  lat: p.lat,
                  lng: p.lng,
                  title: p.title,
                  href: p.href ?? null,
                  ...(p.category ? { category: p.category as MapPinCategory } : {}),
                  ...(p.featured ? { featured: true } : {}),
                }))}
                cluster={clustered}
                onViewportChange={setViewport}
                className={cn(
                  "w-full rounded-2xl border border-border",
                  immersive ? "h-[32rem] shadow-elevated sm:h-[38rem]" : "h-[420px]",
                  mapHeightClassName,
                )}
              />
            </Suspense>
          ) : (
            <StaticMap
              lat={center.lat}
              lng={center.lng}
              zoom={center.zoom ?? 14}
              width={640}
              height={420}
              alt={dto.heading ?? primary.title}
              markers={shownPoints.map((p, i) => ({
                lat: p.lat,
                lng: p.lng,
                kind: p.kind,
                label: labelOf(i),
              }))}
            />
          )}

          {dto.capabilities.allowInteractiveToggle && !interactiveOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInteractive((s) => !s)}
            >
              <MapIcon className="mr-2 h-4 w-4" aria-hidden />
              {interactive ? "Ver mapa estático" : "Ver mapa interactivo"}
            </Button>
          ) : null}
        </div>

        <aside
          className={cn(
            "space-y-4 self-start",
            immersive && "rounded-2xl border border-border bg-background/70 p-3 backdrop-blur",
          )}
        >
          <ul
            className={cn(
              "grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:space-y-0",
              isMulti
                ? immersive
                  ? "lg:max-h-[36rem] lg:overflow-y-auto lg:pr-1"
                  : "lg:max-h-[560px] lg:overflow-y-auto lg:pr-1"
                : undefined,
            )}
            aria-label="Puntos en el mapa"
          >
            {pagePoints.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No hay lugares en esta parte del mapa. Aléjate o muévelo para ver más.
              </li>
            ) : null}
            {pagePoints.map((p, j) => {
              const i = pageStart + j;
              const isActive = p.id === primary.id;
              const label = labelOf(i);
              return (
                <li key={p.id}>
                  <div
                    className={cn(
                      "rounded-2xl border bg-card p-4 transition",
                      isActive
                        ? "border-primary shadow-elevated"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      aria-pressed={isActive}
                      className="block w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        {isMulti && (!p.category || !interactive) ? (
                          <span
                            aria-hidden
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                          >
                            {label}
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">
                            {p.title}
                          </p>
                          {p.subtitle ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{p.subtitle}</p>
                          ) : null}
                          {p.priceLabel ? (
                            <p className="mt-1 text-xs font-medium text-primary">{p.priceLabel}</p>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    {dto.capabilities.showDistance ? (
                      <div className="mt-3">
                        <DistanceBadge destLat={p.lat} destLng={p.lng} />
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      {dto.capabilities.showDirections ? (
                        <Button asChild size="sm" className="w-full">
                          <a
                            href={directionsHref(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Cómo llegar a ${p.title}`}
                          >
                            <Navigation className="mr-2 h-4 w-4" aria-hidden />
                            Cómo llegar
                          </a>
                        </Button>
                      ) : null}
                      {p.href ? (
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <a href={p.href}>Ver detalles</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 ? (
            <nav
              aria-label="Paginación de puntos en el mapa"
              className="flex items-center justify-between gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listPage <= 1}
                onClick={() => goToPage(listPage - 1)}
              >
                ← Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {pageStart + 1}–{pageStart + pagePoints.length} de {listPoints.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listPage >= totalPages}
                onClick={() => goToPage(listPage + 1)}
              >
                Siguiente →
              </Button>
            </nav>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
