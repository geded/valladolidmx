/**
 * /cuenta/mi-viaje — Workspace del Viajero (Iniciativa 7 · Sub-ola D).
 *
 * Convierte "Mi Viaje" en el expediente real del turista sobre el
 * Travel Workspace. Toda operación pasa por travel-plans.functions.ts
 * (Sub-ola B); ninguna UI escribe directo a la BD.
 *
 * Alcance v1:
 *  - Lectura del plan activo (getMyActivePlan).
 *  - Editor de metadatos del plan (título, fechas, party_size, notas).
 *  - Items agrupados por kind (destinos, empresas, productos, eventos, notas).
 *  - Eliminar item, editar notas del item.
 *  - Migración de cola de invitados (localStorage → plan activo).
 *  - Envío al Concierge sin cambiar la lógica del módulo (Sub-ola E).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, Save, Users, Calendar, MapPin, Building2, ShoppingBag, Ticket, StickyNote, Plus, Share2, Copy, ExternalLink, Printer, Headset, CheckCircle2, Circle, Bell, MessageCircle, LayoutDashboard, Route as RouteIcon, ReceiptText, Sparkles as SparklesIcon, FileText, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  addPlanItem,
  disableShareLink,
  enableShareLink,
  getMyActivePlan,
  promotePlanToCase,
  removePlanItem,
  reorderPlanItems,
  updatePlanItem,
  updatePlanMeta,
  type TravelItemKind,
  type TravelPlanItem,
  type TravelPlanWithItems,
} from "@/lib/traveler/travel-plans.functions";
import { getAluxConciergeContext } from "@/lib/alux/concierge-context.functions";
import { getMyConfirmedTravel } from "@/lib/concierge/orders.functions";
import {
  clearGuestQueue,
  readGuestQueue,
  type GuestQueueItem,
} from "@/lib/traveler/guest-queue";
import { ccListMyCases, ccTimelineAppend } from "@/lib/concierge/cc.functions";
import { getConciergeCaseFile } from "@/lib/concierge/concierge.functions";
import { CaseFileView } from "@/components/concierge/CaseFileView";
import { AluxTravelerPanel } from "@/components/traveler/AluxTravelerPanel";
import { AluxPlanProposalsInbox } from "@/components/traveler/AluxPlanProposalsInbox";
import { CalendarCheck, Sparkles } from "lucide-react";
import { getPlanItemsGeo } from "@/lib/traveler/travel-plan-geo.functions";
import { optimizePlanDay } from "@/lib/traveler/travel-plan-optimize.functions";
import { InteractiveMap } from "@/components/maps/InteractiveMap";
import { List, Clock, Map as MapIcon, ChevronUp, ChevronDown, Wand2 } from "lucide-react";
import { ReservationsList } from "@/components/traveler/ReservationsList";
import { TravelDocumentsList } from "@/components/traveler/TravelDocumentsList";
import { MemoriesSection } from "@/components/traveler/MemoriesSection";
import { DayWeatherChip } from "@/components/traveler/DayWeatherChip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  WorkspaceOnboardingTour,
  openWorkspaceTour,
} from "@/components/traveler/WorkspaceOnboardingTour";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cuenta/mi-viaje")({
  validateSearch: (
    raw: Record<string, unknown>,
  ): { vista?: MiViajeVista; focus?: string } => {
    const v = raw.vista;
    const f = raw.focus;
    const out: { vista?: MiViajeVista; focus?: string } = {};
    if (typeof v === "string" && (V_KEYS as readonly string[]).includes(v))
      out.vista = v as MiViajeVista;
    if (typeof f === "string" && f.length > 0 && f.length < 128) out.focus = f;
    return out;
  },
  component: MiViajePage,
});

/* ------------------------------------------------------------------ */
/* CV5.1 · Mi Viaje Workspace de vistas (Founder Travel Companion)     */
/* ------------------------------------------------------------------ */

const V_KEYS = [
  "resumen",
  "itinerario",
  "reservas",
  "concierge",
  "alux",
  "documentos",
  "recuerdos",
] as const;
export type MiViajeVista = (typeof V_KEYS)[number];

/** Fase macro derivada del plan + orden confirmada. NO se persiste. */
export type TravelCompanionPhase = "planning" | "confirmed" | "onsite" | "post";

function deriveCompanionPhase(
  confirmed: { days_to_trip: number | null; plan_end_date: string | null } | null | undefined,
): TravelCompanionPhase {
  if (!confirmed) return "planning";
  const d = confirmed.days_to_trip;
  if (typeof d === "number" && d > 0) return "confirmed";
  if (confirmed.plan_end_date) {
    const end = new Date(`${confirmed.plan_end_date}T23:59:59Z`).getTime();
    if (Date.now() <= end) return "onsite";
    return "post";
  }
  return typeof d === "number" && d === 0 ? "onsite" : "confirmed";
}

const PHASE_LABEL: Record<TravelCompanionPhase, string> = {
  planning: "Planeando",
  confirmed: "Viaje confirmado",
  onsite: "En viaje",
  post: "Después del viaje",
};

const VISTA_META: Record<
  MiViajeVista,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  resumen: { label: "Resumen", icon: LayoutDashboard },
  itinerario: { label: "Itinerario", icon: RouteIcon },
  reservas: { label: "Reservas", icon: ReceiptText },
  concierge: { label: "Concierge", icon: Headset },
  alux: { label: "Alux", icon: SparklesIcon },
  documentos: { label: "Documentos", icon: FileText },
  recuerdos: { label: "Recuerdos", icon: Heart },
};

/**
 * Orden sugerido de vistas por fase. La vista destacada aparece primero.
 * Vinculante con Founder Travel Companion Principle.
 */
const PHASE_VISTA_ORDER: Record<TravelCompanionPhase, MiViajeVista[]> = {
  planning: ["resumen", "itinerario", "alux", "concierge", "reservas", "documentos", "recuerdos"],
  confirmed: ["resumen", "reservas", "itinerario", "documentos", "concierge", "alux", "recuerdos"],
  onsite: ["itinerario", "alux", "concierge", "reservas", "documentos", "resumen", "recuerdos"],
  post: ["recuerdos", "resumen", "reservas", "documentos", "itinerario", "concierge", "alux"],
};

const KIND_META: Record<
  TravelItemKind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  destination: { label: "Destinos", icon: MapPin },
  business: { label: "Empresas", icon: Building2 },
  product: { label: "Productos", icon: ShoppingBag },
  event: { label: "Eventos", icon: Ticket },
  note: { label: "Notas", icon: StickyNote },
};
const KIND_ORDER: TravelItemKind[] = ["destination", "business", "product", "event", "note"];

function MiViajePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fetchActive = useServerFn(getMyActivePlan);
  const fetchCases = useServerFn(ccListMyCases);
  const fetchConcierge = useServerFn(getAluxConciergeContext);
  const fetchConfirmed = useServerFn(getMyConfirmedTravel);

  const activeQ = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    staleTime: 15_000,
  });
  const { data: cases = [] } = useQuery({
    queryKey: ["cc", "my-cases"],
    queryFn: () => fetchCases(),
    staleTime: 30_000,
  });
  const { data: concierge } = useQuery({
    queryKey: ["alux", "concierge-ctx", user?.id],
    queryFn: () => fetchConcierge(),
    staleTime: 30_000,
  });
  const { data: confirmed } = useQuery({
    queryKey: ["traveler", "confirmed-travel", user?.id],
    queryFn: () => fetchConfirmed(),
    staleTime: 30_000,
  });
  // CV5.9 · Propuestas pendientes por confirmar (badge + spotlight).
  const fetchCaseFile = useServerFn(getConciergeCaseFile);
  const activeCaseId = activeQ.data?.plan.case_id ?? null;
  const { data: caseFile } = useQuery({
    queryKey: ["concierge", "case-file", "traveler", activeCaseId],
    queryFn: () => fetchCaseFile({ data: { caseId: activeCaseId! } }),
    enabled: !!activeCaseId,
    staleTime: 30_000,
  });
  const pendingProposalsCount = useMemo(() => {
    const cf = caseFile as { proposals?: Array<{ status?: string }> } | undefined;
    return (cf?.proposals ?? []).filter(
      (p) => p.status === "sent" || p.status === "viewed",
    ).length;
  }, [caseFile]);
  // CV5.10 v2 · id de la primera propuesta pendiente para deep-link.
  const firstPendingProposalId = useMemo(() => {
    const cf = caseFile as
      | { proposals?: Array<{ proposal_id: string; status?: string }> }
      | undefined;
    return (
      (cf?.proposals ?? []).find(
        (p) => p.status === "sent" || p.status === "viewed",
      )?.proposal_id ?? null
    );
  }, [caseFile]);
  // CV5.10 · Último evento del expediente que no venga del propio viajero.
  const latestConciergeEvent = useMemo(() => {
    const cf = caseFile as
      | { timeline?: Array<{ event_type?: string; summary?: string; created_at?: string }> }
      | undefined;
    const events = cf?.timeline ?? [];
    const filtered = events.filter(
      (e) => e.event_type && e.event_type !== "traveler_note",
    );
    return filtered[0] ?? null;
  }, [caseFile]);
  const reservedIds = useMemo(() => {
    const s = new Set<string>();
    if (!concierge?.has_concierge) return s;
    for (const arr of [
      concierge.reserved_business_ids,
      concierge.reserved_product_ids,
      concierge.reserved_event_ids,
      concierge.reserved_destination_ids,
    ]) {
      for (const id of arr) s.add(id);
    }
    return s;
  }, [concierge]);

  const invalidatePlan = () =>
    {
      qc.invalidateQueries({ queryKey: ["traveler", "active-plan", user?.id] });
      // A15 · notifica al Concierge para refrescar snapshot inmediato.
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged("mi-viaje"),
      );
    };

  const search = useSearch({ from: Route.id });
  const activeConfirmed =
    confirmed && confirmed.status !== "refunded" ? confirmed : null;
  const phase = deriveCompanionPhase(activeConfirmed);
  const vista: MiViajeVista = search.vista ?? PHASE_VISTA_ORDER[phase][0];

  return (
    <div className="max-w-5xl space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {PHASE_LABEL[phase]}
          </span>
          {activeConfirmed?.folio ? (
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              {activeConfirmed.folio}
            </span>
          ) : null}
          <div className="ml-auto">
            <TravelNotificationsBell
              pendingProposals={pendingProposalsCount}
              confirmed={activeConfirmed}
              latestConciergeEvent={latestConciergeEvent}
              firstPendingProposalId={firstPendingProposalId}
            />
          </div>
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Mi Viaje</h1>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Tu compañero digital del Oriente Maya de Yucatán — antes, durante y
            después de tu visita. Todas las vistas comparten el mismo viaje.
          </p>
          <button
            type="button"
            onClick={openWorkspaceTour}
            aria-label="Cómo funciona Mi Viaje"
            title="Cómo funciona Mi Viaje"
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      <MiViajeVistaTabs
        current={vista}
        phase={phase}
        concierge_badge={pendingProposalsCount}
      />

      <WorkspaceOnboardingTour userId={user?.id ?? null} />

      {pendingProposalsCount > 0 && vista !== "concierge" ? (
        <PendingProposalsSpotlight count={pendingProposalsCount} />
      ) : null}

      <GuestImportBanner onImported={invalidatePlan} />

      {activeQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tu plan…</p>
      ) : !activeQ.data ? (
        <p className="text-sm text-destructive">
          No pudimos cargar tu plan. Recarga la página.
        </p>
      ) : (
        <MiViajeVistaBody
          vista={vista}
          plan={activeQ.data}
          confirmed={activeConfirmed}
          cases={cases}
          reservedIds={reservedIds}
          phase={phase}
          onChanged={invalidatePlan}
          focus={search.focus}
        />
      )}
    </div>
  );
}

function MiViajeVistaTabs({
  current,
  phase,
  concierge_badge,
}: {
  current: MiViajeVista;
  phase: TravelCompanionPhase;
  concierge_badge?: number;
}) {
  const navigate = useNavigate({ from: Route.fullPath });
  const order = PHASE_VISTA_ORDER[phase];
  const navRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = navRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [current, phase]);
  return (
    <div className="relative">
      <nav
        ref={navRef}
        className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card/40 p-1"
        aria-label="Vistas de Mi Viaje"
      >
      {order.map((key) => {
        const meta = VISTA_META[key];
        const Icon = meta.icon;
        const active = key === current;
        return (
          <button
            key={key}
            type="button"
            onClick={() =>
              navigate({
                search: (prev: { vista?: MiViajeVista }) => ({
                  ...prev,
                  vista: key === "resumen" ? undefined : key,
                }),
                replace: true,
                resetScroll: false,
              })
            }
            aria-pressed={active}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" aria-hidden />
            {meta.label}
            {key === "concierge" && concierge_badge && concierge_badge > 0 ? (
              <span
                className={`ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-4 ${
                  active
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary text-primary-foreground"
                }`}
                aria-label={`${concierge_badge} propuesta(s) pendiente(s)`}
              >
                {concierge_badge}
              </span>
            ) : null}
          </button>
        );
      })}
      </nav>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-background to-transparent"
      />
    </div>
  );
}

/** CV5.9 · Aviso destacado cuando hay propuestas del Concierge listas para confirmar. */
function PendingProposalsSpotlight({ count }: { count: number }) {
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Bell className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Tu Concierge te envió una propuesta
          </p>
          <h2 className="mt-0.5 font-serif text-base text-foreground">
            {count === 1
              ? "Tienes 1 propuesta lista para confirmar tu viaje"
              : `Tienes ${count} propuestas listas para confirmar tu viaje`}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Revisa lo que armaron para ti y confirma cuando estés listo. Nada se
            cobra sin tu aprobación.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            navigate({
              search: (prev: { vista?: MiViajeVista }) => ({
                ...prev,
                vista: "concierge",
              }),
              replace: true,
              resetScroll: false,
            })
          }
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
        >
          <Headset className="size-3.5" aria-hidden />
          Ver propuestas
        </button>
      </div>
    </section>
  );
}

/**
 * CV5.10 · Centro de avisos del viajero.
 * Reúne en un solo bell las tres señales operativas más importantes:
 * propuestas del Concierge por confirmar, próximo hito del viaje
 * (cuenta regresiva) y última actualización del expediente.
 */
