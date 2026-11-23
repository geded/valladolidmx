/**
 * Ventas en línea por empresa · lectura y escritura del interruptor.
 *
 * Lectura: RLS deja ver el ajuste al personal y al equipo de la empresa.
 * Escritura: sólo Administración, a través del RPC
 * `admin_set_business_online_sales` (valida rol y deja historial).
 * La comisión por tipo vive en `platform_settings`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  COMMISSION_MODES,
  ONLINE_SALES_CHANNELS,
  ONLINE_SALES_COMMISSION_SETTING_KEY,
  ONLINE_SALES_MODES,
  normalizeCommissionByMode,
  normalizeOnlineSalesInput,
  type CommissionByMode,
  type OnlineSalesChannel,
  type OnlineSalesMode,
} from "@/lib/commerce/online-sales-rules";

type RoleRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function isAdmin(context: { supabase: unknown; userId: string }): Promise<boolean> {
  const client = context.supabase as unknown as RoleRpc;
  const results = await Promise.all(
    (["super_admin", "admin"] as const).map((role) =>
      client.rpc("has_role", { _user_id: context.userId, _role: role }),
    ),
  );
  for (const r of results) if (r.error) throw new Error(`role_check_failed: ${r.error.message}`);
  return results.some((r) => r.data === true);
}

export interface BusinessOnlineSalesState {
  enabled: boolean;
  modes: OnlineSalesMode[];
  channels: OnlineSalesChannel[];
  note: string | null;
  updatedAt: string | null;
  /** Sólo Administración puede cambiarlo. */
  canManage: boolean;
  commission: CommissionByMode;
}

async function readCommission(supabase: SupabaseClient<Database>): Promise<CommissionByMode> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", ONLINE_SALES_COMMISSION_SETTING_KEY)
    .maybeSingle();
  return normalizeCommissionByMode(data?.value ?? null);
}

export const getBusinessOnlineSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ businessId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<BusinessOnlineSalesState> => {
    const [row, canManage] = await Promise.all([
      context.supabase
        .from("business_online_sales")
        .select("enabled, modes, channels, note, updated_at")
        .eq("business_id", data.businessId)
        .maybeSingle(),
      isAdmin(context),
    ]);
    if (row.error) throw new Error(row.error.message);
    const commission = canManage ? await readCommission(context.supabase) : normalizeCommissionByMode(null);
    const r = row.data;
    const clean = normalizeOnlineSalesInput({
      enabled: Boolean(r?.enabled),
      modes: r?.modes ?? [],
      channels: r?.channels ?? [],
    });
    return {
      enabled: clean.enabled,
      modes: clean.modes,
      channels: clean.channels,
      note: r?.note ?? null,
      updatedAt: r?.updated_at ?? null,
      canManage,
      commission,
    };
  });

export const setBusinessOnlineSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        enabled: z.boolean(),
        modes: z.array(z.enum(ONLINE_SALES_MODES)).max(ONLINE_SALES_MODES.length),
        channels: z.array(z.enum(ONLINE_SALES_CHANNELS)).max(ONLINE_SALES_CHANNELS.length),
        note: z.string().trim().max(600).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const clean = normalizeOnlineSalesInput(data);
    if (data.enabled && !clean.enabled) throw new Error("online_sales_needs_mode_and_channel");
    const { error } = await context.supabase.rpc("admin_set_business_online_sales", {
      _business_id: data.businessId,
      _enabled: clean.enabled,
      _modes: clean.modes,
      _channels: clean.channels,
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getOnlineSalesCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ commission: CommissionByMode; canManage: boolean }> => {
    const canManage = await isAdmin(context);
    if (!canManage) return { commission: normalizeCommissionByMode(null), canManage };
    return { commission: await readCommission(context.supabase), canManage };
  });

export const setOnlineSalesCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object(
        Object.fromEntries(COMMISSION_MODES.map((m) => [m, z.number().int().min(0).max(10000)])) as Record<
          (typeof COMMISSION_MODES)[number],
          z.ZodNumber
        >,
      )
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<CommissionByMode> => {
    if (!(await isAdmin(context))) throw new Error("forbidden");
    const value = normalizeCommissionByMode(data);
    const { error } = await context.supabase.from("platform_settings").upsert(
      {
        key: ONLINE_SALES_COMMISSION_SETTING_KEY,
        value: value as unknown as Database["public"]["Tables"]["platform_settings"]["Insert"]["value"],
        is_public: false,
        description: "Comisión de Valladolid.mx por tipo de venta en línea (tienda, pedidos, hoteles).",
        updated_by: context.userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return value;
  });

/** Mensajes en español para los errores del servidor. */
export function onlineSalesErrorMessage(message: string): string {
  if (message.includes("forbidden")) return "Solo el administrador puede cambiar la venta en línea.";
  if (message.includes("online_sales_needs_mode_and_channel"))
    return "Elige al menos qué vende y por dónde antes de activarla.";
  if (message.includes("online_sales_not_enabled_for_business"))
    return "Primero activa «Ventas en línea» en la empresa para este tipo de producto.";
  return "No se pudo guardar. Intenta de nuevo.";
}
