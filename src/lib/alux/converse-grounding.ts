/**
 * Lote 3K · Anclaje (grounding), ranking determinístico y fallback.
 *
 * Módulo PURO (sin red, sin DB, sin modelo). Lo comparten el servidor
 * (`converse.functions.ts`) y las pruebas unitarias.
 *
 *  · `rankConverseCandidates`   → capa determinística de elegibilidad y orden.
 *  · `groundModelOutput`        → valida la salida del modelo contra los
 *                                 candidatos recuperados; rechaza ids
 *                                 inexistentes, hechos no citables y acciones
 *                                 no permitidas.
 *  · `composeDeterministicResponse` → respuesta útil sin IA (timeout, cuota,
 *                                 error, proveedor ausente).
 */
import {
  ALUX_CONVERSE_CONTRACT_VERSION,
  ALUX_CONVERSE_COPY,
  ALUX_CONVERSE_LIMITS,
  ALUX_FAMILY_LABEL,
  ALUX_UNAVAILABLE_FACT_LABEL,
  candidateKey,
  normalizeText,
  scrubModelText,
  tripItemKey,
  type AluxConverseAction,
  type AluxConverseAiStatus,
  type AluxConverseAudit,
  type AluxConverseCandidate,
  type AluxConverseEntityType,
  type AluxConverseFamily,
  type AluxConverseRecommendation,
  type AluxConverseResponse,
  type AluxConverseSequenceStep,
  type AluxConverseTripItem,
  type AluxConverseUnderstood,
  type AluxModelOutput,
  type AluxTravelIntent,
  type AluxUnavailableFactKind,
} from "./converse-contract";

export interface GroundingContext {
  /** Clave `entityType:entityId` de la entidad activa (no se repite). */
  readonly activeKey: string | null;
  /** Elementos guardados en Mi Viaje (anónimo o autenticado). */
  readonly tripItems: readonly AluxConverseTripItem[];
  readonly intent: AluxTravelIntent;
  readonly destinationSlug: string | null;
  readonly destinationLabel: string | null;
  readonly knownDestinationSlugs: readonly string[];
  readonly injectionFlagged: boolean;
  readonly retrievalScope: "destination" | "region" | "none";
  readonly familiesLoaded: readonly string[];
}

/* ─────────────────────────── utilidades ─────────────────────────── */

function tripKeySet(items: readonly AluxConverseTripItem[]): Set<string> {
  return new Set(items.filter((i) => i.targetId).map((i) => tripItemKey(i.kind, i.targetId)));
}

function tripItemFor(
  items: readonly AluxConverseTripItem[],
  c: AluxConverseCandidate,
): AluxConverseTripItem | null {
  if (!c.planKind) return null;
  return items.find((i) => i.kind === c.planKind && i.targetId === c.entityId) ?? null;
}

export function permittedActionsFor(
  c: AluxConverseCandidate,
  tripItems: readonly AluxConverseTripItem[],
): { actions: AluxConverseAction[]; alreadyInTrip: boolean; savedItemId: string | null } {
  const actions: AluxConverseAction[] = ["view"];
  const saved = tripItemFor(tripItems, c);
  if (c.planKind) {
    if (saved) actions.push("remove_from_trip");
    else actions.push("add_to_trip");
  }
  return {
    actions,
    alreadyInTrip: Boolean(saved),
    savedItemId: saved?.savedItemId ?? null,
  };
}

function toRecommendation(
  c: AluxConverseCandidate,
  reason: string,
  tripItems: readonly AluxConverseTripItem[],
  day: number | null,
): AluxConverseRecommendation {
  const perms = permittedActionsFor(c, tripItems);
  return {
    entityType: c.entityType,
    entityId: c.entityId,
    family: c.family,
    title: c.title,
    href: c.href,
    destinationSlug: c.destinationSlug,
    destinationLabel: c.destinationLabel,
    scope: c.scope,
    reason,
    confirmedFacts: c.facts.map((f) => f.text),
    unavailableFacts: c.unavailable.map((k) => ALUX_UNAVAILABLE_FACT_LABEL[k]),
    planKind: c.planKind,
    alreadyInTrip: perms.alreadyInTrip,
    savedItemId: perms.savedItemId,
    permittedActions: perms.actions,
    imageUrl: c.imageUrl,
    subtitle: c.subtitle,
    day,
  };
}

