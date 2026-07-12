/**
 * Ola A1 · Consola Alux — server functions para leer y actualizar
 * la configuración global de Alux (`alux_settings`, singleton).
 *
 * - Lectura: cualquier usuario autenticado (Alux la consume en runtime).
 * - Escritura: sólo admin / super_admin (RLS en la tabla).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AluxFlags {
  m1_identity: boolean;
  m2_travel_plan: boolean;
  m3_episodic: boolean;
  m4_knowledge: boolean;
  proactive_suggestions: boolean;
  cite_sources: boolean;
  prioritize_visibility: boolean;
}

export interface AluxSettings {
  id: string;
  persona: string;
  guardrails: string;
  default_model: string;
  temperature: number;
  max_tokens: number;
  flags: AluxFlags;
  capability_overrides: Record<string, { persona?: string; model?: string; temperature?: number }>;
  updated_at: string;
  updated_by: string | null;
}

export const DEFAULT_ALUX_FLAGS: AluxFlags = {
  m1_identity: true,
  m2_travel_plan: true,
  m3_episodic: true,
  m4_knowledge: true,
  proactive_suggestions: true,
  cite_sources: true,
  prioritize_visibility: true,
};

type SupabaseLike = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (a: string, b: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }>;
    };
  };
};

function normalize(row: Record<string, unknown> | null): AluxSettings | null {
  if (!row) return null;
  const flags = { ...DEFAULT_ALUX_FLAGS, ...((row.flags as Partial<AluxFlags>) ?? {}) };
  return {
    id: String(row.id),
    persona: String(row.persona ?? ""),
    guardrails: String(row.guardrails ?? ""),
    default_model: String(row.default_model ?? "google/gemini-3-flash-preview"),
    temperature: Number(row.temperature ?? 0.7),
    max_tokens: Number(row.max_tokens ?? 1200),
    flags,
    capability_overrides:
      (row.capability_overrides as AluxSettings["capability_overrides"]) ?? {},
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    updated_by: (row.updated_by as string | null) ?? null,
  };
}

export const getAluxSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context.supabase as unknown as SupabaseLike;
    const { data, error } = await c
      .from("alux_settings")
      .select(
        "id, persona, guardrails, default_model, temperature, max_tokens, flags, capability_overrides, updated_at, updated_by",
      )
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalize(data as Record<string, unknown> | null);
  });

const UpdateInput = z.object({
  persona: z.string().min(20).max(4000),
  guardrails: z.string().min(10).max(4000),
  default_model: z.string().min(3).max(120),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(64).max(8000),
  flags: z.object({
    m1_identity: z.boolean(),
    m2_travel_plan: z.boolean(),
    m3_episodic: z.boolean(),
    m4_knowledge: z.boolean(),
    proactive_suggestions: z.boolean(),
    cite_sources: z.boolean(),
    prioritize_visibility: z.boolean(),
  }),
});

export const updateAluxSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verificar rol admin explícitamente (defensa en profundidad; RLS ya lo exige).
    const rpc = context.supabase as unknown as {
      rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    };
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      rpc.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      rpc.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) throw new Error("Forbidden");

    const c = context.supabase as unknown as SupabaseLike;
    const { error } = await c
      .from("alux_settings")
      .update({
        persona: data.persona,
        guardrails: data.guardrails,
        default_model: data.default_model,
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        flags: data.flags,
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Helper server-side (no expuesto como server fn) para que otras server fns
 * de Alux resuelvan el prompt/persona/modelo activo. Recibe el cliente
 * Supabase autenticado que ya usan y devuelve settings normalizados o
 * los defaults si no hay fila (defensivo).
 */
export async function resolveAluxSettingsServer(
  supabase: unknown,
): Promise<AluxSettings> {
  const c = supabase as SupabaseLike;
  const { data } = await c
    .from("alux_settings")
    .select(
      "id, persona, guardrails, default_model, temperature, max_tokens, flags, capability_overrides, updated_at, updated_by",
    )
    .eq("singleton", true)
    .maybeSingle();
  const normalized = normalize(data as Record<string, unknown> | null);
  if (normalized) return normalized;
  return {
    id: "default",
    persona:
      "Eres Alux, la inteligencia turística de Valladolid y el Oriente Maya. Actúas como copiloto y concierge IA, nunca como chatbot genérico.",
    guardrails:
      "Nunca inventes datos. Prioriza al viajero. Cita el contexto. Nunca sustituyes al concierge humano.",
    default_model: "google/gemini-3-flash-preview",
    temperature: 0.7,
    max_tokens: 1200,
    flags: DEFAULT_ALUX_FLAGS,
    capability_overrides: {},
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

/**
 * Compone el prompt-sistema efectivo para una capacidad concreta,
 * anteponiendo la persona global y anexando los guardrails.
 */
export function composeSystemPrompt(
  settings: AluxSettings,
  capability: string,
  capabilityPrompt: string,
): string {
  const override = settings.capability_overrides[capability];
  const persona = override?.persona ?? settings.persona;
  return `${persona}\n\n${capabilityPrompt}\n\n---\nReglas obligatorias:\n${settings.guardrails}`;
}