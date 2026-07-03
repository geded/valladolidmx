/**
 * /cms/observabilidad — Ola 4 · Etapa 7
 *
 * Dashboard administrativo de Observabilidad técnica y de negocio.
 * Sólo accesible vía rol admin / super_admin (validado server-side
 * por cada RPC SECURITY DEFINER que consume).
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getMarketplaceFunnel,
  getTopProducts,
  getSearchMetricsSummary,
  type MarketplaceFunnel,
  type SearchMetricsSummary,
  type TopProduct,
  type TopProductKind,
} from "@/lib/observability/observability.functions";

export const Route = createFileRoute("/_authenticated/cms/observabilidad")({
  head: () => ({
    meta: [
      { title: "Observabilidad · CMS Studio · Valladolid.mx" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ObservabilityPage,
});

const KIND_LABELS: Record<TopProductKind, string> = {
  most_added: "Más agregados al viaje",
  most_reserved: "Más reservados",
  most_abandoned: "Mayor abandono",
};

function ObservabilityPage() {
  const fnFunnel = useServerFn(getMarketplaceFunnel);
  const fnTop = useServerFn(getTopProducts);
  const fnSearch = useServerFn(getSearchMetricsSummary);

  const [funnel, setFunnel] = useState<MarketplaceFunnel | null>(null);
  const [search, setSearch] = useState<SearchMetricsSummary | null>(null);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [kind, setKind] = useState<TopProductKind>("most_reserved");
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fnFunnel({ data: { days } }),
      fnTop({ data: { kind, days, limit: 10 } }),
      fnSearch({ data: { days: Math.min(days, 30) } }),
    ])
      .then(([f, t, s]) => {
        if (cancelled) return;
        setFunnel(f);
        setTop(t);
        setSearch(s);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fnFunnel, fnTop, fnSearch, kind, days]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Observabilidad
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Observabilidad y Hardening
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Dashboards técnicos y de negocio del Marketplace. Todas las
          lecturas son agregadas y exigen rol admin / super_admin server-side.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Ventana (días):</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1"
            >
              {[7, 14, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {loading && <span className="text-muted-foreground">Cargando…</span>}
          {error && <span className="text-destructive">{error}</span>}
        </div>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Embudo de negocio
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Card label="Marketplace (búsquedas)" value={funnel?.searches} />
          <Card label="Arma tu Viaje" value={funnel?.favorites} />
          <Card label="Carrito" value={funnel?.carts} />
          <Card label="Pago iniciado" value={funnel?.payments} />
          <Card label="Reserva confirmada" value={funnel?.confirmed} highlight />
          <Card label="Leads generados" value={funnel?.leads} muted />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Conteos absolutos en la ventana. Conversión = etapa siguiente / anterior.
        </p>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Catálogo · Top productos
          </h2>
          <div className="flex gap-1 text-xs">
            {(Object.keys(KIND_LABELS) as TopProductKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={[
                  "rounded-full border px-3 py-1",
                  k === kind
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                ].join(" ")}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Empresa</th>
                <th className="px-3 py-2 text-right">Métrica</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    Sin datos en la ventana seleccionada.
                  </td>
                </tr>
              )}
              {top.map((p) => (
                <tr key={p.product_id} className="border-t border-border">
                  <td className="px-3 py-2">{p.product_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.business_name}</td>
                  <td className="px-3 py-2 text-right font-mono">{p.metric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Búsqueda · Salud técnica
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Total búsquedas" value={search?.total} />
          <Card label="Zero results" value={search?.zero_results} />
          <Card label="Tasa zero (%)" value={search?.zero_results_rate} />
          <Card label="p50 / p95 (ms)" value={search ? `${search.p50_ms} / ${search.p95_ms}` : undefined} />
        </div>
        {search && search.top_zero_terms.length > 0 && (
          <div className="mt-4 rounded-xl border border-border p-3 text-xs">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground">
              Top términos sin resultados
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {search.top_zero_terms.map((t) => (
                <li
                  key={t.q}
                  className="rounded-full border border-border bg-background px-3 py-1"
                >
                  <span className="font-medium">{t.q}</span>
                  <span className="ml-2 text-muted-foreground">× {t.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number | string | undefined;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        highlight
          ? "border-primary/40 bg-primary/5"
          : muted
            ? "border-dashed border-border bg-card/40"
            : "border-border bg-card",
      ].join(" ")}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value ?? "—"}
      </p>
    </div>
  );
}
