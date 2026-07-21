/**
 * AnonymousTravelDraft — contrato técnico v1.0.0 (AC1.1).
 *
 * TÉCNICO E INTERNO: por política Founder Concierge Voice, este nombre y sus
 * términos (borrador, draft, TTL, migración, storage) NUNCA se muestran al
 * viajero. Todo copy visible se resuelve por `anonymous-draft/copy.ts`.
 *
 * Local-first: vive en IndexedDB del dispositivo. No hay fila en DB, ni
 * cuenta anónima, ni Realtime. Contrato pequeño, serializable, migrable.
 */
import { z } from "zod";
import type { TravelStage } from "@/lib/traveler/journey-stage";

export const ANON_DRAFT_VERSION = "1.0.0" as const;
export const ANON_DRAFT_TTL_DAYS = 30;
export const ANON_DRAFT_TTL_MS = ANON_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

export const AnonymousFavoriteKindSchema = z.enum([
  "business",
  "product",
  "promotion",
  "event",
  "destination",
]);
export type AnonymousFavoriteKind = z.infer<typeof AnonymousFavoriteKindSchema>;

export const AnonymousItemKindSchema = z.enum([
  "destination",
  "business",
  "product",
  "event",
  "note",
  // Compatibilidad de lectura con la cola local anterior. Al importar se
  // normalizan a los contratos canónicos de Travel Plan.
  "promotion",
  "custom",
]);
export type AnonymousItemKind = z.infer<typeof AnonymousItemKindSchema>;

export const TravelStageSchema = z.enum([
  "inspiration",
  "exploration",
  "planning",
  "pre_trip",
  "on_trip",
  "post_trip",
]) as z.ZodType<TravelStage>;

export const AnonymousFavoriteSchema = z.object({
  kind: AnonymousFavoriteKindSchema,
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(180).optional(),
  slug: z.string().min(1).max(180).optional(),
  imageUrl: z.string().url().max(500).optional(),
  addedAt: z.number().int().nonnegative(),
});
export type AnonymousFavorite = z.infer<typeof AnonymousFavoriteSchema>;

export const AnonymousPlannedItemSchema = z.object({
  kind: AnonymousItemKindSchema,
  targetId: z.string().min(1).max(128).nullable(),
  title: z.string().min(1).max(180).optional(),
  slug: z.string().min(1).max(180).optional(),
  imageUrl: z.string().url().max(500).optional(),
  subtitle: z.string().min(1).max(220).optional(),
  notes: z.string().max(280).optional(),
  addedAt: z.number().int().nonnegative(),
});
export type AnonymousPlannedItem = z.infer<typeof AnonymousPlannedItemSchema>;

export const AnonymousTravelDraftSchema = z.object({
  draftId: z.string().uuid(),
  version: z.literal(ANON_DRAFT_VERSION),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  source: z.enum(["web", "pwa"]),
  travelStage: TravelStageSchema,
  destinationIds: z.array(z.string().min(1).max(128)).max(8),
  favorites: z.array(AnonymousFavoriteSchema).max(25),
  plannedItems: z.array(AnonymousPlannedItemSchema).max(40),
  tentativeDates: z
    .object({
      from: z.string().min(1).max(20).optional(),
      to: z.string().min(1).max(20).optional(),
    })
    .optional(),
  travelerCount: z
    .object({
      adults: z.number().int().min(1).max(20),
      children: z.number().int().min(0).max(20).optional(),
    })
    .optional(),
});
export type AnonymousTravelDraft = z.infer<typeof AnonymousTravelDraftSchema>;

/**
 * Crea un draft nuevo vacío. `now` inyectable para tests.
 */
export function createEmptyDraft(params?: {
  now?: number;
  source?: AnonymousTravelDraft["source"];
  travelStage?: TravelStage;
  draftId?: string;
}): AnonymousTravelDraft {
  const now = params?.now ?? Date.now();
  return {
    draftId: params?.draftId ?? cryptoRandomUuid(),
    version: ANON_DRAFT_VERSION,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ANON_DRAFT_TTL_MS,
    source: params?.source ?? "web",
    travelStage: params?.travelStage ?? "exploration",
    destinationIds: [],
    favorites: [],
    plannedItems: [],
  };
}

/**
 * Migración pura. v1 es la versión inicial: sólo valida.
 * Devuelve null si el payload no es rescatable (se descarta silenciosamente).
 */
export function migrateDraft(raw: unknown, now: number = Date.now()): AnonymousTravelDraft | null {
  const parsed = AnonymousTravelDraftSchema.safeParse(raw);
  if (!parsed.success) return null;
  const draft = parsed.data;
  if (draft.expiresAt <= now) return null;
  return draft;
}

function cryptoRandomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback determinista suficiente para entornos sin crypto.randomUUID.
  const rnd = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  return `${rnd()}-${rnd().slice(0, 4)}-4${rnd().slice(0, 3)}-a${rnd().slice(0, 3)}-${rnd()}${rnd().slice(0, 4)}`;
}
