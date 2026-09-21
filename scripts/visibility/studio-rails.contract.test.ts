import { describe, expect, it } from "bun:test";
import {
  allocateRailSlots,
  commercialRails,
  createPageAppearances,
  railAcceptsSponsored,
} from "@/lib/visibility/studio-rails";
import type { SlotCandidate, SponsoredCandidate } from "@/lib/visibility/commercial-slots";

const organic = (count: number): SlotCandidate[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `org-${index}`,
    businessId: `b-org-${index}`,
    eligible: true,
  }));

const sponsored: SponsoredCandidate[] = [
  { id: "sp-1", businessId: "b-sp-1", eligible: true, weight: 10, servedImpressions: 0 },
];

const HOME = "vmx.home.premium-g4";
const LANDING = "premium-seo-landing";

describe("studio-rails · declaración de carriles comerciales", () => {
  it("lee los carriles declarados por la plantilla", () => {
    expect(commercialRails(HOME).length).toBeGreaterThan(0);
    expect(commercialRails(null)).toEqual([]);
    expect(commercialRails("vmx.no.declarada")).toEqual([]);
  });

  it("la landing SEO declara su carril de experiencias", () => {
    expect(railAcceptsSponsored(LANDING, "offers")).toBe(true);
    expect(railAcceptsSponsored(LANDING, "hero")).toBe(false);
  });

  it("fail-closed: plantilla o carril sin declarar se sirven orgánicos", () => {
    const slots = allocateRailSlots({
      templateKey: "vmx.no.declarada",
      railKey: "offers",
      total: 4,
      organic: organic(4),
      sponsored,
      isoDay: "2026-09-20",
    });
    expect(slots).toHaveLength(4);
    expect(slots.every((slot) => slot.origin === "organic")).toBe(true);
  });

  it("carril declarado: la presencia contratada ocupa la primera posición", () => {
    const slots = allocateRailSlots({
      templateKey: LANDING,
      railKey: "offers",
      total: 4,
      organic: organic(4),
      sponsored,
      isoDay: "2026-09-20",
    });
    expect(slots[0]?.candidate.id).toBe("sp-1");
    expect(slots[0]?.origin).toBe("sponsored");
    expect(slots[0]?.labeled).toBe(true);
  });

  it("el contador de página respeta el techo de 2 apariciones por empresa", () => {
    const pageAppearances = createPageAppearances();
    pageAppearances.set("b-sp-1", 2);
    const slots = allocateRailSlots({
      templateKey: LANDING,
      railKey: "offers",
      total: 4,
      organic: organic(4),
      sponsored,
      isoDay: "2026-09-20",
      pageAppearances,
    });
    expect(slots.every((slot) => slot.candidate.id !== "sp-1")).toBe(true);
  });

  it("la rotación es estable en el día y distinta entre carriles", () => {
    const run = (railKey: string) =>
      allocateRailSlots({
        templateKey: HOME,
        railKey,
        total: 4,
        organic: organic(4),
        sponsored: [],
        isoDay: "2026-09-20",
      }).map((slot) => slot.candidate.id);
    expect(run("experiencias")).toEqual(run("experiencias"));
  });
});
