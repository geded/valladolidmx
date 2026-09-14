/**
 * 14.60.2 — Customer Case File · vista de composición (read-only).
 * Consume concierge_case_file_v1 y respeta visibilidad por rol.
 */
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Headset, Sparkles, Mail, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAluxBrand } from "@/lib/brand/brand-context";
import { toast } from "@/lib/toast";
import {
  acceptConciergeProposal,
  rejectConciergeProposal,
  sendConciergeProposal,
  viewConciergeProposal,
  withdrawConciergeProposal,
  createConciergeProposal,
  assignSelfConciergeCase,
  releaseConciergeCase,
  setConciergeCasePriority,
  getConciergeCaseHandoffContext,
  requestConciergeQuote,
} from "@/lib/concierge/concierge.functions";
import { createOrderFromProposal } from "@/lib/concierge/orders.functions";
import {
  generateAluxSummary,
  generateAluxProducts,
  generateAluxProposalDraft,
  generateAluxCommsDigest,
  generateAluxRiskDetection,
  generateAluxOpportunityDetection,
  type AluxSuggestion,
  type AluxCapability,
} from "@/lib/concierge/alux.functions";

type CaseFile = {
  case: {
    id: string;
    status: string;
    priority: string;
    source: string;
    summary: string | null;
    created_at: string;
    updated_at: string;
    traveler_user_id: string;
    target_response_at?: string | null;
    last_activity_at?: string | null;
    priority_source?: string | null;
    priority_reason?: string | null;
  };
  viewer: { user_id: string; is_internal: boolean };
  traveler: {
    user_id: string;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    preferred_language?: string | null;
    whatsapp_contact_consent?: boolean;
    whatsapp_contact_consented_at?: string | null;
  };
  travel_plan: { id: string } | null;
  requests: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    source_type: string;
    notes: string | null;
    business_id?: string | null;
  }>;
  links: Array<{ link_type: string; target_id: string }>;
  businesses: Array<{ id: string; display_name: string; slug: string | null }>;
  timeline: Array<{
    id: string;
    event_type: string;
    summary: string | null;
    occurred_at: string;
    severity: string;
  }>;
  quotes?: Array<{
    quote_id: string;
    request_id: string;
    business_id: string;
    business_name: string | null;
    status: string;
    currency: string;
    total_amount_cents: number | null;
    valid_until: string | null;
    submitted_at: string | null;
    expired_at: string | null;
    created_at: string;
    notes: string | null;
    terms: string | null;
    request_title: string;
    request_kind: string;
  }>;
  proposals?: Array<{
    proposal_id: string;
    status: string;
    version: number;
    supersedes_proposal_id: string | null;
    currency: string;
    total_amount_cents: number | null;
    valid_until: string | null;
    summary: string | null;
    terms: string | null;
    sent_at: string | null;
    viewed_at: string | null;
    responded_at: string | null;
    created_at: string;
    items: Array<{
      item_id: string;
      quote_id: string;
      request_id: string;
      position: number;
      amount_cents: number;
      currency: string;
      notes: string | null;
      business_id: string;
      business_name: string | null;
      request_title: string;
    }>;
  }>;
  assignment?: {
    id: string;
    concierge_user_id: string;
    assigned_at: string;
    status: string;
  } | null;
  assignments?: Array<{
    id: string;
    concierge_user_id: string;
    status: string;
    assigned_at: string;
    released_at: string | null;
    reason: string | null;
  }>;
  sla?: {
    priority: string;
    priority_source: string | null;
    priority_reason: string | null;
    target_response_at: string | null;
    last_activity_at: string | null;
    first_response_at: string | null;
    sla_status: "on_time" | "due_soon" | "overdue" | null;
  } | null;
};

const CASE_STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  triaged: "En revisión",
  in_progress: "En atención",
  waiting_customer: "Esperando respuesta del viajero",
  waiting_business: "Esperando respuesta de una empresa",
  on_hold: "En pausa",
  resolved: "Resuelto",
  closed_won: "Cerrado con viaje confirmado",
  closed_lost: "Cerrado sin confirmación",
  closed: "Cerrado",
  archived: "Archivado",
  cancelled: "Cancelado",
  lost: "Cerrado sin confirmación",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_SOURCE_LABELS: Record<string, string> = {
  manual: "Definida por el concierge",
  sla: "Calculada por tiempo de respuesta",
  trip_date: "Calculada por cercanía del viaje",
  payment: "Relacionada con una confirmación",
  system: "Asignada automáticamente",
  alux: "Sugerida por Alux",
  other: "Otro criterio",
};

const SLA_STATUS_LABELS: Record<string, string> = {
  on_time: "A tiempo",
  due_soon: "Por vencer",
  overdue: "Vencido",
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  open: "Pendiente de revisión",
  quoting: "Solicitando cotización",
  quoted: "Cotización recibida",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  requested: "Solicitada",
  draft: "En preparación",
  submitted: "Recibida",
  withdrawn: "Retirada",
  expired: "Vencida",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  draft: "En preparación",
  sent: "Enviada al viajero",
  viewed: "Vista por el viajero",
  accepted: "Aceptada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
  expired: "Vencida",
};

const SOURCE_LABELS: Record<string, string> = {
  travel_plan: "Mi Viaje",
  travel_plan_item: "Experiencia guardada en Mi Viaje",
  marketplace_product: "Ficha de una experiencia",
  manual: "Solicitud registrada por el Concierge",
};

const REQUEST_KIND_LABELS: Record<string, string> = {
  reservable: "Requiere cotización o disponibilidad",
  non_reservable: "Interés o actividad por considerar",
};

