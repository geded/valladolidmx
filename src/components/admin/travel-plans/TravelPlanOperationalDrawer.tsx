/**
 * CV1.1 · Drawer read-only con snapshot del plan.
 * Cero mutaciones · privacidad de datos (email visible sólo si RPC lo devuelve).
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  MapPin,
  Sparkles,
  Headset,
  Clock,
  ExternalLink,
} from "lucide-react";
import { getTravelPlanOperationalDetail } from "@/lib/admin/travel-plans-operations.functions";
import {
  PlanStatusBadge,
  ConciergeStatusBadge,
  ProposalStatusBadge,
} from "./badges";

interface Props {
  planId: string;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtCurrency(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency ?? "MXN",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ""}`;
  }
}

export function TravelPlanOperationalDrawer({ planId }: Props) {
  const call = useServerFn(getTravelPlanOperationalDetail);
  const q = useQuery({
    queryKey: ["cms", "travel-plans", "detail", planId],
    queryFn: () => call({ data: { plan_id: planId } }),
    staleTime: 15_000,
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="p-4 text-sm text-destructive">
        No fue posible cargar el detalle del viaje.
      </div>
    );
  }

  const d = q.data;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlanStatusBadge status={d.plan.status} />
          {d.plan.case_id ? (
            <Link
              to="/admin/concierge/$caseId"
              params={{ caseId: d.plan.case_id }}
              className="inline-flex items-center gap-1 rounded-pill border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
            >
              <Headset className="h-3 w-3" /> Ver caso
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          {d.plan.title ?? "Viaje sin título"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Viajero: <span className="font-medium text-foreground">{d.traveler.display_name}</span>
          {d.traveler.handle ? (
            <span className="ml-1 text-xs">@{d.traveler.handle}</span>
          ) : null}
          {d.traveler.email ? (
            <span className="ml-2 text-xs">· {d.traveler.email}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {d.plan.start_date ?? "—"} → {d.plan.end_date ?? "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {d.plan.party_size ?? 1} viajeros
          </span>
          {d.traveler.country ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {d.traveler.country}
            </span>
          ) : null}
          {d.traveler.language ? (
            <span className="rounded-pill border border-border px-2 py-0.5">
              Idioma: {d.traveler.language}
            </span>
          ) : null}
        </div>
      </header>

      {d.plan.notes ? (
        <section className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Notas del viajero
          </p>
          <p className="mt-1 whitespace-pre-wrap">{d.plan.notes}</p>
        </section>
      ) : null}

      {/* Concierge */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Concierge
        </h3>
        {d.concierge_case ? (
          <div className="mt-2 rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ConciergeStatusBadge status={d.concierge_case.status} />
              {d.concierge_case.priority ? (
                <span className="rounded-pill border border-border bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.06em]">
                  {d.concierge_case.priority}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                SLA: {fmtDateTime(d.concierge_case.target_response_at)}
              </span>
            </div>
            {d.concierge_case.summary ? (
              <p className="text-sm">{d.concierge_case.summary}</p>
            ) : null}
            {d.concierge_case.assignees?.length ? (
              <p className="text-xs text-muted-foreground">
                {d.concierge_case.assignees.length} asignad
                {d.concierge_case.assignees.length === 1 ? "o" : "os"}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Sin caso concierge abierto.</p>
        )}

        {d.latest_concierge_proposal ? (
          <div className="mt-3 rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ProposalStatusBadge status={d.latest_concierge_proposal.status} />
              <span className="text-xs text-muted-foreground">
                v{d.latest_concierge_proposal.version} · enviado{" "}
                {fmtDateTime(d.latest_concierge_proposal.sent_at)}
              </span>
              <span className="ml-auto text-sm font-semibold tabular-nums">
                {fmtCurrency(
                  d.latest_concierge_proposal.total_amount_cents,
                  d.latest_concierge_proposal.currency,
                )}
              </span>
            </div>
            {d.latest_concierge_proposal.summary ? (
              <p className="text-sm text-muted-foreground">
                {d.latest_concierge_proposal.summary}
              </p>
            ) : null}
            {d.latest_concierge_proposal.items?.length ? (
              <ul className="mt-1 space-y-1 text-xs">
                {d.latest_concierge_proposal.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between">
                    <span className="truncate">{it.notes ?? `Ítem #${it.position + 1}`}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {fmtCurrency(it.amount_cents, it.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Alux */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Propuestas de Alux
        </h3>
        {d.alux_proposals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin propuestas registradas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {d.alux_proposals.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-card p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{p.title ?? "Sugerencia"}</span>
                  <span className="ml-auto rounded-pill border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    {p.status}
                  </span>
                </div>
                {p.subtitle ? (
                  <p className="mt-1 text-xs text-muted-foreground">{p.subtitle}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ítems */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Ítems del plan ({d.items.length})
        </h3>
        {d.items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">El viajero aún no ha añadido ítems.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {d.items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2"
              >
                <span className="rounded-pill border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]">
                  {it.item_kind}
                </span>
                <span className="truncate">
                  {(it.snapshot?.title as string | undefined) ??
                    (it.snapshot?.name as string | undefined) ??
                    it.target_id ??
                    "Ítem"}
                </span>
                {it.day_index != null ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Día {it.day_index + 1}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Timeline */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Actividad reciente
        </h3>
        {d.timeline.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin actividad registrada.</p>
        ) : (
          <ol className="mt-2 space-y-2 border-l border-border pl-4">
            {d.timeline.map((t, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs text-muted-foreground">
                  {fmtDateTime(t.occurred_at)}
                </p>
                <p>
                  <span className="font-medium">{t.event_type}</span>
                  {t.summary ? ` — ${t.summary}` : null}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="border-t border-border pt-3 text-[11px] text-muted-foreground">
        Snapshot generado {fmtDateTime(d.generated_at)} · sólo lectura, sin mutaciones.
      </footer>
    </div>
  );
}