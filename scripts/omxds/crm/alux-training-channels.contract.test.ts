/**
 * CRM · Fase 4 — entrenamiento de Alux y canales.
 * Ejecutar con: `bun test scripts/omxds/crm/alux-training-channels.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  detectKnowledgeGap,
  destinationBriefSlug,
  scrubGapQuestion,
} from "../../../src/lib/alux/knowledge-gaps";
import {
  channelsFromFlags,
  embedSnippet,
  normalizeEmbedHost,
  withChannel,
} from "../../../src/lib/alux/channels";

describe("Preguntas sin respuesta", () => {
  test("nunca guarda teléfonos ni correos", () => {
    const q = scrubGapQuestion("Soy ana@correo.com, mi cel 999 123 4567, ¿hay tours a Ek Balam?");
    expect(q).not.toContain("ana@correo.com");
    expect(q).not.toContain("4567");
  });
  test("se registra cuando Alux dice que no tiene el dato", () => {
    expect(
      detectKnowledgeGap({
        question: "¿A qué hora abre el cenote Suytun en domingo?",
        reply: "No tengo esa información publicada todavía.",
        candidateCount: 3,
      }),
    ).toBe("no_supo");
  });
  test("los saludos no se registran", () => {
    expect(
      detectKnowledgeGap({ question: "Hola", reply: "No tengo datos", candidateCount: 0 }),
    ).toBeNull();
  });
  test("la ficha de cada destino tiene su propio lugar en la base de conocimiento", () => {
    expect(destinationBriefSlug("izamal")).toBe("destino-izamal");
  });
});

describe("Canales de Alux", () => {
  test("si nadie lo ha apagado, Alux atiende en la web, WhatsApp y otras páginas", () => {
    expect(channelsFromFlags({ m1_identity: true })).toEqual({
      web: true,
      whatsapp: true,
      embed: true,
    });
  });
  test("apagar WhatsApp no apaga la web ni borra otros ajustes", () => {
    const flags = withChannel({ m4_knowledge: true }, "whatsapp", false);
    expect(channelsFromFlags(flags)).toEqual({ web: true, whatsapp: false, embed: true });
    expect(flags["m4_knowledge"]).toBe(true);
  });
  test("los sitios autorizados se guardan sin https ni rutas", () => {
    expect(normalizeEmbedHost("https://www.HotelMeson.com/reservas")).toBe("www.hotelmeson.com");
    expect(normalizeEmbedHost("no es un sitio")).toBeNull();
  });
  test("el código para pegar apunta al script de Alux", () => {
    expect(embedSnippet("https://www.quehacerenvalladolid.com", null)).toBe(
      '<script src="https://www.quehacerenvalladolid.com/alux-embed.js" async></script>',
    );
  });
});