const ITEM_KIND_LABELS: Record<string, string> = {
  business: "Empresa",
  hotel: "Hotel",
  restaurant: "Restaurante",
  vacation_rental: "Casa de vacaciones",
  experience: "Experiencia",
  product: "Experiencia",
  event: "Evento",
  place: "Lugar",
  destination: "Destino",
  route: "Ruta",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  "Concierge.Handoff.Context": "Información del viaje compartida con el Concierge",
  concierge_handoff_context: "Información del viaje compartida con el Concierge",
  "Concierge.Case.Created": "Expediente creado",
  "Concierge.Case.Assigned": "Expediente asignado",
  "Concierge.Case.Reassigned": "Expediente reasignado",
  "Concierge.Case.Released": "Expediente liberado",
  "Concierge.Case.StatusChanged": "Estado del expediente actualizado",
  "Concierge.Case.PriorityChanged": "Prioridad actualizada",
  "Concierge.Case.TargetResponseSet": "Fecha objetivo de respuesta actualizada",
  "Concierge.Request.Created": "Solicitud agregada al expediente",
  "Concierge.Quote.Requested": "Cotización solicitada",
  "Concierge.Quote.Submitted": "Cotización recibida",
  "Concierge.Proposal.Created": "Propuesta preparada",
  "Concierge.Proposal.Sent": "Propuesta enviada al viajero",
  "Concierge.Proposal.Viewed": "Propuesta vista por el viajero",
  "Concierge.Proposal.Accepted": "Propuesta aceptada",
};

const FIELD_LABELS: Record<string, string> = {
  destination: "Destino",
  destination_id: "Destino",
  destination_name: "Destino",
  destinations: "Destinos",
  last_destination: "Último destino consultado",
  recent_destinations: "Destinos consultados recientemente",
  interests: "Intereses",
  categories: "Intereses",
  visited_places: "Lugares visitados",
  saved_places: "Lugares guardados",
  routes: "Rutas de interés",
  notes: "Notas",
  count: "Registros",
  updated_at: "Última actualización",
  created_at: "Fecha de registro",
};

const VALUE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  pt: "Portugués",
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  budget: "Económico",
  comfort: "Confort",
  premium: "Premium",
};

function labelFor(value: string | null | undefined, labels: Record<string, string>): string {
  if (!value) return "Sin datos";
  return labels[value] ?? humanizeKey(value);
}

function humanizeKey(value: string): string {
  const spaced = value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Sin datos";
}

function readableValue(value: unknown): string {
  if (value == null || value === "") return "Sin información";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return value.toLocaleString("es-MX");
  if (typeof value === "string") {
    const mapped = VALUE_LABELS[value.toLowerCase()];
    if (mapped) return mapped;
    const maybeDate = /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : null;
    return maybeDate && !Number.isNaN(maybeDate.getTime())
      ? maybeDate.toLocaleString("es-MX")
      : humanizeKey(value);
  }
  if (Array.isArray(value)) return value.map(readableValue).join(", ");
  return Object.values(value as Record<string, unknown>)
    .map(readableValue)
    .join(" · ");
}

function readableEntries(value: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(value)
    .filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")
    .map(([key, entry]) => [FIELD_LABELS[key] ?? humanizeKey(key), readableValue(entry)]);
}