/* ─────────────────────────── ranking determinístico ─────────────────────────── */

const FAMILY_ORDER: readonly AluxConverseFamily[] = [
  "lugar",
  "experiencia",
  "restaurante",
  "hotel",
  "casa",
  "evento",
  "ruta",
  "destino",
  "otra",
];

export interface RankedCandidate {
  readonly candidate: AluxConverseCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
}

/**
 * Orden determinístico y explicable:
 *  1. excluye entidad activa, lo ya guardado (salvo que se pida quitar/reordenar)
 *     y candidatos sin URL;
 *  2. puntúa por familias solicitadas, intereses, accesibilidad, horario,
 *     alcance territorial (destino > cercanía > región) y datos disponibles;
 *  3. diversifica por familia (round-robin) para que Alux proponga un plan
 *     equilibrado, no seis hoteles.
 */
export function rankConverseCandidates(
  candidates: readonly AluxConverseCandidate[],
  ctx: Pick<GroundingContext, "activeKey" | "tripItems" | "intent">,
  opts: { limit?: number; keepSaved?: boolean } = {},
): RankedCandidate[] {
  const limit = opts.limit ?? ALUX_CONVERSE_LIMITS.maxCandidatesForModel;
  const saved = tripKeySet(ctx.tripItems);
  const intent = ctx.intent;
  const wantedFamilies = new Set(intent.families);
  const interestTags = new Set(intent.interests);

  const scored: RankedCandidate[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = candidateKey(c.entityType, c.entityId);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!c.href) continue;
    if (ctx.activeKey && key === ctx.activeKey) continue;
    const savedKey = c.planKind ? tripItemKey(c.planKind, c.entityId) : null;
    const isSaved = Boolean(savedKey && saved.has(savedKey));
    if (isSaved && !opts.keepSaved) continue;

    let score = 0;
    const reasons: string[] = [];
    if (c.scope === "destination") score += 30;
    else if (c.scope === "nearby") score += 12;
    else score += 8;

    if (wantedFamilies.size > 0) {
      if (wantedFamilies.has(c.family)) {
        score += 25;
        reasons.push(`coincide con lo que buscas (${ALUX_FAMILY_LABEL[c.family].toLowerCase()})`);
      } else score -= 6;
    }
    const tagHits = c.tags.filter((t) => interestTags.has(t));
    if (tagHits.length > 0) {
      score += 10 * Math.min(3, tagHits.length);
      reasons.push(`afín a ${tagHits.slice(0, 2).join(" y ")}`);
    }
    if (intent.company === "familia" && c.tags.includes("familias")) {
      score += 8;
      reasons.push("pensado para familias");
    }
    if (intent.company === "pareja" && c.tags.includes("parejas")) {
      score += 8;
      reasons.push("ideal en pareja");
    }
    if (intent.wantsAccessibility) {
      if (c.tags.includes("accesible")) {
        score += 14;
        reasons.push("con datos de accesibilidad publicados");
      } else if (c.unavailable.includes("accesibilidad")) score -= 10;
    }
    if (intent.asksHours) {
      if (c.openState) score += 6;
      else if (c.unavailable.includes("horario")) score -= 4;
    }
    if (intent.timeOfDay === "noche" && c.openState === "closed") score -= 8;
    if (c.openState === "open") score += 3;
    score += Math.min(5, c.facts.length);
    if (c.imageUrl) score += 1;
    scored.push({ candidate: c, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, "es"));

  // Diversificación por familia (round-robin sobre familias con candidatos).
  const buckets = new Map<AluxConverseFamily, RankedCandidate[]>();
  for (const r of scored) {
    const arr = buckets.get(r.candidate.family) ?? [];
    arr.push(r);
    buckets.set(r.candidate.family, arr);
  }
  const families = FAMILY_ORDER.filter((f) => buckets.has(f)).sort((a, b) => {
    const sa = buckets.get(a)![0]!.score;
    const sb = buckets.get(b)![0]!.score;
    return sb - sa;
  });
  const out: RankedCandidate[] = [];
  let round = 0;
  while (out.length < limit) {
    let pushed = false;
    for (const f of families) {
      const item = buckets.get(f)![round];
      if (!item) continue;
      out.push(item);
      pushed = true;
      if (out.length >= limit) break;
    }
    if (!pushed) break;
    round += 1;
  }
  return out;
}

