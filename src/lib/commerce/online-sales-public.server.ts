/**
 * Lectura pública del interruptor «Ventas en línea» (sólo servidor).
 * Usa el RPC `business_online_sales_public`, que devuelve únicamente las
 * empresas activadas con sus modos y canales.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessOnlineSales } from "@/lib/commerce/online-sales-rules";

export async function fetchPublicOnlineSales(
  sb: SupabaseClient,
  businessIds: readonly string[],
): Promise<Map<string, BusinessOnlineSales>> {
  const ids = Array.from(new Set(businessIds.filter(Boolean)));
  const out = new Map<string, BusinessOnlineSales>();
  if (!ids.length) return out;
  const { data, error } = await sb.rpc("business_online_sales_public", { _business_ids: ids });
  // Sin lectura no se activa nada: falla cerrado (experiencias no dependen de esto).
  if (error || !Array.isArray(data)) return out;
  for (const row of data as Array<{ business_id: string; modes: string[] | null; channels: string[] | null }>) {
    out.set(row.business_id, { enabled: true, modes: row.modes ?? [], channels: row.channels ?? [] });
  }
  return out;
}
