import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  deliveryKey,
  isVmxInstance,
  parseWebhookBody,
  redactWebhookBody,
} from "@/lib/crm/whatsapp/rules";

/**
 * CRM Prospectos · Fase 2 · receptor de avisos del servidor de mensajes
 * (Evolution API) para las líneas `vmx-*` de Valladolid.mx.
 *
 *  1. Verifica el token privado `?t=` en tiempo constante (fail closed).
 *  2. Guarda el aviso en la bandeja durable antes de procesarlo (sin la clave
 *     que el servidor adjunta); un aviso repetido no se duplica.
 *  3. Lo procesa y, de paso, reintenta pocos avisos pendientes.
 *  4. Responde 200 en cuanto el aviso quedó guardado; si el procesamiento
 *     falla queda pendiente para reintentarse. Nunca devuelve datos.
 */
const MAX_BODY_BYTES = 1024 * 1024;

function tokenOk(provided: string | null): boolean {
  const expected = process.env["EVOLUTION_WEBHOOK_TOKEN"] ?? "";
  if (expected.length < 32 || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function plain(status: number, text: string) {
  return new Response(text, { status, headers: { "content-type": "text/plain" } });
}

export const Route = createFileRoute("/api/public/whatsapp/evolution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        if (!tokenOk(url.searchParams.get("t"))) return plain(401, "Unauthorized");

        const length = Number(request.headers.get("content-length") ?? "0");
        if (length > MAX_BODY_BYTES) return plain(413, "Too large");
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return plain(413, "Too large");
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return plain(400, "Invalid JSON");
        }
        const parsed = parseWebhookBody(body);
        if (!parsed) return plain(400, "Invalid event");
        if (!isVmxInstance(parsed.instance)) return plain(200, "ignored");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: line, error: lineErr } = await supabaseAdmin
          .from("crm_whatsapp_lines")
          .select("id")
          .eq("instance_name", parsed.instance)
          .maybeSingle();
        if (lineErr) return plain(503, "Unavailable");
        if (!line) return plain(200, "ignored");

        const hash = createHash("sha256").update(raw).digest("hex").slice(0, 32);
        const key = deliveryKey(parsed, hash);
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("crm_whatsapp_inbox")
          .upsert(
            {
              line_id: line.id,
              delivery_key: key,
              event: parsed.event === "other" ? parsed.rawEvent.toLowerCase() : parsed.event,
              payload: redactWebhookBody(body),
            } as never,
            { onConflict: "delivery_key", ignoreDuplicates: true },
          )
          .select("id");
        if (insErr) {
          console.error("crm whatsapp inbox insert failed", {
            error: insErr.message.slice(0, 200),
          });
          return plain(503, "Unavailable");
        }

        const { processPending } = await import("@/lib/crm/whatsapp/process.server");
        try {
          const id = (inserted ?? [])[0]?.id as string | undefined;
          if (id) await processPending(supabaseAdmin, { id, limit: 1 });
          await processPending(supabaseAdmin, { limit: 2 });
        } catch (e) {
          console.error("crm whatsapp processing error", {
            error: e instanceof Error ? e.message.slice(0, 200) : "unknown",
          });
        }
        return plain(200, "ok");
      },
    },
  },
});
