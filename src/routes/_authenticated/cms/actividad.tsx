/**
 * /cms/actividad — Activity Center (vista administrador)
 * Etapa 14.50.2 · UNC Router + In-App + Activity Center (lectura).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminActivity, type ActivityItem } from "@/lib/notifications/activity.functions";

export const Route = createFileRoute("/_authenticated/cms/actividad")({
  component: AdminActivityPage,
});

function AdminActivityPage() {
  const fetcher = useServerFn(getAdminActivity);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["unc", "activity", "admin"],
    queryFn: () => fetcher({ data: { limit: 100 } }),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Centro de actividad
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Actividad administrativa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen unificado de eventos relevantes: alertas del sistema, órdenes y pagos recientes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
        >
          {isFetching ? "Actualizando…" : "Actualizar"}
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando actividad…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          No se pudo cargar la actividad: {(error as Error).message}
        </p>
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {data.items.map((item: ActivityItem, i) => (
            <li key={`${item.kind}-${item.occurred_at}-${i}`} className="flex items-start gap-3 p-4">
              <span
                className={[
                  "mt-1 inline-block h-2 w-2 shrink-0 rounded-full",
                  item.severity === "critical" || item.severity === "warning"
                    ? "bg-destructive"
                    : "bg-primary",
                ].join(" ")}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.kind} · {new Date(item.occurred_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {item.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}