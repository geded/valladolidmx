/**
 * Menciones «Recomendado» de Alux por empresa con paquete (Server-only).
 *
 * Fuente única: `business_view_events` (event_type `alux_mention`,
 * placement `contratado`), la misma tabla del rendimiento de visibilidad.
 * Sirve para respetar el tope diario del paquete (`alux_daily_cap`) y para
 * que Administración vea cuántas veces Alux recomendó a cada empresa.
 * Nunca interrumpe una respuesta: ante cualquier fallo, no cuenta ni registra.
 */
import { meridaIsoDay } from "@/lib/visibility/commercial-slots";

/** Inicio del día en Valladolid (UTC-6 todo el año) en ISO UTC. */
export function meridaDayStartIso(now: Date = new Date()): string {
  return new Date(`${meridaIsoDay(now)}T06:00:00.000Z`).toISOString();
}

export async function countAluxMentionsToday(
  businessIds: readonly string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (businessIds.length === 0) return out;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("business_view_events")
      .select("business_id")
      .eq("event_type", "alux_mention")
      .gte("occurred_at", meridaDayStartIso())
      .in("business_id", [...businessIds])
      .limit(5000);
    for (const row of (data ?? []) as Array<{ business_id: string }>) {
      out.set(row.business_id, (out.get(row.business_id) ?? 0) + 1);
    }
  } catch {
    /* sin conteo: el tope se evalúa con 0 */
  }
  return out;
}

/** Registra una mención por empresa (sin duplicar en la misma respuesta). */
export async function recordAluxMentions(
  businessIds: readonly string[],
  surface: string,
): Promise<void> {
  const unique = [...new Set(businessIds.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.allSettled(
      unique.map((businessId) =>
        supabaseAdmin.rpc("record_business_view_event", {
          _business_id: businessId,
          _event_type: "alux_mention",
          _surface: surface,
          _placement: "contratado",
        }),
      ),
    );
  } catch {
    /* la medición jamás interrumpe a Alux */
  }
}
