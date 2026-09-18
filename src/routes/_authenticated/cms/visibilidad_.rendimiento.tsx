/**
 * /cms/visibilidad/rendimiento
 *
 * Tablero de reparto comercial: qué está entregando cada contrato de
 * visibilidad (veces mostrado, clics, efectividad, secciones) para decidir
 * con datos. Lectura sobre `business_view_events`; sin fuentes paralelas.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAdminVisibilityPerformance,
  ctr,
  type AdminVisibilityPerformanceRow,
} from "@/lib/visibility/visibility-performance.functions";

const WINDOWS = [7, 30, 90] as const;

export const Route = createFileRoute("/_authenticated/cms/visibilidad_/rendimiento")({
  head: () => ({
    meta: [
      { title: "Rendimiento de visibilidad · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RendimientoPage,
});

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Vigente";
    case "pending":
      return "En revisión";
    case "expired":
      return "Vencido";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function RendimientoPage() {
  const [windowDays, setWindowDays] = useState<number>(30);
  const call = useServerFn(getAdminVisibilityPerformance);
  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery<AdminVisibilityPerformanceRow[]>({
    retry: false,
    queryKey: ["cms", "visibility-performance", windowDays],
    queryFn: () => call({ data: { windowDays } }),
  });

  const totals = useMemo(() => {
    const active = data.filter((r) => r.status === "active");
    return {
      contracts: active.length,
      impressions: data.reduce((a, r) => a + r.impressions, 0),
      clicks: data.reduce((a, r) => a + r.clicks, 0),
      withoutExposure: active.filter((r) => r.impressions === 0).length,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">CMS · Comercial</p>
          <h1 className="mt-1 font-serif text-2xl">Rendimiento de visibilidad</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Qué está entregando cada contrato: veces mostrado, clics, efectividad y en qué secciones
            apareció. Sirve para detectar empresas rezagadas y decidir con datos.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/cms/visibilidad">
            <ArrowLeft className="mr-1 h-4 w-4" /> Paquetes
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((w) => (
          <Button
            key={w}
            size="sm"
            variant={windowDays === w ? "default" : "outline"}
            onClick={() => setWindowDays(w)}
          >
            {w} días
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Contratos vigentes" value={totals.contracts} />
        <Kpi label="Veces mostrado" value={totals.impressions} />
        <Kpi label="Clics" value={totals.clicks} />
        <Kpi label="Sin exposición" value={totals.withoutExposure} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Calculando…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">No fue posible leer el rendimiento.</p>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay contratos de visibilidad registrados.
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map((row) => (
            <article
              key={row.grant_id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {row.business_name ?? "Empresa sin nombre"}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.plan_name ?? "Sin paquete"} · {statusLabel(row.status)}
                    {row.expires_at
                      ? ` · vence ${new Date(row.expires_at).toLocaleDateString("es-MX")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{row.impressions} mostrado</Badge>
                  <Badge variant="outline">{row.clicks} clics</Badge>
                  <Badge variant="secondary">{ctr(row.impressions, row.clicks)}% efectividad</Badge>
                </div>
              </div>

              {row.status === "active" && row.impressions === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Contrato vigente sin apariciones en el periodo. Revisa que la ficha esté
                  publicada, completa y sea pertinente para las secciones contratadas.
                </p>
              ) : row.surfaces.length ? (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {row.surfaces.map((s) => (
                    <li key={s.surface} className="rounded-pill border border-border px-2.5 py-1">
                      {s.surface}: <strong>{s.impressions}</strong> · {s.clicks} clics
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