/* ─────────────────────────── grounding de la salida del modelo ─────────────────────────── */

export interface GroundedResult {
  readonly text: string;
  readonly clarifyingQuestions: string[];
  readonly recommendations: AluxConverseRecommendation[];
  readonly sequence: AluxConverseSequenceStep[] | null;
  readonly reorderProposal: AluxConverseResponse["reorderProposal"];
  readonly confirmedFacts: string[];
  readonly inferences: string[];
  readonly unavailableFacts: string[];
  readonly understood: AluxConverseUnderstood;
  readonly rejectedRefs: number;
  readonly scrubbed: boolean;
}

function cleanLine(s: string, max: number): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

export function groundModelOutput(
  output: AluxModelOutput,
  candidates: readonly AluxConverseCandidate[],
  ctx: GroundingContext,
): GroundedResult {
  const byId = new Map<string, AluxConverseCandidate>();
  const factIndex = new Map<string, { text: string; owner: string }>();
  for (const c of candidates) {
    byId.set(c.entityId, c);
    for (const f of c.facts) factIndex.set(f.id, { text: f.text, owner: c.entityId });
  }
  const saved = tripKeySet(ctx.tripItems);
  let rejected = 0;

  // Recomendaciones: sólo ids recuperados; sin repetir; sin la entidad activa;
  // sin lo ya guardado salvo que la intención sea quitar/reordenar.
  const seen = new Set<string>();
  const recommendations: AluxConverseRecommendation[] = [];
  for (const r of output.recommendations) {
    const c = byId.get(r.id.trim());
    if (!c) {
      rejected += 1;
      continue;
    }
    const key = candidateKey(c.entityType, c.entityId);
    if (seen.has(key) || key === ctx.activeKey) {
      rejected += 1;
      continue;
    }
    const savedKey = c.planKind ? tripItemKey(c.planKind, c.entityId) : null;
    if (savedKey && saved.has(savedKey) && !(ctx.intent.asksRemove || ctx.intent.asksReplan)) {
      rejected += 1;
      continue;
    }
    seen.add(key);
    const reason = cleanLine(scrubModelText(r.reason ?? "").text, 200) || deterministicReason(c, ctx);
    recommendations.push(toRecommendation(c, reason, ctx.tripItems, r.day ?? null));
    if (recommendations.length >= ALUX_CONVERSE_LIMITS.maxRecommendations) break;
  }

  // Secuencia: sólo ids ya recomendados o recuperados; días crecientes.
  let sequence: AluxConverseSequenceStep[] | null = null;
  if (output.sequence && output.sequence.length > 0) {
    const steps: AluxConverseSequenceStep[] = [];
    const usedDays = new Set<number>();
    const ordered = output.sequence
      .map((s, i) => ({ day: s.day ?? i + 1, ids: s.ids }))
      .sort((a, b) => a.day - b.day);
    for (const s of ordered) {
      if (usedDays.has(s.day)) continue;
      const refs = s.ids
        .map((id) => byId.get(id.trim()))
        .filter((c): c is AluxConverseCandidate => Boolean(c))
        .map((c) => ({ entityType: c.entityType, entityId: c.entityId, title: c.title }));
      rejected += s.ids.length - refs.length;
      if (refs.length === 0) continue;
      usedDays.add(s.day);
      steps.push({ day: s.day, refs });
    }
    sequence = steps.length > 0 ? steps : null;
  }

  // Reordenamiento: permutación completa de las claves guardadas.
  let reorderProposal: AluxConverseResponse["reorderProposal"] = null;
  if (output.reorder && output.reorder.orderedSavedKeys.length > 0) {
    const proposed = output.reorder.orderedSavedKeys.map((k) => k.trim());
    const validKeys = ctx.tripItems.filter((i) => i.targetId).map((i) => tripItemKey(i.kind, i.targetId));
    const proposedSet = new Set(proposed);
    const isPermutation =
      proposed.length === validKeys.length &&
      proposedSet.size === proposed.length &&
      validKeys.every((k) => proposedSet.has(k));
    const isSameOrder = isPermutation && proposed.every((k, i) => k === validKeys[i]);
    if (isPermutation && !isSameOrder) {
      reorderProposal = {
        orderedKeys: proposed,
        rationale:
          cleanLine(scrubModelText(output.reorder.rationale ?? "").text, 200) || "Orden propuesto por Alux.",
      };
    } else if (!isPermutation) {
      rejected += 1;
    }
  }

  // Hechos confirmados: sólo por id de hecho recuperado.
  const confirmed: string[] = [];
  for (const id of output.citedFactIds) {
    const f = factIndex.get(id.trim());
    if (!f) {
      rejected += 1;
      continue;
    }
    const owner = byId.get(f.owner);
    const line = owner ? `${owner.title}: ${f.text}` : f.text;
    if (!confirmed.includes(line)) confirmed.push(line);
  }

  const inferences = output.inferences.map((i) => cleanLine(scrubModelText(i).text, 160)).filter(Boolean);

  const unavailable: string[] = [];
  for (const u of output.unavailable) {
    const label = ALUX_UNAVAILABLE_FACT_LABEL[u.kind as AluxUnavailableFactKind];
    if (!label) continue;
    const owner = u.id ? byId.get(u.id.trim()) : null;
    if (u.id && !owner) {
      rejected += 1;
      continue;
    }
    const line = owner ? `${label} no publicado en la ficha de ${owner.title}` : `${label} no disponible en el catálogo`;
    if (!unavailable.includes(line)) unavailable.push(line);
  }
  // Complementa con lo que la recuperación ya sabe que falta para lo recomendado.
  for (const r of recommendations) {
    for (const u of r.unavailableFacts) {
      const line = `${u} no publicado en la ficha de ${r.title}`;
      if (
        (ctx.intent.asksHours && u === ALUX_UNAVAILABLE_FACT_LABEL.horario) ||
        (ctx.intent.asksPrice && u === ALUX_UNAVAILABLE_FACT_LABEL.precio) ||
        (ctx.intent.wantsAccessibility && u === ALUX_UNAVAILABLE_FACT_LABEL.accesibilidad)
      ) {
        if (!unavailable.includes(line)) unavailable.push(line);
      }
    }
  }

  const understood: AluxConverseUnderstood = {
    destinationSlug:
      output.understood.destinationSlug && ctx.knownDestinationSlugs.includes(output.understood.destinationSlug)
        ? output.understood.destinationSlug
        : (ctx.destinationSlug ?? null),
    stage: output.understood.stage ?? ctx.intent.stage ?? null,
    company: output.understood.company ? cleanLine(output.understood.company, 60) : (ctx.intent.company ?? null),
    interests: Array.from(
      new Set([...output.understood.interests.map((i) => cleanLine(i, 60)).filter(Boolean), ...ctx.intent.interests]),
    ).slice(0, 10),
    travelDates: output.understood.travelDates ? cleanLine(output.understood.travelDates, 80) : null,
    durationDays: output.understood.durationDays ?? ctx.intent.durationDays ?? null,
    accessibility: output.understood.accessibility ? cleanLine(output.understood.accessibility, 120) : null,
    restrictions: output.understood.restrictions.map((r) => cleanLine(r, 80)).filter(Boolean).slice(0, 6),
  };

  const scrubbedText = scrubModelText(output.text);
  const text = cleanLine(scrubbedText.text, ALUX_CONVERSE_LIMITS.maxTextChars);
  const clarifyingQuestions = output.clarifyingQuestions
    .map((q) => cleanLine(q, 200))
    .filter(Boolean)
    .slice(0, ALUX_CONVERSE_LIMITS.maxClarifyingQuestions);

  return {
    text: text || ALUX_CONVERSE_COPY.noCatalog,
    clarifyingQuestions,
    recommendations,
    sequence,
    reorderProposal,
    confirmedFacts: confirmed.slice(0, 12),
    inferences,
    unavailableFacts: unavailable.slice(0, 8),
    understood,
    rejectedRefs: rejected,
    scrubbed: scrubbedText.scrubbed,
  };
}

