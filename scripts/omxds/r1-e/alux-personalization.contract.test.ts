/**
 * G8-R1-E · Gate `validate:r1:e` — contrato de personalización de Alux IA.
 *
 * 20 escenarios obligatorios del Founder + privacidad/consentimiento +
 * continuidad anónima + Addendum de composición del viaje.
 * Capas puras, sin red y sin DB: el gate es determinista.
 */
import { describe, expect, test } from "bun:test";
import {
  buildAluxUnifiedContext,
  hasSufficientAluxContext,
  resolveAluxContextScope,
  type AluxUnifiedContext,
} from "../../../src/lib/alux/unified-context";
import type { AluxContext } from "../../../src/lib/alux/use-alux-context";
import {
  rankAluxCandidates,
  type AluxRankableCandidate,
} from "../../../src/lib/alux/personalization";
import {
  derivePartyProfile,
  PARTY_OPTIONS,
  EMPTY_PARTY_PROFILE,
} from "../../../src/lib/traveler/party-composition";
import {
  summarizeSignals,
  pruneSignals,
  ALUX_SIGNAL_TTL_MS,
} from "../../../src/lib/alux/behavior-signals";

const NOW = new Date("2026-03-10T12:00:00Z");

function ctxOf(partial: Partial<AluxContext> = {}): AluxContext {
  return {
    hasContext: true,
    region: { slug: "oriente-maya", label: "Oriente Maya" },
    destination: { slug: "valladolid", label: "Valladolid" },
    category: undefined,
    business: undefined,
    product: undefined,
    related: [],
    canonical: "/oriente-maya/valladolid",
    reason: "Explorando Valladolid.",
    origin: "live",
    ...partial,
  } as unknown as AluxContext;
}

function unifiedOf(input: Parameters<typeof buildAluxUnifiedContext>[0]): AluxUnifiedContext {
  return buildAluxUnifiedContext({ now: NOW, ...input });
}

const base = (over: Partial<AluxRankableCandidate>): AluxRankableCandidate => ({
  entityId: over.slug ?? "id",
  entityKind: "business",
  slug: "candidato",
  label: "Candidato",
  canonicalUrl: "/oriente-maya/valladolid/hoteles/candidato",
  published: true,
  destinationSlug: "valladolid",
  ...over,
});

const CENOTE = base({
  slug: "cenote-zaci",
  label: "Cenote Zací",
  entityKind: "place",
  categorySlug: "cenotes",
  categoryName: "Cenotes",
  interests: ["cenotes", "naturaleza"],
  priceBand: "economico",
  editorialVerified: true,
  distanceKm: 1,
  openState: "open",
});
const HOTEL = base({
  slug: "hotel-colonial",
  label: "Hotel Colonial",
  categorySlug: "hoteles",
  categoryName: "Hoteles",
  priceBand: "premium",
  minorsAllowed: false,
  maxPartySize: 2,
  distanceKm: 12,
  openState: "open",
});
const RESTO = base({
  slug: "restaurante-maya",
  label: "Restaurante Maya",
  categorySlug: "restaurantes",
  categoryName: "Restaurantes",
  priceBand: "medio",
  accessibility: ["silla_ruedas"],
  openState: "closed",
  distanceKm: 3,
});
const POOL = [CENOTE, HOTEL, RESTO];

const rank = (
  unified: AluxUnifiedContext,
  over: Partial<Parameters<typeof rankAluxCandidates>[0]> = {},
) => rankAluxCandidates({ unified, candidates: POOL, now: NOW, ...over });

const slugs = (r: ReturnType<typeof rankAluxCandidates>) => r.ranked.map((x) => x.candidate.slug);

