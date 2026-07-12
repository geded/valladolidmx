/**
 * CV1.2 · Bandeja "Necesita atención"
 *
 * Superficie única con dos carriles:
 *   · Alertas Operativas (SLA, propuestas, Alux, viajes inminentes)
 *   · Oportunidades Comerciales (sales_opportunity)
 *
 * Founder Sales Priority Principle: la bandeja no sólo monitorea
 * incidencias, ayuda a Concierge a identificar dónde hay venta.
 *
 * Read-only: cero mutaciones sobre el Travel Plan. Al hacer clic en
 * "Ver expediente" abre el drawer CV1.1 del plan correspondiente.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Clock,
  Send,
  Sparkles,
  UserCheck,
  Plane,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAttentionQueue,
  type AttentionSignal,
  type AttentionSeverity,
  type AttentionType,
} from "@/lib/admin/travel-plans-operations.functions";

interface Props {
  onlyMine: boolean;
  onOpenPlan: (planId: string) => void;
}

const TYPE_META: Record<AttentionType, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  sla_breach: { icon: AlertTriangle, label: "SLA vencido" },
  sla_at_risk: { icon: Clock, label: "SLA en riesgo" },
  proposal_awaiting: { icon: Send, label: "Propuesta esperando" },
  alux_pending: { icon: Sparkles, label: "Alux esperando" },
  high_intent_no_case: { icon: UserCheck, label: "Intención alta sin caso" },
  trip_imminent: { icon: Plane, label: "Viaje inminente" },
  sales_opportunity: { icon: TrendingUp, label: "Oportunidad de venta" },
};

const SEVERITY_STYLES: Record<AttentionSeverity, string> = {
  critical: "border-destructive/40 bg-destructive/5 text-destructive",
  high: "border-warning/40 bg-warning/5 text-warning",
  medium: "border-info/30 bg-info/5 text-info",
};

function formatAge(hours: number): string {
  if (hours <= 0) return "ahora";
  if (hours < 1) return "hace <1h";
  if (hours < 48) return `hace ${Math.round(hours)}h`;
  return `hace ${Math.round(hours / 24)}d`;
}

export function AttentionQueue({ onlyMine, onOpenPlan }: Props) {
  const call = useServerFn(getAttentionQueue);
  const q = useQuery({
    queryKey: ["cms", "travel-plans", "attention", { onlyMine }],
    queryFn: () => call({ data: { only_mine: onlyMine, limit: 60 } }),
    staleTime: 20_000,
    refetchInterval: 60_000,
  });

  const { ops, sales } = useMemo(() => {
    const all = q.data?.signals ?? [];
    return {
      ops: all.filter((s) => s.category === "ops"),
      sales: all.filter((s) => s.category === "sales"),
    };
  }, [q.data]);

  const counts = q.data?.counts;
  const hasCritical = (counts?.ops_critical ?? 0) > 0;
  const [expanded, setExpanded] = useState(true);

  // Autocolapsar cuando no hay críticos y ya hay data
  const initiallyExpanded = hasCritical || (counts?.total ?? 0) > 0;
  const effectivelyExpanded = expanded && initiallyExpanded;

  return (
    <section
      id="attention"
      className="rounded-2xl border border-border bg-card"
      aria-label="Bandeja Necesita atención"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-2 rounded-pill px-2 py-1 text-sm font-semibold hover:bg-accent/40"
          aria-expanded={effectivelyExpanded}
        >
          {effectivelyExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Necesita atención
        </button>
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.08em]">
          {q.isLoading ? (
            <span className="text-muted-foreground">Cargando…</span>
          ) : counts ? (
            <>
              <CountPill label="Crítico" value={counts.ops_critical} tone="critical" />
              <CountPill label="Ops alto" value={counts.ops_high} tone="high" />
              <CountPill label="Ops medio" value={counts.ops_medium} tone="medium" />
              <span className="mx-1 h-3 w-px bg-border" />
              <CountPill label="Ventas alta" value={counts.sales_high} tone="sales-high" />
              <CountPill label="Ventas media" value={counts.sales_medium} tone="sales-medium" />
            </>
          ) : null}
        </div>
      </header>

      {effectivelyExpanded ? (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <Column
            title="Alertas operativas"
            subtitle="Cosas que resolver ahora"
            accent="border-l-warning"
            signals={ops}
            empty="Sin alertas operativas activas."
            onOpenPlan={onOpenPlan}
          />
          <Column
            title="Oportunidades comerciales"
            subtitle="Viajes con mayor probabilidad de venta"
            accent="border-l-success"
            signals={sales}
            empty="Sin oportunidades comerciales destacadas."
            onOpenPlan={onOpenPlan}
          />
        </div>
      ) : null}

      {q.error ? (
        <p className="border-t border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar la bandeja. Verifica tu rol y vuelve a intentar.
        </p>
      ) : null}
    </section>
  );
}

function CountPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "high" | "medium" | "sales-high" | "sales-medium";
}) {
  const map: Record<typeof tone, string> = {
    critical: "border-destructive/40 text-destructive bg-destructive/10",
    high: "border-warning/40 text-warning bg-warning/10",
    medium: "border-info/30 text-info bg-info/10",
    "sales-high": "border-success/40 text-success bg-success/10",
    "sales-medium": "border-success/30 text-success bg-success/5",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-medium",
        map[tone],
        value === 0 && "opacity-50",
      )}
    >
      {label} <span className="tabular-nums">{value}</span>
    </span>
  );
}

function Column({
  title,
  subtitle,
  accent,
  signals,
  empty,
  onOpenPlan,
}: {
  title: string;
  subtitle: string;
  accent: string;
  signals: AttentionSignal[];
  empty: string;
  onOpenPlan: (planId: string) => void;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-background/40", "border-l-4", accent)}>
      <header className="px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </header>
      <ul className="max-h-[420px] space-y-2 overflow-y-auto px-3 pb-3">
        {signals.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            {empty}
          </li>
        ) : (
          signals.map((s, i) => <SignalCard key={`${s.plan_id}-${s.type}-${i}`} s={s} onOpenPlan={onOpenPlan} />)
        )}
      </ul>
    </div>
  );
}

function SignalCard({
  s,
  onOpenPlan,
}: {
  s: AttentionSignal;
  onOpenPlan: (planId: string) => void;
}) {
  const meta = TYPE_META[s.type];
  const Icon = meta.icon;
  const isSales = s.category === "sales";
  return (
    <li
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30",
        isSales ? "border-success/25" : "border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            SEVERITY_STYLES[s.severity],
          )}
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {meta.label}
              <span className="ml-1 text-muted-foreground">·</span>{" "}
              <span className="text-foreground">{s.traveler_display_name}</span>
            </p>
            {s.age_hours > 0 ? (
              <span className="text-[11px] text-muted-foreground">{formatAge(s.age_hours)}</span>
            ) : null}
            {isSales ? (
              <span className="rounded-pill border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-success">
                Score {s.score}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => onOpenPlan(s.plan_id)}
              className="inline-flex items-center gap-1 rounded-pill border border-primary/30 bg-primary/10 px-2 py-1 font-medium text-primary hover:bg-primary/15"
            >
              Ver expediente <ArrowRight className="h-3 w-3" />
            </button>
            {s.case_id ? (
              <span className="rounded-pill border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                Caso #{s.case_id.slice(0, 8)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}