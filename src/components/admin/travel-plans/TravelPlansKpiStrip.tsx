/**
 * CV1.1 · KPI Strip
 * Tarjetas vivas + acción "filtrar tabla" para cada KPI.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTravelPlansOpsOverview } from "@/lib/admin/travel-plans-operations.functions";
import { cn } from "@/lib/utils";
import type { KpiFilter } from "@/lib/admin/travel-plans-operations.functions";

interface Props {
  active: KpiFilter;
  onSelect: (kpi: KpiFilter) => void;
}

export function TravelPlansKpiStrip({ active, onSelect }: Props) {
  const call = useServerFn(getTravelPlansOpsOverview);
  const q = useQuery({
    queryKey: ["cms", "travel-plans", "overview"],
    queryFn: () => call(),
    staleTime: 30_000,
  });

  const kpis: Array<{ key: KpiFilter; label: string; value: string | number; hint?: string }> = [
    { key: "active", label: "Viajes activos", value: q.data?.active_plans ?? "—" },
    {
      key: "pending_alux",
      label: "Propuestas Alux pendientes",
      value: q.data?.plans_with_pending_alux ?? "—",
    },
    {
      key: "open_case",
      label: "Casos Concierge abiertos",
      value: q.data?.plans_with_open_concierge_case ?? "—",
    },
    {
      key: "proposals_sla",
      label: "Propuestas > 48h sin respuesta",
      value: q.data?.proposals_awaiting_over_48h ?? "—",
    },
    {
      key: null,
      label: "Aceptación propuestas 30d",
      value:
        q.data?.proposals_acceptance_rate_30d == null
          ? "—"
          : `${q.data.proposals_acceptance_rate_30d}%`,
      hint: "informativo",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((k, i) => {
        const clickable = k.key !== null || active !== null;
        const isActive = active === k.key && k.key !== null;
        return (
          <button
            key={`${i}-${k.label}`}
            type="button"
            disabled={!clickable}
            onClick={() => {
              if (k.hint) {
                if (active !== null) onSelect(null);
                return;
              }
              onSelect(active === k.key ? null : k.key);
            }}
            className={cn(
              "text-left rounded-2xl border p-4 transition-colors",
              "bg-card hover:bg-accent/40",
              isActive
                ? "border-primary ring-2 ring-primary/30"
                : "border-border",
              !clickable && "cursor-default opacity-90",
            )}
            aria-pressed={isActive}
          >
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {q.isLoading ? "…" : k.value}
            </p>
            {k.hint ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isActive ? "Filtrando tabla · clic para limpiar" : "Clic para filtrar"}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}