/**
 * /portal/reportes — Ola 7.7 · Reporte de presencia
 *
 * KPIs, serie temporal, fuentes y países. Las métricas más profundas se
 * bloquean cuando el plan activo no las incluye: se muestran con overlay
 * y CTA a `/portal/visibilidad` para subir de nivel.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  MessageCircle,
  MapPin,
  Globe,
  Phone,
  Sparkles,
  Share2,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getBusinessPresenceReport,
  type PresenceReport,
} from "@/lib/visibility/presence-report.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/reportes")({
  component: ReportsPage,
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

function ReportsPage() {
  const businessId = useActiveBusinessId();
  const [windowDays, setWindowDays] = useState<number>(30);
  const fetchReport = useServerFn(getBusinessPresenceReport);

  const q = useQuery({
    queryKey: ["portal-presence", businessId, windowDays],
    enabled: !!businessId,
    queryFn: () =>
      fetchReport({
        data: { businessId: businessId!, windowDays },
      }) as Promise<PresenceReport>,
  });

  const r = q.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
            Portal empresa
          </p>
          <h1 className="text-2xl font-semibold">Reporte de presencia</h1>
          <p className="text-sm text-muted-foreground">
            Cuánto se ve y cuánto se acciona tu ficha en Valladolid.mx.
          </p>
        </div>
        <Select
          value={String(windowDays)}
          onValueChange={(v) => setWindowDays(Number(v))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
            <SelectItem value="365">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {!businessId && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Selecciona una empresa activa arriba para ver el reporte.
        </div>
      )}

      {businessId && q.isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Cargando reporte…
        </div>
      )}

      {businessId && q.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(q.error as Error).message}
        </div>
      )}

      {r && (
        <>
          <PlanBanner tier={r.tier} windowDays={r.window_days} />

          {/* KPIs siempre visibles */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              icon={Eye}
              label="Impresiones"
              value={r.totals.impressions}
              hint="Vistas de tu ficha"
            />
            <Kpi
              icon={MessageCircle}
              label="WhatsApp"
              value={r.totals.whatsapp}
              hint="Clics para contactar"
              tone="success"
            />
            <Kpi
              icon={MapPin}
              label="Cómo llegar"
              value={r.totals.map}
              hint="Clics al mapa"
              tone="info"
            />
            <Kpi
              icon={Globe}
              label="Sitio web"
              value={r.totals.web}
              hint="Clics al sitio"
            />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi
              icon={Phone}
              label="Teléfono"
              value={r.totals.phone}
              hint="Clics para llamar"
            />
            <LockedKpi
              icon={Sparkles}
              label="Menciones de Alux"
              value={r.totals.alux}
              locked={!r.tier.showAluxMentions}
              requiredPlan="Premium"
            />
            <LockedKpi
              icon={Share2}
              label="Compartidos"
              value={r.totals.share}
              locked={!r.tier.showShares}
              requiredPlan="Premium"
            />
          </section>

          {/* Serie */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Actividad diaria
              </h2>
              <p className="text-xs text-muted-foreground">
                {r.window_days} días
              </p>
            </div>
            {r.series.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay actividad registrada en esta ventana.
              </p>
            ) : (
              <>
                <SeriesChart data={r.series} />
                <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-sm bg-primary/40" />
                    Impresiones
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-sm bg-success" />
                    Interacciones
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Fuentes */}
          <LockedSection
            title="De dónde llegan las visitas"
            locked={!r.tier.showSources}
            requiredPlan="Destacado"
          >
            {r.top_sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin datos de origen aún.
              </p>
            ) : (
              <ul className="space-y-2">
                {r.top_sources.map((s) => {
                  const total = r.top_sources.reduce((a, x) => a + x.count, 0);
                  const pct = total ? (s.count / total) * 100 : 0;
                  return (
                    <li key={s.source} className="flex items-center gap-3">
                      <span className="w-28 truncate text-xs font-medium">
                        {s.source}
                      </span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums">
                        {s.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </LockedSection>

          {/* Países */}
          <LockedSection
            title="Origen de los visitantes"
            locked={!r.tier.showCountries}
            requiredPlan="Destacado"
          >
            {r.countries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin datos de países aún.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {r.countries.map((c) => {
                  const total = r.countries.reduce((a, x) => a + x.count, 0);
                  const pct = total ? (c.count / total) * 100 : 0;
                  return (
                    <li
                      key={c.country_code}
                      className="flex items-center gap-3"
                    >
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
          </LockedSection>

          <p className="text-[11px] italic text-muted-foreground">
            Datos agregados y anónimos. Nunca compartimos información
            identificable de un visitante individual.
          </p>
        </>
      )}
    </div>
  );
}

function PlanBanner({
  tier,
  windowDays,
}: {
  tier: PresenceReport["tier"];
  windowDays: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-semibold text-foreground">
          Plan activo: {tier.planName}
        </p>
        <p className="text-muted-foreground">
          Estás viendo los últimos {windowDays} días. Máximo permitido en
          este plan: {tier.maxWindowDays} días.
        </p>
      </div>
      {tier.planSlug !== "elite" && (
        <Button asChild size="sm" variant="outline">
          <Link to="/portal/visibilidad">
            Ver planes superiores
            <ArrowUpRight className="ml-1 size-3.5" aria-hidden />
          </Link>
        </Button>
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
  icon: typeof Eye;
  label: string;
  value: number;
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
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LockedKpi({
  icon: Icon,
  label,
  value,
  locked,
  requiredPlan,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  locked: boolean;
  requiredPlan: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className={locked ? "opacity-30 blur-[2px]" : ""}>
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {locked ? "—" : value}
        </p>
      </div>
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/70 p-2 text-center">
          <Lock className="size-4 text-primary" aria-hidden />
          <p className="text-[11px] font-medium">Plan {requiredPlan}</p>
          <Link
            to="/portal/visibilidad"
            className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Mejorar plan
          </Link>
        </div>
      )}
    </div>
  );
}

function LockedSection({
  title,
  locked,
  requiredPlan,
  children,
}: {
  title: string;
  locked: boolean;
  requiredPlan: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className={locked ? "opacity-30 blur-[2px]" : ""}>{children}</div>
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 p-4 text-center">
          <Lock className="size-5 text-primary" aria-hidden />
          <p className="text-sm font-medium">
            Disponible en el plan {requiredPlan}
          </p>
          <Button asChild size="sm">
            <Link to="/portal/visibilidad">Ver planes</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function SeriesChart({
  data,
}: {
  data: Array<{ date: string; impressions: number; interactions: number }>;
}) {
  const max = useMemo(
    () =>
      Math.max(1, ...data.map((d) => Math.max(d.impressions, d.interactions))),
    [data],
  );
  return (
    <div className="flex h-40 items-end gap-[2px]" aria-hidden>
      {data.map((d) => (
        <div
          key={d.date}
          className="flex flex-1 flex-col justify-end gap-[1px]"
          title={`${d.date} · impresiones ${d.impressions} · interacciones ${d.interactions}`}
        >
          <div
            className="w-full rounded-sm bg-primary/40"
            style={{ height: `${(d.impressions / max) * 100}%` }}
          />
          <div
            className="w-full rounded-sm bg-success"
            style={{ height: `${(d.interactions / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function flag(iso: string): string {
  if (iso === "??" || iso.length !== 2) return "🌎";
  const base = 0x1f1e6 - 65;
  const cc = iso.toUpperCase();
  return String.fromCodePoint(cc.charCodeAt(0) + base, cc.charCodeAt(1) + base);
}