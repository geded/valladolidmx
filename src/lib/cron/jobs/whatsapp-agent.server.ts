/**
 * Agente de WhatsApp del administrador · ronda de cada minuto.
 *
 *  1. Lee los mensajes nuevos que el administrador escribió a su agente y los
 *     guarda antes de avanzar la lectura (nada se pierde si algo falla).
 *  2. Contesta hasta dos preguntas por ronda con la información publicada.
 *  3. Envía un solo aviso agrupado de nuevas conversaciones con Alux.
 *
 * Un candado evita rondas simultáneas; en simulación no se envía ni escribe.
 */
import type { CronJobResult, CronRunContext, CronSupabase } from "@/lib/cron/cron-hook-auth.server";
import {
  classifyNotice,
  clampWhatsAppText,
  decideInbound,
  formatAluxDigest,
  parseAgentUpdate,
  type AluxNoticeRow,
} from "@/lib/whatsapp-agent/digest";
import {
  WhatsAppAgentError,
  markAgentMessageRead,
  pollAgentUpdates,
  readAgentCredentials,
  sendAgentText,
  type AgentCredentials,
} from "@/lib/whatsapp-agent/client.server";

const LEASE_MS = 58_000;
const MAX_ANSWERS_PER_RUN = 2;
const MAX_ATTEMPTS = 3;
const SENDING_TIMEOUT_MS = 10 * 60 * 1000;
const NON_TEXT_REPLY =
  "Por ahora leo sólo mensajes de texto. Escríbeme tu pregunta y te respondo con la información publicada de Valladolid.mx.";

type Answerer = (question: string) => Promise<string>;

export interface WhatsAppAgentDeps {
  readonly creds?: AgentCredentials | null;
  readonly answer?: Answerer;
  readonly now?: () => number;
}

function errorText(error: unknown): string {
  if (error instanceof WhatsAppAgentError) return `[${error.status}] ${error.detail.slice(0, 300)}`;
  return error instanceof Error ? error.message.slice(0, 300) : "unknown_error";
}

function must<T>(result: { data: T; error: unknown }, what: string): T {
  if (result.error) throw new Error(`${what}_failed`);
  return result.data;
}

