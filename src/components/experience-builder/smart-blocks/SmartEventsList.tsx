import { SmartEmpty } from "./SmartCard";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";

export interface SmartEventItem {
  id?: string;
  slug?: string;
  name?: string;
  short_description?: string | null;
  cover_image_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  [k: string]: unknown;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SmartEventsList({
  items,
  title,
}: {
  items: SmartEventItem[];
  title?: string;
}) {
  if (!items?.length) return <SmartEmpty message="No hay eventos programados." />;
  return (
    <section className="space-y-4">
      {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((e, i) => {
          const href = e.slug ? `/eventos/${e.slug}` : null;
          const Wrapper: any = href ? "a" : "div";
          const wrapperProps = href ? { href } : {};
          return (
            <li key={String(e.id ?? e.slug ?? i)}>
              <Wrapper
                {...wrapperProps}
                className="flex items-center gap-4 p-4 transition hover:bg-muted/40"
              >
                {e.cover_image_url ? (
                  <img
                    src={e.cover_image_url}
                    alt={String(e.name ?? "Evento")}
                    loading="lazy"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{String(e.name ?? "Evento")}</p>
                  {e.short_description ? (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {e.short_description}
                    </p>
                  ) : null}
                  {e.starts_at ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(e.starts_at)}
                      {e.ends_at ? ` – ${formatDate(e.ends_at)}` : ""}
                    </p>
                  ) : null}
                </div>
                {e.id ? (
                  <div className="shrink-0">
                    <AddToTravelPlanButton
                      kind="event"
                      targetId={String(e.id)}
                      title={String(e.name ?? "Evento")}
                      slug={e.slug ?? null}
                      imageUrl={e.cover_image_url ?? null}
                      subtitle={e.starts_at ? formatDate(e.starts_at) : null}
                    />
                  </div>
                ) : null}
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </section>
  );
}