function TravelNotificationsBell({
  pendingProposals,
  confirmed,
  latestConciergeEvent,
  firstPendingProposalId,
}: {
  pendingProposals: number;
  confirmed: { days_to_trip: number | null; folio: string | null } | null;
  latestConciergeEvent: { event_type?: string; summary?: string; created_at?: string } | null;
  firstPendingProposalId: string | null;
}) {
  const navigate = useNavigate({ from: Route.fullPath });
  const daysToTrip = confirmed?.days_to_trip ?? null;
  const tripMilestone =
    daysToTrip !== null && daysToTrip >= 0 && daysToTrip <= 14
      ? daysToTrip
      : null;
  const hasEvent =
    !!latestConciergeEvent &&
    !!latestConciergeEvent.created_at &&
    // sólo si es de los últimos 7 días
    Date.now() - new Date(latestConciergeEvent.created_at).getTime() <
      7 * 86_400_000;

  const count =
    (pendingProposals > 0 ? 1 : 0) +
    (tripMilestone !== null ? 1 : 0) +
    (hasEvent ? 1 : 0);

  const goTo = (vista: MiViajeVista, focus?: string) =>
    navigate({
      search: (prev: { vista?: MiViajeVista; focus?: string }) => ({
        ...prev,
        vista,
        focus: focus ?? undefined,
      }),
      replace: true,
      resetScroll: false,
    });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Avisos (${count})`}
          className="relative inline-flex items-center justify-center rounded-full border border-border/70 bg-background p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" aria-hidden />
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Centro de avisos
          </p>
          <p className="text-sm text-foreground">Novedades de tu viaje</p>
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto text-sm">
          {pendingProposals > 0 ? (
            <li>
              <button
                type="button"
                onClick={() =>
                  goTo(
                    "concierge",
                    firstPendingProposalId
                      ? `proposal:${firstPendingProposalId}`
                      : "proposals",
                  )
                }
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Headset className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {pendingProposals === 1
                      ? "1 propuesta lista para confirmar"
                      : `${pendingProposals} propuestas listas para confirmar`}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Tu concierge armó una propuesta. Nada se cobra sin tu
                    aprobación.
                  </span>
                </span>
              </button>
            </li>
          ) : null}

          {tripMilestone !== null ? (
            <li>
              <button
                type="button"
                onClick={() => goTo("itinerario")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CalendarCheck className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {tripMilestone === 0
                      ? "Tu viaje empieza hoy"
                      : tripMilestone === 1
                        ? "Tu viaje empieza mañana"
                        : `Faltan ${tripMilestone} días para tu viaje`}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {confirmed?.folio ? `Reservación ${confirmed.folio}` : "Revisa tu itinerario del día."}
                  </span>
                </span>
              </button>
            </li>
          ) : null}

          {hasEvent ? (
            <li>
              <button
                type="button"
                onClick={() => goTo("concierge", "timeline")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                  <MessageCircle className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    Nuevo mensaje de tu Concierge
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                    {latestConciergeEvent?.summary ?? "Actualización en tu expediente."}
                  </span>
                </span>
              </button>
            </li>
          ) : null}

          {count === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              Sin avisos pendientes. Sigue armando tu viaje con calma.
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Router de vistas — cada rama compone bloques existentes del mismo Travel Plan. */
function MiViajeVistaBody({
  vista,
  plan,
  confirmed,
  cases,
  reservedIds,
  phase,
  onChanged,
  focus,
}: {
  vista: MiViajeVista;
  plan: TravelPlanWithItems;
  confirmed:
    | (Parameters<typeof ConfirmedTravelBanner>[0]["data"] & {
        order_id: string;
        paid_at: string | null;
        status: string;
        email_t14_sent_at: string | null;
        email_t3_sent_at: string | null;
        email_welcome_sent_at: string | null;
        email_post_sent_at: string | null;
      })
    | null;
  cases: CaseSummary[];
  reservedIds: Set<string>;
  phase: TravelCompanionPhase;
  onChanged: () => void;
  focus?: string;
}) {
  if (vista === "resumen") {
    return (
      <div className="space-y-6">
        {confirmed ? (
          <>
            <ConfirmedTravelBanner data={confirmed} />
            <TripPhaseCard data={confirmed} />
          </>
        ) : null}
        <AluxPlanProposalsInbox onChanged={onChanged} />
        <PlanMetaEditor data={plan} onSaved={onChanged} />
      </div>
    );
  }
  if (vista === "itinerario") {
    return (
      <div className="space-y-6">
        {confirmed ? <ConfirmedTripTimeline data={confirmed} /> : null}
        <ItinerarioViews
          data={plan}
          onChanged={onChanged}
          reservedIds={reservedIds}
        />
      </div>
    );
  }
  if (vista === "reservas") {
    return (
      <div className="space-y-6">
        {confirmed ? (
          <>
            <ConfirmedTravelBanner data={confirmed} />
            <ReservationsList
              orderId={confirmed.order_id}
              folio={confirmed.folio}
            />
          </>
        ) : (
          <VistaEmpty
            title="Aún no tienes reservas confirmadas"
            body="Cuando cierres tu viaje con el Concierge, tus reservas aparecerán aquí."
          />
        )}
        <ShareExportSection data={plan} onChanged={onChanged} />
      </div>
    );
  }
  if (vista === "concierge") {
    return (
      <div className="space-y-6">
        {plan.plan.case_id ? (
          <EmbeddedCaseFile caseId={plan.plan.case_id} focus={focus} />
        ) : null}
        <ConciergeSection data={plan} cases={cases} onChanged={onChanged} />
      </div>
    );
  }
  if (vista === "alux") {
    return (
      <div className="space-y-6">
        <AluxWorkspaceHeader plan={plan} phase={phase} confirmed={confirmed} />
        <AluxPlanProposalsInbox onChanged={onChanged} />
        <AluxTravelerPanel />
      </div>
    );
  }
  if (vista === "documentos") {
    return (
      <div className="space-y-6">
        {confirmed ? (
          <TravelDocumentsList
            orderId={confirmed.order_id}
            folio={confirmed.folio}
            paidAt={confirmed.paid_at ?? null}
          />
        ) : (
          <VistaEmpty
            title="Tus documentos en un solo lugar"
            body="Cuando confirmes tu viaje aparecerán aquí tu voucher y recibo, listos para descargar como PDF."
            icon={FileText}
          />
        )}
      </div>
    );
  }
  // recuerdos
  return (
    <div className="space-y-6">
      <MemoriesSection
        planId={plan.plan.id}
        orderId={confirmed?.order_id ?? null}
      />
    </div>
  );
}

function VistaEmpty({
  title,
  body,
  icon: Icon = Sparkles,
}: {
  title: string;
  body: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
      <Icon className="mx-auto size-6 text-primary" aria-hidden />
      <h2 className="mt-3 font-serif text-lg text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{body}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CV5.8 · Alux vista v2 · Header contextual + quick actions           */
/* ------------------------------------------------------------------ */

function AluxWorkspaceHeader({
  plan,
  phase,
  confirmed,
}: {
  plan: TravelPlanWithItems;
  phase: TravelCompanionPhase;
  confirmed: { folio?: string | null } | null;
}) {
  const p = plan.plan;
  const itemCount = plan.items.length;
  const start = p.start_date ?? null;
  const party = p.party_size ?? null;
  const contextBits: string[] = [];
  if (start) contextBits.push(`Llegada ${new Date(start + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`);
  if (party) contextBits.push(`${party} ${party === 1 ? "viajero" : "viajeros"}`);
  contextBits.push(`${itemCount} ${itemCount === 1 ? "parada" : "paradas"} en el plan`);

  const phasePrompt: Record<TravelCompanionPhase, { title: string; prompt: string; cta: string }> = {
    planning: {
      title: "Estás planeando tu viaje",
      prompt: `Ayúdame a mejorar mi plan actual con ${itemCount} paradas${start ? ` llegando el ${start}` : ""}. Sugiere qué falta y qué reordenar.`,
      cta: "Mejorar mi plan con Alux",
    },
    confirmed: {
      title: "Tu viaje está confirmado",
      prompt: `Mi viaje está confirmado${confirmed?.folio ? ` (${confirmed.folio})` : ""}. Prepárame: qué llevar, clima, ropa y consejos culturales del Oriente Maya.`,
      cta: "Prepararme para el viaje",
    },
    onsite: {
      title: "Estás viviendo el Oriente Maya",
      prompt: "Estoy en Valladolid ahora mismo. ¿Qué me recomiendas hacer hoy cerca de mí y qué debo saber para vivirlo mejor?",
      cta: "¿Qué hago ahora?",
    },
    post: {
      title: "El viaje continúa",
      prompt: "Ya terminé mi viaje al Oriente Maya. Ayúdame a dejar reseñas y a planear mi próxima visita.",
      cta: "Continuar mi historia",
    },
  };
  const meta = phasePrompt[phase];

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <SparklesIcon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Alux · Copiloto de viaje
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">{meta.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {contextBits.join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/alux"
          search={{ prompt: meta.prompt }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {meta.cta}
        </Link>
        <Link
          to="/alux"
          search={{ prompt: `Explícame mi plan actual con ${itemCount} paradas y dime qué mejorarías.` }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          <RouteIcon className="size-3.5" aria-hidden />
          Revisar mi plan
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Alux conoce tu plan, tus reservas y tu momento del viaje. Cada sugerencia
        se puede añadir con un solo toque; nada se agrega sin tu confirmación.
      </p>
    </section>
  );
}

function VistaHint({ label, body }: { label: string; body: string }) {
  return (
    <p className="rounded-lg border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
      <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {label}
      </span>
      {body}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* CV5.1.2 · Itinerario Lista / Timeline / Mapa                        */
/* ------------------------------------------------------------------ */

type ItinerarioView = "lista" | "timeline" | "mapa";

function ItinerarioViews({
  data,
  onChanged,
  reservedIds,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
  reservedIds: Set<string>;
}) {
  const [view, setView] = useState<ItinerarioView>("lista");
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Tu itinerario</h2>
        <div
          role="tablist"
          aria-label="Cambiar vista del itinerario"
          className="inline-flex rounded-lg border bg-background p-1 text-xs"
        >
          {(
            [
              { k: "lista", label: "Lista", Icon: List },
              { k: "timeline", label: "Timeline", Icon: Clock },
              { k: "mapa", label: "Mapa", Icon: MapIcon },
            ] as const
          ).map(({ k, label, Icon }) => {
            const active = view === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(k)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {view === "lista" ? (
        <PlanItemsSection
          data={data}
          onChanged={onChanged}
          reservedIds={reservedIds}
        />
      ) : view === "timeline" ? (
        <ItinerarioTimeline data={data} onChanged={onChanged} />
      ) : (
        <ItinerarioMap data={data} />
      )}
    </section>
  );
}

function ItinerarioTimeline({
  data,
  onChanged,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
}) {
  const globalOrder = useMemo(
    () => [...data.items].sort((a, b) => a.position - b.position).map((i) => i.id),
    [data.items],
  );

  const reorderFn = useServerFn(reorderPlanItems);
  const optimizeFn = useServerFn(optimizePlanDay);

  const reorder = useMutation({
    mutationFn: (orderedItemIds: string[]) =>
      reorderFn({ data: { planId: data.plan.id, orderedItemIds } }),
    onSuccess: () => onChanged(),
    onError: (e: unknown) =>
      toast.error("No pudimos guardar el nuevo orden", {
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
      }),
  });

  const optimize = useMutation({
    mutationFn: (dayIndex: number | null) =>
      optimizeFn({ data: { planId: data.plan.id, dayIndex } }),
    onSuccess: (res) => {
      onChanged();
      if (res.updated === 0) {
        toast(res.rationale);
        return;
      }
      toast.success("Alux optimizó tu día", {
        description: res.rationale,
        duration: 8000,
        action: {
          label: "Deshacer",
          onClick: () => reorder.mutate(res.previousOrder),
        },
      });
    },
    onError: (e: unknown) =>
      toast.error("Alux no pudo optimizar este día", {
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
      }),
  });

  function moveWithinDay(
    dayItems: TravelPlanItem[],
    itemId: string,
    delta: -1 | 1,
  ) {
    const idx = dayItems.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= dayItems.length) return;
    // Reordena el bloque del día dentro del orden global.
    const dayIds = dayItems.map((i) => i.id);
    const [moved] = dayIds.splice(idx, 1);
    dayIds.splice(target, 0, moved);
    const daySet = new Set(dayIds);
    const newOrder: string[] = [];
    let inserted = false;
    for (const id of globalOrder) {
      if (daySet.has(id)) {
        if (!inserted) {
          newOrder.push(...dayIds);
          inserted = true;
        }
        continue;
      }
      newOrder.push(id);
    }
    reorder.mutate(newOrder);
  }

  const grouped = useMemo(() => {
    const map = new Map<number | "sin", TravelPlanItem[]>();
    for (const it of data.items) {
      const key = typeof it.day_index === "number" ? it.day_index : "sin";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    const days = Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "sin") return 1;
      if (b[0] === "sin") return -1;
      return (a[0] as number) - (b[0] as number);
    });
    for (const [, arr] of days) arr.sort((x, y) => x.position - y.position);
    return days;
  }, [data.items]);

  const totalDays = useMemo(() => {
    let max = 0;
    for (const it of data.items) {
      if (typeof it.day_index === "number" && it.day_index + 1 > max) {
        max = it.day_index + 1;
      }
    }
    return Math.min(Math.max(max, 1), 16);
  }, [data.items]);
  const startDate = data.plan.start_date;

  if (data.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aún no hay actividades. Cuando agregues elementos con día asignado, verás aquí tu recorrido cronológico.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([key, items]) => (
        <div key={String(key)} className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-serif text-sm text-foreground">
              {key === "sin" ? "Sin día asignado" : `Día ${(key as number) + 1}`}
              <span className="ml-2 text-xs text-muted-foreground">
                ({items.length})
              </span>
            </h3>
            <div className="ml-auto flex items-center gap-2">
              {typeof key === "number" ? (
                <DayWeatherChip
                  startDate={startDate}
                  totalDays={totalDays}
                  dayIndex={key}
                />
              ) : null}
              {items.length >= 2 ? (
              <button
                type="button"
                onClick={() =>
                  optimize.mutate(key === "sin" ? null : (key as number))
                }
                disabled={optimize.isPending}
                className="inline-flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                title="Alux calcula la ruta más corta entre las paradas de este día"
              >
                <Wand2 className="size-3" aria-hidden />
                Optimizar con Alux
              </button>
              ) : null}
            </div>
          </div>
          <ol className="relative space-y-3 border-l border-border/60 pl-4">
            {items.map((it, idx) => {
              const snap = it.snapshot ?? {};
              const canUp = idx > 0;
              const canDown = idx < items.length - 1;
              return (
                <li key={it.id} className="relative">
                  <span className="absolute -left-[21px] top-2 grid size-3 place-items-center rounded-full bg-primary" />
                  <div className="flex items-start gap-3">
                    {snap.image_url ? (
                      <img
                        src={snap.image_url}
                        alt=""
                        className="size-12 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {snap.title || (it.item_kind === "note" ? "Nota" : "Elemento")}
                      </p>
                      {snap.subtitle ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {snap.subtitle}
                        </p>
                      ) : null}
                      {it.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {it.notes}
                        </p>
                      ) : null}
                    </div>
                    {items.length > 1 ? (
                      <div className="ml-auto flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveWithinDay(items, it.id, -1)}
                          disabled={!canUp || reorder.isPending}
                          className="grid size-6 place-items-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                          aria-label="Mover arriba"
                          title="Mover arriba"
                        >
                          <ChevronUp className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveWithinDay(items, it.id, 1)}
                          disabled={!canDown || reorder.isPending}
                          className="grid size-6 place-items-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                          aria-label="Mover abajo"
                          title="Mover abajo"
                        >
                          <ChevronDown className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

function ItinerarioMap({ data }: { data: TravelPlanWithItems }) {
  const fetchGeo = useServerFn(getPlanItemsGeo);
  const itemsPayload = useMemo(
    () =>
      data.items
        .filter((i) => i.target_id && (i.item_kind === "business" || i.item_kind === "destination"))
        .map((i) => ({ id: i.id, kind: i.item_kind, target_id: i.target_id })),
    [data.items],
  );
  const q = useQuery({
    queryKey: ["mi-viaje", "itinerario-geo", data.plan.id, itemsPayload.length],
    queryFn: () => fetchGeo({ data: { items: itemsPayload } }),
    enabled: itemsPayload.length > 0,
  });

  const itemsById = useMemo(() => {
    const m = new Map<string, TravelPlanItem>();
    for (const i of data.items) m.set(i.id, i);
    return m;
  }, [data.items]);

  const markers = useMemo(() => {
    const geo = q.data?.geo ?? [];
    return geo.map((g) => ({
      lat: g.lat,
      lng: g.lng,
      title: itemsById.get(g.item_id)?.snapshot?.title ?? undefined,
      href: null as string | null,
    }));
  }, [q.data, itemsById]);

  if (itemsPayload.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        El mapa muestra destinos y empresas de tu viaje. Cuando agregues alguno, aparecerá aquí con sus coordenadas reales.
      </div>
    );
  }
  if (q.isPending) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Cargando ubicaciones…
      </div>
    );
  }
  if (markers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aún no encontramos coordenadas para los elementos guardados. Pide a tu Concierge que enriquezca la ubicación.
      </div>
    );
  }
  const first = markers[0];
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <InteractiveMap
        lat={first.lat}
        lng={first.lng}
        zoom={12}
        markers={markers}
        className="h-[380px] w-full"
      />
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        {markers.length} ubicación{markers.length === 1 ? "" : "es"} en tu viaje. Los pines muestran destinos y empresas guardadas.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Guest queue → migración post-login                                  */
/* ------------------------------------------------------------------ */

function GuestImportBanner({ onImported }: { onImported: () => void }) {
  const addItem = useServerFn(addPlanItem);
  const [queue, setQueue] = useState<GuestQueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQueue(readGuestQueue());
  }, []);

  if (queue.length === 0) return null;

  async function handleImport() {
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const it of queue) {
      if (it.kind !== "note" && !it.targetId) {
        fail += 1;
        continue;
      }
      try {
        await addItem({
          data: {
            kind: it.kind,
            targetId: it.targetId ?? undefined,
            snapshot: {
              title: it.title ?? null,
              slug: it.slug ?? null,
              image_url: it.imageUrl ?? null,
              subtitle: it.subtitle ?? null,
            },
            notes: it.notes ?? null,
          },
        });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    clearGuestQueue();
    setQueue([]);
    setBusy(false);
    onImported();
    toast.success(`Se importaron ${ok} elementos a Mi Viaje`, {
      description: fail > 0 ? `${fail} no pudieron migrarse.` : undefined,
    });
  }

  function handleDiscard() {
    clearGuestQueue();
    setQueue([]);
    toast("Elementos provisionales descartados");
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            Tienes {queue.length} elemento{queue.length === 1 ? "" : "s"} guardado{queue.length === 1 ? "" : "s"} en este dispositivo
          </p>
          <p className="text-xs text-muted-foreground">
            Fueron agregados antes de iniciar sesión. ¿Los movemos a Mi Viaje?
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={busy}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Importando…" : "Importar a Mi Viaje"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Viaje confirmado (CV4.3-narrativa · Etapa 7 Timeline)              */
/* ------------------------------------------------------------------ */

function ConfirmedTravelBanner({
  data,
}: {
  data: {
    folio: string;
    editorial_title: string | null;
    destination_name: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    party_size: number | null;
    days_to_trip: number | null;
  };
}) {
  const dateFmt = (iso: string | null) =>
    iso
      ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;
  const startTxt = dateFmt(data.plan_start_date);
  const endTxt = dateFmt(data.plan_end_date);
  const dateRange =
    startTxt && endTxt
      ? `${startTxt} – ${endTxt}`
      : startTxt
        ? `Desde el ${startTxt}`
        : "Fechas por confirmar con tu concierge";

  const countdown =
    typeof data.days_to_trip === "number"
      ? data.days_to_trip > 0
        ? `Faltan ${data.days_to_trip} días para tu llegada al Oriente Maya de Yucatán`
        : data.days_to_trip === 0
          ? "Hoy comienza tu viaje al Oriente Maya de Yucatán"
          : "Tu viaje al Oriente Maya está en curso o recién concluyó"
      : "Tu concierge confirmará las fechas contigo";

  return (
    <section className="overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/12 via-card to-card p-6 shadow-elevated">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
            <CalendarCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success-foreground/80">
              Viaje confirmado
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {data.editorial_title ?? "Tu viaje al Oriente Maya de Yucatán"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{dateRange}</p>
          </div>
        </div>
        <div className="rounded-xl border border-success/40 bg-background/70 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Folio
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-[0.14em] text-foreground">
            {data.folio}
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        {countdown}
        {data.party_size ? (
          <span className="text-muted-foreground">· {data.party_size} viajero{data.party_size === 1 ? "" : "s"}</span>
        ) : null}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Los ítems reservados con tu concierge quedan bloqueados en tu plan.
        Guarda tu folio para referencia rápida con tu concierge.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline del viaje confirmado (CV4.3-narrativa · Etapa 7)          */
/* ------------------------------------------------------------------ */

function ConfirmedTripTimeline({
  data,
}: {
  data: {
    plan_start_date: string | null;
    plan_end_date: string | null;
    days_to_trip: number | null;
    destination_name: string | null;
  };
}) {
  const start = data.plan_start_date
    ? new Date(`${data.plan_start_date}T00:00:00Z`)
    : null;
  const end = data.plan_end_date
    ? new Date(`${data.plan_end_date}T00:00:00Z`)
    : null;

  const days: Date[] = [];
  if (start && end) {
    const cur = new Date(start);
    for (let i = 0; i < 14 && cur.getTime() <= end.getTime(); i++) {
      days.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (start) {
    days.push(start);
  }

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const dtt = data.days_to_trip;
  const preMilestones: { key: string; label: string; hint: string; active: boolean }[] =
    typeof dtt === "number" && dtt >= 0
      ? [
          {
            key: "t-14",
            label: "T‑14 días · Preparando tu llegada",
            hint: "Recomendaciones climáticas y culturales del Oriente Maya.",
            active: dtt <= 14,
          },
          {
            key: "t-3",
            label: "T‑3 días · Todo listo para tu viaje",
            hint: "Punto de encuentro, contacto de tu concierge, botón de emergencia.",
            active: dtt <= 3,
          },
          {
            key: "t-0",
            label: "Día de llegada · Bienvenido al Oriente Maya",
            hint: "Alux te acompaña con contexto espacial y tu concierge en línea.",
            active: dtt === 0,
          },
        ]
      : [];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="font-serif text-xl">Mapa de tu viaje</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Los hitos de tu experiencia en el Oriente Maya de Yucatán
        {data.destination_name ? `, con base en ${data.destination_name}` : ""}.
      </p>

      {preMilestones.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {preMilestones.map((m) => (
            <li
              key={m.key}
              className={`flex gap-3 rounded-xl border p-3 ${
                m.active
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 bg-background/60"
              }`}
            >
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                  m.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {m.active ? "●" : "○"}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {days.length > 0 ? (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tu itinerario día a día
          </p>
          <ol className="mt-3 space-y-2">
            {days.map((d, idx) => {
              const isArrival = idx === 0;
              const isReturn = end && d.getTime() === end.getTime() && days.length > 1;
              const label = isArrival
                ? "Tu llegada"
                : isReturn
                  ? "Tu regreso"
                  : `Día ${idx + 1}`;
              return (
                <li
                  key={d.toISOString()}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-3"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{fmtDay(d)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tu concierge y Alux te propondrán actividades por día conforme se
            acerque tu viaje.
          </p>
        </div>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">
          Cuando confirmes fechas con tu concierge, aquí verás tu itinerario
          día por día.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Editor de metadatos                                                 */
/* ------------------------------------------------------------------ */

function PlanMetaEditor({
  data,
  onSaved,
}: {
  data: TravelPlanWithItems;
  onSaved: () => void;
}) {
  const saveMeta = useServerFn(updatePlanMeta);
  const [title, setTitle] = useState(data.plan.title);
  const [start, setStart] = useState(data.plan.start_date ?? "");
  const [end, setEnd] = useState(data.plan.end_date ?? "");
  const [party, setParty] = useState<string>(
    data.plan.party_size ? String(data.plan.party_size) : "",
  );
  const [notes, setNotes] = useState(data.plan.notes ?? "");

  const mut = useMutation({
    mutationFn: () =>
      saveMeta({
        data: {
          planId: data.plan.id,
          title: title.trim() || "Mi Viaje",
          startDate: start || null,
          endDate: end || null,
          partySize: party ? Number(party) : null,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Plan actualizado");
      onSaved();
    },
    onError: (e) =>
      toast.error("No se pudo actualizar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const dirty =
    title !== data.plan.title ||
    (start || null) !== data.plan.start_date ||
    (end || null) !== data.plan.end_date ||
    (party ? Number(party) : null) !== data.plan.party_size ||
    (notes.trim() || null) !== data.plan.notes;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-medium">Detalles del viaje</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Estos datos viajan con tu expediente cuando lo envías al Concierge.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Título</span>
          <input
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="size-3" /> Personas
          </span>
          <input
            type="number"
            min={1}
            max={40}
            value={party}
            onChange={(e) => setParty(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3" /> Fecha inicio
          </span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3" /> Fecha fin
          </span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Notas generales</span>
        <textarea
          value={notes}
          rows={3}
          maxLength={4000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferencias, restricciones, intereses…"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!dirty || mut.isPending}
          onClick={() => mut.mutate()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {mut.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Compartir + exportar (US-E4.3)                                     */
/* ------------------------------------------------------------------ */

function ShareExportSection({
  data,
  onChanged,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
}) {
  const enableFn = useServerFn(enableShareLink);
  const disableFn = useServerFn(disableShareLink);
  const { plan } = data;
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && plan.share_token
      ? `${window.location.origin}/viaje-compartido/${plan.share_token}`
      : null;

  const enableMut = useMutation({
    mutationFn: () => enableFn({ data: { planId: plan.id } }),
    onSuccess: () => {
      onChanged();
      toast.success("Link de compartir activado");
    },
    onError: (e) =>
      toast.error("No se pudo activar el link", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const disableMut = useMutation({
    mutationFn: () => disableFn({ data: { planId: plan.id } }),
    onSuccess: () => {
      onChanged();
      toast.success("Link revocado");
    },
    onError: (e) =>
      toast.error("No se pudo revocar el link", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Copia manualmente.");
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <Share2 className="size-4 text-primary" /> Compartir y exportar
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Genera un link público read-only para compartir tu expediente con
        familia, amigos o tu concierge. Puedes revocarlo en cualquier momento.
      </p>

      {plan.share_token && shareUrl ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Link activo
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-95"
              >
                <Copy className="size-3.5" />
                {copied ? "Copiado" : "Copiar"}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <ExternalLink className="size-3.5" />
                Ver
              </a>
            </div>
            {plan.shared_at ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Activado el{" "}
                {new Date(plan.shared_at).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <Printer className="size-3.5" />
              Imprimir / Guardar PDF
            </a>
            <button
              type="button"
              onClick={() => disableMut.mutate()}
              disabled={disableMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              {disableMut.isPending ? "Revocando…" : "Revocar link"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => enableMut.mutate()}
            disabled={enableMut.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
          >
            <Share2 className="size-4" />
            {enableMut.isPending ? "Generando…" : "Generar link de compartir"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Cualquier persona con el link podrá ver tu expediente (sin tu correo
            ni notas privadas). Podrás revocarlo cuando quieras.
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Items del plan                                                      */
/* ------------------------------------------------------------------ */

function PlanItemsSection({
  data,
  onChanged,
  reservedIds,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
  reservedIds: Set<string>;
}) {
  const addItem = useServerFn(addPlanItem);
  const [newNote, setNewNote] = useState("");

  const grouped = useMemo(() => {
    const g: Record<TravelItemKind, TravelPlanItem[]> = {
      destination: [],
      business: [],
      product: [],
      event: [],
      note: [],
    };
    for (const it of data.items) g[it.item_kind]?.push(it);
    return g;
  }, [data.items]);

  const addNoteMut = useMutation({
    mutationFn: (text: string) =>
      addItem({
        data: { kind: "note", notes: text, snapshot: { title: text.slice(0, 80) } },
      }),
    onSuccess: () => {
      setNewNote("");
      onChanged();
      toast.success("Nota agregada");
    },
    onError: (e) =>
      toast.error("No se pudo agregar la nota", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Tu expediente ({data.items.length})
        </h2>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has agregado nada. Explora el ecosistema y usa el botón
            "➕ Agregar a Mi Viaje" en las tarjetas.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/oriente-maya"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Ver destinos
            </Link>
            <Link
              to="/experiencias"
              search={{ destino: undefined, tema: undefined }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Ver experiencias
            </Link>
          </div>
        </div>
      ) : (
        KIND_ORDER.map((kind) => {
          const items = grouped[kind];
          if (!items || items.length === 0) return null;
          const { label, icon: Icon } = KIND_META[kind];
          return (
            <div key={kind} className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-primary" /> {label} ({items.length})
              </h3>
              <ul className="divide-y">
                {items.map((it) => (
                  <PlanItemRow
                    key={it.id}
                    item={it}
                    onChanged={onChanged}
                    reservedByConcierge={Boolean(
                      it.target_id && reservedIds.has(it.target_id),
                    )}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <StickyNote className="size-4 text-primary" /> Agregar una nota
        </h3>
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ej. Prefiero hoteles boutique, viajo con mi hija de 8 años…"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={2000}
          />
          <button
            type="button"
            disabled={newNote.trim().length < 3 || addNoteMut.isPending}
            onClick={() => addNoteMut.mutate(newNote.trim())}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Agregar
          </button>
        </div>
      </div>
    </section>
  );
}

function PlanItemRow({
  item,
  onChanged,
  reservedByConcierge,
}: {
  item: TravelPlanItem;
  onChanged: () => void;
  reservedByConcierge?: boolean;
}) {
  const remove = useServerFn(removePlanItem);
  const update = useServerFn(updatePlanItem);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [editing, setEditing] = useState(false);

  const removeMut = useMutation({
    mutationFn: () => remove({ data: { itemId: item.id } }),
    onSuccess: () => {
      onChanged();
      toast.success("Eliminado de Mi Viaje");
    },
    onError: (e) =>
      toast.error("No se pudo eliminar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      update({ data: { itemId: item.id, notes: notes.trim() || null } }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
      toast.success("Notas actualizadas");
    },
    onError: (e) =>
      toast.error("No se pudo actualizar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const snap = item.snapshot ?? {};
  const title = snap.title || (item.item_kind === "note" ? "Nota" : "Elemento");

  return (
    <li className="flex gap-3 py-3">
      {snap.image_url ? (
        <img
          src={snap.image_url}
          alt=""
          className="size-14 shrink-0 rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <div className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <StickyNote className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{title}</span>
          {reservedByConcierge && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              <Headset className="size-2.5" aria-hidden />
              Propuesto por tu concierge
            </span>
          )}
        </p>
        {snap.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{snap.subtitle}</p>
        ) : null}
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={notes}
              rows={2}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              placeholder="Notas para este elemento…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {saveMut.isPending ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotes(item.notes ?? "");
                  setEditing(false);
                }}
                className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : item.notes ? (
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
            {item.notes}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
          >
            {item.notes ? "Editar" : "Nota"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => removeMut.mutate()}
          disabled={removeMut.isPending}
          aria-label="Eliminar"
          className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Concierge (sin cambios de lógica; Sub-ola E)                        */
/* ------------------------------------------------------------------ */

interface CaseSummary {
  id: string;
  summary: string | null;
  status: string;
  priority: string;
  updated_at: string;
}

function EmbeddedCaseFile({ caseId, focus }: { caseId: string; focus?: string }) {
  const qc = useQueryClient();
  const fetchFile = useServerFn(getConciergeCaseFile);
  const appendNote = useServerFn(ccTimelineAppend);
  const q = useQuery({
    queryKey: ["concierge", "case-file", "traveler", caseId],
    queryFn: () => fetchFile({ data: { caseId } }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  // CV5.10 v2 · Deep-link scroll cuando llega focus= desde el bell.
  useEffect(() => {
    if (!focus || !q.data) return;
    let selector: string | null = null;
    if (focus.startsWith("proposal:")) {
      selector = `#proposal-${focus.slice("proposal:".length)}`;
    } else if (focus === "proposals") {
      selector = "#case-proposals";
    } else if (focus === "timeline") {
      selector = "#case-timeline";
    }
    if (!selector) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector(selector!);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-primary/60", "rounded-md");
        window.setTimeout(
          () => el.classList.remove("ring-2", "ring-primary/60", "rounded-md"),
          1800,
        );
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [focus, q.data]);
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: (summary: string) =>
      appendNote({
        data: {
          caseId,
          eventType: "traveler_note",
          summary,
          severity: "info",
        },
      }),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["concierge", "case-file", "traveler", caseId] });
      toast.success("Nota enviada a tu concierge");
    },
    onError: (e) =>
      toast.error("No se pudo enviar la nota", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Mi expediente Concierge
          </p>
          <h2 className="font-serif text-lg text-foreground">
            Conversación con tu concierge humano
          </h2>
        </div>
        <Link
          to="/cuenta/concierge/$caseId"
          params={{ caseId }}
          className="rounded-pill border border-border/60 px-3 py-1.5 text-xs text-primary hover:bg-accent"
        >
          Abrir en pantalla completa →
        </Link>
      </div>

      <form
        className="mb-5 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = note.trim();
          if (t.length >= 3 && !send.isPending) send.mutate(t);
        }}
      >
        <label className="text-xs font-medium text-foreground/80">
          Enviar una nota rápida a tu concierge
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Ej. Preferimos comenzar el segundo día un poco más tarde…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{note.length}/1000</span>
          <button
            type="submit"
            disabled={note.trim().length < 3 || send.isPending}
            className="rounded-pill bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {send.isPending ? "Enviando…" : "Enviar nota"}
          </button>
        </div>
      </form>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando expediente…</p>
      ) : q.data ? (
        <div className="rounded-lg border border-border/60 bg-background/40 p-3">
          <CaseFileView data={q.data} hideInternal />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aún no hay expediente.</p>
      )}
    </section>
  );
}