/* ─────────────────────────── fallback determinístico ─────────────────────────── */

export function deterministicReason(c: AluxConverseCandidate, ctx: Pick<GroundingContext, "intent">): string {
  const where = c.destinationLabel ?? "el Oriente Maya";
  const fam = ALUX_FAMILY_LABEL[c.family];
  const bits: string[] = [];
  if (c.scope === "nearby") bits.push(`Cercanía · ${where}`);
  else bits.push(`${fam} publicado en ${where}`);
  const firstFact = c.facts[0]?.text;
  if (firstFact) bits.push(firstFact);
  if (ctx.intent.wantsAccessibility && c.tags.includes("accesible")) bits.push("con accesibilidad declarada");
  return `${bits.join(" · ")}.`.slice(0, 200);
}

function summarizeIntent(intent: AluxTravelIntent): string {
  const parts: string[] = [];
  if (intent.company) parts.push(`viaje ${intent.company === "solo" ? "en solitario" : `en ${intent.company}`}`);
  if (intent.durationDays) parts.push(`${intent.durationDays} día${intent.durationDays === 1 ? "" : "s"}`);
  if (intent.interests.length) parts.push(`interés en ${intent.interests.slice(0, 3).join(", ").replace(/-/g, " ")}`);
  if (intent.wantsAccessibility) parts.push("necesidades de accesibilidad");
  return parts.join(" · ");
}