/* ══════════════ 1-2 · Anónimo ══════════════ */
describe("R1-E · anónimo", () => {
  test("1 · anónimo sin perfil: sin personalización ficticia", () => {
    const u = unifiedOf({ context: ctxOf() });
    const r = rank(u);
    expect(u.party).toEqual(EMPTY_PARTY_PROFILE);
    expect(r.personalized).toBe(false);
    expect(r.reason).toContain("Aún no sé lo suficiente");
    expect(r.ranked.every((x) => x.reasons.length > 0)).toBe(true);
  });

  test("2 · anónimo con navegación local: las señales cambian el orden", () => {
    const u = unifiedOf({ context: ctxOf() });
    const signals = summarizeSignals({
      now: NOW.getTime(),
      signals: [
        { kind: "category_explored", key: "restaurantes", at: NOW.getTime() - 1000, purpose: "personalization" },
        { kind: "category_explored", key: "restaurantes", at: NOW.getTime() - 900, purpose: "personalization" },
      ],
    });
    const withSignals = rank(u, { signals });
    expect(signals.enabled).toBe(true);
    expect(withSignals.personalized).toBe(true);
    const scoreOf = (r: ReturnType<typeof rankAluxCandidates>, slug: string) =>
      r.ranked.find((x) => x.candidate.slug === slug)!.score;
    expect(scoreOf(withSignals, "restaurante-maya")).toBeGreaterThan(scoreOf(rank(u), "restaurante-maya"));
  });
});

/* ══════════════ 3-8 · Perfiles ══════════════ */
describe("R1-E · perfiles", () => {
  test("3 · registrado con perfil incompleto no bloquea", () => {
    const u = unifiedOf({ context: ctxOf(), isAuthenticated: true });
    expect(rank(u).ranked.length).toBe(3);
  });

  test("4 · pareja premium prioriza premium y explica", () => {
    const u = unifiedOf({
      context: ctxOf(),
      profileHints: { travelStyle: "romantico", budgetBand: "premium", interests: [] },
      plan: { id: "p", party_size: 2, item_count: 0 },
    });
    expect(u.party.composition).toBe("pareja");
    const r = rank(u);
    const hotel = r.ranked.find((x) => x.candidate.slug === "hotel-colonial")!;
    expect(hotel.signals).toContain("express.budget.match");
    expect(hotel.reasons.join(" ")).toContain("Funciona bien para dos");
  });

  test("5 · familia con menores excluye lo que no admite menores", () => {
    const u = unifiedOf({
      context: ctxOf(),
      profileHints: { travelStyle: "familiar", interests: [] },
      plan: { id: "p", party_size: 4, item_count: 0 },
    });
    expect(u.party.hasMinors).toBe(true);
    const r = rank(u);
    expect(slugs(r)).not.toContain("hotel-colonial");
    expect(r.excluded.some((e) => e.rule === "hard.party.minors")).toBe(true);
    expect(r.ranked[0]!.reasons.join(" ")).toContain("viajas con niños");
  });

  test("6 · grupo excluye lo que no acomoda al grupo", () => {
    const u = unifiedOf({
      context: ctxOf(),
      profileHints: { travelStyle: "cultura", interests: [] },
      plan: { id: "p", party_size: 6, item_count: 0 },
    });
    expect(u.party.composition).toBe("amigos");
    const r = rank(u);
    expect(r.excluded.some((e) => e.rule === "hard.party.capacity")).toBe(true);
  });

  test("7 · accesibilidad declarada es restricción dura", () => {
    const u = unifiedOf({ context: ctxOf() });
    const r = rank(u, { requiredAccessibility: ["silla_ruedas"] });
    expect(slugs(r)).toEqual(["restaurante-maya"]);
    expect(r.excluded.every((e) => e.rule === "hard.accessibility")).toBe(true);
  });

  test("8 · presupuesto económico penaliza premium", () => {
    const u = unifiedOf({
      context: ctxOf(),
      profileHints: { budgetBand: "economico", interests: [] },
    });
    const r = rank(u);
    expect(slugs(r)[0]).toBe("cenote-zaci");
    expect(slugs(r).at(-1)).toBe("hotel-colonial");
  });
});

