/**
 * CV1.1 · Badges deterministas para estados y prioridad.
 * Tokens DSL — sin hardcodes de color hex.
 */
import { cn } from "@/lib/utils";
import type {
  PriorityLevel,
  SlaRisk,
  IntentLevel,
} from "@/lib/admin/travel-plans-operations.functions";

const base =
  "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] border";

export function PlanStatusBadge({ status }: { status: string | null | undefined }) {
  const s = (status ?? "unknown").toLowerCase();
  const map: Record<string, string> = {
    draft: "border-border text-muted-foreground bg-muted",
    active: "border-info/30 text-info bg-info/10",
    shared_with_concierge: "border-primary/30 text-primary bg-primary/10",
    archived: "border-border text-muted-foreground bg-muted/60",
  };
  const label: Record<string, string> = {
    draft: "Borrador",
    active: "Activo",
    shared_with_concierge: "Con concierge",
    archived: "Archivado",
  };
  return (
    <span className={cn(base, map[s] ?? "border-border text-foreground bg-muted")}>
      {label[s] ?? s}
    </span>
  );
}

export function IntentBadge({ level }: { level: IntentLevel }) {
  const map: Record<IntentLevel, { cls: string; label: string }> = {
    exploring: { cls: "border-border text-muted-foreground bg-muted", label: "Explorando" },
    low: { cls: "border-border text-foreground bg-muted", label: "Intención baja" },
    medium: { cls: "border-warning/30 text-warning bg-warning/10", label: "Intención media" },
    high: { cls: "border-success/30 text-success bg-success/10", label: "Intención alta" },
  };
  const v = map[level] ?? map.exploring;
  return <span className={cn(base, v.cls)}>{v.label}</span>;
}

export function ConciergeStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <span className={cn(base, "border-border text-muted-foreground bg-muted")}>Sin caso</span>;
  }
  const s = status.toLowerCase();
  const closed = ["closed", "cancelled", "won", "lost"].includes(s);
  return (
    <span
      className={cn(
        base,
        closed
          ? "border-border text-muted-foreground bg-muted/60"
          : "border-primary/30 text-primary bg-primary/10",
      )}
    >
      {s}
    </span>
  );
}

export function ProposalStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <span className={cn(base, "border-border text-muted-foreground bg-muted")}>Sin propuesta</span>;
  }
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    draft: "border-border text-muted-foreground bg-muted",
    sent: "border-info/30 text-info bg-info/10",
    accepted: "border-success/30 text-success bg-success/10",
    rejected: "border-destructive/30 text-destructive bg-destructive/10",
    expired: "border-warning/30 text-warning bg-warning/10",
  };
  return <span className={cn(base, map[s] ?? "border-border text-foreground bg-muted")}>{s}</span>;
}

export function SlaBadge({ risk }: { risk: SlaRisk }) {
  const map: Record<SlaRisk, { cls: string; label: string }> = {
    ok: { cls: "border-success/30 text-success bg-success/10", label: "En tiempo" },
    at_risk: { cls: "border-warning/30 text-warning bg-warning/10", label: "En riesgo" },
    breached: { cls: "border-destructive/30 text-destructive bg-destructive/10", label: "Vencido" },
  };
  const v = map[risk] ?? map.ok;
  return <span className={cn(base, v.cls)}>{v.label}</span>;
}

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  const map: Record<PriorityLevel, { cls: string; label: string }> = {
    critical: { cls: "border-destructive/40 text-destructive bg-destructive/15", label: "Crítica" },
    high: { cls: "border-warning/40 text-warning bg-warning/15", label: "Alta" },
    medium: { cls: "border-info/30 text-info bg-info/10", label: "Media" },
    low: { cls: "border-border text-muted-foreground bg-muted", label: "Baja" },
  };
  const v = map[level] ?? map.low;
  return <span className={cn(base, v.cls)}>{v.label}</span>;
}