export function composeDeterministicResponse(
  candidates: readonly AluxConverseCandidate[],
  ctx: GroundingContext,
  status: AluxConverseAiStatus,
  extra: { model: string | null; latencyMs: number; rateLimited?: boolean; candidateCount?: number } = {
    model: null,
    latencyMs: 0,
  },
): AluxConverseResponse {
  const keepSaved = ctx.intent.asksRemove || ctx.intent.asksReplan;
  const ranked = rankConverseCandidates(candidates, ctx, { limit: 4, keepSaved });
  const recommendations = ranked.map((r) =>
    toRecommendation(
      r.candidate,
      r.reasons.length > 0
        ? `${deterministicReason(r.candidate, ctx).replace(/\.$/, "")} · ${r.reasons[0]}.`.slice(0, 200)
        : deterministicReason(r.candidate, ctx),
      ctx.tripItems,
      null,
    ),
  );

  const where = ctx.destinationLabel ?? null;
  const intentLine = summarizeIntent(ctx.intent);
  const clarifying: string[] = [];
  let text: string;
  if (status === "blocked") {
    text = ALUX_CONVERSE_COPY.blockedNotice;
  } else if (!ctx.destinationSlug && ctx.retrievalScope !== "region") {
    text = "Para recomendarte con certeza necesito saber a qué destino del Oriente Maya quieres ir.";
    clarifying.push(ALUX_CONVERSE_COPY.askDestination);
  } else if (recommendations.length === 0) {
    text = where
      ? `Por ahora no encuentro publicaciones en ${where} que coincidan con lo que pides. Puedo mostrarte otras familias del catálogo o destinos cercanos.`
      : ALUX_CONVERSE_COPY.noCatalog;
  } else {
    text = `Con base en el catálogo publicado${where ? ` de ${where}` : " del Oriente Maya"}${
      intentLine ? ` y en lo que me cuentas (${intentLine})` : ""
    }, estas opciones son reales y están vigentes. Te explico cada una con los datos que sí tenemos.`;
  }

  const unavailable: string[] = [];
  for (const r of recommendations) {
    for (const u of r.unavailableFacts) {
      const line = `${u} no publicado en la ficha de ${r.title}`;
      if (
        (ctx.intent.asksHours && u === ALUX_UNAVAILABLE_FACT_LABEL.horario) ||
        (ctx.intent.asksPrice && u === ALUX_UNAVAILABLE_FACT_LABEL.precio) ||
        (ctx.intent.wantsAccessibility && u === ALUX_UNAVAILABLE_FACT_LABEL.accesibilidad)
      ) {
        if (!unavailable.includes(line)) unavailable.push(line);
      }
    }
  }

  const notice =
    status === "rate_limited"
      ? ALUX_CONVERSE_COPY.rateLimitedNotice
      : status === "blocked"
        ? null
        : ALUX_CONVERSE_COPY.fallbackNotice;

  const audit: AluxConverseAudit = {
    candidateCount: extra.candidateCount ?? candidates.length,
    rejectedRefs: 0,
    retrievalScope: ctx.retrievalScope,
    destinationSlug: ctx.destinationSlug,
    familiesLoaded: ctx.familiesLoaded,
    injectionFlagged: ctx.injectionFlagged,
  };

  return {
    version: ALUX_CONVERSE_CONTRACT_VERSION,
    mode: "deterministic",
    aiStatus: status,
    text,
    clarifyingQuestions: clarifying,
    recommendations,
    sequence: null,
    reorderProposal: null,
    confirmedFacts: recommendations.flatMap((r) => r.confirmedFacts.slice(0, 1).map((f) => `${r.title}: ${f}`)),
    inferences: intentLine ? [`Entendí: ${intentLine}.`] : [],
    unavailableFacts: unavailable,
    understood: {
      destinationSlug: ctx.destinationSlug,
      stage: ctx.intent.stage,
      company: ctx.intent.company,
      interests: [...ctx.intent.interests],
      travelDates: null,
      durationDays: ctx.intent.durationDays,
      accessibility: ctx.intent.wantsAccessibility ? "solicitada" : null,
      restrictions: [],
    },
    notice,
    model: extra.model,
    latencyMs: extra.latencyMs,
    rateLimited: Boolean(extra.rateLimited),
    audit,
  };
}

