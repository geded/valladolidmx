/**
 * /concierge/prospectos — CRM Prospectos (Fase 1, propuesta 19.48).
 *
 * Personas que todavía no tienen cuenta y dejaron nombre y WhatsApp con
 * Alux. Sección separada de la bandeja «CRM Arma tu viaje», que no cambia.
 * Pestañas: Hoy · Prospectos · Pláticas de Alux · Estadísticas.
 */
import { createFileRoute, ErrorComponent, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { translateTranscriptToSpanish } from "@/lib/crm/whatsapp.functions";
import { WhatsAppConversationPanel } from "@/components/crm/WhatsAppConversationPanel";
import { meridaDateTime } from "@/lib/time/merida";
import {
  getAluxConversation,
  getProspectStats,
  getProspectsToday,
  listAluxConversations,
  listProspects,
  type ProspectRow,
} from "@/lib/crm/prospects.functions";
import {
  CONTACT_OFFER_REASON_LABEL,
  PROSPECT_CLOSED_STAGES,
  PROSPECT_FUNNEL_STAGES,
  PROSPECT_STAGE_LABEL,
  type ContactOfferReason,
} from "@/lib/crm/prospect-rules";
import {
  StageBadge,
  TemperatureBadge,
  WaitingLabel,
  whatsappHref,
} from "@/components/crm/ProspectBadges";

const TABS = ["hoy", "prospectos", "platicas", "estadisticas"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  hoy: "Hoy",
  prospectos: "Prospectos",
  platicas: "Pláticas de Alux",
  estadisticas: "Estadísticas",
};

export const Route = createFileRoute("/_authenticated/concierge/prospectos/")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => {
    const tab = typeof search["tab"] === "string" ? (search["tab"] as Tab) : undefined;
    return tab && TABS.includes(tab) ? { tab } : {};
  },
  component: ProspectsPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "CRM Prospectos | Centro Concierge" },
      {
        name: "description",
        content:
          "Personas que dejaron su nombre y WhatsApp con Alux y esperan seguimiento del concierge.",
      },
      { property: "og:title", content: "CRM Prospectos | Centro Concierge" },
      {
        property: "og:description",
        content:
          "Personas que dejaron su nombre y WhatsApp con Alux y esperan seguimiento del concierge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ProspectsPage() {
  const { tab = "hoy" } = Route.useSearch();
  const navigate = useNavigate({ from: "/concierge/prospectos/" });
  return (
    <div className="space-y-5 pb-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Central de operaciones
        </p>
        <h1 className="mt-1 font-serif text-3xl">CRM Prospectos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Personas sin cuenta que dejaron su nombre y WhatsApp con Alux. Los viajeros con cuenta
          siguen en{" "}
          <Link to="/concierge" className="font-medium text-primary hover:underline">
            CRM Arma tu viaje
          </Link>
          .
        </p>
        <Link
          to="/concierge/prospectos/whatsapp"
          className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-primary hover:underline"
        >
          Líneas de WhatsApp
        </Link>
      </header>

      <nav aria-label="Secciones del CRM" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => void navigate({ search: { tab: t }, replace: true })}
            aria-current={tab === t ? "page" : undefined}
            className={[
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            ].join(" ")}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </nav>

      {tab === "hoy" ? <TodayTab /> : null}
      {tab === "prospectos" ? <ListTab /> : null}
      {tab === "platicas" ? <ConversationsTab /> : null}
      {tab === "estadisticas" ? <StatsTab /> : null}
    </div>
  );
}

function ProspectCard({ p, showWaiting }: { p: ProspectRow; showWaiting?: boolean }) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/concierge/prospectos/$prospectId"
          params={{ prospectId: p.id }}
          className="font-semibold text-foreground hover:text-primary hover:underline"
        >
          {p.first_name}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <StageBadge stage={p.stage} />
          <TemperatureBadge temperature={p.temperature} />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {p.capture_reason
          ? CONTACT_OFFER_REASON_LABEL[p.capture_reason as ContactOfferReason]
          : "Contacto de Alux"}
        {p.destination_slug ? ` · ${p.destination_slug}` : ""}
        {p.trip_items?.length ? ` · ${p.trip_items.length} lugares en su viaje` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {showWaiting ? (
          <WaitingLabel since={p.last_activity_at} />
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Última actividad {meridaDateTime(p.last_activity_at)}
          </span>
        )}
        <div className="flex items-center gap-2">
          <a
            href={whatsappHref(p.phone_e164)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 text-xs font-semibold text-success hover:bg-success/15"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            WhatsApp
          </a>
          <Link
            to="/concierge/prospectos/$prospectId"
            params={{ prospectId: p.id }}
            className="inline-flex min-h-10 items-center rounded-full border border-border px-3 text-xs font-semibold hover:bg-muted"
          >
            Abrir
          </Link>
        </div>
      </div>
    </li>
  );
}

