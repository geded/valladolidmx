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
  embedSitesFromFlags,
  embedSnippet,
  matchEmbedHost,
  normalizeEmbedHost,
  resolveEmbedContext,
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

describe("Alux en la página de un aliado: la consola manda", () => {
  test("si la consola fijó destino y negocio, el código pegado no los cambia", () => {
    const r = resolveEmbedContext(
      { destination: "valladolid", business: "hotel-meson" },
      { destination: "izamal", business: "otro-hotel" },
    );
    expect(r.destination).toBe("valladolid");
    expect(r.business).toBe("hotel-meson");
    expect(r.businessFrom).toBe("consola");
  });
  test("si la consola dejó el negocio vacío, el código puede indicarlo", () => {
    const r = resolveEmbedContext(
      { destination: "valladolid", business: null },
      { business: "cafe-de-la-plaza" },
    );
    expect(r.destination).toBe("valladolid");
    expect(r.business).toBe("cafe-de-la-plaza");
    expect(r.businessFrom).toBe("codigo");
  });
  test("sin consola ni código, Alux no supone destino ni negocio", () => {
    expect(resolveEmbedContext(null, null)).toEqual({
      destination: null,
      destinationFrom: null,
      business: null,
      businessFrom: null,
    });
  });
  test("un valor raro en el código se ignora", () => {
    expect(resolveEmbedContext(null, { business: '"><script>' }).business).toBeNull();
  });
  test("un subdominio usa lo configurado para su sitio", () => {
    expect(matchEmbedHost("reservas.hotelmeson.com", ["hotelmeson.com"])).toBe("hotelmeson.com");
    expect(matchEmbedHost("hotelmeson.com.evil.io", ["hotelmeson.com"])).toBeNull();
  });
  test("lo que guarda la consola se lee por sitio", () => {
    expect(
      embedSitesFromFlags({ embed_sites: { "hotelmeson.com": { destination: "izamal" } } }),
    ).toEqual({ "hotelmeson.com": { destination: "izamal", business: null } });
  });
  test("el código para pegar puede llevar destino y empresa", () => {
    expect(
      embedSnippet("https://www.quehacerenvalladolid.com", {
        destination: "valladolid",
        business: "hotel-meson",
      }),
    ).toBe(
      '<script src="https://www.quehacerenvalladolid.com/alux-embed.js" async data-destino="valladolid" data-empresa="hotel-meson"></script>',
    );
  });
});
