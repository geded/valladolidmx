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
 * Nota: las variantes `list-sync` y `cluster` renderizan hoy la lista
 * como puntos + mapa multi básico; la sincronización avanzada y el
 * clustering territorial se completan en Fase V4.3 sobre este mismo
 * bloque (sin duplicar componentes).
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Map as MapIcon } from "lucide-react";
import { StaticMap } from "@/components/maps/StaticMap";
import { DistanceBadge } from "@/components/maps/DistanceBadge";
import { cn } from "@/lib/utils";
import type {
  ExperienceMapDTO,
  ExperienceMapPoint,
} from "@/lib/experience-builder/blocks/experience-map/contract";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((m) => ({
    default: m.InteractiveMap,
  })),
);

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
}

export function ExperienceMapBlock({ dto, className }: ExperienceMapBlockProps) {
  const [interactive, setInteractive] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(
    dto.points[0]?.id ?? null,
  );

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

  const primary = dto.points.find((p) => p.id === activeId) ?? dto.points[0];
  const isMulti = dto.variant !== "single";
  const labelOf = (idx: number) => String.fromCharCode(65 + (idx % 26));

  return (
    <section className={cn("space-y-4", className)}>
      {dto.heading ? (
        <h2 className="text-xl font-semibold text-foreground">{dto.heading}</h2>
      ) : null}

      <div
        className={cn(
          "grid gap-6",
          isMulti
            ? "md:grid-cols-[minmax(0,1fr)_320px]"
            : "md:grid-cols-[minmax(0,1fr)_320px]",
        )}
      >
        <div className="min-w-0 space-y-3">
          {interactive && dto.capabilities.allowInteractiveToggle ? (
            <Suspense
              fallback={
                <div className="h-[420px] w-full animate-pulse rounded-2xl bg-muted" />
              }
            >
              <InteractiveMap
                lat={center.lat}
                lng={center.lng}
                zoom={center.zoom ?? 14}
                markerTitle={primary.title}
                markers={dto.points.map((p) => ({
                  lat: p.lat,
                  lng: p.lng,
                  title: p.title,
                  href: p.href ?? null,
                }))}
                className="h-[420px] w-full rounded-2xl border border-border"
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
              markers={dto.points.map((p, i) => ({
                lat: p.lat,
                lng: p.lng,
                kind: p.kind,
                label: labelOf(i),
              }))}
            />
          )}

          {dto.capabilities.allowInteractiveToggle ? (
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

        <aside className="space-y-4">
          <ul
            className={cn(
              "space-y-3",
              isMulti
                ? "max-h-[560px] overflow-y-auto pr-1"
                : undefined,
            )}
            aria-label="Puntos en el mapa"
          >
            {dto.points.map((p, i) => {
              const isActive = p.id === primary.id;
              const label = labelOf(i);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "block w-full rounded-2xl border bg-card p-4 text-left transition",
                      isActive
                        ? "border-primary shadow-elevated"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {isMulti ? (
                        <span
                          aria-hidden
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                        >
                          {label}
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {p.title}
                        </p>
                        {p.subtitle ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.subtitle}
                          </p>
                        ) : null}
                        {p.priceLabel ? (
                          <p className="mt-1 text-xs font-medium text-primary">
                            {p.priceLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>

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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation className="mr-2 h-4 w-4" aria-hidden />
                            Cómo llegar
                          </a>
                        </Button>
                      ) : null}
                      {p.href ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <a
                            href={p.href}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver detalles
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </section>
  );
}