function Section({
  title,
  hint,
  rows,
  empty,
  showWaiting,
}: {
  title: string;
  hint: string;
  rows: ProspectRow[];
  empty: string;
  showWaiting?: boolean;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-base font-semibold">
          {title} <span className="text-muted-foreground">({rows.length})</span>
        </h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {rows.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <ProspectCard key={p.id} p={p} {...(showWaiting ? { showWaiting } : {})} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

function TodayTab() {
  const fn = useServerFn(getProspectsToday);
  const q = useQuery({
    queryKey: ["crm-prospects-today"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando prospectos…</p>;
  if (q.isError)
    return <p className="text-sm text-destructive">No se pudieron cargar los prospectos.</p>;
  const d = q.data!;
  return (
    <div className="space-y-6">
      <Section
        title="Esperando respuesta"
        hint="Nuevos sin revisar. Los que llevan más de 30 minutos se marcan en rojo."
        rows={d.waiting}
        empty="Nadie está esperando. ¡Buen trabajo!"
        showWaiting
      />
      <Section
        title="Seguimientos para hoy"
        hint="Prospectos con un seguimiento programado para hoy o atrasado."
        rows={d.followups}
        empty="No hay seguimientos programados para hoy."
      />
      <Section
        title="Calientes sin responsable"
        hint="Quieren reservar, cotizar o hablar con un concierge y nadie los ha tomado."
        rows={d.hotUnassigned}
        empty="Todos los prospectos calientes ya tienen responsable."
      />
    </div>
  );
}

function ListTab() {
  const fn = useServerFn(listProspects);
  const [view, setView] = useState<"abiertos" | "por_atender" | "cerrados" | "todos">("abiertos");
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["crm-prospects", view, search],
    queryFn: () => fn({ data: { view, ...(search.trim() ? { search: search.trim() } : {}) } }),
  });
  const rows = q.data ?? [];
  const byStage = new Map<string, ProspectRow[]>();
  for (const r of rows) byStage.set(r.stage, [...(byStage.get(r.stage) ?? []), r]);
  const stages = view === "cerrados" ? PROSPECT_CLOSED_STAGES : PROSPECT_FUNNEL_STAGES;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["abiertos", "Abiertos"],
            ["por_atender", "Nuevos"],
            ["cerrados", "No interesados y perdidos"],
            ["todos", "Todos"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={[
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium",
              view === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o número"
          className="ml-auto min-h-9 w-full rounded-full border border-border bg-background px-3 text-sm sm:w-64"
        />
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Todavía no hay prospectos en esta vista.
        </p>
      ) : view === "todos" ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <ProspectCard key={p.id} p={p} />
          ))}
        </ul>
      ) : (
        <div className="space-y-5">
          {stages
            .filter((s) => (byStage.get(s) ?? []).length > 0)
            .map((s) => (
              <section key={s} className="space-y-2">
                <h2 className="text-sm font-semibold">
                  {PROSPECT_STAGE_LABEL[s]}{" "}
                  <span className="text-muted-foreground">({byStage.get(s)!.length})</span>
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {byStage.get(s)!.map((p) => (
                    <ProspectCard key={p.id} p={p} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function ConversationsTab() {
  const listFn = useServerFn(listAluxConversations);
  const [filter, setFilter] = useState<"todas" | "con_datos" | "sin_datos" | "whatsapp">("todas");
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["crm-alux-conversations", filter],
    queryFn: () => listFn({ data: { days: 7, filter } }),
  });
  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pláticas de Alux de los últimos 7 días, más recientes primero.
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["todas", "Todas"],
            ["con_datos", "Dejaron sus datos"],
            ["sin_datos", "Sin datos"],
            ["whatsapp", "WhatsApp"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={[
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium",
              filter === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando pláticas…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay pláticas en estos días.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-card p-3">
              <button
                type="button"
                onClick={() => setOpenId(openId === s.id ? null : s.id)}
                aria-expanded={openId === s.id}
                className="block w-full text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {s.channel === "whatsapp" ? (
                      <span className="mr-1 font-semibold text-success">WhatsApp ·</span>
                    ) : null}
                    {s.channel === "whatsapp" && s.alux_mode === "human" ? (
                      <span
                        className={
                          s.handoff_requested_at ? "mr-1 font-semibold text-destructive" : "mr-1"
                        }
                      >
                        {s.handoff_requested_at ? "Pidió concierge ·" : "Atiende concierge ·"}
                      </span>
                    ) : null}
                    {meridaDateTime(s.last_seen_at)} · {s.message_count}{" "}
                    {s.message_count === 1 ? "mensaje" : "mensajes"}
                    {s.last_destination_slug ? ` · ${s.last_destination_slug}` : ""}
                  </span>
                  <span className="text-[11px] font-medium">
                    {s.prospect_id ? (
                      <span className="text-success">Dejó sus datos</span>
                    ) : s.traveler_user_id ? (
                      <span className="text-info">Viajero con cuenta</span>
                    ) : (
                      <span className="text-muted-foreground">Sin datos</span>
                    )}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm">{s.preview ?? "—"}</p>
              </button>
              {s.prospect_id ? (
                <Link
                  to="/concierge/prospectos/$prospectId"
                  params={{ prospectId: s.prospect_id }}
                  className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  Ver prospecto
                </Link>
              ) : null}
              {openId === s.id ? <Transcript sessionId={s.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Transcript({ sessionId }: { sessionId: string }) {
  const fn = useServerFn(getAluxConversation);
  const q = useQuery({
    queryKey: ["crm-alux-conversation", sessionId],
    queryFn: () => fn({ data: { sessionId } }),
  });
  if (q.isLoading) return <p className="mt-2 text-xs text-muted-foreground">Cargando plática…</p>;
  const session = q.data?.session as
    | {
        channel?: string;
        alux_mode?: "alux" | "human";
        conversation_language?: string | null;
        handoff_requested_at?: string | null;
      }
    | null
    | undefined;
  return (
    <>
      <TranscriptList messages={q.data?.messages ?? []} />
      {session?.channel === "whatsapp" ? (
        <WhatsAppConversationPanel
          sessionId={sessionId}
          mode={session.alux_mode ?? "alux"}
          language={session.conversation_language ?? null}
          handoffRequestedAt={session.handoff_requested_at ?? null}
        />
      ) : null}
    </>
  );
}

type TranscriptMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  author?: string | null;
  channel?: string;
  send_status?: string | null;
  original_text?: string | null;
};

function authorLabel(m: TranscriptMessage): string {
  if (m.role === "user") return "Explorador";
  if (m.author === "concierge") return "Concierge";
  if (m.author === "system") return "Nota del CRM";
  return "Alux";
}

export function TranscriptList({ messages }: { messages: ReadonlyArray<TranscriptMessage> }) {
  const translateFn = useServerFn(translateTranscriptToSpanish);
  const [spanish, setSpanish] = useState<Record<string, string> | null>(null);
  const recent = messages.slice(-40);
  const translate = useMutation({
    mutationFn: () => translateFn({ data: { texts: recent.map((m) => m.content.slice(0, 2000)) } }),
    onSuccess: (r) => {
      const map: Record<string, string> = {};
      recent.forEach((m, i) => {
        map[m.id] = r.texts[i] ?? m.content;
      });
      setSpanish(map);
    },
  });
  if (!messages.length)
    return <p className="mt-2 text-xs text-muted-foreground">Sin mensajes guardados.</p>;
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => (spanish ? setSpanish(null) : translate.mutate())}
          disabled={translate.isPending}
          className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 text-[11px] font-medium hover:bg-muted disabled:opacity-60"
        >
          {translate.isPending ? "Traduciendo…" : spanish ? "Ver original" : "Ver en español"}
        </button>
      </div>
      <ol className="space-y-2">
        {messages.map((m) => (
          <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className={[
                "max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-snug",
                m.role === "user"
                  ? "bg-primary/10"
                  : m.author === "system"
                    ? "border border-dashed border-border bg-background"
                    : "bg-muted",
              ].join(" ")}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {authorLabel(m)} · {meridaDateTime(m.created_at)}
                {m.send_status === "failed" ? (
                  <span className="ml-1 text-destructive">· no se envió</span>
                ) : null}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{spanish?.[m.id] ?? m.content}</p>
              {m.original_text && !spanish ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Escrito en español: {m.original_text}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatsTab() {
  const fn = useServerFn(getProspectStats);
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["crm-prospect-stats", days],
    queryFn: () => fn({ data: { days } }),
  });
  const d = q.data;
  const rate =
    d && d.anonymousConversations > 0
      ? Math.round((d.conversationsWithContact / d.anonymousConversations) * 100)
      : 0;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setDays(n)}
            className={[
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium",
              days === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
            ].join(" ")}
          >
            {n} días
          </button>
        ))}
      </div>
      {q.isLoading || !d ? (
        <p className="text-sm text-muted-foreground">Calculando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Pláticas sin cuenta" value={d.anonymousConversations} />
            <Stat label="Dejaron sus datos" value={d.conversationsWithContact} />
            <Stat label="De cada 100 pláticas" value={rate} suffix="%" />
            <Stat label="Prospectos nuevos" value={d.prospectsCreated} />
          </div>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Embudo (todos los prospectos)</h2>
            <ul className="mt-2 space-y-1.5">
              {[...PROSPECT_FUNNEL_STAGES, ...PROSPECT_CLOSED_STAGES].map((s) => (
                <li key={s} className="flex items-center justify-between text-sm">
                  <span>{PROSPECT_STAGE_LABEL[s]}</span>
                  <span className="tabular-nums font-semibold">{d.byStage[s] ?? 0}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Por qué dejaron sus datos</h2>
            <ul className="mt-2 space-y-1.5">
              {(Object.keys(CONTACT_OFFER_REASON_LABEL) as ContactOfferReason[]).map((r) => (
                <li key={r} className="flex items-center justify-between text-sm">
                  <span>{CONTACT_OFFER_REASON_LABEL[r]}</span>
                  <span className="tabular-nums font-semibold">{d.byReason[r] ?? 0}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-soft">
      <span className="block text-2xl font-semibold tabular-nums">
        {value}
        {suffix ?? ""}
      </span>
      <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}
