/**
 * G8-R1-E · Fase 3 — Señales de comportamiento consentidas de Alux.
 *
 * Capa PURA (sin red, sin DB, sin React). No crea un historial paralelo:
 * normaliza, caduca y resume las señales que ya emiten las superficies
 * (Context Engine, favoritos, Mi Viaje, aceptación/rechazo de sugerencia)
 * para que la priorización pueda usarlas de forma explicable.
 *
 * Invariantes vinculantes:
 *  · Lista CERRADA de tipos de señal. Cualquier otro tipo se descarta.
 *  · Cada señal declara `purpose`; sin finalidad declarada se descarta.
 *  · Caducidad obligatoria (`ALUX_SIGNAL_TTL_MS`). Nada es permanente.
 *  · Opt-out total: `optedOut` ⇒ resumen vacío, sin excepciones.
 *  · Cero PII, cero roles, cero tokens, cero ubicación, cero inferencias
 *    de salud, religión, origen étnico o situación económica.
 *  · Nunca sustituyen una preferencia expresa: el resumen sólo aporta
 *    afinidad blanda, acotada por `MAX_AFFINITY`.
 */

export const ALUX_SIGNAL_CONTRACT_VERSION = "1.0.0" as const;

/** Días de vida de una señal antes de caducar de forma automática. */
export const ALUX_SIGNAL_TTL_DAYS = 30;
export const ALUX_SIGNAL_TTL_MS = ALUX_SIGNAL_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Tope de afinidad blanda por categoría (nunca desplaza lo expreso). */
export const MAX_AFFINITY = 3;

/** Lista CERRADA de señales permitidas (Fase 3). */
export const ALLOWED_SIGNAL_KINDS = [
  "entity_viewed",
  "territory_viewed",
  "category_explored",
  "saved",
  "plan_added",
  "plan_removed",
  "suggestion_accepted",
  "suggestion_rejected",
] as const;

export type AluxSignalKind = (typeof ALLOWED_SIGNAL_KINDS)[number];

/** Finalidades declaradas admitidas. */
export const ALLOWED_SIGNAL_PURPOSES = ["personalization", "continuity"] as const;
export type AluxSignalPurpose = (typeof ALLOWED_SIGNAL_PURPOSES)[number];

export interface AluxBehaviorSignal {
  readonly kind: AluxSignalKind;
  /** Slug o id canónico. Nunca texto libre, nunca PII. */
  readonly key: string;
  /** Epoch ms de emisión. */
  readonly at: number;
  readonly purpose: AluxSignalPurpose;
}

export interface AluxSignalSummary {
  readonly enabled: boolean;
  /** categorySlug → afinidad 0..MAX_AFFINITY. */
  readonly categoryAffinity: Readonly<Record<string, number>>;
  readonly viewedEntityKeys: readonly string[];
  readonly exploredTerritories: readonly string[];
  readonly acceptedKeys: readonly string[];
  readonly rejectedKeys: readonly string[];
  readonly savedKeys: readonly string[];
  readonly removedKeys: readonly string[];
  readonly signalCount: number;
  readonly reason: string;
}

export const EMPTY_SIGNAL_SUMMARY: AluxSignalSummary = {
  enabled: false,
  categoryAffinity: {},
  viewedEntityKeys: [],
  exploredTerritories: [],
  acceptedKeys: [],
  rejectedKeys: [],
  savedKeys: [],
  removedKeys: [],
  signalCount: 0,
  reason: "Sin señales de navegación utilizables.",
};

const KIND_SET = new Set<string>(ALLOWED_SIGNAL_KINDS);
const PURPOSE_SET = new Set<string>(ALLOWED_SIGNAL_PURPOSES);

/** `true` si la señal es de un tipo y finalidad admitidos y tiene clave. */
export function isAllowedSignal(value: unknown): value is AluxBehaviorSignal {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<AluxBehaviorSignal>;
  if (typeof s.kind !== "string" || !KIND_SET.has(s.kind)) return false;
  if (typeof s.purpose !== "string" || !PURPOSE_SET.has(s.purpose)) return false;
  if (typeof s.key !== "string" || !s.key.trim() || s.key.length > 180) return false;
  if (typeof s.at !== "number" || !Number.isFinite(s.at) || s.at <= 0) return false;
  return true;
}

/** Descarta señales inválidas y caducadas. Determinista y sin efectos. */
export function pruneSignals(
  signals: readonly unknown[],
  now: number = Date.now(),
): readonly AluxBehaviorSignal[] {
  const out: AluxBehaviorSignal[] = [];
  for (const raw of signals) {
    if (!isAllowedSignal(raw)) continue;
    if (now - raw.at > ALUX_SIGNAL_TTL_MS) continue;
    if (raw.at > now + 60_000) continue; // reloj adelantado ⇒ no confiable
    out.push({
      kind: raw.kind,
      key: raw.key.trim().toLowerCase(),
      at: raw.at,
      purpose: raw.purpose,
    });
  }
  return out.sort((a, b) => (a.at === b.at ? a.key.localeCompare(b.key) : a.at - b.at));
}

export interface SummarizeSignalsInput {
  readonly signals: readonly unknown[];
  /** Exclusión total declarada por el visitante. */
  readonly optedOut?: boolean;
  readonly now?: number;
}

/**
 * Resume las señales en afinidad blanda. `optedOut` ⇒ resumen vacío.
 */
export function summarizeSignals(input: SummarizeSignalsInput): AluxSignalSummary {
  if (input.optedOut === true) {
    return { ...EMPTY_SIGNAL_SUMMARY, reason: "El visitante excluyó sus señales de navegación." };
  }
  const signals = pruneSignals(input.signals, input.now ?? Date.now());
  if (!signals.length) return EMPTY_SIGNAL_SUMMARY;

  const affinity: Record<string, number> = {};
  const viewed: string[] = [];
  const territories: string[] = [];
  const accepted: string[] = [];
  const rejected: string[] = [];
  const saved: string[] = [];
  const removed: string[] = [];

  const bump = (key: string, amount: number) => {
    affinity[key] = Math.max(0, Math.min(MAX_AFFINITY, (affinity[key] ?? 0) + amount));
  };

  for (const s of signals) {
    switch (s.kind) {
      case "entity_viewed":
        if (!viewed.includes(s.key)) viewed.push(s.key);
        break;
      case "territory_viewed":
        if (!territories.includes(s.key)) territories.push(s.key);
        break;
      case "category_explored":
        bump(s.key, 1);
        break;
      case "saved":
        if (!saved.includes(s.key)) saved.push(s.key);
        break;
      case "plan_added":
        if (!saved.includes(s.key)) saved.push(s.key);
        break;
      case "plan_removed":
        if (!removed.includes(s.key)) removed.push(s.key);
        break;
      case "suggestion_accepted":
        if (!accepted.includes(s.key)) accepted.push(s.key);
        break;
      case "suggestion_rejected":
        if (!rejected.includes(s.key)) rejected.push(s.key);
        break;
    }
  }

  return {
    enabled: true,
    categoryAffinity: affinity,
    viewedEntityKeys: viewed,
    exploredTerritories: territories,
    acceptedKeys: accepted,
    rejectedKeys: rejected,
    savedKeys: saved,
    removedKeys: removed,
    signalCount: signals.length,
    reason: `Uso ${signals.length} señal(es) recientes de tu navegación.`,
  };
}
