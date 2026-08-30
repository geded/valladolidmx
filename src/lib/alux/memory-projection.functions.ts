/**
 * G8-R1-E-R3 · Fusión anónimo → cuenta y continuidad multidispositivo.
 *
 * Sólo viaja el RESUMEN permitido (`memory-summary.ts`). El histórico
 * append-only de `visitor_intel.events` NO se reescribe ni se re-atribuye.
 *
 * Posesión: el navegador anónimo guarda un secreto aleatorio local; para
 * vincular su memoria a la cuenta envía ese secreto y el servidor almacena
 * únicamente su hash SHA-256. Un `subjectId` enviado sin secreto jamás
 * vincula nada (impide reclamar la memoria de otra persona).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AluxMemorySummarySchema,
  normalizeMemorySummary,
  type AluxMemorySummary,
} from "./memory-summary";

const SyncInput = z.object({
  summary: AluxMemorySummarySchema,
  personalization: z.enum(["active", "paused"]),
  /** Secreto aleatorio del navegador anónimo (nunca se persiste en claro). */
  possessionSecret: z.string().min(16).max(200).optional(),
});

export interface MemoryProjectionResult {
  readonly ok: boolean;
  readonly linked: boolean;
  readonly summary: AluxMemorySummary | null;
  readonly personalization: "active" | "paused";
}

async function sha256Hex(value: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(value).digest("hex");
}

type ProjectionRow = {
  summary: unknown;
  personalization: string;
  anonymous_subject_hash: string | null;
};

/** Guarda (idempotente) el resumen permitido del viajero autenticado. */
export const syncTravelerMemoryProjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SyncInput.parse(d))
  .handler(async ({ data, context }): Promise<MemoryProjectionResult> => {
    const hash = data.possessionSecret ? await sha256Hex(data.possessionSecret) : null;
    const ttlDays = Math.max(1, Math.round(data.summary.ttlMs / 86_400_000));
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();

    const { data: row, error } = await (
      context.supabase as never as {
        from: (t: string) => {
          upsert: (
            v: Record<string, unknown>,
            o: { onConflict: string },
          ) => {
            select: (c: string) => {
              single: () => Promise<{ data: ProjectionRow | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("traveler_memory_projection")
      .upsert(
        {
          user_id: context.userId,
          summary: data.summary,
          personalization: data.personalization,
          ...(hash ? { anonymous_subject_hash: hash, linked_at: new Date().toISOString() } : {}),
          expires_at: expiresAt,
        },
        { onConflict: "user_id" },
      )
      .select("summary, personalization, anonymous_subject_hash")
      .single();

    if (error || !row) {
      console.error("[alux.memory-projection] sync failed", error);
      return { ok: false, linked: false, summary: null, personalization: data.personalization };
    }
    return {
      ok: true,
      linked: Boolean(row.anonymous_subject_hash),
      summary: normalizeMemorySummary(row.summary),
      personalization: row.personalization === "paused" ? "paused" : "active",
    };
  });

/** Recupera el resumen del viajero en un dispositivo nuevo. */
export const getTravelerMemoryProjection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemoryProjectionResult> => {
    const { data: row, error } = await (
      context.supabase as never as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              c: string,
              v: string,
            ) => { maybeSingle: () => Promise<{ data: ProjectionRow | null; error: unknown }> };
          };
        };
      }
    )
      .from("traveler_memory_projection")
      .select("summary, personalization, anonymous_subject_hash")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error || !row) {
      return { ok: !error, linked: false, summary: null, personalization: "active" };
    }
    return {
      ok: true,
      linked: Boolean(row.anonymous_subject_hash),
      summary: normalizeMemorySummary(row.summary),
      personalization: row.personalization === "paused" ? "paused" : "active",
    };
  });

/** Borra la memoria del viajero en la nube (derecho al olvido). */
export const clearTravelerMemoryProjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { error } = await (
      context.supabase as never as {
        from: (t: string) => {
          delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
        };
      }
    )
      .from("traveler_memory_projection")
      .delete()
      .eq("user_id", context.userId);
    return { ok: !error };
  });