export function CaseFileView({
  data,
  hideInternal = false,
}: {
  data: unknown;
  hideInternal?: boolean;
}) {
  const f = data as CaseFile | null;
  if (!f) return <p className="text-sm text-muted-foreground">Expediente no disponible.</p>;
  const internal = f.viewer.is_internal && !hideInternal;

  return (
    <div className="grid gap-6">
      <Header f={f} internal={internal} />
      {!internal && <TravelerConciergeProgress f={f} />}
      {!internal && <ProposalsSection f={f} internal={false} />}
      {internal && <SlaAssignmentPanel f={f} />}
      {internal && <TravelerContactSection traveler={f.traveler} />}
      {internal && <HandoffContextCard caseId={f.case.id} />}
      {internal && <AluxAssistantPanel caseId={f.case.id} />}
      <Section title="Qué solicita el viajero">
        {f.requests.length === 0 ? (
          <Empty>Sin solicitudes registradas.</Empty>
        ) : (
          <ul className="grid gap-2">
            {f.requests.map((request) => (
              <RequestCard key={request.id} request={request} f={f} internal={internal} />
            ))}
          </ul>
        )}
      </Section>

      {f.businesses.length > 0 && (
        <Section title="Empresas participantes">
          <ul className="flex flex-wrap gap-2 text-xs">
            {Array.from(
              new Map(f.businesses.map((business) => [business.id, business])).values(),
            ).map((b) => (
              <li key={b.id} className="rounded-full border border-border bg-card px-3 py-1">
                {b.display_name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {internal && f.quotes && f.quotes.length > 0 && (
        <Section title="Cotizaciones">
          <ul className="grid gap-2">
            {f.quotes.map((q) => (
              <li key={q.quote_id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {q.business_name ?? "Empresa"} · {q.request_title}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {labelFor(q.status, QUOTE_STATUS_LABELS)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {q.total_amount_cents != null
                    ? `${(q.total_amount_cents / 100).toLocaleString("es-MX", { style: "currency", currency: q.currency })}`
                    : "Sin monto"}
                  {q.valid_until
                    ? ` · Vigente hasta ${new Date(q.valid_until).toLocaleString()}`
                    : ""}
                </p>
                {q.notes ? <p className="mt-1 text-xs text-foreground/80">{q.notes}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {internal && <ProposalsSection f={f} internal />}

      {internal && (
        <Section title="Enlaces internos">
          {f.links.length === 0 ? (
            <Empty>Sin enlaces.</Empty>
          ) : (
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {f.links.map((l, i) => (
                <li key={i} className="font-mono">
                  {l.link_type} · {l.target_id.slice(0, 8)}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Línea de tiempo" id="case-timeline">
        {f.timeline.length === 0 ? (
          <Empty>Sin eventos.</Empty>
        ) : (
          <ol className="grid gap-2">
            {f.timeline.map((t) => (
              <li key={t.id} className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{labelFor(t.event_type, EVENT_TYPE_LABELS)}</span>
                  <span className="text-muted-foreground">
                    {new Date(t.occurred_at).toLocaleString()}
                  </span>
                </div>
                {t.summary ? <p className="mt-1 text-foreground/80">{t.summary}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Header({ f, internal }: { f: CaseFile; internal: boolean }) {
  return (
    <header className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Expediente {f.case.id.slice(0, 8).toUpperCase()}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {labelFor(f.case.status, CASE_STATUS_LABELS)}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">{f.case.summary ?? "Sin resumen"}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {internal
          ? `Origen: ${labelFor(f.case.source, SOURCE_LABELS)} · Prioridad: ${labelFor(f.case.priority, PRIORITY_LABELS)} · `
          : "Recibido "}
        {new Date(f.case.created_at).toLocaleString("es-MX")}
      </p>
      {internal && f.traveler.display_name && (
        <p className="mt-1 text-xs text-muted-foreground">Viajero: {f.traveler.display_name}</p>
      )}
    </header>
  );
}

function TravelerContactSection({ traveler }: { traveler: CaseFile["traveler"] }) {
  const safePhone = traveler.phone?.trim() ?? "";
  const phoneHref = /^\+?[0-9 ()-]{8,32}$/.test(safePhone)
    ? `tel:${safePhone.replace(/[^+0-9]/g, "")}`
    : null;
  const whatsappHref =
    traveler.whatsapp_contact_consent && phoneHref
      ? `https://wa.me/${safePhone.replace(/\D/g, "")}`
      : null;
  const emailHref = traveler.email ? `mailto:${encodeURIComponent(traveler.email)}` : null;

  return (
    <Section title="Cliente y contacto">
      <div className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-foreground">
            {traveler.display_name ?? "Nombre no disponible"}
          </p>
          <dl className="mt-2 grid gap-1 text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Correo:</dt>
              <dd className="break-all">{traveler.email ?? "No disponible"}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Móvil:</dt>
              <dd>{safePhone || "No disponible"}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">WhatsApp:</dt>
              <dd>
                {traveler.whatsapp_contact_consent
                  ? "Autorizado por el viajero"
                  : "Sin autorización de contacto"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap content-start gap-2">
          {emailHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={emailHref}>
                <Mail className="size-4" aria-hidden />
                Correo
              </a>
            </Button>
          ) : null}
          {phoneHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={phoneHref}>
                <Phone className="size-4" aria-hidden />
                Llamar
              </a>
            </Button>
          ) : null}
          {whatsappHref ? (
            <Button asChild size="sm">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function TravelerConciergeProgress({ f }: { f: CaseFile }) {
  const alux = useAluxBrand();
  const proposals = f.proposals ?? [];
  const hasReadyProposal = proposals.some((proposal) =>
    ["sent", "viewed", "accepted"].includes(proposal.status),
  );
  const hasQuoteActivity =
    f.requests.some((request) => ["quoting", "quoted", "accepted"].includes(request.status)) ||
    (f.quotes?.length ?? 0) > 0;
  const isReviewing =
    hasQuoteActivity ||
    ["triaged", "in_progress", "waiting_business", "waiting_customer"].includes(f.case.status);
  const activeStep = hasReadyProposal ? 3 : hasQuoteActivity ? 2 : isReviewing ? 1 : 0;
  const steps = ["Recibido", "En revisión", "Preparando propuesta", "Propuesta lista"];

  return (
    <section
      aria-labelledby="traveler-concierge-progress"
      className="border-y border-alux-border bg-alux-surface px-4 py-5 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-alux text-alux-foreground">
          {hasReadyProposal ? (
            <Headset className="size-5" aria-hidden />
          ) : (
            <Sparkles className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-alux-surface-foreground/70">
            {alux.name} · contigo durante la espera
          </p>
          <h3
            id="traveler-concierge-progress"
            className="mt-1 text-lg font-semibold text-alux-surface-foreground"
          >
            {hasReadyProposal
              ? alux.copy("conciergeProposalReadyTitle")
              : isReviewing
                ? alux.copy("conciergeWaitingTitle")
                : alux.copy("conciergeSentTitle")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-alux-surface-foreground/75">
            {hasReadyProposal
              ? alux.copy("conciergeProposalReadyBody")
              : isReviewing
                ? alux.copy("conciergeWaitingBody")
                : alux.copy("conciergeSentBody")}
          </p>
        </div>
      </div>
      <ol
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="Avance de tu solicitud"
      >
        {steps.map((step, index) => {
          const complete = index <= activeStep;
          return (
            <li key={step} className="flex items-center gap-2 text-xs">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border ${complete ? "border-alux bg-alux text-alux-foreground" : "border-alux-border bg-background text-muted-foreground"}`}
              >
                {complete ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Circle className="size-3" aria-hidden />
                )}
              </span>
              <span
                className={
                  complete
                    ? "font-medium text-alux-surface-foreground"
                    : "text-alux-surface-foreground/55"
                }
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
      {!hasReadyProposal ? (
        <p className="mt-4 border-t border-alux-border pt-3 text-xs text-alux-surface-foreground/70">
          Cuando esté lista, recibirás un aviso en tu cuenta y podrás revisar qué incluye, el
          importe y la vigencia antes de decidir.
        </p>
      ) : null}
    </section>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function money(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("es-MX", { style: "currency", currency });
}

function ProposalsSection({ f, internal }: { f: CaseFile; internal: boolean }) {
  const proposals = f.proposals ?? [];
  if (proposals.length === 0 && !internal) return null;

  const [compareOpen, setCompareOpen] = useState(false);
  const canCompare = proposals.length >= 2;

  return (
    <Section
      title={internal ? "Propuesta económica del Concierge" : "Propuestas"}
      id="case-proposals"
    >
      {internal ? (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Las empresas sólo cotizan sus servicios. Tú seleccionas esas respuestas, preparas la
          propuesta final y la envías al viajero.
        </p>
      ) : null}
      {proposals.length === 0 ? (
        <Empty>Sin propuestas todavía.</Empty>
      ) : (
        <>
          {canCompare ? (
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Tienes {proposals.length} propuestas disponibles.
              </p>
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground/80 hover:bg-muted"
              >
                {compareOpen ? "Ver como lista" : "Comparar lado a lado"}
              </button>
            </div>
          ) : null}
          {compareOpen && canCompare ? (
            <ProposalCompare proposals={proposals} internal={internal} />
          ) : (
            <ul className="grid gap-3">
              {proposals.map((p) => (
                <ProposalCard key={p.proposal_id} p={p} caseId={f.case.id} internal={internal} />
              ))}
            </ul>
          )}
        </>
      )}
      {internal ? <ProposalComposer caseId={f.case.id} quotes={f.quotes ?? []} /> : null}
    </Section>
  );
}

function ProposalCard({
  p,
  caseId: _caseId,
  internal,
}: {
  p: NonNullable<CaseFile["proposals"]>[number];
  caseId: string;
  internal: boolean;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const sendFn = useServerFn(sendConciergeProposal);
  const withdrawFn = useServerFn(withdrawConciergeProposal);
  const viewFn = useServerFn(viewConciergeProposal);
  const acceptFn = useServerFn(acceptConciergeProposal);
  const rejectFn = useServerFn(rejectConciergeProposal);
  const createOrderFn = useServerFn(createOrderFromProposal);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  // Marcar como vista al renderizar para el viajero (idempotente, server-side)
  if (!internal && p.status === "sent") {
    void viewFn({ data: { proposalId: p.proposal_id } }).catch(() => {});
  }

  return (
    <li
      id={`proposal-${p.proposal_id}`}
      className="scroll-mt-24 rounded-md border border-border bg-card p-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          Propuesta v{p.version} · {money(p.total_amount_cents, p.currency)}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {labelFor(p.status, PROPOSAL_STATUS_LABELS)}
        </span>
      </div>
      {p.summary ? <p className="mt-1 text-xs text-foreground/80">{p.summary}</p> : null}
      {p.valid_until ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Vigente hasta {new Date(p.valid_until).toLocaleString()}
        </p>
      ) : null}
      {p.items.length > 0 && (
        <ul className="mt-2 grid gap-1 text-xs">
          {p.items.map((it) => (
            <li
              key={it.item_id}
              className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/60 px-2 py-1"
            >
              <span>
                {it.business_name ?? "Empresa"} · {it.request_title}
              </span>
              <span className="font-mono">{money(it.amount_cents, it.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      {p.terms ? (
        <p className="mt-2 whitespace-pre-line text-[11px] text-muted-foreground">{p.terms}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {internal && p.status === "draft" && (
          <ActionButton
            label="Enviar al viajero"
            disabled={busy}
            onClick={() => run(() => sendFn({ data: { proposalId: p.proposal_id } }))}
          />
        )}
        {internal && ["draft", "sent", "viewed"].includes(p.status) && (
          <ActionButton
            label="Retirar"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              run(() => withdrawFn({ data: { proposalId: p.proposal_id, reason: null } }))
            }
          />
        )}
        {!internal && ["sent", "viewed", "accepted"].includes(p.status) && (
          <>
            <ActionButton
              label={p.status === "accepted" ? "Confirmar mi viaje" : "Confirmar mi viaje"}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  // Marca aceptada en el dominio concierge (idempotente)
                  if (p.status !== "accepted") {
                    await acceptFn({ data: { proposalId: p.proposal_id } });
                  }
                  const { orderId } = await createOrderFn({
                    data: { proposalId: p.proposal_id },
                  });
                  await router.invalidate();
                  navigate({
                    to: "/cuenta/checkout/$orderId",
                    params: { orderId },
                  });
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "No se pudo abrir la confirmación del viaje",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            {p.status !== "accepted" ? (
              <ActionButton
                label="Rechazar"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(() => rejectFn({ data: { proposalId: p.proposal_id, reason: null } }))
                }
              />
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

function ProposalCompare({
  proposals,
  internal,
}: {
  proposals: NonNullable<CaseFile["proposals"]>;
  internal: boolean;
}) {
  const ordered = [...proposals].sort((a, b) => b.version - a.version);
  const statusTone = (s: string) =>
    s === "accepted"
      ? "bg-success/10 text-success"
      : s === "sent" || s === "viewed"
        ? "bg-primary/10 text-primary"
        : "bg-muted text-muted-foreground";
  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-2">
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${ordered.length}, minmax(240px, 1fr))`,
        }}
      >
        {ordered.map((p) => (
          <article
            key={p.proposal_id}
            id={`proposal-${p.proposal_id}`}
            className="scroll-mt-24 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs"
          >
            <header className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">v{p.version}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusTone(p.status)}`}
              >
                {labelFor(p.status, PROPOSAL_STATUS_LABELS)}
              </span>
            </header>
            <div className="text-base font-semibold text-foreground">
              {money(p.total_amount_cents, p.currency)}
            </div>
            {p.valid_until ? (
              <p className="text-[10px] text-muted-foreground">
                Vigente hasta {new Date(p.valid_until).toLocaleDateString("es-MX")}
              </p>
            ) : null}
            {p.summary ? (
              <p className="line-clamp-3 text-[11px] text-foreground/80">{p.summary}</p>
            ) : null}
            <div className="mt-1 border-t border-border/60 pt-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Incluye
              </p>
              {p.items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Sin partidas.</p>
              ) : (
                <ul className="grid gap-1">
                  {p.items.map((it) => (
                    <li key={it.item_id} className="flex justify-between gap-2">
                      <span className="truncate text-foreground/80">
                        {it.business_name ?? "Empresa"} · {it.request_title}
                      </span>
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {money(it.amount_cents, it.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <a
              href={`#proposal-${p.proposal_id}`}
              className="mt-auto text-[11px] font-medium text-primary hover:underline"
            >
              Ver detalle y acciones →
            </a>
          </article>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {internal
          ? "Vista comparativa · sólo lectura. Usa la lista para enviar o retirar."
          : "Vista comparativa · toca una propuesta para confirmar o rechazar."}
      </p>
    </div>
  );
}

interface ManualLine {
  key: string;
  title: string;
  amount: string;
  notes: string;
}

function ProposalComposer({
  caseId,
  quotes,
}: {
  caseId: string;
  quotes: NonNullable<CaseFile["quotes"]>;
}) {
  const router = useRouter();
  const createFn = useServerFn(createConciergeProposal);
  const submittable = quotes.filter((q) => q.status === "submitted");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [manual, setManual] = useState<ManualLine[]>([]);
  const [summary, setSummary] = useState("");
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedQuotes = submittable.filter((quote) => selected[quote.quote_id]);

  const manualValid = manual.filter(
    (line) => line.title.trim().length >= 3 && Number(line.amount) >= 0 && line.amount !== "",
  );
  const manualTotalCents = manualValid.reduce(
    (sum, line) => sum + Math.round(Number(line.amount) * 100),
    0,
  );
  const selectedTotal =
    selectedQuotes.reduce((sum, quote) => sum + (quote.total_amount_cents ?? 0), 0) +
    manualTotalCents;
  const totalLines = selectedQuotes.length + manualValid.length;

  function updateManual(key: string, patch: Partial<ManualLine>) {
    setManual((lines) => lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function onCreate() {
    const items: Array<Record<string, unknown>> = [
      ...selectedQuotes.map((quote) => ({ quote_id: quote.quote_id })),
      ...manualValid.map((line) => ({
        title: line.title.trim(),
        amount_cents: Math.round(Number(line.amount) * 100),
        currency: "MXN",
        notes: line.notes.trim() || null,
      })),
    ];
    if (items.length === 0) return;
    setBusy(true);
    try {
      await createFn({
        data: {
          caseId,
          items,
          summary: summary.trim() || null,
          terms: terms.trim() || null,
          validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
        },
      });
      setSelected({});
      setManual([]);
      setSummary("");
      setTerms("");
      setValidUntil("");
      toast.success("Borrador de propuesta creado. Revísalo antes de enviarlo al viajero.");
      await router.invalidate();
    } catch (error) {
      toast.error("No fue posible crear el borrador", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-dashed border-border bg-card/40 p-3 text-xs">
      <p className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">
        Preparar propuesta final para el viajero
      </p>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Puedes incluir dos tipos de partidas: las cotizaciones que respondieron las empresas y
        partidas escritas por ti con precios que ya tienes acordados con el proveedor. Sólo necesitas
        pedir cotización a una empresa cuando el viajero solicite algo especial.
      </p>

      <p className="mb-1 font-medium text-foreground">Cotizaciones recibidas de empresas</p>
      {submittable.length === 0 ? (
        <p className="rounded-md border border-border/70 bg-background/70 p-2 leading-relaxed text-muted-foreground">
          Todavía no hay cotizaciones recibidas. Si necesitas el precio de una empresa, solicítala en
          el apartado &quot;Qué solicita el viajero&quot;. Si ya tienes el precio acordado, agrega la
          partida tú mismo aquí abajo.
        </p>
      ) : (
        <ul className="grid gap-1">
          {submittable.map((q) => (
            <li key={q.quote_id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!selected[q.quote_id]}
                onChange={(e) => setSelected((s) => ({ ...s, [q.quote_id]: e.target.checked }))}
              />
              <span className="flex-1">
                {q.business_name ?? "Empresa"} · {q.request_title} ·{" "}
                {money(q.total_amount_cents, q.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mb-1 mt-4 font-medium text-foreground">Partidas propias del Concierge</p>
      {manual.length === 0 ? (
        <p className="leading-relaxed text-muted-foreground">
          Ejemplo: &quot;Tour a Ek Balam con transporte y guía&quot; con el precio que ya tienes
          acordado.
        </p>
      ) : null}
      <ul className="grid gap-2">
        {manual.map((line) => (
          <li key={line.key} className="rounded-md border border-border/70 bg-background/70 p-2">
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[180px] flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs"
                placeholder="Concepto (ej. Tour a Ek Balam)"
                maxLength={200}
                value={line.title}
                onChange={(e) => updateManual(line.key, { title: e.target.value })}
              />
              <input
                className="w-32 rounded border border-border bg-background px-2 py-1.5 text-xs"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Precio MXN"
                value={line.amount}
                onChange={(e) => updateManual(line.key, { amount: e.target.value })}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setManual((lines) => lines.filter((l) => l.key !== line.key))}
              >
                Quitar
              </Button>
            </div>
            <textarea
              className="mt-2 w-full rounded border border-border bg-background p-2 text-xs"
              rows={2}
              maxLength={1000}
              placeholder="Descripción para el viajero: qué incluye, horarios, condiciones"
              value={line.notes}
              onChange={(e) => updateManual(line.key, { notes: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() =>
          setManual((lines) => [
            ...lines,
            {
              key: `m-${Date.now()}-${lines.length}`,
              title: "",
              amount: "",
              notes: "",
            },
          ])
        }
      >
        Agregar partida propia
      </Button>

      <p className="mt-3 border-t border-border/60 pt-3 text-sm font-semibold">
        Total seleccionado: {money(selectedTotal, selectedQuotes[0]?.currency ?? "MXN")}
      </p>
      <textarea
        className="mt-2 w-full rounded border border-border bg-background p-2 text-xs"
        rows={2}
        maxLength={1000}
        placeholder="Explica al viajero qué incluye esta propuesta"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <textarea
        className="mt-2 w-full rounded border border-border bg-background p-2 text-xs"
        rows={3}
        maxLength={4000}
        placeholder="Condiciones, cambios y consideraciones"
        value={terms}
        onChange={(e) => setTerms(e.target.value)}
      />
      <label className="mt-2 grid max-w-xs gap-1 text-xs font-medium text-muted-foreground">
        Vigencia de la propuesta
        <input
          type="date"
          value={validUntil}
          onChange={(event) => setValidUntil(event.target.value)}
          className="h-10 rounded border border-border bg-background px-2 text-foreground"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {totalLines === 0 ? (
          <p className="mr-auto max-w-md leading-relaxed text-muted-foreground">
            Agrega al menos una partida: marca una cotización recibida o escribe una partida propia
            con su concepto y precio.
          </p>
        ) : null}
        <ActionButton label="Crear borrador" disabled={busy || totalLines === 0} onClick={onCreate} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant === "primary" ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

function readableConciergeError(error: unknown, action: "assign" | "quote") {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("forbidden")) {
    return action === "assign"
      ? "Tu perfil actual no puede tomar expedientes. Entra con un perfil Concierge, Concierge Lead o Administrador."
      : "No tienes permiso para solicitar esta cotización desde el perfil actual.";
  }
  if (message.includes("already") || message.includes("duplicate") || message.includes("unique")) {
    return "Esta solicitud ya tiene una cotización en curso.";
  }
  return action === "assign"
    ? "No fue posible asignarte el expediente. Intenta nuevamente."
    : "No fue posible solicitar la cotización. Intenta nuevamente.";
}

function RequestCard({
  request,
  f,
  internal,
}: {
  request: CaseFile["requests"][number];
  f: CaseFile;
  internal: boolean;
}) {
  const queryClient = useQueryClient();
  const requestQuote = useServerFn(requestConciergeQuote);
  const [busy, setBusy] = useState(false);
  const quote = f.quotes?.find((item) => item.request_id === request.id);
  const canRequestQuote = internal && request.business_id && !quote;

  async function onRequestQuote() {
    if (!request.business_id) return;
    setBusy(true);
    try {
      await requestQuote({
        data: { requestId: request.id, businessId: request.business_id, validForHours: 72 },
      });
      await queryClient.invalidateQueries({ queryKey: ["concierge", "case-file", f.case.id] });
      toast.success("Solicitud enviada a la empresa. Te avisaremos cuando responda.");
    } catch (error) {
      toast.error(readableConciergeError(error, "quote"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-md border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{request.title}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {quote
            ? labelFor(quote.status, QUOTE_STATUS_LABELS)
            : labelFor(request.status, REQUEST_STATUS_LABELS)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {labelFor(request.kind, REQUEST_KIND_LABELS)} · Origen:{" "}
        {labelFor(request.source_type, SOURCE_LABELS)}
      </p>
      {request.notes ? <p className="mt-1 text-xs text-foreground/80">{request.notes}</p> : null}
      {internal ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          {canRequestQuote ? (
            <ActionButton
              label={busy ? "Enviando…" : "Solicitar cotización"}
              onClick={onRequestQuote}
              disabled={busy}
            />
          ) : quote ? (
            <p className="text-xs text-muted-foreground">
              {quote.status === "submitted"
                ? "La empresa respondió. Ya puedes incluir esta cotización en una propuesta."
                : "Solicitud enviada a la empresa; esperando su respuesta."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Este elemento no tiene una empresa vinculada; no requiere cotización empresarial.
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}

/* ============================================================
 * 14.60.5 — SLA + Asignaciones (sólo visible a internos)
 * ============================================================ */
function SlaAssignmentPanel({ f }: { f: CaseFile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const assignFn = useServerFn(assignSelfConciergeCase);
  const releaseFn = useServerFn(releaseConciergeCase);
  const setPriorityFn = useServerFn(setConciergeCasePriority);
  const [busy, setBusy] = useState(false);

  const sla = f.sla ?? null;
  const assignment = f.assignment ?? null;
  const viewerId = f.viewer.user_id;
  const isAssignedToMe = assignment?.concierge_user_id === viewerId;

  const slaBadge =
    sla?.sla_status === "overdue"
      ? "bg-destructive/15 text-destructive"
      : sla?.sla_status === "due_soon"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : sla?.sla_status === "on_time"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground";

  async function doAssignSelf() {
    setBusy(true);
    try {
      await assignFn({ data: { caseId: f.case.id } });
      await queryClient.invalidateQueries({ queryKey: ["concierge", "case-file", f.case.id] });
      await queryClient.invalidateQueries({ queryKey: ["concierge", "cases-ext"] });
      await router.invalidate();
      toast.success("El expediente quedó asignado a ti.");
    } catch (error) {
      toast.error(readableConciergeError(error, "assign"));
    } finally {
      setBusy(false);
    }
  }
  async function doRelease() {
    setBusy(true);
    try {
      await releaseFn({ data: { caseId: f.case.id } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }
  async function changePriority(p: "low" | "normal" | "high" | "urgent") {
    setBusy(true);
    try {
      await setPriorityFn({ data: { caseId: f.case.id, priority: p, source: "manual" } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${slaBadge}`}>
            Tiempo de respuesta · {labelFor(sla?.sla_status, SLA_STATUS_LABELS)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            Prioridad:{" "}
            <strong className="text-foreground">
              {labelFor(f.case.priority, PRIORITY_LABELS)}
            </strong>
            {f.case.priority_source
              ? ` · ${labelFor(f.case.priority_source, PRIORITY_SOURCE_LABELS)}`
              : ""}
          </span>
          {sla?.target_response_at && (
            <span className="text-muted-foreground">
              Objetivo: {new Date(sla.target_response_at).toLocaleString()}
            </span>
          )}
          {sla?.last_activity_at && (
            <span className="text-muted-foreground">
              Última actividad: {new Date(sla.last_activity_at).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!assignment && <ActionButton label="Asignarme" onClick={doAssignSelf} disabled={busy} />}
          {assignment && isAssignedToMe && (
            <ActionButton label="Liberar" variant="ghost" onClick={doRelease} disabled={busy} />
          )}
          {assignment && !isAssignedToMe && (
            <span className="text-xs text-muted-foreground">Asignado a otro concierge</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Cambiar prioridad:</span>
        {(["low", "normal", "high", "urgent"] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy || p === f.case.priority}
            onClick={() => changePriority(p)}
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
 * 14.60.6 — Asistente Alux (read-only, sólo internos)
 * ============================================================ */

/* ============================================================
 * CV2.1 — Handoff Context (fotografía del viajero al promover el plan)
 * ============================================================ */
type HandoffPayload = {
  version?: string;
  generated_at?: string;
  source?: string;
  profile?: Record<string, unknown> | null;
  active_coupons?: Array<Record<string, unknown>>;
  territorial_memory?: Record<string, unknown> | null;
  plan_snapshot?: {
    item_count?: number;
    items?: Array<{
      kind?: string;
      title?: string | null;
      slug?: string | null;
      subtitle?: string | null;
    }>;
  } | null;
};

function HandoffContextCard({ caseId }: { caseId: string }) {
  const fetchFn = useServerFn(getConciergeCaseHandoffContext);
  const [payload, setPayload] = useState<HandoffPayload | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchFn({ data: { caseId } })
      .then((raw) => {
        if (!alive) return;
        if (!raw) {
          setState("empty");
          return;
        }
        // La operación oficial devuelve un sobre
        // { event_id, occurred_at, payload }. Aceptamos ambas formas.
        const envelope = raw as { payload?: unknown; occurred_at?: string };
        const inner =
          envelope && typeof envelope === "object" && envelope.payload
            ? (envelope.payload as HandoffPayload)
            : (raw as HandoffPayload);
        if (!inner || Object.keys(inner).length === 0) {
          setState("empty");
          return;
        }
        setPayload({
          ...inner,
          generated_at: inner.generated_at ?? envelope?.occurred_at,
        });
        setState("idle");
      })
      .catch((e) => {
        if (!alive) return;
        console.error("No se pudo cargar el contexto del viajero", e);
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [caseId, fetchFn]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Contexto del viajero (Alux)</h3>
          <p className="text-[11px] text-muted-foreground">
            Información disponible cuando el viajero envió su selección al Concierge.
          </p>
        </div>
        {payload?.generated_at && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {new Date(payload.generated_at).toLocaleString()}
          </span>
        )}
      </header>

      {state === "loading" && (
        <p className="mt-3 text-xs text-muted-foreground">Cargando contexto…</p>
      )}
      {state === "empty" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sin fotografía adjunta todavía. Se capturará automáticamente al promover el plan del
          viajero.
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          No pudimos cargar la información del viajero. Intenta de nuevo en un momento.
        </p>
      )}

      {state === "idle" && payload && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <HandoffBlock title="Perfil del viajero">
            {payload.profile ? (
              <ProfileSummary profile={payload.profile} />
            ) : (
              <Empty>El viajero todavía no ha compartido preferencias personales.</Empty>
            )}
          </HandoffBlock>

          <HandoffBlock title={`Cupones activos (${payload.active_coupons?.length ?? 0})`}>
            {payload.active_coupons && payload.active_coupons.length > 0 ? (
              <ul className="grid gap-1 text-xs">
                {payload.active_coupons.slice(0, 6).map((c, i) => (
                  <li key={i} className="truncate">
                    · {(c.code as string) ?? (c.id as string) ?? "cupón"}
                    {c.business_name ? ` — ${c.business_name as string}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Sin cupones vigentes.</Empty>
            )}
          </HandoffBlock>

          <HandoffBlock
            title={`Experiencias guardadas (${payload.plan_snapshot?.item_count ?? 0})`}
          >
            {payload.plan_snapshot?.items && payload.plan_snapshot.items.length > 0 ? (
              <ul className="grid gap-1 text-xs">
                {payload.plan_snapshot.items.slice(0, 8).map((it, i) => (
                  <li key={i} className="truncate">
                    <span className="text-muted-foreground">
                      {labelFor(it.kind, ITEM_KIND_LABELS)}:
                    </span>{" "}
                    {it.title ?? it.subtitle ?? it.slug ?? "Sin nombre"}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No había experiencias guardadas cuando se envió el viaje.</Empty>
            )}
          </HandoffBlock>

          <HandoffBlock title="Memoria territorial">
            <TerritorialMemory memory={payload.territorial_memory ?? null} />
          </HandoffBlock>
        </div>
      )}
    </section>
  );
}

function HandoffBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-md border border-dashed border-border bg-background/60 p-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h4>
      {children}
    </article>
  );
}

/**
 * Presentación legible de la memoria territorial capturada por Alux:
 * destinos y categorías consultados por el viajero antes del envío,
 * más el resumen narrativo. Sin claves internas ni datos crudos.
 */
function TerritorialMemory({ memory }: { memory: Record<string, unknown> | null }) {
  if (!memory) {
    return <Empty>Aún no hay destinos o lugares consultados para orientar la atención.</Empty>;
  }
  const nameOf = (v: unknown): string => {
    if (typeof v === "string") return humanizeKey(v);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const raw = (o.label as string) || (o.slug as string) || "";
      const count = typeof o.count === "number" && o.count > 1 ? ` (${o.count})` : "";
      return raw ? `${humanizeKey(raw)}${count}` : "";
    }
    return "";
  };
  const destinations = Array.isArray(memory.visited_destinations)
    ? (memory.visited_destinations as unknown[]).map(nameOf).filter(Boolean)
    : [];
  const categories = Array.isArray(memory.visited_categories)
    ? (memory.visited_categories as unknown[]).map(nameOf).filter(Boolean)
    : [];
  const lastDestination =
    typeof memory.last_destination_slug === "string"
      ? humanizeKey(memory.last_destination_slug)
      : null;
  const summary = typeof memory.summary === "string" ? memory.summary.trim() : "";
  const summaryLines = summary
    .split("\n")
    .map((line) => line.replace(/^·\s*/, "").trim())
    .filter(Boolean);

  if (destinations.length === 0 && categories.length === 0 && summaryLines.length === 0) {
    return <Empty>Aún no hay destinos o lugares consultados para orientar la atención.</Empty>;
  }

  return (
    <div className="grid gap-2 text-xs">
      {destinations.length > 0 ? (
        <div className="grid gap-1">
          <span className="text-muted-foreground">Destinos que consultó</span>
          <div className="flex flex-wrap gap-1">
            {destinations.map((d) => (
              <span key={d} className="rounded-full bg-muted px-2 py-0.5 text-foreground/90">
                {d}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {categories.length > 0 ? (
        <div className="grid gap-1">
          <span className="text-muted-foreground">Qué estuvo buscando</span>
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-foreground/90">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {lastDestination ? (
        <p className="text-foreground/90">
          <span className="text-muted-foreground">Último destino consultado: </span>
          {lastDestination}
        </p>
      ) : null}
      {summaryLines.length > 0 ? (
        <div className="grid gap-1 border-t border-border/60 pt-2">
          <span className="text-muted-foreground">Lo que Alux entendió del viajero</span>
          <ul className="grid gap-1">
            {summaryLines.map((line, i) => (
              <li key={i} className="text-foreground/90">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProfileSummary({ profile }: { profile: Record<string, unknown> }) {
  const all: Array<[string, unknown]> = [
    ["Idioma", profile.preferred_language],
    ["País de origen", profile.home_country],
    ["Estilo de viaje", profile.travel_style ?? profile.travel_style_tags],
    ["Presupuesto", profile.budget_band ?? profile.budget_range],
    ["Dieta", profile.dietary ?? profile.dietary_restrictions],
    ["Accesibilidad", profile.accessibility ?? profile.accessibility_needs],
    ["Idiomas que habla", profile.languages],
    ["Intereses", profile.interests],
    ["Acompañantes", profile.travel_party],
  ];
  const rows = all.filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  if (rows.length === 0) return <Empty>El viajero todavía no ha indicado sus preferencias.</Empty>;
  return (
    <dl className="grid gap-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="min-w-[80px] text-muted-foreground">{k}</dt>
          <dd className="flex-1 truncate text-foreground/90">{readableValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

type AluxState = Partial<Record<AluxCapability, AluxSuggestion>>;

const ALUX_LABELS: Record<AluxCapability, string> = {
  summary: "Resumir expediente",
  products: "Sugerir productos",
  proposal_draft: "Borrador de propuesta",
  comms_digest: "Resumen de comunicaciones",
  risk_detection: "Detectar riesgos",
  opportunity_detection: "Detectar oportunidades",
};

function AluxAssistantPanel({ caseId }: { caseId: string }) {
  const summaryFn = useServerFn(generateAluxSummary);
  const productsFn = useServerFn(generateAluxProducts);
  const draftFn = useServerFn(generateAluxProposalDraft);
  const commsFn = useServerFn(generateAluxCommsDigest);
  const riskFn = useServerFn(generateAluxRiskDetection);
  const oppFn = useServerFn(generateAluxOpportunityDetection);

  const [results, setResults] = useState<AluxState>({});
  const [busy, setBusy] = useState<AluxCapability | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(cap: AluxCapability) {
    setBusy(cap);
    setError(null);
    try {
      let res: AluxSuggestion;
      switch (cap) {
        case "summary":
          res = await summaryFn({ data: { caseId } });
          break;
        case "products":
          res = await productsFn({ data: { caseId } });
          break;
        case "proposal_draft":
          res = await draftFn({ data: { caseId, productIds: [] } });
          break;
        case "comms_digest":
          res = await commsFn({ data: { caseId } });
          break;
        case "risk_detection":
          res = await riskFn({ data: { caseId } });
          break;
        case "opportunity_detection":
          res = await oppFn({ data: { caseId } });
          break;
      }
      setResults((s) => ({ ...s, [cap]: res }));
    } catch (e) {
      console.error("No se pudo generar la sugerencia de Alux", e);
      setError("Alux no pudo preparar esta lectura. Intenta de nuevo en un momento.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Asistente Alux</h3>
          <p className="text-[11px] text-muted-foreground">
            Alux interpreta la información disponible; tú revisas y decides cada acción.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Solo sugerencias
        </span>
      </header>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(ALUX_LABELS) as AluxCapability[]).map((cap) => (
          <button
            key={cap}
            type="button"
            disabled={busy !== null}
            onClick={() => run(cap)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {busy === cap ? "Generando…" : ALUX_LABELS[cap]}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {(Object.keys(results) as AluxCapability[]).map((cap) => {
          const r = results[cap]!;
          return (
            <article
              key={cap}
              className="rounded-md border border-dashed border-border bg-background/60 p-3"
            >
              <header className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide text-foreground">
                  {ALUX_LABELS[cap]}
                </span>
                <span title={`${r.model} · ${r.latency_ms} ms`}>Generado por Alux</span>
              </header>
              <AluxReadableText text={r.text} />
              <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span>{r.disclaimer}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(r.text)}
                  className="rounded border border-border bg-card px-2 py-0.5 hover:bg-muted"
                >
                  Copiar
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AluxReadableText({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div className="grid gap-1.5 text-xs leading-relaxed text-foreground/90">
      {lines.map((line, index) => {
        const cleaned = line
          .replace(/^#{1,6}\s*/, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/`([^`]+)`/g, "$1");
        const isBullet = /^[-*•]\s+/.test(cleaned);
        const isNumbered = /^\d+[.)]\s+/.test(cleaned);
        const content = cleaned.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
        return (
          <p
            key={`${index}-${line.slice(0, 12)}`}
            className={isBullet || isNumbered ? "pl-4" : undefined}
          >
            {isBullet ? "• " : isNumbered ? `${cleaned.match(/^\d+/)?.[0]}. ` : ""}
            {content}
          </p>
        );
      })}
    </div>
  );
}
