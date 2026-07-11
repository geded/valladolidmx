/**
 * PendingReviewsBanner — Ola 6.2 · Notificación in-app.
 *
 * Cuando el viajero entra a su área privada, si tiene canjes recientes sin
 * reseñar, mostramos una tarjeta invitándolo a compartir su experiencia con
 * un CTA directo al composer verificado (`/resenar/negocio/:slug`).
 *
 * Persistencia: cada canje pendiente se puede posponer por 24 h usando
 * sessionStorage/localStorage por `couponId`. No sustituye los emails
 * automáticos (Ola 6.1); es la contraparte in-app.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareHeart, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyReviewerStats } from "@/lib/reviews/reviewer-stats.functions";

const STORAGE_KEY = "vmx.pendingReviews.dismissed";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    // Purge expired.
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    for (const [k, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && now - ts < DISMISS_TTL_MS) cleaned[k] = ts;
    }
    return cleaned;
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

export function PendingReviewsBanner() {
  const { user } = useAuth();
  const fetchStats = useServerFn(getMyReviewerStats);
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setHydrated(true);
  }, []);

  const { data } = useQuery({
    queryKey: ["reviewer-stats", user?.id],
    queryFn: () => fetchStats(),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  });

  const visible = useMemo(() => {
    if (!data?.pending) return [];
    return data.pending.filter((p) => !dismissed[p.couponId]).slice(0, 3);
  }, [data, dismissed]);

  if (!hydrated || !user?.id || visible.length === 0) return null;

  const dismiss = (couponId: string) => {
    const next = { ...dismissed, [couponId]: Date.now() };
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm dark:from-amber-950/30 dark:to-orange-950/20">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <MessageSquareHeart className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Cuéntanos cómo te fue
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tu reseña se publica con el sello <strong>Canje verificado</strong>.
          </p>
          <ul className="mt-3 space-y-2">
            {visible.map((p) => (
              <li
                key={p.couponId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-foreground">
                  <span className="font-medium">{p.businessName}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to="/resenar/negocio/$slug"
                    params={{ slug: p.businessSlug }}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    Reseñar
                  </Link>
                  <button
                    type="button"
                    onClick={() => dismiss(p.couponId)}
                    aria-label="Posponer"
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
