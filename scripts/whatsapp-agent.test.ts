/**
 * Agente de WhatsApp del administrador · reglas acordadas:
 *  - aviso agrupado por ronda, sin datos personales;
 *  - robots y avisos de más de 24 h no se envían;
 *  - reacciones y mensajes previos a la conexión no se contestan;
 *  - sin clave del agente o en simulación no se envía ni escribe nada.
 */
import { describe, expect, it } from "bun:test";
import {
  classifyNotice,
  decideInbound,
  formatAluxDigest,
  parseAgentUpdate,
  type AluxNoticeRow,
} from "../src/lib/whatsapp-agent/digest";
import { createWhatsAppAgentRunner } from "../src/lib/cron/jobs/whatsapp-agent.server";
import { makeFakeSupabase } from "./cron/fake-supabase";

const CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const NOW = Date.parse("2026-11-21T05:30:00Z");

function notice(over: Partial<AluxNoticeRow> = {}): AluxNoticeRow {
  return {
    id: "n1",
    started_at: "2026-11-21T05:14:00Z",
    destination_slug: "valladolid",
    registered: false,
    user_agent: CHROME,
    ...over,
  };
}

describe("aviso agrupado de Alux", () => {
  it("una persona: hora de Mérida, destino y tipo de visitante", () => {
    expect(formatAluxDigest([notice()], { valladolid: "Valladolid" })).toBe(
      "🌿 *Alux* · 1 persona inició una conversación\n• 23:14 · Valladolid · visitante sin cuenta",
    );
  });

  it("viajero con cuenta y más de ocho personas resume el resto", () => {
    const rows = Array.from({ length: 10 }, (_, i) => notice({ id: `n${i}`, registered: i === 0 }));
    const text = formatAluxDigest(rows, {});
    expect(text.startsWith("🌿 *Alux* · 10 personas iniciaron una conversación")).toBe(true);
    expect(text).toContain("viajero con cuenta");
    expect(text.endsWith("• y 2 más")).toBe(true);
  });

  it("robots declarados, navegadores automatizados o sin identificación no se avisan", () => {
    expect(classifyNotice(notice({ user_agent: "Mozilla/5.0 HeadlessChrome/131" }), NOW)).toBe(
      "bot",
    );
    expect(classifyNotice(notice({ user_agent: "Googlebot/2.1" }), NOW)).toBe("bot");
    expect(classifyNotice(notice({ user_agent: null }), NOW)).toBe("bot");
    expect(classifyNotice(notice(), NOW)).toBe("send");
  });

  it("avisos con más de 24 horas ya no se envían", () => {
    expect(classifyNotice(notice({ started_at: "2026-11-20T05:00:00Z" }), NOW)).toBe("stale");
  });
});

describe("mensajes que recibe el agente", () => {
  const setup = NOW;
  const base = { id: "w1", from: "user:1", text: "Hola", sentAtMs: NOW };

  it("textos nuevos se contestan; reacciones no", () => {
    expect(decideInbound({ ...base, type: "text" }, setup)).toBe("answer");
    expect(decideInbound({ ...base, type: "reaction" }, setup)).toBe("ignore");
  });

  it("mensajes escritos más de 10 minutos antes de conectar no se contestan", () => {
    expect(decideInbound({ ...base, type: "text", sentAtMs: NOW - 11 * 60_000 }, setup)).toBe(
      "ignore",
    );
    expect(decideInbound({ ...base, type: "text", sentAtMs: NOW - 5 * 60_000 }, setup)).toBe(
      "answer",
    );
  });

  it("lee el formato oficial de actualizaciones", () => {
    const update = parseAgentUpdate({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "user:5",
                    id: "wamid.A",
                    timestamp: "1795238028",
                    type: "text",
                    text: { body: "Hola" },
                  },
                  {
                    from: "agent:9",
                    id: "wamid.B",
                    timestamp: "1795238028",
                    type: "text",
                    text: { body: "x" },
                  },
                ],
                statuses: [],
              },
            },
          ],
        },
      ],
      next_offset: 2,
    });
    expect(update.nextOffset).toBe(2);
    expect(update.messages).toEqual([
      { id: "wamid.A", from: "user:5", type: "text", text: "Hola", sentAtMs: 1795238028000 },
    ]);
  });
});

describe("ronda programada", () => {
  it("sin clave del agente no envía ni escribe", async () => {
    const fake = makeFakeSupabase();
    const run = createWhatsAppAgentRunner({ creds: null });
    const result = await run(fake.client, { dryRun: false });
    expect(result.body).toEqual({ ok: true, configured: false });
    expect(fake.writes).toHaveLength(0);
  });

  it("en simulación no envía ni escribe", async () => {
    const fake = makeFakeSupabase();
    const run = createWhatsAppAgentRunner({ creds: { lovableApiKey: "x", connectionKey: "y" } });
    const result = await run(fake.client, { dryRun: true });
    expect(result.body).toEqual({ ok: true, configured: true, skipped: "dry_run" });
    expect(fake.writes).toHaveLength(0);
  });
});
