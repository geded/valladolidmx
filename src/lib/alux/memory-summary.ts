/**
 * G8-R1-E-R3 · Contrato PURO del RESUMEN permitido de memoria.
 *
 * Es lo único que puede viajar del dispositivo a la cuenta (y de la cuenta
 * a otro dispositivo). Allowlist estricta: cualquier campo desconocido se
 * descarta (fail-closed). Prohibido: historial página a página, ubicación
 * precisa, texto del chat, tokens, correo, nombre, teléfono o IP.
 */
import { z } from "zod";
import type { AluxSignalSummary } from "./behavior-signals";

export const ALUX_MEMORY_SUMMARY_VERSION = "1.0.0" as const;

const slug = z.string().trim().toLowerCase().min(1).max(80);

export const AluxMemorySummarySchema = z
  .object({
    version: z.literal(ALUX_MEMORY_SUMMARY_VERSION),
    interests: z.array(slug).max(30).default([]),
    party: z
      .object({
        adults: z.number().int().min(0).max(30).optional(),
        minors: z.number().int().min(0).max(30).optional(),
        accessibility: z.array(slug).max(10).optional(),
      })
      .strict()
      .nullable()
      .default(null),
    preferences: z
      .object({
        budgetBand: z.enum(["economico", "medio", "premium"]).nullable().optional(),
        locale: z.string().trim().max(8).nullable().optional(),
      })
      .strict()
      .nullable()
      .default(null),
    categoryAffinity: z.array(slug).max(30).default([]),
    territoryAffinity: z.array(slug).max(30).default([]),
    acceptedRecommendations: z.array(slug).max(50).default([]),
    rejectedRecommendations: z.array(slug).max(50).default([]),
    updatedAt: z.number().int().nonnegative(),
    ttlMs: z.number().int().positive(),
  })
  .strict();

export type AluxMemorySummary = z.infer<typeof AluxMemorySummarySchema>;

export const EMPTY_MEMORY_SUMMARY: AluxMemorySummary = {
  version: ALUX_MEMORY_SUMMARY_VERSION,
  interests: [],
  party: null,
  preferences: null,
  categoryAffinity: [],
  territoryAffinity: [],
  acceptedRecommendations: [],
  rejectedRecommendations: [],
  updatedAt: 0,
  ttlMs: 30 * 24 * 60 * 60 * 1000,
};

/** Construye el resumen permitido desde el resumen de señales local. */
export function toMemorySummary(input: {
  readonly signals: AluxSignalSummary;
  readonly ttlMs: number;
  readonly now?: number;
  readonly party?: AluxMemorySummary["party"];
  readonly preferences?: AluxMemorySummary["preferences"];
}): AluxMemorySummary {
  const clean = (values: readonly string[]) =>
    Array.from(
      new Set(values.map((v) => String(v).trim().toLowerCase()).filter(Boolean)),
    ).slice(0, 30);
  const topCategories = Object.entries(input.signals.categoryAffinity ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([slugValue]) => slugValue);

  return AluxMemorySummarySchema.parse({
    version: ALUX_MEMORY_SUMMARY_VERSION,
    interests: clean(input.signals.savedKeys ?? []),
    party: input.party ?? null,
    preferences: input.preferences ?? null,
    categoryAffinity: clean(topCategories),
    territoryAffinity: clean(input.signals.exploredTerritories ?? []),
    acceptedRecommendations: clean(input.signals.acceptedKeys ?? []).slice(0, 50),
    rejectedRecommendations: clean(input.signals.rejectedKeys ?? []).slice(0, 50),
    updatedAt: input.now ?? Date.now(),
    ttlMs: input.ttlMs,
  });
}

/** Valida un resumen recuperado del servidor. `null` si no es admisible o caducó. */
export function normalizeMemorySummary(
  raw: unknown,
  now = Date.now(),
): AluxMemorySummary | null {
  const parsed = AluxMemorySummarySchema.safeParse(raw);
  if (!parsed.success) return null;
  if (now - parsed.data.updatedAt > parsed.data.ttlMs) return null;
  return parsed.data;
}
