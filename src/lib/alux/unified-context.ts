/**
 * G8-R1-D2 · Contexto unificado de Alux IA.
 *
 * EXTIENDE (no reemplaza) el contrato existente `AluxContext`
 * (`use-alux-context.ts`). No crea un segundo Context Engine, ni un
 * segundo perfil, ni un segundo Travel Plan: compone en un único objeto
 * explicable las fuentes ya acreditadas:
 *
 *   · Territorio y entidad activa → Context Engine (`useAluxContext`).
 *   · Perfil seguro del explorador → `getAluxTravelerLens` (hints M2).
 *   · Fechas / grupo / guardados → contratos de Travel Plan
 *     (`getMyActivePlan`) y continuidad anónima (`importAnonymousDraft`).
 *   · Etapa derivada → `deriveTravelStage` (journey-stage), sin persistir
 *     un modelo nuevo.
 *
 * Invariantes vinculantes:
 *  · Cero PII: nunca viajan email, teléfono, nombre legal, roles ni tokens.
 *  · Coordenadas SÓLO con consentimiento explícito (`locationConsent`).
 *    Sin consentimiento el bloque `coords` se omite por completo.
 *  · `permissions` declara capacidades mínimas booleanas, jamás roles.
 *  · `reason` siempre presente: contrato Explainable-by-Default.
 *  · Capa PURA: sin red, sin base de datos, sin efectos. El llamador
 *    inyecta lo que ya cargó con los contratos existentes.
 */
import { deriveTravelStage, type TravelStage } from "@/lib/traveler/journey-stage";
import type { AluxContext } from "./use-alux-context";

export const ALUX_UNIFIED_CONTEXT_VERSION = "1.0.0" as const;

/** Tipos de entidad canónica que Alux puede tener como foco activo. */
export type AluxEntityKind =
  | "region"
  | "destination"
  | "zone"
  | "category"
  | "business"
  | "product"
  | "event"
  | "place";

export interface AluxUnifiedEntity {
  readonly entityId: string | null;
  readonly entityKind: AluxEntityKind | null;
  readonly slug: string | null;
  readonly canonicalUrl: string | null;
  readonly label: string | null;
}

export interface AluxUnifiedTerritory {
  readonly regionSlug: string | null;
  readonly destinationSlug: string | null;
  readonly destinationLabel: string | null;
  readonly zoneSlug: string | null;
}

export interface AluxUnifiedTrip {
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly daysUntilStart: number | null;
  readonly partySize: number | null;
  readonly partyComposition: string | null;
  readonly stage: TravelStage;
  readonly hasActivePlan: boolean;
  readonly planItemCount: number;
  readonly savedItemCount: number;
}

export interface AluxUnifiedProfile {
  readonly homeCountry: string | null;
  readonly preferredLanguage: string | null;
  readonly travelStyle: string | null;
  readonly budgetBand: string | null;
  readonly interests: readonly string[];
}

export interface AluxUnifiedPermissions {
  /** Puede guardar favoritos y agregar a Mi Viaje sin fricción remota. */
  readonly canSaveRemotely: boolean;
  /** Consentimiento explícito de ubicación otorgado. */
  readonly canUseLocation: boolean;
  /** Continuidad anónima pendiente de fusión al registrarse. */
  readonly hasAnonymousDraft: boolean;
}

export interface AluxUnifiedContext {
  readonly version: typeof ALUX_UNIFIED_CONTEXT_VERSION;
  readonly entity: AluxUnifiedEntity;
  readonly territory: AluxUnifiedTerritory;
  readonly trip: AluxUnifiedTrip;
  readonly profile: AluxUnifiedProfile;
  readonly permissions: AluxUnifiedPermissions;
  /** Sólo presente con consentimiento explícito de ubicación. */
  readonly coords?: { readonly lat: number; readonly lng: number };
  /** Contexto de navegación heredado del Context Engine. */
  readonly navigation: {
    readonly origin: AluxContext["origin"];
    readonly canonical: string | null;
  };
  /**
   * G8-R1-E · Composición del viaje derivada de la tarjeta existente
   * (`derivePartyProfile`). Autoridad funcional única: nunca se captura
   * ni se persiste aquí un segundo modelo de grupo.
   */
  readonly party: PartyProfile;
  /**
   * G8-R1-E · Fase 6 — alcance real del contexto. Home entrega alcance
   * `region` sin fingir destino ni entidad; `none` falla de forma segura.
   */
  readonly scope: "entity" | "destination" | "region" | "none";
  /** Motivo humano y explicable del contexto actual. */
  readonly reason: string;
}

export interface BuildAluxUnifiedContextInput {
  readonly context: AluxContext;
  readonly entityId?: string | null;
  readonly entityKind?: AluxEntityKind | null;
  readonly plan?: {
    readonly id?: string | null;
    readonly start_date?: string | null;
    readonly end_date?: string | null;
    readonly party_size?: number | null;
    readonly party_composition?: string | null;
    readonly item_count?: number | null;
  } | null;
  readonly savedItemCount?: number;
  readonly profileHints?: Partial<AluxUnifiedProfile> | null;
  readonly hasCompletedProfile?: boolean;
  readonly isAuthenticated?: boolean;
  readonly hasAnonymousDraft?: boolean;
  /** Consentimiento explícito. Sin `true`, las coordenadas se descartan. */
  readonly locationConsent?: boolean;
  /**
   * DEF-R1D-004 · Zona territorial candidata. Sólo se acredita si
   * `destinationSlug` coincide con el destino activo del contexto.
   * Nunca se infiere por texto, cercanía ni parecido de slug.
   */
  readonly zone?: { readonly slug: string; readonly destinationSlug: string } | null;
  readonly coords?: { readonly lat: number; readonly lng: number } | null;
  /** `traveler_profiles.trip_context.party_size` (perfil declarado). */
  readonly profilePartySize?: number | null;
  /** `AnonymousTravelDraft.travelerCount` (continuidad anónima local). */
  readonly anonymousTravelerCount?: {
    readonly adults: number;
    readonly children?: number;
  } | null;
  /** Inyectable para pruebas deterministas. */
  readonly now?: Date;
}


