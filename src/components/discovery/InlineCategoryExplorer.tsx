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
import { BadgeCheck, MapPin, X, Navigation, Share2, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import { InteractiveMap } from "@/components/maps/InteractiveMap";
import { toast } from "sonner";
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

function labelForIndex(i: number) {
  return String.fromCharCode(65 + (i % 26));
}

function directionsHref(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

function itemUrl(item: InlineExplorerItem) {
  return typeof window !== "undefined"
    ? new URL(item.href, window.location.origin).toString()
    : item.href;
}

async function copyText(value: string, label = "Enlace copiado") {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    toast.error("No se pudo copiar en este dispositivo");
    return false;
  }
  await navigator.clipboard.writeText(value);
  toast.success(label);
  return true;
}

async function nativeShareItem(item: InlineExplorerItem) {
  const url = itemUrl(item);
  const data = { title: item.display_name, text: item.tagline || item.display_name, url };
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator) : null;
    if (nav && "share" in nav && typeof (nav as { share?: (d: ShareData) => Promise<void> }).share === "function") {
      await (nav as { share: (d: ShareData) => Promise<void> }).share(data);
      return;
    }
    await copyText(url, "Enlace copiado");
  } catch {
    /* usuario canceló — sin feedback */
  }
}

type ExplorerPanel =
  | { type: "details"; item: InlineExplorerItem }
  | { type: "directions"; item: InlineExplorerItem }
  | { type: "share"; item: InlineExplorerItem }
  | null;

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
  const [panel, setPanel] = useState<ExplorerPanel>(null);
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

  const mappable = useMemo(
    () => sorted.filter((it) => it.latitude != null && it.longitude != null),
    [sorted],
  );
  const mapCenter = useMemo(() => {
    if (mappable.length === 0) return null;
    const lat = mappable.reduce((s, p) => s + (p.latitude as number), 0) / mappable.length;
    const lng = mappable.reduce((s, p) => s + (p.longitude as number), 0) / mappable.length;
    return { lat, lng };
  }, [mappable]);
  const mapMarkers = useMemo(
    () =>
      mappable.map((it) => ({
        lat: it.latitude as number,
        lng: it.longitude as number,
        title: it.display_name,
        href: it.href,
      })),
    [mappable],
  );

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

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <MapPin className="h-4 w-4" aria-hidden />
        {location ? (
          <span>Ubicación compartida · ordenamos por cercanía a ti.</span>
        ) : (
          <span>Comparte tu ubicación para ordenar por cercanía.</span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={request}
          disabled={status === "prompting"}
        >
          {status === "prompting"
            ? "Solicitando…"
            : location
              ? "Actualizar ubicación"
              : status === "denied"
                ? "Permiso denegado"
                : status === "unavailable"
                  ? "No disponible"
                  : "Compartir mi ubicación"}
        </Button>
      </div>

      {mapCenter && mapMarkers.length > 0 ? (
        <div className="mb-4">
          <InteractiveMap
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            zoom={mapMarkers.length === 1 ? 15 : 13}
            markers={mapMarkers}
            className="h-[420px] w-full rounded-2xl border border-border sm:h-[520px]"
          />
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
            {sorted.map((it, idx) => (
              <InlineExplorerCard
                key={it.id}
                item={it}
                index={idx}
                visitor={location}
                onDetails={() => setPanel({ type: "details", item: it })}
                onDirections={() => setPanel({ type: "directions", item: it })}
                onShare={() => setPanel({ type: "share", item: it })}
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

      <ExplorerActionSheet panel={panel} onOpenChange={(open) => !open && setPanel(null)} />
    </section>
  );
}

function InlineExplorerCard({
  item,
  index,
  visitor,
  onDetails,
  onDirections,
  onShare,
}: {
  item: InlineExplorerItem;
  index: number;
  visitor: { lat: number; lng: number } | null;
  onDetails: () => void;
  onDirections: () => void;
  onShare: () => void;
}) {
  const km =
    visitor && item.latitude != null && item.longitude != null
      ? haversineKm(visitor, { lat: item.latitude, lng: item.longitude })
      : null;
  const hasCoords = item.latitude != null && item.longitude != null;
  return (
    <li>
      <article className="flex h-full min-w-0 gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
        >
          {labelForIndex(index)}
        </span>
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hasCoords ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={onDirections}
                aria-label={`Cómo llegar a ${item.display_name}`}
              >
                <Navigation className="mr-1 h-3 w-3" aria-hidden />
                Cómo llegar
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={onShare}
              aria-label={`Compartir ${item.display_name}`}
            >
              <Share2 className="mr-1 h-3 w-3" aria-hidden />
              Compartir
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={onDetails}
              aria-label={`Ver detalles de ${item.display_name}`}
            >
              <ExternalLink className="mr-1 h-3 w-3" aria-hidden />
              Ver detalles
            </Button>
          </div>
        </div>
      </article>
    </li>
  );
}

function ExplorerActionSheet({
  panel,
  onOpenChange,
}: {
  panel: ExplorerPanel;
  onOpenChange: (open: boolean) => void;
}) {
  const item = panel?.item ?? null;
  const hasCoords = item?.latitude != null && item.longitude != null;
  const url = item ? itemUrl(item) : "";
  const directionsUrl = hasCoords
    ? directionsHref({ lat: item.latitude as number, lng: item.longitude as number })
    : "";

  return (
    <Sheet open={!!panel} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-2xl border-border bg-background px-4 pb-5 pt-6 sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:px-6"
      >
        {item ? (
          <div className="mx-auto w-full max-w-2xl">
            <SheetHeader className="pr-8 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {panel?.type === "directions" ? "Cómo llegar" : panel?.type === "share" ? "Compartir" : "Detalles"}
              </p>
              <SheetTitle className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                {item.display_name}
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                {item.tagline || item.address || "Información publicada dentro del destino."}
              </SheetDescription>
            </SheetHeader>

            {panel?.type === "details" ? (
              <div className="mt-5 space-y-4">
                {item.address ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ubicación</p>
                    <p className="mt-1 text-sm text-foreground">{item.address}</p>
                  </div>
                ) : null}
                {hasCoords ? (
                  <InteractiveMap
                    lat={item.latitude as number}
                    lng={item.longitude as number}
                    zoom={15}
                    markerTitle={item.display_name}
                    className="h-[280px] w-full rounded-2xl border border-border sm:h-[360px]"
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {hasCoords ? (
                    <Button type="button" variant="outline" onClick={() => copyText(directionsUrl, "Ruta copiada")}>
                      <Navigation className="mr-2 h-4 w-4" aria-hidden />
                      Copiar ruta
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" onClick={() => copyText(url)}>
                    <Copy className="mr-2 h-4 w-4" aria-hidden />
                    Copiar enlace
                  </Button>
                  <Button type="button" onClick={() => nativeShareItem(item)}>
                    <Share2 className="mr-2 h-4 w-4" aria-hidden />
                    Compartir
                  </Button>
                </div>
              </div>
            ) : null}

            {panel?.type === "directions" ? (
              <div className="mt-5 space-y-4">
                {hasCoords ? (
                  <>
                    <InteractiveMap
                      lat={item.latitude as number}
                      lng={item.longitude as number}
                      zoom={15}
                      markerTitle={item.display_name}
                      className="h-[340px] w-full rounded-2xl border border-border sm:h-[440px]"
                    />
                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{item.address ?? "Punto marcado en el mapa"}</p>
                      <p className="mt-1">Copia la ruta para abrirla cuando quieras, sin abandonar este micrositio.</p>
                    </div>
                    <Button type="button" className="w-full" onClick={() => copyText(directionsUrl, "Ruta copiada")}>
                      <Navigation className="mr-2 h-4 w-4" aria-hidden />
                      Copiar ruta de Google Maps
                    </Button>
                  </>
                ) : (
                  <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Este lugar aún no tiene coordenadas públicas para mostrar la ruta.
                  </p>
                )}
              </div>
            ) : null}

            {panel?.type === "share" ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="break-all text-sm text-muted-foreground">{url}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button type="button" onClick={() => nativeShareItem(item)}>
                    <Share2 className="mr-2 h-4 w-4" aria-hidden />
                    Compartir del dispositivo
                  </Button>
                  <Button type="button" variant="outline" onClick={() => copyText(url)}>
                    <Copy className="mr-2 h-4 w-4" aria-hidden />
                    Copiar enlace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyText(`${item.display_name}\n${url}`, "Texto copiado")}
                  >
                    <Check className="mr-2 h-4 w-4" aria-hidden />
                    Copiar texto
                  </Button>
                  {hasCoords ? (
                    <Button type="button" variant="outline" onClick={() => copyText(directionsUrl, "Ruta copiada")}>
                      <Navigation className="mr-2 h-4 w-4" aria-hidden />
                      Copiar ruta
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}