/* ══════════════ 9-10 · Ubicación ══════════════ */
describe("R1-E · ubicación y consentimiento", () => {
  test("9 · sin consentimiento la distancia NO influye", () => {
    const u = unifiedOf({ context: ctxOf(), coords: { lat: 20.6, lng: -88.2 } });
    expect(u.coords).toBeUndefined();
    expect(u.permissions.canUseLocation).toBe(false);
    const r = rank(u);
    expect(r.ranked.every((x) => !x.signals.includes("distance.near"))).toBe(true);
  });

  test("10 · con consentimiento la cercanía suma y se explica", () => {
    const u = unifiedOf({
      context: ctxOf(),
      locationConsent: true,
      coords: { lat: 20.6, lng: -88.2 },
    });
    const r = rank(u);
    const cenote = r.ranked.find((x) => x.candidate.slug === "cenote-zaci")!;
    expect(cenote.signals).toContain("distance.near");
    expect(cenote.reasons.join(" ")).toContain("km de donde estás");
  });
});

/* ══════════════ 11-16 · Mi Viaje, etapa y feedback ══════════════ */
describe("R1-E · Mi Viaje, etapa y feedback", () => {
  test("11 · Mi Viaje vacío no inventa afinidad", () => {
    const u = unifiedOf({ context: ctxOf() });
    expect(rank(u).ranked.every((x) => !x.signals.includes("saved.affinity"))).toBe(true);
  });

  test("12 · Mi Viaje con cenotes explica la combinación", () => {
    const u = unifiedOf({ context: ctxOf(), plan: { id: "p", item_count: 2 } });
    const r = rank(u, { savedCategorySlugs: ["cenotes"] });
    const cenote = r.ranked.find((x) => x.candidate.slug === "cenote-zaci")!;
    expect(cenote.signals).toContain("saved.affinity");
    expect(cenote.reasons.join(" ")).toContain("Combina con lo que ya guardaste");
  });

  test("13 · durante el viaje prioriza abierto ahora", () => {
    const u = unifiedOf({
      context: ctxOf(),
      plan: { id: "p", start_date: "2026-03-08", end_date: "2026-03-14", item_count: 1 },
    });
    expect(u.trip.stage).toBe("on_trip");
    const r = rank(u);
    expect(r.ranked[0]!.signals).toContain("stage.onTrip.open");
    expect(slugs(r).at(-1)).toBe("restaurante-maya");
  });

  test("14 · después del viaje recupera lo vivido", () => {
    const u = unifiedOf({
      context: ctxOf(),
      plan: { id: "p", start_date: "2026-02-20", end_date: "2026-02-25", item_count: 3 },
    });
    expect(u.trip.stage).toBe("post_trip");
    const r = rankAluxCandidates({
      unified: u,
      now: NOW,
      candidates: [{ ...CENOTE, alreadyInPlan: true }, HOTEL],
    });
    expect(slugs(r)[0]).toBe("cenote-zaci");
    expect(r.ranked[0]!.reasons.join(" ")).toContain("Lo viviste");
  });

  test("15 · sugerencia aceptada sube", () => {
    const u = unifiedOf({ context: ctxOf() });
    const signals = summarizeSignals({
      now: NOW.getTime(),
      signals: [
        { kind: "suggestion_accepted", key: "hotel-colonial", at: NOW.getTime(), purpose: "personalization" },
      ],
    });
    expect(rank(u, { signals }).ranked.find((x) => x.candidate.slug === "hotel-colonial")!.signals)
      .toContain("behavior.accepted");
  });

  test("16 · sugerencia rechazada baja al final", () => {
    const u = unifiedOf({ context: ctxOf() });
    const signals = summarizeSignals({
      now: NOW.getTime(),
      signals: [
        { kind: "suggestion_rejected", key: "cenote-zaci", at: NOW.getTime(), purpose: "personalization" },
      ],
    });
    expect(slugs(rank(u, { signals })).at(-1)).toBe("cenote-zaci");
  });
});

