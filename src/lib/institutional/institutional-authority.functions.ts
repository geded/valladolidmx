/**
 * Lote 3B · C — Lectura/escritura de la autoridad institucional.
 *
 * Lectura pública anónima (`is_public = true`) y escritura restringida a
 * `admin` / `super_admin`. Fail-safe: ante cualquier error se devuelve
 * `null` y el registry aplica su fallback seguro — nunca se inventa una
 * autorización institucional.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  INSTITUTIONAL_AUTHORITY_KEY,
  normalizeInstitutionalAuthority,
  type InstitutionalAuthority,
} from "./institutional-authority";

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getInstitutionalAuthoritySettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<InstitutionalAuthority | null> => {
    try {
      const { data, error } = await publicClient()
        .from("platform_settings")
        .select("value")
        .eq("key", INSTITUTIONAL_AUTHORITY_KEY)
        .eq("is_public", true)
        .maybeSingle();
      if (error || !data) return null;
      return normalizeInstitutionalAuthority(data.value);
    } catch {
      return null;
    }
  },
);

export const getInstitutionalAuthorityAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InstitutionalAuthority | null> => {
    await assertAdmin(context as unknown as Parameters<typeof assertAdmin>[0]);
    const { data, error } = await context.supabase
      .from("platform_settings")
      .select("value")
      .eq("key", INSTITUTIONAL_AUTHORITY_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return normalizeInstitutionalAuthority(data.value);
  });

async function assertAdmin(context: {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
}): Promise<void> {
  const [a, b] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (a.error) throw new Error(`role_check_failed: ${a.error.message}`);
  if (b.error) throw new Error(`role_check_failed: ${b.error.message}`);
  if (!a.data && !b.data) throw new Error("forbidden");
}

export const updateInstitutionalAuthoritySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => normalizeInstitutionalAuthority(input))
  .handler(async ({ data, context }): Promise<InstitutionalAuthority> => {
    await assertAdmin(context as unknown as Parameters<typeof assertAdmin>[0]);
    const { error } = await context.supabase.from("platform_settings").upsert(
      {
        key: INSTITUTIONAL_AUTHORITY_KEY,
        value: data as unknown as Database["public"]["Tables"]["platform_settings"]["Insert"]["value"],
        is_public: true,
        description:
          "Autoridad institucional vigente: destinos que ostentan cada distintivo oficial.",
        updated_by: context.userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return data;
  });