function ConciergeSection({
  data,
  cases,
  onChanged,
}: {
  data: TravelPlanWithItems;
  cases: CaseSummary[];
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const promote = useServerFn(promotePlanToCase);
  const { plan, items } = data;
  const [summary, setSummary] = useState("");

  const hasContent =
    items.length > 0 || Boolean((plan.notes ?? "").trim().length >= 8);
  const alreadyShared =
    plan.status === "shared_with_concierge" && Boolean(plan.case_id);

  const send = useMutation({
    mutationFn: (s: string) =>
      promote({ data: { planId: plan.id, summary: s } }),
    onSuccess: (res) => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["cc", "my-cases"] });
      onChanged();
      toast.success("Expediente enviado al Concierge", {
        description: "Un concierge humano revisará tu viaje.",
        action: {
          label: "Ver caso",
          onClick: () => {
            window.location.href = `/cuenta/concierge/${res.caseId}`;
          },
        },
      });
    },
    onError: (e) =>
      toast.error("No se pudo enviar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const derivedSummary =
    summary.trim() ||
    `Viaje "${plan.title}" · ${items.length} elemento${items.length === 1 ? "" : "s"}${
      plan.party_size ? ` · ${plan.party_size} personas` : ""
    }${plan.start_date ? ` · desde ${plan.start_date}` : ""}`;
  const canSend =
    !alreadyShared && hasContent && derivedSummary.length >= 8 && !send.isPending;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-medium">Enviar al Concierge</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu expediente completo (destinos, empresas, productos, eventos, notas,
        fechas y personas) viaja como snapshot al concierge humano.
      </p>

      {alreadyShared ? (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Ya enviaste este viaje al Concierge.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            El caso está en proceso. Puedes seguir agregando elementos y volver a enviar cuando quieras revisar contigo tu concierge.
          </p>
          {plan.case_id ? (
            <Link
              to="/cuenta/concierge/$caseId"
              params={{ caseId: plan.case_id }}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ver mi caso →
            </Link>
          ) : null}
        </div>
      ) : !hasContent ? (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Agrega al menos un destino, empresa, producto o evento — o escribe
          notas generales del viaje — para poder enviarlo.
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) send.mutate(derivedSummary);
          }}
        >
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Mensaje opcional para tu concierge (fechas flexibles, presupuesto, restricciones…)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Adjuntaremos automáticamente: {items.length} elemento
            {items.length === 1 ? "" : "s"}
            {plan.party_size ? ` · ${plan.party_size} personas` : ""}
            {plan.start_date ? ` · ${plan.start_date}` : ""}
            {plan.end_date ? ` → ${plan.end_date}` : ""}.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{summary.length}/500</span>
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {send.isPending ? "Enviando…" : "Enviar al Concierge"}
            </button>
          </div>
          {send.isError ? (
            <p className="text-xs text-destructive">
              {send.error instanceof Error ? send.error.message : "Error al enviar"}
            </p>
          ) : null}
        </form>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Mis solicitudes</h3>
          <Link to="/cuenta/concierge" className="text-xs text-primary hover:underline">
            Ver historial →
          </Link>
        </div>
        {cases.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no has enviado ninguna solicitud.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {cases.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{c.summary ?? "(sin resumen)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status} · {c.priority} · {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to="/cuenta/concierge/$caseId"
                  params={{ caseId: c.id }}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Ver caso
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Fase activa del viaje (CV4.3-narrativa · Etapa 5)                   */
/* ------------------------------------------------------------------ */

type TripPhase = "planning" | "t14" | "t3" | "onsite" | "post" | "closed";

interface ChecklistItem {
  key: string;
  label: string;
  hint?: string;
}

const PHASE_META: Record<
  TripPhase,
  {
    label: string;
    tagline: string;
    tone: "muted" | "info" | "primary" | "success" | "warning";
    aluxPrompt: string;
    checklist: ChecklistItem[];
  }
> = {
  planning: {
    label: "Preparación",
    tagline: "Aún tienes tiempo para afinar detalles con tu concierge.",
    tone: "muted",
    aluxPrompt: "Ayúdame a preparar mi viaje al Oriente Maya con calma.",
    checklist: [
      { key: "identity", label: "Documentos y datos de acompañantes", hint: "Nombres completos y contactos de emergencia." },
      { key: "expectations", label: "Cuéntale a tu concierge tus expectativas", hint: "Ritmo, intereses, restricciones alimentarias." },
      { key: "wishlist", label: "Guarda inspiración en Mi Viaje", hint: "Cenotes, restaurantes o experiencias que te llamen." },
    ],
  },
  t14: {
    label: "T‑14 · Preparando tu llegada",
    tagline: "Faltan menos de dos semanas: alista lo esencial.",
    tone: "info",
    aluxPrompt: "Dame recomendaciones de clima, ropa y cultura para mi viaje.",
    checklist: [
      { key: "weather", label: "Revisa el clima y qué empacar", hint: "Alux te da el pronóstico de tu destino." },
      { key: "culture", label: "Contexto cultural del Oriente Maya", hint: "Pequeños hábitos que enriquecen la experiencia." },
      { key: "docs", label: "Copia digital de identificaciones y reservas" },
    ],
  },
  t3: {
    label: "T‑3 · Últimos detalles",
    tagline: "Tu viaje inicia en días. Confirmamos logística fina.",
    tone: "warning",
    aluxPrompt: "Confirma conmigo el punto de encuentro y qué llevar el primer día.",
    checklist: [
      { key: "arrival", label: "Punto de encuentro y hora de llegada" },
      { key: "contact", label: "Guarda el contacto de tu concierge" },
      { key: "emergency", label: "Contacto de emergencia y seguros" },
      { key: "pack", label: "Empaca ligero: sandalias, protector, agua reutilizable" },
    ],
  },
  onsite: {
    label: "Bienvenido al Oriente Maya",
    tagline: "Ya estás aquí. Alux te acompaña con contexto vivo del lugar.",
    tone: "success",
    aluxPrompt: "¿Qué me recomiendas hacer ahora mismo cerca de mí?",
    checklist: [
      { key: "checkin", label: "Confirma tu llegada con tu concierge" },
      { key: "explore", label: "Explora recomendaciones cercanas con Alux" },
      { key: "share", label: "Comparte momentos: los publicaremos si autorizas" },
    ],
  },
  post: {
    label: "Después de tu viaje",
    tagline: "Gracias por descubrir el Oriente Maya con nosotros.",
    tone: "primary",
    aluxPrompt: "Ayúdame a dejar reseñas de las experiencias que viví.",
    checklist: [
      { key: "review", label: "Deja una reseña de las experiencias vividas" },
      { key: "next", label: "Guarda inspiración para tu próximo viaje" },
    ],
  },
  closed: {
    label: "Viaje cerrado",
    tagline: "Tu expediente queda disponible para consultas y futuras visitas.",
    tone: "muted",
    aluxPrompt: "Ayúdame a planear mi próxima visita al Oriente Maya.",
    checklist: [],
  },
};

function derivePhase(data: {
  days_to_trip: number | null;
  plan_end_date: string | null;
}): TripPhase {
  const d = data.days_to_trip;
  if (typeof d !== "number") return "planning";
  if (d > 14) return "planning";
  if (d > 3) return "t14";
  if (d > 0) return "t3";
  // d <= 0 → viaje en curso o pasado
  if (data.plan_end_date) {
    const end = new Date(`${data.plan_end_date}T23:59:59Z`).getTime();
    const now = Date.now();
    if (now <= end) return "onsite";
    const daysAfter = Math.floor((now - end) / 86_400_000);
    if (daysAfter <= 14) return "post";
    return "closed";
  }
  return "onsite";
}

function TripPhaseCard({
  data,
}: {
  data: {
    folio: string;
    days_to_trip: number | null;
    plan_end_date: string | null;
    email_t14_sent_at: string | null;
    email_t3_sent_at: string | null;
    email_welcome_sent_at: string | null;
    email_post_sent_at: string | null;
  };
}) {
  const phase = derivePhase(data);
  const meta = PHASE_META[phase];

  // Persistimos qué correos ya "leyó" el viajero en local storage
  // (señal 100% cliente; el hito recién enviado se marca con un badge).
  const storageKey = `mi-viaje:read-milestones:${data.folio}`;
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setReadMap(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, [storageKey]);
  const markRead = (key: string, iso: string | null) => {
    if (!iso) return;
    const next = { ...readMap, [`${key}:${iso}`]: true };
    setReadMap(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const milestones: { key: "t14" | "t3" | "welcome" | "post"; label: string; iso: string | null }[] = [
    { key: "t14", label: "Preparando tu llegada", iso: data.email_t14_sent_at },
    { key: "t3", label: "Últimos detalles del viaje", iso: data.email_t3_sent_at },
    { key: "welcome", label: "Bienvenida al Oriente Maya", iso: data.email_welcome_sent_at },
    { key: "post", label: "Después de tu viaje", iso: data.email_post_sent_at },
  ];
  const unread = milestones.filter((m) => m.iso && !readMap[`${m.key}:${m.iso}`]);

  // Checklist local: el viajero puede marcar sus propios pendientes.
  const checkKey = `mi-viaje:checklist:${data.folio}:${phase}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(checkKey);
      setDone(raw ? JSON.parse(raw) : {});
    } catch {
      setDone({});
    }
  }, [checkKey]);
  const toggle = (key: string) => {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    try {
      localStorage.setItem(checkKey, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };
  const completedCount = meta.checklist.filter((c) => done[c.key]).length;

  const toneRing: Record<typeof meta.tone, string> = {
    muted: "border-border/60 bg-card",
    info: "border-info/40 bg-info/5",
    primary: "border-primary/40 bg-primary/5",
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
  };

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section
      className={`overflow-hidden rounded-2xl border p-6 shadow-soft ${toneRing[meta.tone]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Fase actual de tu viaje
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">{meta.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
        </div>
        {meta.checklist.length > 0 ? (
          <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
            {completedCount}/{meta.checklist.length} listos
          </div>
        ) : null}
      </div>

      {unread.length > 0 ? (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Bell className="h-3.5 w-3.5" aria-hidden />
            Novedades de tu viaje
          </div>
          <ul className="mt-2 space-y-1.5">
            {unread.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {m.label}
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    · {dateFmt(m.iso!)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => markRead(m.key, m.iso)}
                  className="rounded-md border border-primary/40 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                >
                  Marcar leído
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {meta.checklist.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {meta.checklist.map((c) => {
            const isDone = !!done[c.key];
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => toggle(c.key)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-3 text-left transition hover:bg-accent/40"
                >
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-medium ${
                        isDone ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {c.label}
                    </span>
                    {c.hint ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {c.hint}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
        <p className="text-xs text-muted-foreground">
          Alux te acompaña en cada fase con contexto real y respuestas rápidas.
        </p>
        <Link
          to="/alux"
          search={{ prompt: meta.aluxPrompt }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Pregúntale a Alux
        </Link>
      </div>
    </section>
  );
}