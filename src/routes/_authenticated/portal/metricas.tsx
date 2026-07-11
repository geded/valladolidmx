/**
 * /portal/metricas — Ola 5 · Métricas de cupones para empresas.
 *
 * KPIs, serie temporal, top promociones y países de los viajeros que
 * canjearon. Sirve para que el empresario vea el valor comercial real
 * del cupón digital.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Ticket, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getBusinessCouponMetrics,
  type CouponMetrics,
} from "@/lib/promotions/coupon-metrics.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/metricas")({
  component: MetricsPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const h = (e: Event) => {
      const d = (e as CustomEvent<string>).detail;
      setId(d ?? null);
    };
    window.addEventListener("portal:active-business-changed", h);
    return () =>
      window.removeEventListener("portal:active-business-changed", h);
  }, []);
  return id;
}

function MetricsPage() {
  const businessId = useActiveBusinessId();
  const [windowDays, setWindowDays] = useState<number>(30);
  const fetchMetrics = useServerFn(getBusinessCouponMetrics);

  const q = useQuery({
    queryKey: ["portal-metrics", businessId, windowDays],
    enabled: !!businessId,
    queryFn: () =>
      fetchMetrics({
        data: { business_id: businessId!, window_days: windowDays },
      }) as Promise<CouponMetrics>,
  });

  const m = q.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
            Portal empresa
          </p>
          <h1 className="text-2xl font-semibold">Métricas de cupones</h1>
          <p className="text-sm text-muted-foreground">
            Emisión, canjes y perfil de los viajeros que aprovechan tus
            promociones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(windowDays)}
            onValueChange={(v) => setWindowDays(Number(v))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
              <SelectItem value="180">Últimos 180 días</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <Link to="/portal/canjes">
              <ArrowLeft className="mr-2 size-4" aria-hidden />
              Historial
            </Link>
          </Button>
        </div>
      </header>

      {!businessId && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Selecciona una empresa activa arriba para ver métricas.
        </div>
      )}

      {businessId && q.isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Calculando métricas…
        </div>
      )}

      {m && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              icon={Ticket}
              label="Emitidos"
              value={m.totals.issued}
              hint="Reclamados por viajeros"
            />
            <Kpi
              icon={BarChart3}
              label="Canjeados"
              value={m.totals.redeemed}
              hint="Usados en tu empresa"
              tone="success"
            />
            <Kpi
              icon={TrendingUp}
              label="Conversión"
              value={`${Math.round(m.totals.conversion * 100)}%`}
              hint={`${m.totals.redeemed} / ${m.totals.issued}`}
              tone="info"
            />
            <Kpi
              icon={Users}
              label="Vigentes"
              value={m.totals.active}
              hint={`${m.totals.expired} expirados`}
            />
          </div>

          {/* Serie temporal */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Emisión y canje diarios
              </h2>
              <p className="text-xs text-muted-foreground">
                {m.window_days} días
              </p>
            </div>
            <SeriesChart data={m.series} />
            <Legend />
          </section>

          {/* Top promociones */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold">
              Promociones con más canjes
            </h2>
            {m.top_promotions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay canjes en esta ventana.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="pb-2">Promoción</th>
                      <th className="pb-2">Emitidos</th>
                      <th className="pb-2">Canjeados</th>
                      <th className="pb-2">Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.top_promotions.map((p) => (
                      <tr key={p.promotion_slug} className="border-t border-border">
                        <td className="py-2">
                          <div className="font-medium">{p.title}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {p.promotion_slug}
                          </div>
                        </td>
                        <td className="py-2">{p.issued}</td>
                        <td className="py-2 font-semibold">{p.redeemed}</td>
                        <td className="py-2">
                          {Math.round(p.conversion * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Países */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold">
              Origen de los viajeros que canjearon
            </h2>
            {m.countries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay datos de países.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {m.countries.map((c) => {
                  const total = m.countries.reduce((a, x) => a + x.count, 0);
                  const pct = total ? (c.count / total) * 100 : 0;
                  return (
                    <li key={c.country_code} className="flex items-center gap-3">
                      <span className="text-xl leading-none">
                        {flag(c.country_code)}
                      </span>
                      <span className="w-8 font-mono text-xs uppercase text-muted-foreground">
                        {c.country_code}
                      </span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums">
                        {c.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-[11px] italic text-muted-foreground">
              Datos agregados. Alux nunca comparte información personal
              identificable de un viajero individual.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Ticket;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "success" | "info";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "info"
        ? "text-info"
        : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-7 place-items-center rounded-md bg-primary/10 ${toneCls}`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function SeriesChart({
  data,
}: {
  data: Array<{ date: string; issued: number; redeemed: number }>;
}) {
  const max = useMemo(
    () => Math.max(1, ...data.map((d) => Math.max(d.issued, d.redeemed))),
    [data],
  );
  return (
    <div className="flex h-40 items-end gap-[2px]" aria-hidden>
      {data.map((d) => (
        <div
          key={d.date}
          className="flex flex-1 flex-col justify-end gap-[1px]"
          title={`${d.date} · emitidos ${d.issued} · canjeados ${d.redeemed}`}
        >
          <div
            className="w-full rounded-sm bg-primary/40"
            style={{ height: `${(d.issued / max) * 100}%` }}
          />
          <div
            className="w-full rounded-sm bg-success"
            style={{ height: `${(d.redeemed / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="inline-block size-2 rounded-sm bg-primary/40" />
        Emitidos
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2 rounded-sm bg-success" />
        Canjeados
      </span>
    </div>
  );
}

function flag(iso: string): string {
  if (iso === "??" || iso.length !== 2) return "🌎";
  const base = 0x1f1e6 - 65;
  const cc = iso.toUpperCase();
  return String.fromCodePoint(cc.charCodeAt(0) + base, cc.charCodeAt(1) + base);
}