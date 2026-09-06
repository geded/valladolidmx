/**
 * Lote 3B · Objetivo A — Contrato de materialización CMS-first de la Home.
 *
 * Exige que la revisión materializada (todo el contenido administrable en el
 * snapshot del CMS) resuelva EXACTAMENTE el mismo contenido que la revisión
 * vigente, que sólo declaraba decisiones de medios.
 */
import { describe, expect, it } from "vitest";
import { resolveHomePremiumG4 } from "@/components/home-premium/home-premium-config";
import { materializeHomePremiumConfig } from "@/lib/experience-builder/home-materialization";

/** Config exacta de la revisión 33 (activa antes de la materialización). */
const CURRENT_CONFIG = {
  variant: "premium-g4-approved",
  hero_slides: [{ media_url: "" }, { media_url: "" }],
  rutas_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }],
  destinos_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }, { media_url: "" }],
  servicios_food: [{ media_url: "" }, { media_url: "" }],
  que_hacer_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }],
  servicios_stays: [{ media_url: "" }, { media_url: "" }],
  eventos_media_url: "",
  experiencias_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }, { media_url: "" }],
} as Record<string, unknown>;

describe("Home CMS-first · materialización equivalente", () => {
  const materialized = materializeHomePremiumConfig(CURRENT_CONFIG);

  it("resuelve un contenido idéntico al de la revisión vigente", () => {
    expect(resolveHomePremiumG4(materialized)).toEqual(resolveHomePremiumG4(CURRENT_CONFIG));
  });

  it("materializa textos, enlaces, límites y visibilidad en el snapshot", () => {
    expect(typeof materialized.hero_title).toBe("string");
    expect((materialized.hero_title as string).length).toBeGreaterThan(0);
    expect(materialized.hero_cta_href).toMatch(/^\//);
    expect(Array.isArray(materialized.categorias_items)).toBe(true);
    expect(materialized.show_destinos).toBe(true);
    expect(materialized.show_mapa).toBe(true);
    expect(typeof materialized.destinos_max_items).toBe("number");
  });

  it("preserva las decisiones editoriales de medios vigentes", () => {
    expect(materialized.eventos_media_url).toBe("");
    for (const key of [
      "hero_slides",
      "rutas_items",
      "destinos_items",
      "servicios_food",
      "servicios_stays",
      "que_hacer_items",
      "experiencias_items",
    ]) {
      const rows = materialized[key] as Array<Record<string, unknown>>;
      expect(rows.length).toBe((CURRENT_CONFIG[key] as unknown[]).length);
      for (const row of rows) expect(row.media_url).toBe("");
    }
  });

  it("no recorta ninguna colección respecto de lo que hoy se renderiza", () => {
    const before = resolveHomePremiumG4(CURRENT_CONFIG).content;
    const after = resolveHomePremiumG4(materialized).content;
    expect(after.destinos.items.length).toBe(before.destinos.items.length);
    expect(after.rutas.items.length).toBe(before.rutas.items.length);
    expect(after.experiencias.items.length).toBe(before.experiencias.items.length);
    expect(after.queHacer.items.length).toBe(before.queHacer.items.length);
    expect(after.categorias.items.length).toBe(before.categorias.items.length);
  });

  it("mantiene el fallback de código operativo (sin pantalla blanca)", () => {
    const empty = resolveHomePremiumG4({});
    expect(empty.content.hero.title.length).toBeGreaterThan(0);
    expect(empty.order.length).toBeGreaterThan(0);
  });
});
