/**
 * /concierge/prospectos/$prospectId — ficha del prospecto (Fase 1, 19.48).
 *
 * Datos que la persona dejó con Alux, su viaje, la plática completa, el
 * historial y las acciones del concierge (etapa, temperatura, responsable,
 * revisión, seguimiento y notas). No toca «CRM Arma tu viaje».
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { meridaDateTime } from "@/lib/time/merida";
import {
  addProspectNote,
  getProspect,
  updateProspect,
  type UpdateProspectPatch,
} from "@/lib/crm/prospects.functions";
import { listConciergeDirectory } from "@/lib/concierge/concierge.functions";
import {
  CONTACT_OFFER_REASON_LABEL,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABEL,
  PROSPECT_TEMPERATURES,
  PROSPECT_TEMPERATURE_LABEL,
  type ContactOfferReason,
  type ProspectStage,
  type ProspectTemperature,
} from "@/lib/crm/prospect-rules";
import {
  StageBadge,
  TemperatureBadge,
  WaitingLabel,
  whatsappHref,
} from "@/components/crm/ProspectBadges";
import { TranscriptList } from "./prospectos.index";
import { WhatsAppConversationPanel } from "@/components/crm/WhatsAppConversationPanel";

export const Route = createFileRoute("/_authenticated/concierge/prospectos/$prospectId")({
  component: ProspectDetailPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "Prospecto | CRM Prospectos" },
      { name: "description", content: "Ficha del prospecto que dejó sus datos con Alux." },
      { property: "og:title", content: "Prospecto | CRM Prospectos" },
      { property: "og:description", content: "Ficha del prospecto que dejó sus datos con Alux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const EVENT_LABEL: Record<string, string> = {
  created: "Dejó sus datos con Alux",
  returned: "Regresó con Alux",
  stage_changed: "Cambio de etapa",
  note: "Nota",
  assigned: "Cambio de responsable",
  reviewed: "Marcado como revisado",
  contact_updated: "Datos actualizados",
  followup_set: "Seguimiento programado",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ProspectDetailPage() {
  const { prospectId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const getFn = useServerFn(getProspect);
  const updateFn = useServerFn(updateProspect);
  const noteFn = useServerFn(addProspectNote);
  const dirFn = useServerFn(listConciergeDirectory);
  const q = useQuery({
    queryKey: ["crm-prospect", prospectId],
    queryFn: () => getFn({ data: { id: prospectId } }),
  });
  const dir = useQuery({ queryKey: ["concierge-directory"], queryFn: () => dirFn() });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const nameOf = (id: string | null) => {
    if (!id) return null;
    if (id === user?.id) return "Tú";
    return dir.data?.find((d) => d.user_id === id)?.display_name ?? "Otro miembro del equipo";
  };

  const run = async (patch: UpdateProspectPatch, ok: string) => {
    setBusy(true);
    try {
      await updateFn({ data: { id: prospectId, ...patch } });
      toast(ok);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-prospect", prospectId] }),
        qc.invalidateQueries({ queryKey: ["crm-prospects-today"] }),
        qc.invalidateQueries({ queryKey: ["crm-prospects"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando prospecto…</p>;
  if (q.isError || !q.data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No encontramos este prospecto.</p>
        <Link to="/concierge/prospectos" className="text-sm font-semibold text-primary">
          Volver a CRM Prospectos
        </Link>
      </div>
    );

  const { prospect: p, events, messages, sessions } = q.data;
  const brief = p.trip_brief ?? {};
  const briefBits: string[] = [];
  if (Array.isArray(brief["destinations"]) && brief["destinations"].length)
    briefBits.push(`Destinos: ${(brief["destinations"] as string[]).join(", ")}`);
  if (brief["partySize"]) briefBits.push(`${String(brief["partySize"])} personas`);
  if (brief["startDate"])
    briefBits.push(
      `Del ${String(brief["startDate"])}${brief["endDate"] ? ` al ${String(brief["endDate"])}` : ""}`,
    );
  if (brief["durationDays"]) briefBits.push(`${String(brief["durationDays"])} días`);
  if (Array.isArray(brief["interests"]) && brief["interests"].length)
    briefBits.push(`Le interesa: ${(brief["interests"] as string[]).join(", ")}`);

  return (
    <div className="space-y-5 pb-12">
      <Link
        to="/concierge/prospectos"
        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        CRM Prospectos
      </Link>

      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">{p.first_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.phone_e164} · idioma {p.language.toUpperCase()} · llegó por Alux en la web
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StageBadge stage={p.stage} />
              <TemperatureBadge temperature={p.temperature} />
              {p.stage === "nuevo" && !p.reviewed_at ? (
                <WaitingLabel since={p.last_activity_at} />
              ) : null}
            </div>
          </div>
          <a
            href={whatsappHref(p.phone_e164)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-success px-4 text-sm font-semibold text-success-foreground hover:bg-success/90"
          >
            <MessageCircle className="size-4" aria-hidden />
            Escribir por WhatsApp
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {p.capture_reason
            ? CONTACT_OFFER_REASON_LABEL[p.capture_reason as ContactOfferReason]
            : "Contacto de Alux"}{" "}
          · Dio permiso de contacto el {meridaDateTime(p.consent_at)} · Responsable:{" "}
          {nameOf(p.assigned_concierge_user_id) ?? "nadie"}
        </p>
      </header>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Etapa
          <select
            value={p.stage}
            disabled={busy}
            onChange={(e) => {
              const stage = e.target.value as ProspectStage;
              if (stage === "perdido" || stage === "no_interesado") {
                void run({ stage, lostReason: lostReason.trim() || null }, "Etapa actualizada");
              } else void run({ stage }, "Etapa actualizada");
            }}
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            {PROSPECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Temperatura
          <select
            value={p.temperature}
            disabled={busy}
            onChange={(e) =>
              void run(
                { temperature: e.target.value as ProspectTemperature },
                "Temperatura actualizada",
              )
            }
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            {PROSPECT_TEMPERATURES.map((t) => (
              <option key={t} value={t}>
                {PROSPECT_TEMPERATURE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Próximo seguimiento
          <input
            type="datetime-local"
            defaultValue={toLocalInput(p.next_followup_at)}
            disabled={busy}
            onBlur={(e) => {
              const v = e.target.value;
              const iso = v ? new Date(v).toISOString() : null;
              if (iso !== p.next_followup_at)
                void run({ nextFollowupAt: iso }, "Seguimiento guardado");
            }}
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Motivo si se pierde (opcional)
          <input
            value={lostReason || p.lost_reason || ""}
            onChange={(e) => setLostReason(e.target.value)}
            maxLength={500}
            placeholder="Ej. eligió otra agencia, cambió de fechas"
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          {p.assigned_concierge_user_id !== user?.id ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run({ assignToMe: true }, "Ahora eres responsable")}
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Tomar este prospecto
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run({ release: true }, "Prospecto liberado")}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              Liberar
            </button>
          )}
          {!p.reviewed_at ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  p.stage === "nuevo"
                    ? { reviewed: true, stage: "contactado" }
                    : { reviewed: true },
                  "Marcado como revisado",
                )
              }
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              Ya lo contacté
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Su viaje</h2>
        {briefBits.length || p.destination_slug ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {[p.destination_slug ? `Desde ${p.destination_slug}` : null, ...briefBits]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Todavía no compartió fechas ni personas.
          </p>
        )}
        {p.trip_items?.length ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
            {p.trip_items.map((it, i) => (
              <li key={`${it.kind}:${it.targetId ?? i}`}>{it.title ?? it.kind}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Plática con Alux</h2>
        <p className="text-xs text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? "plática" : "pláticas"} ligadas a este
          prospecto.
        </p>
        <TranscriptList messages={messages} />
        {(() => {
          const wa = (
            sessions as Array<{
              id: string;
              channel?: string;
              alux_mode?: "alux" | "human";
              conversation_language?: string | null;
              handoff_requested_at?: string | null;
            }>
          ).find((s) => s.channel === "whatsapp");
          return wa ? (
            <WhatsAppConversationPanel
              sessionId={wa.id}
              mode={wa.alux_mode ?? "alux"}
              language={wa.conversation_language ?? p.language ?? null}
              handoffRequestedAt={wa.handoff_requested_at ?? null}
            />
          ) : null;
        })()}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Notas e historial</h2>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            setBusy(true);
            try {
              await noteFn({ data: { id: prospectId, body: note.trim() } });
              setNote("");
              await qc.invalidateQueries({ queryKey: ["crm-prospect", prospectId] });
            } catch {
              toast.error("No se pudo guardar la nota.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Escribe una nota para el equipo"
            className="min-h-11 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !note.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Guardar nota
          </button>
        </form>
        <ol className="mt-4 space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="border-l-2 border-border pl-3 text-sm">
              <p className="text-[11px] text-muted-foreground">
                {meridaDateTime(ev.created_at)}
                {ev.actor_user_id ? ` · ${nameOf(ev.actor_user_id)}` : " · Alux"}
              </p>
              <p className="font-medium">
                {EVENT_LABEL[ev.kind] ?? ev.kind}
                {ev.kind === "stage_changed" && typeof ev.meta["to"] === "string"
                  ? `: ${PROSPECT_STAGE_LABEL[ev.meta["to"] as ProspectStage] ?? ev.meta["to"]}`
                  : ""}
              </p>
              {ev.body ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{ev.body}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
