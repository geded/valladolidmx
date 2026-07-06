/**
 * Inline Category Explorer — panel embebido en el micrositio de destino.
 *
 * Se abre cuando el visitante toca un chip del `DiscoveryNavigator` en
 * modo `inline`. Presenta un listado controlado (paginación real,
 * tarjetas compactas, distancia opcional) SIN sacar al visitante del
 * micrositio. Respeta el DSL Colonial — sin nuevos tokens.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import {
  inlineExplorerQueryOptions,
  type InlineExplorerItem,
} from "@/lib/discovery/inline-explorer.functions";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export interface InlineCategoryExplorerProps {
  destinationSlug: string;
  destinationName?: string | null;
  categorySlug: string;
  categoryLabel?: string | null;
  pageSize?: number;
  /** Callback para "Ver todo el destino" (cierra el explorador). */
  onClose?: () => void;
}

export function InlineCategoryExplorer({
  destinationSlug,
  destinationName,
  categorySlug,
  categoryLabel,
  pageSize = 8,
  onClose,
}: InlineCategoryExplorerProps) {
  const [page, setPage] = useState(1);
  const { location, status, request } = useVisitorGeolocation();

  const { data, isLoading } = useQuery(
    inlineExplorerQueryOptions({
      destinationSlug,
      categorySlug,
      page,
      pageSize,
    }),
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = totalCount > page * pageSize;

  const sorted = useMemo(() => {
    if (!location) return items;
    const withD = items.map((it) => {
      const d =
        it.latitude != null && it.longitude != null
          ? haversineKm(location, { lat: it.latitude, lng: it.longitude })
          : Number.POSITIVE_INFINITY;
      return { it, d };
    });
    withD.sort((a, b) => a.d - b.d);
    return withD.map((x) => x.it);
  }, [items, location]);

  const label = categoryLabel ?? categorySlug;

  return (
    <section
      aria-label={`Explorando ${label}${destinationName ? ` en ${destinationName}` : ""}`}
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm"
      data-inline-explorer
    >
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Explorando en {destinationName ?? "este destino"}
          </p>
          <h3 className="truncate text-lg font-semibold">{label}</h3>
          {!isLoading ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? "opción publicada" : "opciones publicadas"}
              {location ? " · ordenadas por cercanía a ti" : ""}
            </p>
          ) : null}
        </div>
        {onClose ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="ml-1 hidden sm:inline">Ver todo el destino</span>
          </Button>
        ) : null}
      </header>

      {!location ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden />
          <span>Comparte tu ubicación para ordenar por cercanía.</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={request}
            disabled={status === "prompting"}
          >
            {status === "prompting"
              ? "Solicitando…"
              : status === "denied"
                ? "Permiso denegado"
                : status === "unavailable"
                  ? "No disponible"
                  : "Compartir ubicación"}
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay opciones publicadas de {label.toLowerCase()} en{" "}
          {destinationName ?? "este destino"}.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sorted.map((it) => (
              <InlineExplorerCard
                key={it.id}
                item={it}
                visitor={location}
              />
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Página {page} · mostrando {sorted.length} de {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ← Anterior
                </Button>
              ) : null}
              {hasMore ? (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                  Ver más
                </Button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function InlineExplorerCard({
  item,
  visitor,
}: {
  item: InlineExplorerItem;
  visitor: { lat: number; lng: number } | null;
}) {
  const km =
    visitor && item.latitude != null && item.longitude != null
      ? haversineKm(visitor, { lat: item.latitude, lng: item.longitude })
      : null;
  return (
    <li>
      <a
        href={item.href}
        className="group flex h-full min-w-0 gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{item.display_name}</span>
            {item.verified ? (
              <BadgeCheck
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-label="Verificado"
              />
            ) : null}
          </div>
          {item.tagline ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {item.tagline}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {km != null ? (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                <MapPin className="h-3 w-3" aria-hidden />
                {formatKm(km)}
              </Badge>
            ) : item.address ? (
              <span className="truncate text-[10px] text-muted-foreground">
                {item.address}
              </span>
            ) : null}
          </div>
        </div>
      </a>
    </li>
  );
}