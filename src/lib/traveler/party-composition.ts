/**
 * G8-R1-E · Addendum Founder — Composición del viaje (autoridad única).
 *
 * NO crea un control nuevo. Extrae el vocabulario que ya usaba la tarjeta
 * existente `WelcomeOnboardingModal` (paso "¿Con quién viajas?") para que
 * esa misma tarjeta siga siendo la autoridad VISUAL y esta capa sea la
 * autoridad FUNCIONAL compartida por:
 *
 *   · `WelcomeOnboardingModal` (captura — importa `PARTY_OPTIONS` de aquí).
 *   · `traveler_profiles.travel_style` + `trip_context.party_size` (perfil).
 *   · `travel_plans.party_size` (Mi Viaje).
 *   · `AnonymousTravelDraft.travelerCount` (continuidad anónima).
 *   · `buildAluxUnifiedContext` → priorización explicable de Alux.
 *
 * Prohibido duplicar o sustituir la tarjeta. Capa PURA: sin red, sin DB.
 */

export type PartyComposition = "solo" | "pareja" | "familiar" | "amigos";

export type PartyTravelStyle = "aventura" | "romantico" | "familiar" | "cultura";

export interface PartyOption {
  readonly value: PartyComposition;
  readonly label: string;
  readonly style: PartyTravelStyle;
  readonly partySize: number;
}

/**
 * Vocabulario canónico (idéntico al que ya mostraba la tarjeta existente).
 * Cambiarlo aquí cambia la tarjeta: fuente única, cero duplicación.
 */
export const PARTY_OPTIONS: readonly PartyOption[] = [
  { value: "solo", label: "Solo/a", style: "aventura", partySize: 1 },
  { value: "pareja", label: "En pareja", style: "romantico", partySize: 2 },
  { value: "familiar", label: "Con familia", style: "familiar", partySize: 4 },
  { value: "amigos", label: "Con amigos", style: "cultura", partySize: 3 },
];

export interface PartyProfile {
  readonly composition: PartyComposition | null;
  readonly partySize: number | null;
  readonly adults: number | null;
  readonly children: number | null;
  /** `true` sólo cuando hay evidencia real de menores. Nunca se infiere. */
  readonly hasMinors: boolean;
  /** Fuente acreditada del dato (auditoría Explainable-by-Default). */
  readonly source: "plan" | "profile" | "anonymous" | "none";
  /** Frase corta y no invasiva para explicar una recomendación. */
  readonly reason: string;
}

export const EMPTY_PARTY_PROFILE: PartyProfile = {
  composition: null,
  partySize: null,
  adults: null,
  children: null,
  hasMinors: false,
  source: "none",
  reason: "Aún no sé con quién viajas.",
};

/** Estilo de viaje del perfil → composición equivalente de la tarjeta. */
export function compositionFromTravelStyle(
  travelStyle: string | null | undefined,
): PartyComposition | null {
  const style = (travelStyle ?? "").trim().toLowerCase();
  if (!style) return null;
  const match = PARTY_OPTIONS.find((o) => o.style === style);
  return match?.value ?? null;
}

/** Tamaño de grupo → composición equivalente (sólo como último recurso). */
export function compositionFromPartySize(size: number | null | undefined): PartyComposition | null {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 1) return null;
  if (size === 1) return "solo";
  if (size === 2) return "pareja";
  return "amigos";
}

export interface DerivePartyProfileInput {
  /** `travel_plans.party_size` del plan activo (Mi Viaje). */
  readonly planPartySize?: number | null;
  /** `traveler_profiles.travel_style`. */
  readonly travelStyle?: string | null;
  /** `traveler_profiles.trip_context.party_size`. */
  readonly profilePartySize?: number | null;
  /** `AnonymousTravelDraft.travelerCount` (continuidad anónima local). */
  readonly anonymousTravelerCount?: {
    readonly adults: number;
    readonly children?: number;
  } | null;
}

const LABEL: Record<PartyComposition, string> = {
  solo: "viajas por tu cuenta",
  pareja: "viajan en pareja",
  familiar: "viajas en familia",
  amigos: "viajan en grupo",
};

/**
 * Deriva la composición del viaje SIN persistir un segundo modelo.
 *
 * Precedencia: Mi Viaje (dato operativo confirmado) → perfil declarado →
 * continuidad anónima local. Sin evidencia ⇒ `EMPTY_PARTY_PROFILE`
 * (jamás se inventa un grupo, ni menores, ni un tamaño por defecto).
 */
export function derivePartyProfile(input: DerivePartyProfileInput): PartyProfile {
  const anon = input.anonymousTravelerCount ?? null;
  const anonAdults = anon && Number.isFinite(anon.adults) ? Math.max(1, anon.adults) : null;
  const anonChildren = anon && Number.isFinite(anon.children ?? 0) ? (anon.children ?? 0) : null;

  const styleComposition = compositionFromTravelStyle(input.travelStyle);

  // 1 · Mi Viaje — dato operativo confirmado por el propio viajero.
  const planSize =
    typeof input.planPartySize === "number" && input.planPartySize >= 1
      ? input.planPartySize
      : null;
  if (planSize != null) {
    const composition = styleComposition ?? compositionFromPartySize(planSize);
    return finalize({
      composition,
      partySize: planSize,
      adults: anonAdults,
      children: anonChildren,
      source: "plan",
    });
  }

  // 2 · Perfil declarado en la tarjeta de composición.
  const profileSize =
    typeof input.profilePartySize === "number" && input.profilePartySize >= 1
      ? input.profilePartySize
      : null;
  if (styleComposition || profileSize != null) {
    const composition = styleComposition ?? compositionFromPartySize(profileSize);
    const size =
      profileSize ??
      (composition
        ? (PARTY_OPTIONS.find((o) => o.value === composition)?.partySize ?? null)
        : null);
    return finalize({
      composition,
      partySize: size,
      adults: anonAdults,
      children: anonChildren,
      source: "profile",
    });
  }

  // 3 · Continuidad anónima local (aún sin cuenta).
  if (anonAdults != null) {
    const total = anonAdults + (anonChildren ?? 0);
    const composition = (anonChildren ?? 0) > 0 ? "familiar" : compositionFromPartySize(total);
    return finalize({
      composition,
      partySize: total,
      adults: anonAdults,
      children: anonChildren,
      source: "anonymous",
    });
  }

  return EMPTY_PARTY_PROFILE;
}

function finalize(p: {
  composition: PartyComposition | null;
  partySize: number | null;
  adults: number | null;
  children: number | null;
  source: PartyProfile["source"];
}): PartyProfile {
  const hasMinors = p.composition === "familiar" || (p.children ?? 0) > 0;
  return {
    composition: p.composition,
    partySize: p.partySize,
    adults: p.adults,
    children: p.children,
    hasMinors,
    source: p.source,
    reason: p.composition
      ? `Sé que ${LABEL[p.composition]}.`
      : "Sé cuántos son, pero no cómo viajan.",
  };
}
