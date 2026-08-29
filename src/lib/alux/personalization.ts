/**
 * G8-R1-E · Priorización explicable y determinista de Alux IA.
 *
 * Capa PURA (sin red, sin DB, sin React, sin modelo). NO es un segundo
 * motor de recomendación: es la función de orden que consume lo que ya
 * existe y está acreditado:
 *
 *   · Universo de candidatos → catálogo canónico cerrado en R1-D
 *     (`canonical-catalog.server.ts`) o las sugerencias de
 *     `aluxContextualSuggest`. Aquí NUNCA se lee una tabla.
 *   · Contexto → `buildAluxUnifiedContext` (autoridad única, R1-D-R1).
 *   · Composición del viaje → `derivePartyProfile` (tarjeta existente).
 *   · Señales → `summarizeSignals` (Fase 3, consentidas y caducables).
 *   · Etapa → `deriveTravelStage` vía el contexto unificado (jamás una
 *     segunda verdad almacenada).
 *
 * Jerarquía vinculante (Fase 4), en este orden exacto:
 *   0. Restricciones duras  → EXCLUYEN (no penalizan).
 *   1. Preferencias expresas.
 *   2. Contenido ya guardado o agregado.
 *   3. Intención de navegación actual.
 *   4. Distancia (sólo con coordenadas consentidas).
 *   5. Diversidad y equilibrio del itinerario.
 *   6. Calidad y verificación editorial.
 *
 * Patrocinio: jamás suma puntaje ni desplaza a la mejor coincidencia.
 * Sólo desempata en último lugar y SIEMPRE se declara (`sponsored: true`
 * ⇒ `disclosure` presente).
 *
 * Explicabilidad: toda sugerencia devuelve `reasons[]` en lenguaje humano
 * derivado exclusivamente de reglas que se dispararon con datos reales.
 * Sin datos ⇒ sin razón inventada (`reasons` puede quedar en la razón
 * territorial mínima). Prohibido revelar campos internos del perfil.
 */
import type { AluxUnifiedContext } from "./unified-context";
import type { PartyProfile } from "@/lib/traveler/party-composition";
import { EMPTY_PARTY_PROFILE } from "@/lib/traveler/party-composition";
import { EMPTY_SIGNAL_SUMMARY, type AluxSignalSummary } from "./behavior-signals";
import type { TravelStage } from "@/lib/traveler/journey-stage";

export const ALUX_PERSONALIZATION_VERSION = "1.0.0" as const;

export type AluxOpenState = "open" | "closed" | "unknown";

export type AluxBudgetBand = "economico" | "medio" | "premium";

export interface AluxRankableCandidate {
  readonly entityId: string;
  readonly entityKind: "business" | "product" | "event" | "place" | "destination";
  readonly slug: string;
  readonly label: string;
  /** Ruta canónica real. Sin ella el candidato es inelegible. */
  readonly canonicalUrl: string | null;
  readonly published: boolean;
  readonly destinationSlug?: string | null;
  readonly zoneSlug?: string | null;
  readonly categorySlug?: string | null;
  readonly categoryName?: string | null;
  /** Ventana temporal verificada (eventos, temporadas). */
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
  readonly openState?: AluxOpenState;
  /** Rasgos de accesibilidad acreditados en ficha. */
  readonly accessibility?: readonly string[];
  readonly priceBand?: AluxBudgetBand | null;
  /** `false` sólo cuando la ficha declara explícitamente "sin menores". */
  readonly minorsAllowed?: boolean | null;
  /** Capacidad máxima acreditada del grupo. */
  readonly maxPartySize?: number | null;
  readonly interests?: readonly string[];
  readonly editorialVerified?: boolean;
  readonly sponsored?: boolean;
  /** Distancia en km. Sólo se usa con consentimiento de ubicación. */
  readonly distanceKm?: number | null;
  readonly alreadySaved?: boolean;
  readonly alreadyInPlan?: boolean;
}

export interface AluxRankedSuggestion {
  readonly candidate: AluxRankableCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
  /** Reglas disparadas (auditoría; nunca se muestra al viajero). */
  readonly signals: readonly string[];
  readonly sponsored: boolean;
  readonly disclosure?: string;
}

export interface AluxExcludedCandidate {
  readonly slug: string;
  readonly reason: string;
  readonly rule: string;
}

