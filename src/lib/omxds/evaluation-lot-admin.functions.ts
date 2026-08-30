/**
 * G8-R1-F1G · Herramienta interna "Contenido de evaluación".
 *
 * Permite a Administración ver el lote completo y retirar o restaurar
 * fichas de forma reversible. Reglas fail-closed:
 *  - Sólo `is_admin`. Ninguna UI concede autoridad.
 *  - Sólo opera sobre filas marcadas con el lote de evaluación.
 *  - Nunca borra físicamente, nunca toca fechas de eventos, nunca
 *    modifica el flag visual global.
 *  - Fichas con propietario activo, reclamación registrada u operación
 *    comercial quedan protegidas: no se pueden retirar.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EVALUATION_LOT_ID, type EvaluationLotFamily } from "./evaluation-lot";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

const TABLE: Record<EvaluationLotFamily, string> = {
  destination: "destinations",
  business: "businesses",
  product: "products",
  event: "events",
  place: "points_of_interest",
};

const LABEL_COLUMN: Record<EvaluationLotFamily, string> = {
  destination: "name",
  business: "display_name",
  product: "name",
  event: "title",
  place: "name",
};

const ENTITY_KIND: Record<EvaluationLotFamily, string> = {
  destination: "destination",
  business: "business",
  product: "product",
  event: "event",
  place: "point_of_interest",
};

export interface EvaluationLotRow {
  id: string;
  family: EvaluationLotFamily;
  slug: string;
  label: string;
  status: string;
  isDemoSeed: boolean;
  protected: boolean;
}

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (data !== true) throw new Error("forbidden");
}

function isFamily(value: unknown): value is EvaluationLotFamily {
  return typeof value === "string" && value in TABLE;
}

export const listEvaluationLot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: EvaluationLotRow[]; lotId: string }> => {
    await assertAdmin(context as Ctx);
    const sb = (context as Ctx).supabase;

    const families = Object.keys(TABLE) as EvaluationLotFamily[];
    const results = await Promise.all(
      families.map(async (family) => {
        const { data, error } = await sb
          .from(TABLE[family])
          .select(`id, slug, status, is_demo_seed, ${LABEL_COLUMN[family]}`)
          .eq("demo_seed_batch", EVALUATION_LOT_ID);
        if (error) throw new Error(error.message);
        return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          family,
          slug: String(row.slug ?? ""),
          label: String(row[LABEL_COLUMN[family]] ?? row.slug ?? ""),
          status: String(row.status ?? "draft"),
          isDemoSeed: row.is_demo_seed === true,
          protected: false,
        }));
      }),
    );

    const rows = results.flat();

    // Protección: propietario activo, reclamación registrada u operación comercial.
    const businessIds = rows.filter((r) => r.family === "business").map((r) => r.id);
    if (businessIds.length) {
      const [owners, claims, items] = await Promise.all([
        sb
          .from("business_users")
          .select("business_id")
          .in("business_id", businessIds)
          .eq("status", "active"),
        sb.from("business_claim_snapshots").select("business_id").in("business_id", businessIds),
        sb.from("concierge_order_items").select("business_id").in("business_id", businessIds),
      ]);
      const guarded = new Set<string>();
      for (const res of [owners, claims, items]) {
        for (const row of ((res.data ?? []) as Array<{ business_id: string }>) ?? []) {
          if (row.business_id) guarded.add(row.business_id);
        }
      }
      for (const row of rows) {
        if (row.family === "business" && guarded.has(row.id)) row.protected = true;
      }
    }

    rows.sort((a, b) => a.family.localeCompare(b.family) || a.label.localeCompare(b.label));
    return { rows, lotId: EVALUATION_LOT_ID };
  });

export const setEvaluationLotStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { family: string; id: string; action: "withdraw" | "restore" }) => {
    if (!isFamily(input?.family)) throw new Error("familia inválida");
    if (!input?.id || typeof input.id !== "string") throw new Error("id requerido");
    if (input.action !== "withdraw" && input.action !== "restore") {
      throw new Error("acción inválida");
    }
    return { family: input.family as EvaluationLotFamily, id: input.id, action: input.action };
  })
  .handler(async ({ data, context }): Promise<{ status: string }> => {
    await assertAdmin(context as Ctx);
    const sb = (context as Ctx).supabase;
    const table = TABLE[data.family];

    const { data: current, error: readErr } = await sb
      .from(table)
      .select("id, status, demo_seed_batch")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("ficha no encontrada");
    if (current.demo_seed_batch !== EVALUATION_LOT_ID) throw new Error("fuera_del_lote");

    if (data.action === "withdraw" && data.family === "business") {
      const [owners, claims, items] = await Promise.all([
        sb
          .from("business_users")
          .select("business_id")
          .eq("business_id", data.id)
          .eq("status", "active")
          .limit(1),
        sb.from("business_claim_snapshots").select("business_id").eq("business_id", data.id).limit(1),
        sb.from("concierge_order_items").select("business_id").eq("business_id", data.id).limit(1),
      ]);
      const guarded = [owners, claims, items].some((res) => (res.data ?? []).length > 0);
      if (guarded) throw new Error("ficha_protegida");
    }

    const next = data.action === "withdraw" ? "draft" : "published";
    const { error: updErr } = await sb.from(table).update({ status: next }).eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    await sb.from("content_audit_log").insert({
      entity_kind: ENTITY_KIND[data.family],
      entity_id: data.id,
      action: data.action === "withdraw" ? "g8_r1_f1g_withdrawn" : "g8_r1_f1g_restored",
      from_status: current.status,
      to_status: next,
      notes:
        data.action === "withdraw"
          ? "Retiro reversible desde Contenido de evaluación"
          : "Restauración desde Contenido de evaluación",
      metadata: { batch: EVALUATION_LOT_ID, actor: (context as Ctx).userId },
    });

    return { status: next };
  });