/** Texto compacto de un candidato para el bloque DATOS del prompt. */
export function candidateToPromptLine(c: AluxConverseCandidate, index: number): string {
  const facts = c.facts
    .slice(0, ALUX_CONVERSE_LIMITS.maxFactsPerCandidate)
    .map((f) => `${f.id}="${f.text}"`)
    .join(" · ");
  const missing = c.unavailable.length ? ` · sin dato: ${c.unavailable.join(", ")}` : "";
  const scope = c.scope === "destination" ? "destino" : c.scope === "nearby" ? "CERCANÍA (rotular)" : "región";
  const saved = c.planKind ? "" : " · no se puede guardar";
  return `${index + 1}. id="${c.entityId}" tipo=${c.family} título="${c.title}" destino=${c.destinationSlug ?? "—"} alcance=${scope}${saved}${
    c.summary ? ` resumen="${c.summary}"` : ""
  }${facts ? ` hechos: ${facts}` : ""}${missing}`;
}

/** Clave activa a partir de una referencia `kind:uuid` de la superficie. */
export function activeKeyFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const [kind, id] = ref.split(":");
  if (!kind || !id) return null;
  const map: Record<string, AluxConverseEntityType> = {
    business: "business",
    product: "product",
    event: "event",
    place: "place",
    route: "route",
    destination: "destination",
  };
  const t = map[kind];
  return t ? candidateKey(t, id) : null;
}

export { normalizeText };