export interface AluxPersonalizationResult {
  readonly version: typeof ALUX_PERSONALIZATION_VERSION;
  readonly stage: TravelStage;
  readonly ranked: readonly AluxRankedSuggestion[];
  readonly excluded: readonly AluxExcludedCandidate[];
  /** `false` cuando no hay ninguna señal real de personalización. */
  readonly personalized: boolean;
  readonly reason: string;
}

export interface RankAluxCandidatesInput {
  readonly unified: AluxUnifiedContext;
  readonly candidates: readonly AluxRankableCandidate[];
  readonly party?: PartyProfile | null;
  readonly signals?: AluxSignalSummary | null;
  /** Rasgos de accesibilidad REQUERIDOS declarados por el viajero. */
  readonly requiredAccessibility?: readonly string[];
  /** Categorías/slugs ya presentes en Mi Viaje (afinidad temática). */
  readonly savedCategorySlugs?: readonly string[];
  readonly limit?: number;
  readonly now?: Date;
}

/* ─────────────────────────── utilidades puras ─────────────────────────── */

const norm = (v: string | null | undefined): string => (v ?? "").trim().toLowerCase();

function overlap(a: readonly string[], b: readonly string[]): string[] {
  const setB = new Set(b.map(norm).filter(Boolean));
  const out: string[] = [];
  for (const raw of a) {
    const v = norm(raw);
    if (v && setB.has(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Restricción dura temporal: sólo excluye cuando AMBOS extremos son
 * verificados y no hay ninguna intersección posible.
 */
function outsideTripWindow(
  candidate: AluxRankableCandidate,
  tripStart: string | null,
  tripEnd: string | null,
): boolean {
  const cStart = dateOnly(candidate.startsAt);
  const cEnd = dateOnly(candidate.endsAt);
  if (!cStart && !cEnd) return false;
  if (!tripStart && !tripEnd) return false;
  const ts = tripStart ?? tripEnd!;
  const te = tripEnd ?? tripStart!;
  if (cEnd && cEnd < ts) return true;
  if (cStart && cStart > te) return true;
  return false;
}

/* ────────────────────────────── algoritmo ─────────────────────────────── */

/** Pesos deterministas. Documentados para auditoría del Founder. */
export const ALUX_WEIGHTS = {
  expressInterest: 40,
  expressInterestCap: 80,
  budgetMatch: 25,
  budgetMismatch: -25,
  savedAffinity: 30,
  alreadyInPlan: -120,
  alreadySaved: -20,
  navigationCategory: 20,
  behaviorAffinity: 5, // × afinidad (máx. 3) ⇒ tope 15
  zoneMatch: 10,
  distanceMax: 20,
  diversityPenalty: 12,
  editorialVerified: 8,
  openNowOnTrip: 25,
  closedNowOnTrip: -30,
  verifiedScheduleOnPreTrip: 10,
  partyFit: 15,
  rejectedPenalty: -60,
  acceptedBoost: 15,
} as const;

/**
 * Ordena candidatos de forma determinista y explicable.
 * Entradas iguales ⇒ salida idéntica. Sin datos ⇒ sin personalización.
 */
export function rankAluxCandidates(input: RankAluxCandidatesInput): AluxPersonalizationResult {
  const unified = input.unified;
  // Addendum Founder: la tarjeta de composición es la autoridad. El contexto
  // unificado ya la deriva; `input.party` sólo sirve para pruebas dirigidas.
  const party = input.party ?? unified.party ?? EMPTY_PARTY_PROFILE;
  const signals = input.signals ?? EMPTY_SIGNAL_SUMMARY;
  const stage = unified.trip.stage;
  const limit = input.limit ?? 6;

  const destinationSlug = norm(unified.territory.destinationSlug);
  const zoneSlug = norm(unified.territory.zoneSlug);
  const activeCategory = norm(unified.entity.entityKind === "category" ? unified.entity.slug : null);
  const interests = unified.profile.interests ?? [];
  const budget = norm(unified.profile.budgetBand) as AluxBudgetBand | "";
  const required = (input.requiredAccessibility ?? []).map(norm).filter(Boolean);
  const savedCategories = (input.savedCategorySlugs ?? []).map(norm).filter(Boolean);
  const canUseDistance = unified.permissions.canUseLocation === true && Boolean(unified.coords);

  const excluded: AluxExcludedCandidate[] = [];
  const scored: Array<{
    candidate: AluxRankableCandidate;
    score: number;
    reasons: string[];
    signals: string[];
  }> = [];

  for (const c of input.candidates) {
    /* ── 0 · Restricciones duras: excluyen, no penalizan ── */
    if (!c.published) {
      excluded.push({ slug: c.slug, reason: "no está publicado", rule: "hard.published" });
      continue;
    }
    if (!c.canonicalUrl) {
      excluded.push({ slug: c.slug, reason: "sin ruta canónica", rule: "hard.canonical" });
      continue;
    }
    const cDest = norm(c.destinationSlug);
    if (destinationSlug && cDest && cDest !== destinationSlug) {
      excluded.push({
        slug: c.slug,
        reason: "fuera del territorio elegido",
        rule: "hard.territory",
      });
      continue;
    }
    if (outsideTripWindow(c, dateOnly(unified.trip.startDate), dateOnly(unified.trip.endDate))) {
      excluded.push({ slug: c.slug, reason: "fuera de tus fechas", rule: "hard.dates" });
      continue;
    }
    if (required.length) {
      const met = overlap(required, c.accessibility ?? []);
      if (met.length !== required.length) {
        excluded.push({
          slug: c.slug,
          reason: "no acredita la accesibilidad que necesitas",
          rule: "hard.accessibility",
        });
        continue;
      }
    }
    if (party.hasMinors && c.minorsAllowed === false) {
      excluded.push({ slug: c.slug, reason: "no admite menores", rule: "hard.party.minors" });
      continue;
    }
    if (
      party.partySize != null &&
      typeof c.maxPartySize === "number" &&
      c.maxPartySize > 0 &&
      party.partySize > c.maxPartySize
    ) {
      excluded.push({
        slug: c.slug,
        reason: "no acomoda a tu grupo",
        rule: "hard.party.capacity",
      });
      continue;
    }

    let score = 0;
    const reasons: string[] = [];
    const fired: string[] = [];

    /* ── 1 · Preferencias expresas ── */
    const matchedInterests = overlap(interests, [
      ...(c.interests ?? []),
      c.categorySlug ?? "",
      c.categoryName ?? "",
    ]);
    if (matchedInterests.length) {
      score += Math.min(
        ALUX_WEIGHTS.expressInterestCap,
        matchedInterests.length * ALUX_WEIGHTS.expressInterest,
      );
      fired.push("express.interest");
      reasons.push(`Coincide con lo que te interesa: ${matchedInterests.slice(0, 2).join(", ")}.`);
    }
    if (budget && c.priceBand) {
      if (c.priceBand === budget) {
        score += ALUX_WEIGHTS.budgetMatch;
        fired.push("express.budget.match");
        reasons.push("Va con el presupuesto que elegiste.");
      } else if (
        (budget === "economico" && c.priceBand === "premium") ||
        (budget === "premium" && c.priceBand === "economico")
      ) {
        score += ALUX_WEIGHTS.budgetMismatch;
        fired.push("express.budget.mismatch");
      }
    }
    if (party.composition) {
      score += ALUX_WEIGHTS.partyFit;
      fired.push(`express.party.${party.composition}`);
      reasons.push(
        party.hasMinors
          ? "Te lo sugiero porque viajas con niños."
          : party.composition === "pareja"
            ? "Funciona bien para dos."
            : party.composition === "amigos"
              ? "Aguanta bien a un grupo."
              : "Buena opción para viajar por tu cuenta.",
      );
    }

    /* ── 2 · Contenido ya guardado o agregado ── */
    if (c.alreadyInPlan) {
      score += ALUX_WEIGHTS.alreadyInPlan;
      fired.push("saved.inPlan");
    } else if (c.alreadySaved) {
      score += ALUX_WEIGHTS.alreadySaved;
      fired.push("saved.favorite");
    } else if (savedCategories.length && norm(c.categorySlug) && savedCategories.includes(norm(c.categorySlug))) {
      score += ALUX_WEIGHTS.savedAffinity;
      fired.push("saved.affinity");
      reasons.push(`Combina con lo que ya guardaste en ${c.categoryName || c.categorySlug}.`);
    }

    /* ── 3 · Intención de navegación actual ── */
    if (activeCategory && norm(c.categorySlug) === activeCategory) {
      score += ALUX_WEIGHTS.navigationCategory;
      fired.push("navigation.category");
      reasons.push("Es de la categoría que estás explorando.");
    }
    if (zoneSlug && norm(c.zoneSlug) === zoneSlug) {
      score += ALUX_WEIGHTS.zoneMatch;
      fired.push("navigation.zone");
    }
    if (signals.enabled) {
      const affinity = signals.categoryAffinity[norm(c.categorySlug)] ?? 0;
      if (affinity > 0) {
        score += affinity * ALUX_WEIGHTS.behaviorAffinity;
        fired.push("behavior.affinity");
      }
      const key = norm(c.slug);
      if (signals.rejectedKeys.includes(key)) {
        score += ALUX_WEIGHTS.rejectedPenalty;
        fired.push("behavior.rejected");
      } else if (signals.acceptedKeys.includes(key)) {
        score += ALUX_WEIGHTS.acceptedBoost;
        fired.push("behavior.accepted");
      }
    }

    /* ── 4 · Distancia (sólo con consentimiento) ── */
    if (canUseDistance && typeof c.distanceKm === "number" && c.distanceKm >= 0) {
      const bonus = Math.max(0, ALUX_WEIGHTS.distanceMax - c.distanceKm);
      if (bonus > 0) {
        score += bonus;
        fired.push("distance.near");
        reasons.push(`Está a ${Math.round(c.distanceKm)} km de donde estás.`);
      }
    }

    /* ── 5 · Etapa del viaje ── */
    if (stage === "on_trip") {
      if (c.openState === "open") {
        score += ALUX_WEIGHTS.openNowOnTrip;
        fired.push("stage.onTrip.open");
        reasons.push("Está abierto ahora.");
      } else if (c.openState === "closed") {
        score += ALUX_WEIGHTS.closedNowOnTrip;
        fired.push("stage.onTrip.closed");
      }
    } else if (stage === "pre_trip" && (c.openState === "open" || c.startsAt)) {
      score += ALUX_WEIGHTS.verifiedScheduleOnPreTrip;
      fired.push("stage.preTrip.schedule");
      reasons.push("Tiene horarios verificados para tus fechas.");
    } else if (stage === "post_trip" && (c.alreadyInPlan || c.alreadySaved)) {
      // Después del viaje, lo vivido vuelve a ser relevante (reseñas/recuerdos).
      score += Math.abs(ALUX_WEIGHTS.alreadyInPlan) + ALUX_WEIGHTS.acceptedBoost;
      fired.push("stage.postTrip.revisit");
      reasons.push("Lo viviste en este viaje: cuéntanos cómo te fue.");
    }

    /* ── 6 · Calidad y verificación editorial ── */
    if (c.editorialVerified) {
      score += ALUX_WEIGHTS.editorialVerified;
      fired.push("quality.verified");
    }

    /* Razón territorial mínima — nunca vacío, nunca inventado. */
    if (!reasons.length && unified.territory.destinationLabel) {
      reasons.push(`Está publicado en ${unified.territory.destinationLabel}.`);
    }

    scored.push({ candidate: c, score, reasons, signals: fired });
  }

  /* Orden determinista: puntaje ↓ · no-patrocinado primero · slug ↑ */
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const sa = a.candidate.sponsored ? 1 : 0;
    const sb = b.candidate.sponsored ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return a.candidate.slug.localeCompare(b.candidate.slug);
  });

  /* ── 5b · Diversidad: penaliza repetir categoría al seleccionar ── */
  const picked: AluxRankedSuggestion[] = [];
  const seenCategory = new Map<string, number>();
  const pool = [...scored];
  while (picked.length < limit && pool.length) {
    let bestIdx = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const cat = norm(pool[i]!.candidate.categorySlug);
      const repeats = cat ? (seenCategory.get(cat) ?? 0) : 0;
      const value = pool[i]!.score - repeats * ALUX_WEIGHTS.diversityPenalty;
      if (value > bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }
    const chosen = pool.splice(bestIdx, 1)[0]!;
    const cat = norm(chosen.candidate.categorySlug);
    if (cat) seenCategory.set(cat, (seenCategory.get(cat) ?? 0) + 1);
    const sponsored = chosen.candidate.sponsored === true;
    picked.push({
      candidate: chosen.candidate,
      score: chosen.score,
      reasons: chosen.reasons,
      signals: chosen.signals,
      sponsored,
      ...(sponsored ? { disclosure: "Contenido patrocinado, identificado como tal." } : {}),
    });
  }

  const personalized =
    interests.length > 0 ||
    Boolean(budget) ||
    party.composition != null ||
    signals.enabled ||
    savedCategories.length > 0 ||
    canUseDistance ||
    stage !== "inspiration";

  return {
    version: ALUX_PERSONALIZATION_VERSION,
    stage,
    ranked: picked,
    excluded,
    personalized,
    reason: personalized
      ? "Ordené las opciones con lo que ya me compartiste."
      : "Aún no sé lo suficiente de ti: te muestro lo mejor del destino.",
  };
}