function dayDiff(from: Date, isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const target = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const base = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

/** Deriva la entidad activa del snapshot territorial cuando no se inyecta. */
function deriveEntity(
  ctx: AluxContext,
  entityId: string | null,
  entityKind: AluxEntityKind | null,
): AluxUnifiedEntity {
  const leaf =
    (ctx.product && { kind: "product" as const, slot: ctx.product }) ??
    (ctx.business && { kind: "business" as const, slot: ctx.business }) ??
    (ctx.category && { kind: "category" as const, slot: ctx.category }) ??
    (ctx.destination && { kind: "destination" as const, slot: ctx.destination }) ??
    null;
  return {
    entityId: entityId ?? null,
    entityKind: entityKind ?? leaf?.kind ?? null,
    slug: leaf?.slot.slug ?? null,
    canonicalUrl: ctx.canonical ?? leaf?.slot.href ?? null,
    label: leaf?.slot.label ?? null,
  };
}

/**
 * DEF-R1D-004 · Zona acreditada: pertenece al destino activo o es `null`.
 * Una zona incompatible NUNCA bloquea una recomendación válida: sólo se
 * descarta el dato territorial opcional.
 */
export function resolveContextZoneSlug(
  zone: { slug: string; destinationSlug: string } | null | undefined,
  destinationSlug: string | null,
): string | null {
  if (!zone) return null;
  const slug = zone.slug?.trim() ?? "";
  if (!slug) return null;
  if (!destinationSlug) return null;
  if (zone.destinationSlug?.trim() !== destinationSlug) return null;
  return slug;
}

/**
 * `true` cuando el contexto alcanza para sugerir. Contexto insuficiente
 * ⇒ Alux no sugiere y lo declara; jamás inventa.
 */
export function hasSufficientAluxContext(unified: AluxUnifiedContext): boolean {
  return Boolean(unified.territory.destinationSlug) || Boolean(unified.entity.entityId);
}

/**
 * Compone el contexto unificado. Fail-safe: cualquier fuente ausente se
 * omite; nunca se inventa fecha, grupo, coordenada ni perfil.
 */
export function buildAluxUnifiedContext(input: BuildAluxUnifiedContextInput): AluxUnifiedContext {
  const now = input.now ?? new Date();
  const ctx = input.context;
  const plan = input.plan ?? null;

  const daysUntilStart = dayDiff(now, plan?.start_date);
  const daysAfterEnd = (() => {
    const d = dayDiff(now, plan?.end_date);
    return d == null ? null : -d;
  })();
  const hasActiveTrip =
    daysUntilStart != null && daysAfterEnd != null && daysUntilStart <= 0 && daysAfterEnd <= 0;

  const planItemCount = plan?.item_count ?? 0;
  const stage = deriveTravelStage({
    hasTravelPlan: Boolean(plan?.id),
    hasPlanItems: planItemCount > 0,
    hasActiveTrip,
    daysUntilStart,
    daysAfterEnd,
    hasCompletedProfile: Boolean(input.hasCompletedProfile),
  });

  const locationConsent = input.locationConsent === true;
  const coords = locationConsent && input.coords ? input.coords : undefined;

  return {
    version: ALUX_UNIFIED_CONTEXT_VERSION,
    entity: deriveEntity(ctx, input.entityId ?? null, input.entityKind ?? null),
    territory: {
      regionSlug: ctx.region?.slug ?? null,
      destinationSlug: ctx.destination?.slug ?? null,
      destinationLabel: ctx.destination?.label ?? null,
      zoneSlug: resolveContextZoneSlug(input.zone, ctx.destination?.slug ?? null),
    },
    trip: {
      startDate: plan?.start_date ?? null,
      endDate: plan?.end_date ?? null,
      daysUntilStart,
      partySize: plan?.party_size ?? null,
      partyComposition: plan?.party_composition ?? null,
      stage,
      hasActivePlan: Boolean(plan?.id),
      planItemCount,
      savedItemCount: input.savedItemCount ?? 0,
    },
    profile: {
      homeCountry: input.profileHints?.homeCountry ?? null,
      preferredLanguage: input.profileHints?.preferredLanguage ?? null,
      travelStyle: input.profileHints?.travelStyle ?? null,
      budgetBand: input.profileHints?.budgetBand ?? null,
      interests: input.profileHints?.interests ?? [],
    },
    permissions: {
      canSaveRemotely: input.isAuthenticated === true,
      canUseLocation: locationConsent,
      hasAnonymousDraft: input.hasAnonymousDraft === true,
    },
    ...(coords ? { coords } : {}),
    navigation: { origin: ctx.origin, canonical: ctx.canonical ?? null },
    reason: ctx.reason,
  };
}