export function createWhatsAppAgentRunner(deps: WhatsAppAgentDeps = {}) {
  return async (supabase: CronSupabase, ctx: CronRunContext): Promise<CronJobResult> => {
    const creds = deps.creds === undefined ? readAgentCredentials() : deps.creds;
    if (!creds) return { body: { ok: true, configured: false } };
    if (ctx.dryRun) return { body: { ok: true, configured: true, skipped: "dry_run" } };
    const now = deps.now ?? Date.now;
    const answer: Answerer =
      deps.answer ??
      (async (q) => (await import("@/lib/whatsapp-agent/answer.server")).answerOwnerQuestion(q));

    // ── Candado ──
    const nowIso = new Date(now()).toISOString();
    const lease = must(
      await supabase
        .from("whatsapp_agent_state")
        .update({ lease_until: new Date(now() + LEASE_MS).toISOString(), updated_at: nowIso })
        .eq("id", 1)
        .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
        .select("next_offset, recipient_id, setup_at")
        .maybeSingle(),
      "lease",
    ) as { next_offset: number | null; recipient_id: string | null; setup_at: string } | null;
    if (!lease) return { body: { ok: true, busy: true } };

    const stats = { received: 0, answered: 0, failed: 0, notices: 0, skippedNotices: 0 };
    let recipient = lease.recipient_id;
    let lastError: string | null = null;

    try {
      // ── 1. Lectura ──
      try {
        const payload = await pollAgentUpdates(creds, lease.next_offset ?? 0);
        if (payload) {
          const update = parseAgentUpdate(payload);
          const setupAtMs = Date.parse(lease.setup_at);
          const rows = update.messages.map((m) => ({
            message_id: m.id,
            sender: m.from,
            message_type: m.type,
            body: m.text ? m.text.slice(0, 4000) : null,
            sent_at: new Date(m.sentAtMs).toISOString(),
            reply_status: decideInbound(m, setupAtMs) === "answer" ? "pending" : "ignored",
          }));
          if (rows.length) {
            must(
              await supabase
                .from("whatsapp_agent_inbound")
                .upsert(rows, { onConflict: "message_id", ignoreDuplicates: true }),
              "inbound_store",
            );
            recipient = update.messages[update.messages.length - 1]!.from;
            stats.received = rows.length;
            for (const row of rows.filter((r) => r.reply_status === "ignored")) {
              await markAgentMessageRead(creds, row.message_id, false).catch(() => undefined);
            }
          }
          if (update.nextOffset !== null || recipient !== lease.recipient_id) {
            must(
              await supabase
                .from("whatsapp_agent_state")
                .update({
                  ...(update.nextOffset !== null ? { next_offset: update.nextOffset } : {}),
                  recipient_id: recipient,
                })
                .eq("id", 1),
              "offset_store",
            );
          }
        }
      } catch (error) {
        lastError = `poll ${errorText(error)}`;
      }

      // ── 2. Respuestas ──
      must(
        await supabase
          .from("whatsapp_agent_inbound")
          .update({ reply_status: "unknown", last_error: "send_outcome_unknown" })
          .eq("reply_status", "sending")
          .lt("processed_at", new Date(now() - SENDING_TIMEOUT_MS).toISOString()),
        "stale_sending",
      );
      const pending = must(
        await supabase
          .from("whatsapp_agent_inbound")
          .select("message_id, sender, message_type, body, reply_status, attempts")
          .in("reply_status", ["pending", "failed"])
          .lt("attempts", MAX_ATTEMPTS)
          .order("received_at", { ascending: true })
          .limit(MAX_ANSWERS_PER_RUN),
        "pending_select",
      ) as Array<{
        message_id: string;
        sender: string;
        message_type: string;
        body: string | null;
        reply_status: string;
        attempts: number;
      }>;

      for (const item of pending) {
        await markAgentMessageRead(creds, item.message_id, true).catch(() => undefined);
        let reply: string;
        try {
          reply =
            item.message_type === "text" && item.body?.trim()
              ? await answer(item.body.trim())
              : NON_TEXT_REPLY;
        } catch (error) {
          stats.failed += 1;
          await supabase
            .from("whatsapp_agent_inbound")
            .update({
              reply_status: "failed",
              attempts: item.attempts + 1,
              last_error: errorText(error),
            })
            .eq("message_id", item.message_id);
          continue;
        }
        const claim = must(
          await supabase
            .from("whatsapp_agent_inbound")
            .update({
              reply_status: "sending",
              attempts: item.attempts + 1,
              processed_at: new Date(now()).toISOString(),
            })
            .eq("message_id", item.message_id)
            .eq("reply_status", item.reply_status)
            .select("message_id"),
          "claim",
        ) as unknown[] | null;
        if (!claim?.length) continue;
        try {
          const replyId = await sendAgentText(creds, item.sender, clampWhatsAppText(reply));
          must(
            await supabase
              .from("whatsapp_agent_inbound")
              .update({ reply_status: "sent", reply_message_id: replyId, last_error: null })
              .eq("message_id", item.message_id),
            "reply_store",
          );
          stats.answered += 1;
        } catch (error) {
          stats.failed += 1;
          const known = error instanceof WhatsAppAgentError;
          await supabase
            .from("whatsapp_agent_inbound")
            .update({ reply_status: known ? "failed" : "unknown", last_error: errorText(error) })
            .eq("message_id", item.message_id);
        }
      }

      // ── 3. Avisos de Alux ──
      const notices = must(
        await supabase
          .from("whatsapp_agent_alux_notices")
          .select("id, started_at, destination_slug, registered, user_agent")
          .is("sent_at", null)
          .is("skipped_reason", null)
          .order("started_at", { ascending: true })
          .limit(50),
        "notices_select",
      ) as AluxNoticeRow[];
      const toSend: AluxNoticeRow[] = [];
      for (const row of notices) {
        const verdict = classifyNotice(row, now());
        if (verdict === "send") {
          toSend.push(row);
          continue;
        }
        stats.skippedNotices += 1;
        await supabase
          .from("whatsapp_agent_alux_notices")
          .update({ skipped_reason: verdict })
          .eq("id", row.id);
      }
      if (toSend.length && recipient) {
        const slugs = Array.from(
          new Set(toSend.map((r) => r.destination_slug).filter((s): s is string => Boolean(s))),
        );
        const names: Record<string, string> = {};
        if (slugs.length) {
          const { data } = await supabase
            .from("destinations")
            .select("slug, name")
            .in("slug", slugs);
          for (const d of (data ?? []) as Array<{ slug: string; name: string }>) {
            names[d.slug] = d.name;
          }
        }
        try {
          await sendAgentText(creds, recipient, formatAluxDigest(toSend, names));
          must(
            await supabase
              .from("whatsapp_agent_alux_notices")
              .update({ sent_at: new Date(now()).toISOString() })
              .in(
                "id",
                toSend.map((r) => r.id),
              ),
            "notices_mark",
          );
          stats.notices = toSend.length;
        } catch (error) {
          lastError = `notice ${errorText(error)}`;
        }
      }
    } finally {
      await supabase
        .from("whatsapp_agent_state")
        .update({
          lease_until: null,
          last_poll_at: new Date(now()).toISOString(),
          last_error: lastError,
          updated_at: new Date(now()).toISOString(),
        })
        .eq("id", 1);
    }

    return { body: { ok: true, configured: true, hasRecipient: Boolean(recipient), ...stats } };
  };
}

export const runWhatsAppAgentTick = createWhatsAppAgentRunner();
