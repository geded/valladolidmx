/**
 * CV1.1 · Vista Operativa "Viajes en curso"
 *
 * Panel read-only para Founder/Admin/Concierge dentro del CMS Studio.
 * Consume RPCs SECURITY DEFINER; cero mutaciones sobre el Travel Plan.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listActiveTravelPlansForOps,
  type KpiFilter,
  type TravelPlanOpsRow,
} from "@/lib/admin/travel-plans-operations.functions";
import { TravelPlansKpiStrip } from "@/components/admin/travel-plans/TravelPlansKpiStrip";
import { TravelPlansFilters } from "@/components/admin/travel-plans/TravelPlansFilters";
import { ActiveTravelPlansTable } from "@/components/admin/travel-plans/ActiveTravelPlansTable";
import { TravelPlanOperationalDrawer } from "@/components/admin/travel-plans/TravelPlanOperationalDrawer";
import { AttentionQueue } from "@/components/admin/travel-plans/AttentionQueue";
import { useSheetStack } from "@/components/workspace/sheets/SheetStackProvider";

export const Route = createFileRoute("/_authenticated/cms/travel-plans")({
  head: () => ({
    meta: [
      { title: "Viajes en curso · CMS · Valladolid.mx" },
      {
        name: "description",
        content:
          "Panel operativo de Travel Plans activos para Founder, Admin y Concierge.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TravelPlansOpsPage,
});

const PAGE_SIZE = 25;

function TravelPlansOpsPage() {
  const [kpi, setKpi] = useState<KpiFilter>(null);
  const [search, setSearch] = useState("");
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [offset, setOffset] = useState(0);

  const call = useServerFn(listActiveTravelPlansForOps);
  const sheets = useSheetStack();

  const params = useMemo(
    () => ({
      kpi_filter: kpi,
      plan_status: planStatus,
      priority: priority as "critical" | "high" | "medium" | "low" | null,
      only_mine: onlyMine,
      include_closed: includeClosed || kpi === "closed",
      search: search.trim() || null,
      limit: PAGE_SIZE,
      offset,
    }),
    [kpi, planStatus, priority, onlyMine, includeClosed, search, offset],
  );

  const q = useQuery({
    queryKey: ["cms", "travel-plans", "list", params],
    queryFn: () => call({ data: params }),
    staleTime: 15_000,
  });

  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const isAdmin = q.data?.is_admin ?? false;

  const openDrawer = (row: TravelPlanOpsRow) => {
    sheets.push({
      title: row.title ?? "Viaje sin título",
      description: `Viajero: ${row.traveler.display_name}`,
      snap: "full",
      content: <TravelPlanOperationalDrawer planId={row.plan_id} />,
    });
  };

  const reset = () => {
    setKpi(null);
    setSearch("");
    setPlanStatus(null);
    setPriority(null);
    setOnlyMine(false);
    setIncludeClosed(false);
    setOffset(0);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Operaciones · Travel Plan
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Viajes en curso</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Vista operativa de viajes activos, propuestas de Alux y casos concierge.
              Sólo lectura — todas las acciones se realizan desde el expediente correspondiente.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Limpiar filtros
          </button>
        </div>
      </header>

      <TravelPlansKpiStrip
        active={kpi}
        onSelect={(k) => {
          setKpi(k);
          setOffset(0);
        }}
      />

      <AttentionQueue
        onlyMine={onlyMine}
        onOpenPlan={(planId) =>
          sheets.push({
            title: "Expediente del viaje",
            description: `Plan ${planId.slice(0, 8)}`,
            snap: "full",
            content: <TravelPlanOperationalDrawer planId={planId} />,
          })
        }
      />

      <TravelPlansFilters
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setOffset(0);
        }}
        confirmedOnly={kpi === "confirmed"}
        onConfirmedOnly={(v) => {
          setKpi(v ? "confirmed" : null);
          setOffset(0);
        }}
        planStatus={planStatus}
        onPlanStatus={(v) => {
          setPlanStatus(v);
          setOffset(0);
        }}
        priority={priority}
        onPriority={(v) => {
          setPriority(v);
          setOffset(0);
        }}
        onlyMine={onlyMine}
        onOnlyMine={(v) => {
          setOnlyMine(v);
          setOffset(0);
        }}
        includeClosed={includeClosed}
        onIncludeClosed={(v) => {
          setIncludeClosed(v);
          setOffset(0);
        }}
        isAdmin={isAdmin}
      />

      <ActiveTravelPlansTable
        rows={rows}
        isLoading={q.isLoading}
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        onOffset={setOffset}
        onRowClick={openDrawer}
      />

      {q.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar los viajes. Verifica tu rol y vuelve a intentar.
        </p>
      ) : null}
    </div>
  );
}