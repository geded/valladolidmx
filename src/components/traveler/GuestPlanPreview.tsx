/** Vista del único AnonymousTravelDraft local. No consulta ni escribe red. */
import { Landmark, Package, CalendarDays, MapPin, StickyNote, BadgePercent } from "lucide-react";
import { useEffect } from "react";
import {
  selectAnonymousTravelItems,
  useAnonymousTrip,
  type AnonymousItemKind,
} from "@/lib/traveler/anonymous-draft";

const KIND_LABEL: Record<AnonymousItemKind, string> = {
  destination: "Destino",
  business: "Lugar",
  product: "Experiencia",
  event: "Evento",
  note: "Nota",
  promotion: "Promoción",
  custom: "Idea",
};

function KindIcon({ kind }: { kind: AnonymousItemKind }) {
  const className = "size-3.5";
  if (kind === "destination") return <MapPin className={className} aria-hidden />;
  if (kind === "business") return <Landmark className={className} aria-hidden />;
  if (kind === "product") return <Package className={className} aria-hidden />;
  if (kind === "event") return <CalendarDays className={className} aria-hidden />;
  if (kind === "promotion") return <BadgePercent className={className} aria-hidden />;
  return <StickyNote className={className} aria-hidden />;
}

export interface GuestPlanPreviewProps {
  limit?: number;
  onCount?: (count: number) => void;
}

export function GuestPlanPreview({ limit = 6, onCount }: GuestPlanPreviewProps) {
  const { trip, status } = useAnonymousTrip();
  const items = selectAnonymousTravelItems(trip);
  useEffect(() => {
    onCount?.(items.length);
  }, [items.length, onCount]);
  if (status === "idle" || status === "loading") {
    return (
      <div aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
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
      {visible.map((item, index) => (
        <article
          key={`${item.kind}:${item.targetId ?? "note"}:${item.addedAt}:${index}`}
          className="flex gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <KindIcon kind={item.kind} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <KindIcon kind={item.kind} />
              {KIND_LABEL[item.kind]}
            </p>
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
              {item.title ?? "Parte de tu viaje"}
            </h3>
            {item.subtitle ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
            ) : null}
          </div>
        </article>
      ))}
      {overflow > 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
          + {overflow} más en tu viaje
        </div>
      ) : null}
    </div>
  );
}
