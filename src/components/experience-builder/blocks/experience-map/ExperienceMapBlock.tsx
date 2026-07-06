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
          {isMulti ? (
            <ul
              className="max-h-[360px] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-3"
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
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted",
                      )}
                    >
                      <span className="relative flex-shrink-0">
                        {p.thumbUrl ? (
                          <img
                            src={p.thumbUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-primary">
                            <MapPin className="h-5 w-5" aria-hidden />
                          </span>
                        )}
                        <span
                          aria-hidden
                          className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow"
                        >
                          {label}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {p.title}
                        </span>
                        {p.subtitle ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.subtitle}
                          </span>
                        ) : null}
                        {p.priceLabel ? (
                          <span className="mt-1 inline-block text-xs font-medium text-primary">
                            {p.priceLabel}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">{primary.title}</p>
            {primary.subtitle ? (
              <p className="text-xs text-muted-foreground">{primary.subtitle}</p>
            ) : null}

            {dto.capabilities.showDistance ? (
              <DistanceBadge destLat={primary.lat} destLng={primary.lng} />
            ) : null}

            {dto.capabilities.showDirections ? (
              <Button asChild size="sm" className="w-full">
                <a
                  href={directionsHref(primary)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Cómo llegar a ${primary.title}`}
                >
                  <Navigation className="mr-2 h-4 w-4" aria-hidden />
                  Cómo llegar
                </a>
              </Button>
            ) : null}

            {primary.href ? (
              <Button asChild size="sm" variant="outline" className="w-full">
                <a href={primary.href}>Ver detalles</a>
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
