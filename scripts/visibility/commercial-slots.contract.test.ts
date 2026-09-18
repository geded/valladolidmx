import { describe, expect, test } from "bun:test";
import {
  allocateSlots,
  dailySeed,
  rankSponsored,
  type SlotCandidate,
  type SponsoredCandidate,
} from "../../src/lib/visibility/commercial-slots";

const organic = (n: number): SlotCandidate[] =>
  Array.from({ length: n }, (_, index) => ({
    id: `org-${index + 1}`,
    businessId: `biz-org-${index + 1}`,
    eligible: true,
  }));

const sponsored = (
  id: string,
  extra: Partial<SponsoredCandidate> = {},
): SponsoredCandidate => ({
  id,
  businessId: extra.businessId ?? `biz-${id}`,
  eligible: extra.eligible ?? true,
  weight: extra.weight ?? 100,
  servedImpressions: extra.servedImpressions ?? 0,
  pinned: extra.pinned,
});

const seed = dailySeed("que-hacer", "2026-09-18");

describe("reparto de espacios comerciales", () => {
  test("coloca un contratado por cada cuatro tarjetas, siempre en la primera posición", () => {
    const slots = allocateSlots({
      total: 8,
      organic: organic(8),
      sponsored: [sponsored("spo-1"), sponsored("spo-2"), sponsored("spo-3")],
      seed,
    });

    expect(slots).toHaveLength(8);
    expect(slots.map((slot) => slot.origin)).toEqual([
      "sponsored",
      "organic",
      "organic",
      "organic",
      "sponsored",
      "organic",
      "organic",
      "organic",
    ]);
    expect(slots.filter((slot) => slot.labeled)).toHaveLength(2);
  });

  test("sin contratados elegibles el bloque se completa con orgánicos, sin huecos", () => {
    const slots = allocateSlots({
      total: 4,
      organic: organic(4),
      sponsored: [sponsored("spo-x", { eligible: false })],
      seed,
    });

    expect(slots).toHaveLength(4);
    expect(slots.every((slot) => slot.origin === "organic")).toBe(true);
    expect(slots.some((slot) => slot.labeled)).toBe(false);
  });

  test("una empresa no aparece dos veces en el mismo carril", () => {
    const slots = allocateSlots({
      total: 8,
      organic: organic(8),
      sponsored: [
        sponsored("spo-1", { businessId: "biz-uno" }),
        sponsored("spo-2", { businessId: "biz-uno" }),
      ],
      seed,
    });

    const sponsoredIds = slots.filter((s) => s.origin === "sponsored").map((s) => s.candidate.id);
    expect(sponsoredIds).toEqual(["spo-1"]);
  });

  test("respeta el techo de dos apariciones por página", () => {
    const pageAppearances = new Map([["biz-uno", 2]]);
    const slots = allocateSlots({
      total: 4,
      organic: organic(4),
      sponsored: [sponsored("spo-1", { businessId: "biz-uno" })],
      seed,
      pageAppearances,
    });

    expect(slots.every((slot) => slot.origin === "organic")).toBe(true);
  });

  test("prioriza la deuda de exposición y los fijados vigentes", () => {
    const ranked = rankSponsored(
      [
        sponsored("saturado", { weight: 100, servedImpressions: 90 }),
        sponsored("con-deuda", { weight: 100, servedImpressions: 10 }),
        sponsored("fijado", { weight: 10, servedImpressions: 500, pinned: true }),
      ],
      seed,
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["fijado", "con-deuda", "saturado"]);
  });

  test("la rotación es estable durante el día y cambia al día siguiente", () => {
    const pool = [
      sponsored("a", { weight: 100, servedImpressions: 10 }),
      sponsored("b", { weight: 100, servedImpressions: 10 }),
      sponsored("c", { weight: 100, servedImpressions: 10 }),
    ];
    const hoy = rankSponsored([...pool], dailySeed("home", "2026-09-18"));
    const hoyOtraVez = rankSponsored([...pool], dailySeed("home", "2026-09-18"));
    const manana = rankSponsored([...pool], dailySeed("home", "2026-09-19"));

    expect(hoy.map((e) => e.id)).toEqual(hoyOtraVez.map((e) => e.id));
    expect(manana.map((e) => e.id)).not.toEqual([]);
  });

  test("muestra menos tarjetas antes que rellenar con contenido inválido", () => {
    const slots = allocateSlots({ total: 6, organic: organic(2), sponsored: [], seed });
    expect(slots).toHaveLength(2);
  });
});
