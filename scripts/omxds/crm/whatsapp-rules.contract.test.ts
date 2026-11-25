/**
 * CRM Prospectos · Fase 2 (WhatsApp) — reglas acordadas con el Founder (propuesta 19.48).
 * Ejecutar con: `bun test scripts/omxds/crm/whatsapp-rules.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  MAX_ALUX_REPLIES_PER_DAY,
  MAX_SENDS_PER_MINUTE,
  STABLE_PREVIEW_ORIGIN,
  decideInboundAction,
  deliveryKey,
  detectHandoffReason,
  formatForWhatsApp,
  isVmxInstance,
  jidToE164,
  makeInstanceName,
  parseAgendaDate,
  parseConciergeCommand,
  parseInboundMessage,
  parseWebhookBody,
  redactWebhookBody,
  resolveWebhookOrigin,
  shouldAluxReply,
} from "../../../src/lib/crm/whatsapp/rules";

describe("Las líneas de Zazil nunca se tocan", () => {
  test("sólo se aceptan líneas vmx-*", () => {
    expect(isVmxInstance("vmx-concierge-ab12")).toBe(true);
    expect(isVmxInstance("zt-977ec016")).toBe(false);
    expect(isVmxInstance("vmx-")).toBe(false);
  });
  test("el nombre generado siempre es vmx-*", () => {
    const name = makeInstanceName("Concierge Valladolid.mx", "a1b2c3d4");
    expect(name).toBe("vmx-concierge-valladolid-mx-a1b2c3d4");
    expect(isVmxInstance(name)).toBe(true);
  });
});

describe("Números de WhatsApp", () => {
  test("móvil de México con 521 se guarda como +52 (igual que en la web)", () => {
    expect(jidToE164("5219851234567@s.whatsapp.net")).toBe("+529851234567");
  });
  test("número extranjero conserva su lada", () => {
    expect(jidToE164("34612345678@s.whatsapp.net")).toBe("+34612345678");
  });
  test("chats de grupo o @lid no dan teléfono", () => {
    expect(jidToE164("120363@g.us")).toBeNull();
    expect(jidToE164("123456789@lid")).toBeNull();
  });
});

describe("Quién escribió cada mensaje", () => {
  const base = { remoteJid: "5219851234567@s.whatsapp.net", text: "Hola" };
  test("mensaje del cliente lo atiende Alux", () => {
    expect(decideInboundAction({ ...base, fromMe: false, isOwnOutbound: false })).toBe("customer");
  });
  test("lo que el concierge escribe desde el teléfono es respuesta humana", () => {
    expect(decideInboundAction({ ...base, fromMe: true, isOwnOutbound: false })).toBe(
      "human_reply",
    );
  });
  test("el eco de lo que mandó Alux no cuenta como respuesta humana", () => {
    expect(decideInboundAction({ ...base, fromMe: true, isOwnOutbound: true })).toBe("own_echo");
  });
  test("#alux desde el teléfono es un comando", () => {
    expect(
      decideInboundAction({ ...base, text: "#alux", fromMe: true, isOwnOutbound: false }),
    ).toBe("command");
  });
  test("los grupos se ignoran", () => {
    expect(
      decideInboundAction({
        remoteJid: "1203@g.us",
        text: "x",
        fromMe: false,
        isOwnOutbound: false,
      }),
    ).toBe("ignore");
  });
});

describe("Comandos # del concierge", () => {
  test("los seis comandos del plan se reconocen", () => {
    for (const c of ["alux", "apagar", "cotizar", "enlace", "nota", "agenda"]) {
      expect(parseConciergeCommand(`#${c} algo`)?.command).toBe(c as never);
    }
  });
  test("#nota conserva el texto", () => {
    expect(parseConciergeCommand("#nota Viene con 2 niños")).toEqual({
      command: "nota",
      arg: "Viene con 2 niños",
    });
  });
  test("un # que no es comando es un mensaje normal", () => {
    expect(parseConciergeCommand("#ValladolidMagico")).toBeNull();
  });
  test("#agenda 2026-11-25 10:00 es hora de Mérida (16:00 UTC)", () => {
    expect(parseAgendaDate("2026-11-25 10:00")).toBe("2026-11-25T16:00:00.000Z");
  });
  test("#agenda 25/11 sin hora agenda a las 10:00", () => {
    expect(parseAgendaDate("25/11", new Date("2026-11-21T12:00:00Z"))).toBe(
      "2026-11-25T16:00:00.000Z",
    );
  });
  test("fecha inválida no agenda", () => {
    expect(parseAgendaDate("31/02")).toBeNull();
    expect(parseAgendaDate("mañana")).toBeNull();
  });
});

describe("Pase al concierge", () => {
  test("pedir una persona activa el pase", () => {
    expect(detectHandoffReason("Quiero hablar con un asesor")).toBe("concierge");
  });
  test("querer reservar activa el pase", () => {
    expect(detectHandoffReason("Quiero reservar el tour")).toBe("booking");
  });
  test("pedir el viaje armado activa el pase", () => {
    expect(detectHandoffReason("Ármame el viaje por favor")).toBe("itinerary");
  });
  test("preguntar un precio solo no es pase: Alux contesta", () => {
    expect(detectHandoffReason("¿Cuánto cuesta el cenote?")).toBeNull();
  });
});

describe("Alux se calla cuando atiende un concierge", () => {
  test("con la plática tomada, Alux no contesta", () => {
    expect(shouldAluxReply({ aluxEnabled: true, mode: "human", repliesLast24h: 0 })).toBe(false);
  });
  test("con la línea en pausa, Alux no contesta", () => {
    expect(shouldAluxReply({ aluxEnabled: false, mode: "alux", repliesLast24h: 0 })).toBe(false);
  });
  test("tope de 40 respuestas de Alux por plática al día", () => {
    expect(MAX_ALUX_REPLIES_PER_DAY).toBe(40);
    expect(shouldAluxReply({ aluxEnabled: true, mode: "alux", repliesLast24h: 39 })).toBe(true);
    expect(shouldAluxReply({ aluxEnabled: true, mode: "alux", repliesLast24h: 40 })).toBe(false);
  });
  test("tope de 12 envíos automáticos por minuto", () => {
    expect(MAX_SENDS_PER_MINUTE).toBe(12);
  });
});

describe("Tono de WhatsApp (reglas de Zazil)", () => {
  test("máximo un signo de admiración", () => {
    const out = formatForWhatsApp("¡Hola! ¡Qué gusto! Te ayudo!!");
    expect((out.match(/!/g) ?? []).length).toBe(1);
    expect((out.match(/¡/g) ?? []).length).toBe(1);
  });
  test("sin negritas ni viñetas", () => {
    const out = formatForWhatsApp("**Cenote Suytun**\n- Abre a las 9\n• Tiene estacionamiento");
    expect(out).not.toContain("**");
    expect(out).not.toMatch(/^\s*[-•]/m);
  });
  test("mensajes largos se recortan a 1000 caracteres", () => {
    expect(formatForWhatsApp("Hola. ".repeat(400)).length).toBeLessThanOrEqual(1000);
  });
});

describe("Avisos del servidor de mensajes", () => {
  const body = {
    event: "messages.upsert",
    instance: "vmx-concierge-ab12",
    apikey: "secreto-de-la-linea",
    server_url: "https://servidor",
    date_time: "2026-11-21T15:00:00.000Z",
    data: {
      key: { id: "ABC123", remoteJid: "5219851234567@s.whatsapp.net", fromMe: false },
      pushName: "Ana",
      message: { conversation: "Hola, ¿qué hago en Valladolid?" },
      messageTimestamp: 1795000000,
    },
  };
  test("la clave de la línea nunca se guarda", () => {
    const saved = redactWebhookBody(body);
    expect(saved["apikey"]).toBeUndefined();
    expect(saved["server_url"]).toBeUndefined();
  });
  test("el mismo mensaje siempre tiene la misma llave (no se procesa dos veces)", () => {
    const parsed = parseWebhookBody(body)!;
    expect(deliveryKey(parsed, "h1")).toBe("msg:vmx-concierge-ab12:ABC123");
    expect(deliveryKey(parsed, "h2")).toBe("msg:vmx-concierge-ab12:ABC123");
  });
  test("se lee el texto y el nombre del perfil", () => {
    const msg = parseInboundMessage(body.data)!;
    expect(msg.text).toBe("Hola, ¿qué hago en Valladolid?");
    expect(msg.pushName).toBe("Ana");
    expect(msg.fromMe).toBe(false);
  });
});

describe("Dirección que recibe los avisos", () => {
  test("desde la vista previa se usa la dirección estable de la vista previa", () => {
    expect(resolveWebhookOrigin("https://id-preview--abc.lovable.app")).toBe(STABLE_PREVIEW_ORIGIN);
    expect(resolveWebhookOrigin("http://localhost:8080")).toBe(STABLE_PREVIEW_ORIGIN);
  });
  test("desde el sitio publicado se usa el propio sitio", () => {
    expect(resolveWebhookOrigin("https://www.quehacerenvalladolid.com")).toBe(
      "https://www.quehacerenvalladolid.com",
    );
  });
  test("un dominio ajeno nunca recibe los avisos", () => {
    expect(resolveWebhookOrigin("https://evil.example.com")).toBe(STABLE_PREVIEW_ORIGIN);
  });
});