/* ══════════════ 17-20 · Restricciones duras ══════════════ */
describe("R1-E · restricciones duras", () => {
  test("17 · entidad draft nunca se recomienda", () => {
    const r = rankAluxCandidates({
      unified: unifiedOf({ context: ctxOf() }),
      candidates: [{ ...CENOTE, published: false }, HOTEL],
      now: NOW,
    });
    expect(slugs(r)).not.toContain("cenote-zaci");
    expect(r.excluded[0]!.rule).toBe("hard.published");
  });

  test("18 · entidad sin horario no se excluye ni se inventa apertura", () => {
    const u = unifiedOf({
      context: ctxOf(),
      plan: { id: "p", start_date: "2026-03-08", end_date: "2026-03-14", item_count: 1 },
    });
    const r = rankAluxCandidates({
      unified: u,
      candidates: [{ ...RESTO, openState: undefined }],
      now: NOW,
    });
    expect(slugs(r)).toEqual(["restaurante-maya"]);
    expect(r.ranked[0]!.reasons.join(" ")).not.toContain("abierto");
  });

  test("19 · entidad fuera del territorio elegido se excluye", () => {
    const r = rankAluxCandidates({
      unified: unifiedOf({ context: ctxOf() }),
      candidates: [{ ...CENOTE, destinationSlug: "izamal" }],
      now: NOW,
    });
    expect(r.ranked).toHaveLength(0);
    expect(r.excluded[0]!.rule).toBe("hard.territory");
  });

  test("20 · perfil sin coincidencias sigue devolviendo territorio real", () => {
    const u = unifiedOf({
      context: ctxOf(),
      profileHints: { interests: ["esqui", "opera"] },
    });
    const r = rank(u);
    expect(r.ranked.length).toBe(3);
    expect(r.ranked.every((x) => !x.signals.includes("express.interest"))).toBe(true);
    expect(r.ranked[0]!.reasons.join(" ")).toContain("Valladolid");
  });

  test("20b · evento fuera de las fechas del viaje se excluye", () => {
    const u = unifiedOf({
      context: ctxOf(),
      plan: { id: "p", start_date: "2026-03-08", end_date: "2026-03-14", item_count: 1 },
    });
    const r = rankAluxCandidates({
      unified: u,
      now: NOW,
      candidates: [
        base({ slug: "feria-pasada", entityKind: "event", startsAt: "2026-01-01", endsAt: "2026-01-05" }),
        base({ slug: "feria-vigente", entityKind: "event", startsAt: "2026-03-09", endsAt: "2026-03-12" }),
      ],
    });
    expect(slugs(r)).toEqual(["feria-vigente"]);
    expect(r.excluded[0]!.rule).toBe("hard.dates");
  });
});

/* ══════════════ Privacidad, consentimiento y patrocinio ══════════════ */
describe("R1-E · privacidad y patrocinio", () => {
  test("opt-out desactiva por completo las señales", () => {
    const s = summarizeSignals({
      optedOut: true,
      signals: [{ kind: "saved", key: "x", at: Date.now(), purpose: "personalization" }],
    });
    expect(s.enabled).toBe(false);
    expect(s.signalCount).toBe(0);
  });

  test("señales caducadas y tipos no permitidos se descartan", () => {
    const now = Date.now();
    const kept = pruneSignals(
      [
        { kind: "saved", key: "vigente", at: now - 1000, purpose: "personalization" },
        { kind: "saved", key: "vieja", at: now - ALUX_SIGNAL_TTL_MS - 1, purpose: "personalization" },
        { kind: "geolocation", key: "no", at: now, purpose: "personalization" },
        { kind: "saved", key: "sin-finalidad", at: now },
      ],
      now,
    );
    expect(kept.map((s) => s.key)).toEqual(["vigente"]);
  });

  test("el contexto nunca transporta PII", () => {
    const u = unifiedOf({ context: ctxOf(), isAuthenticated: true });
    const json = JSON.stringify(u);
    for (const forbidden of ["email", "phone", "token", "role", "avatar"]) {
      expect(json.toLowerCase()).not.toContain(forbidden);
    }
  });

  test("patrocinio jamás desplaza a la mejor coincidencia y se declara", () => {
    const u = unifiedOf({ context: ctxOf(), profileHints: { interests: ["cenotes"] } });
    const r = rankAluxCandidates({
      unified: u,
      now: NOW,
      candidates: [CENOTE, { ...HOTEL, sponsored: true }],
    });
    expect(slugs(r)[0]).toBe("cenote-zaci");
    const sponsored = r.ranked.find((x) => x.sponsored)!;
    expect(sponsored.disclosure).toBeTruthy();
  });

  test("misma entrada ⇒ misma salida (determinismo)", () => {
    const u = unifiedOf({ context: ctxOf(), profileHints: { interests: ["cenotes"] } });
    expect(JSON.stringify(rank(u))).toBe(JSON.stringify(rank(u)));
  });
});

