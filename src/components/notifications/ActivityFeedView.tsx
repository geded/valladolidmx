/**
 * 14.50.6 — Vista compartida del Intelligent Activity Center.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAluxActivityFeed,
  getActivityGroupBySubject,
  getActivitySummaryByPeriod,
  type AluxFeedItem,
  type SubjectGroup,
  type PeriodSummary,
} from "@/lib/notifications/iac.functions";

type Scope = "admin" | "business" | "traveler";

interface Props {
  scope: Scope;
  businessId?: string | null;
  title: string;
  description: string;
  eyebrow?: string;
}

const severityClass: Record<string, string> = {
  critical: "bg-destructive",
  warning: "bg-amber-500",
  info: "bg-primary",
};

const categoryLabel: Record<string, string> = {
  transactional: "Transaccional",
  operational: "Operativa",
  security: "Seguridad",
  marketing: "Marketing",
};

export function ActivityFeedView({ scope, businessId = null, title, description, eyebrow }: Props) {
  const enabled = scope !== "business" || Boolean(businessId);
  const baseKey = useMemo(() => ["unc", "iac", scope, businessId ?? "n/a"], [scope, businessId]);

  const fetchFeed = useServerFn(getAluxActivityFeed);
  const fetchGroup = useServerFn(getActivityGroupBySubject);
  const fetchSummary = useServerFn(getActivitySummaryByPeriod);

  const feedQuery = useQuery({
    queryKey: [...baseKey, "feed"],
    queryFn: () => fetchFeed({ data: { scope, businessId, limit: 100 } }),
    enabled,
    staleTime: 30_000,
  });

  const groupQuery = useQuery({
    queryKey: [...baseKey, "group"],
    queryFn: () => fetchGroup({ data: { scope, businessId, limit: 30 } }),
    enabled,
    staleTime: 30_000,
  });

  const summaryQuery = useQuery({
    queryKey: [...baseKey, "summary"],
    queryFn: () => fetchSummary({ data: { scope, businessId, bucket: "day" } }),
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) {
    return (
      <div className="space-y-4">
        <Header eyebrow={eyebrow} title={title} description={description} />
        <p className="text-sm text-muted-foreground">
          Selecciona una empresa en el menú lateral para ver su actividad.
        </p>
      </div>
    );
  }

  const isLoading = feedQuery.isLoading || groupQuery.isLoading || summaryQuery.isLoading;
  const error = (feedQuery.error ?? groupQuery.error ?? summaryQuery.error) as Error | null;

  return (
    <div className="space-y-8">
      <Header eyebrow={eyebrow} title={title} description={description} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando actividad…</p>
      ) : error ? (
        <p className="text-sm text-destructive">No se pudo cargar la actividad: {error.message}</p>
      ) : (
        <>
          <SummarySection items={summaryQuery.data?.items ?? []} />
          <GroupSection items={groupQuery.data?.items ?? []} />
          <FeedSection items={feedQuery.data?.items ?? []} />
        </>
      )}
    </div>
  );
}

function Header({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <header>
      {eyebrow ? (
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

function SummarySection({ items }: { items: PeriodSummary[] }) {
  if (!items.length) return null;
  const byDay = new Map<string, { total: number; critical: number; warning: number }>();
  for (const it of items) {
    const key = it.bucket_start.slice(0, 10);
    const agg = byDay.get(key) ?? { total: 0, critical: 0, warning: 0 };
    agg.total += Number(it.event_count);
    if (it.severity === "critical") agg.critical += Number(it.event_count);
    if (it.severity === "warning") agg.warning += Number(it.event_count);
    byDay.set(key, agg);
  }
  const rows = [...byDay.entries()].slice(0, 7);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Resumen por día (últimos 30 días)
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {rows.map(([day, agg]) => (
          <div key={day} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{day}</p>
            <p className="mt-1 text-xl font-semibold">{agg.total}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {agg.critical > 0 ? `${agg.critical} críticos · ` : ""}
              {agg.warning > 0 ? `${agg.warning} avisos` : "sin avisos"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupSection({ items }: { items: SubjectGroup[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Agrupación por entidad
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((g) => (
          <li key={`${g.subject_type}-${g.subject_id}`} className="flex items-start gap-3 p-3">
            <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${severityClass[g.last_severity ?? "info"] ?? "bg-primary"}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{g.last_summary ?? g.subject_type}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {g.subject_type} · {g.subject_id.slice(0, 8)} · {g.event_count} eventos
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {new Date(g.last_occurred_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeedSection({ items }: { items: AluxFeedItem[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Feed estructurado
      </h2>
      {!items.length ? (
        <p className="mt-3 text-sm text-muted-foreground">Sin actividad reciente.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((it, i) => (
            <li key={`${it.event_id}-${i}`} className="flex items-start gap-3 p-4">
              <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${severityClass[it.severity] ?? "bg-primary"}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{it.summary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {it.event_type} · {categoryLabel[it.category] ?? it.category} · {new Date(it.occurred_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {it.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
