/**
 * GuestPlanPreview — US-E4.1 (Programa A · Carril A).
 *
 * Preview puro del guest-queue (localStorage) para la superficie
 * pública "Arma tu Viaje". No escribe, no muta, no llama al backend.
 *
 * Reglas:
 *  · SSR-safe: renderiza vacío en el servidor, hidrata en cliente.
 *  · Sólo lee `guest-queue` (Sub-ola D). Cero contratos paralelos.
 *  · No es una lista de favoritos: presenta cada elemento como parte
 *    del expediente del viaje (snapshot + tipo + fecha de guardado).
 */
import { useEffect, useState } from "react";
import { Landmark, Package, CalendarDays, MapPin, StickyNote } from "lucide-react";
import type { GuestQueueItem } from "@/lib/traveler/guest-queue";
import { readGuestQueue } from "@/lib/traveler/guest-queue";
import type { TravelItemKind } from "@/lib/traveler/travel-plans.functions";

const KIND_LABEL: Record<TravelItemKind, string> = {
  destination: "Destino",
  business: "Lugar",
  product: "Experiencia",
  event: "Evento",
  note: "Nota",
};

function KindIcon({ kind }: { kind: TravelItemKind }) {
  const Cls = "size-3.5";
  switch (kind) {
    case "destination":
      return <MapPin className={Cls} aria-hidden />;
    case "business":
      return <Landmark className={Cls} aria-hidden />;
    case "product":
      return <Package className={Cls} aria-hidden />;
    case "event":
      return <CalendarDays className={Cls} aria-hidden />;
    default:
      return <StickyNote className={Cls} aria-hidden />;
  }
}

export interface GuestPlanPreviewProps {
  /** Nº máximo de tarjetas visibles (resto se resume). */
  limit?: number;
  /** Callback opcional al hidratar (para exponer el count al padre). */
  onCount?: (n: number) => void;
}

export function GuestPlanPreview({ limit = 6, onCount }: GuestPlanPreviewProps) {
  const [items, setItems] = useState<GuestQueueItem[] | null>(null);

  useEffect(() => {
    const q = readGuestQueue();
    // Más recientes primero.
    const sorted = [...q].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
    setItems(sorted);
    onCount?.(sorted.length);
  }, [onCount]);

  if (items === null) {
    return (
      <div
        aria-hidden
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  const visible = items.slice(0, limit);
  const overflow = items.length - visible.length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((it, idx) => (
        <article
          key={`${it.kind}:${it.targetId ?? "n"}:${it.ts}:${idx}`}
          className="flex gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {it.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.imageUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <KindIcon kind={it.kind} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <KindIcon kind={it.kind} />
              {KIND_LABEL[it.kind] ?? "Elemento"}
            </p>
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
              {it.title ?? "Elemento guardado"}
            </h3>
            {it.subtitle ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {it.subtitle}
              </p>
            ) : null}
          </div>
        </article>
      ))}
      {overflow > 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
          + {overflow} más en tu expediente
        </div>
      ) : null}
    </div>
  );
}