/* ══════════════ Fase 6 · Home, eventos y alcance ══════════════ */
describe("R1-E · alcance de contexto", () => {
  test("Home entrega alcance regional sin fingir destino", () => {
    const u = unifiedOf({ context: ctxOf({ destination: undefined, canonical: "/" }) });
    expect(u.scope).toBe("region");
    expect(u.territory.destinationSlug).toBeNull();
    expect(hasSufficientAluxContext(u)).toBe(true);
  });

  test("sin territorio ni entidad el contexto falla de forma segura", () => {
    const u = unifiedOf({
      context: ctxOf({ region: undefined, destination: undefined, hasContext: false }),
    });
    expect(resolveAluxContextScope(u)).toBe("none");
    expect(hasSufficientAluxContext(u)).toBe(false);
  });
});

/* ══════════════ Addendum · Tarjeta de composición del viaje ══════════════ */
describe("R1-E · Addendum composición del viaje", () => {
  test("la tarjeta existente es la fuente única del vocabulario", () => {
    expect(PARTY_OPTIONS.map((o) => o.value)).toEqual(["solo", "pareja", "familiar", "amigos"]);
  });

  test("precedencia Mi Viaje → perfil → continuidad anónima", () => {
    expect(derivePartyProfile({ planPartySize: 5, travelStyle: "cultura" }).source).toBe("plan");
    expect(derivePartyProfile({ travelStyle: "romantico" }).source).toBe("profile");
    expect(derivePartyProfile({ anonymousTravelerCount: { adults: 2, children: 2 } }).source).toBe(
      "anonymous",
    );
  });

  test("continuidad anónima: la selección sobrevive al registro sin duplicarse", () => {
    const anon = derivePartyProfile({ anonymousTravelerCount: { adults: 2, children: 2 } });
    expect(anon.composition).toBe("familiar");
    const afterSignup = derivePartyProfile({
      travelStyle: "familiar",
      profilePartySize: 4,
      anonymousTravelerCount: { adults: 2, children: 2 },
    });
    expect(afterSignup.composition).toBe("familiar");
    expect(afterSignup.partySize).toBe(4);
  });

  test("cada composición produce una priorización o razón distinta", () => {
    const results = (["solo", "pareja", "familiar", "amigos"] as const).map((value) => {
      const option = PARTY_OPTIONS.find((o) => o.value === value)!;
      const u = unifiedOf({
        context: ctxOf(),
        profileHints: { travelStyle: option.style, interests: [] },
        plan: { id: "p", party_size: option.partySize, item_count: 0 },
      });
      const r = rank(u);
      return `${slugs(r).join(",")}|${r.ranked[0]!.reasons.join(" ")}`;
    });
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  test("sin dato de grupo no se inventa composición", () => {
    expect(derivePartyProfile({}).composition).toBeNull();
    expect(derivePartyProfile({}).hasMinors).toBe(false);
  });
});
