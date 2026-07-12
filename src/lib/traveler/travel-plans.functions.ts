/**
 * traveler/travel-plans.functions.ts — Iniciativa 7 · Sub-ola B.
 *
 * Capa de dominio única del Travel Workspace ("Mi Viaje").
 *
 * Reglas Founder (Iniciativa 7):
 *  - Toda operación sobre `travel_plans` y `travel_plan_items` pasa
 *    OBLIGATORIAMENTE por este módulo. Ninguna UI escribe directo a la BD.
 *  - Contrato universal: el tipo `TravelItemKind` es string abierto en el
 *    borde (`string`), validado internamente contra una whitelist actual
 *    (`KNOWN_ITEM_KINDS`). Añadir un nuevo kind mañana (`hotel`,
 *    `restaurant`, `experience`, `route`, `package`, `reservation`) sólo
 *    requiere: (a) ampliar el ENUM en BD, (b) ampliar la whitelist aquí.
 *    Las funciones no cambian de forma.
 *  - Snapshot inmutable por item: `title/slug/image_url/subtitle` se
 *    guardan al momento de agregar → el plan sobrevive despublicaciones.
 *  - Multi-plan capable en el modelo; UI v1 puede exponer sólo 1 activo.
 *  - Sin acceso a service_role. Sin `SUPABASE_SERVICE_ROLE_KEY`.
 *  - Toda escritura pasa por `requireSupabaseAuth`; el `user_id` proviene
 *    exclusivamente de `context.userId`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { createClient } from "@supabase/supabase-js";

// -------------------------------------------------------------------------
// Contrato público (estable)
// -------------------------------------------------------------------------

/**
 * Kinds soportados HOY por la BD (ENUM `travel_item_kind`). El contrato de
 * las funciones es `string`; la validación vive en `KNOWN_ITEM_KINDS`.
 */
export type TravelItemKind =
  | "destination"
  | "business"
  | "product"
  | "event"
  | "note";

/**
 * Whitelist activa. Ampliar aquí + en el ENUM de BD para admitir nuevos
 * kinds (hotel, restaurant, experience, route, package, reservation…).
 * Las funciones NO cambian.
 */
const KNOWN_ITEM_KINDS: ReadonlySet<TravelItemKind> = new Set([
  "destination",
  "business",
  "product",
  "event",
  "note",
]);

export type TravelPlanStatus =
  | "draft"
  | "active"
  | "shared_with_concierge"
  | "archived";

export type TravelPlanSource = "web" | "import" | "concierge" | "alux";

export interface TravelPlanItemSnapshot {
  title?: string | null;
  slug?: string | null;
  image_url?: string | null;
  subtitle?: string | null;
}

export interface TravelPlanItem {
  id: string;
  plan_id: string;
  item_kind: TravelItemKind;
  target_id: string | null;
  position: number;
  day_index: number | null;
  notes: string | null;
  snapshot: TravelPlanItemSnapshot;
  created_at: string;
  updated_at: string;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  title: string;
  status: TravelPlanStatus;
  party_size: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  cover_image_url: string | null;
  source: TravelPlanSource;
  meta: Json;
  case_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  share_token: string | null;
  shared_at: string | null;
}

export interface TravelPlanWithItems {
  plan: TravelPlan;
  items: TravelPlanItem[];
}

export interface TravelPlanSnapshot {
  plan: TravelPlan;
  items: TravelPlanItem[];
}

// -------------------------------------------------------------------------
// Helpers de validación / normalización (server-side)
// -------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertUuid(v: unknown, field: string): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) {
    throw new Error(`invalid_${field}`);
  }
  return v;
}

function assertKind(v: unknown): TravelItemKind {
  if (typeof v !== "string" || !KNOWN_ITEM_KINDS.has(v as TravelItemKind)) {
    throw new Error("invalid_item_kind");
  }
  return v as TravelItemKind;
}

function clampStr(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function clampSnapshot(v: unknown): TravelPlanItemSnapshot {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const src = v as Record<string, unknown>;
  const out: TravelPlanItemSnapshot = {};
  const title = clampStr(src.title, 200);
  const slug = clampStr(src.slug, 200);
  const image = clampStr(src.image_url, 500);
  const subtitle = clampStr(src.subtitle, 300);
  if (title !== null) out.title = title;
  if (slug !== null) out.slug = slug;
  if (image !== null) out.image_url = image;
  if (subtitle !== null) out.subtitle = subtitle;
  return out;
}

function clampDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || !ISO_DATE_RE.test(v)) {
    throw new Error("invalid_date_format_expected_YYYY_MM_DD");
  }
  return v;
}

function clampParty(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 1 || i > 40) throw new Error("invalid_party_size");
  return i;
}

type PlanRow = Database["public"]["Tables"]["travel_plans"]["Row"];
type ItemRow = Database["public"]["Tables"]["travel_plan_items"]["Row"];

function mapPlan(r: PlanRow): TravelPlan {
  return {
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    status: r.status as TravelPlanStatus,
    party_size: r.party_size,
    start_date: r.start_date,
    end_date: r.end_date,
    notes: r.notes,
    cover_image_url: r.cover_image_url,
    source: r.source as TravelPlanSource,
    meta: (r.meta as Json) ?? {},
    case_id: r.case_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    archived_at: r.archived_at,
    share_token: r.share_token ?? null,
    shared_at: r.shared_at ?? null,
  };
}

function mapItem(r: ItemRow): TravelPlanItem {
  return {
    id: r.id,
    plan_id: r.plan_id,
    item_kind: r.item_kind as TravelItemKind,
    target_id: r.target_id,
    position: r.position,
    day_index: r.day_index,
    notes: r.notes,
    snapshot: ((r.snapshot as unknown) as TravelPlanItemSnapshot) ?? {},
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// =========================================================================
// LECTURA
// =========================================================================

/**
 * getMyActivePlan — Devuelve el plan activo del usuario con sus items.
 * Si no existe, lo crea (idempotente vía RPC `travel_plan_ensure_active`).
 */
export const getMyActivePlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelPlanWithItems> => {
    const { data: pid, error: rpcErr } = await context.supabase.rpc(
      "travel_plan_ensure_active",
    );
    if (rpcErr) throw new Error(`ensure_active_failed: ${rpcErr.message}`);
    const planId = pid as string;

    const [{ data: planRow, error: pErr }, { data: itemRows, error: iErr }] =
      await Promise.all([
        context.supabase
          .from("travel_plans")
          .select("*")
          .eq("id", planId)
          .single(),
        context.supabase
          .from("travel_plan_items")
          .select("*")
          .eq("plan_id", planId)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
    if (pErr) throw new Error(`plan_read_failed: ${pErr.message}`);
    if (iErr) throw new Error(`items_read_failed: ${iErr.message}`);

    return {
      plan: mapPlan(planRow as PlanRow),
      items: (itemRows ?? []).map((r) => mapItem(r as ItemRow)),
    };
  });

/**
 * listMyPlans — Historial de planes del usuario (activo + archivados +
 * enviados a concierge). Sin items. Ordenado por actividad reciente.
 */
export const listMyPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelPlan[]> => {
    const { data, error } = await context.supabase
      .from("travel_plans")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(`plans_list_failed: ${error.message}`);
    return (data ?? []).map((r) => mapPlan(r as PlanRow));
  });

/**
 * getPlanById — Devuelve un plan específico con sus items. RLS filtra por
 * owner o concierge asignado; devolvemos `null` si no es visible.
 */
export const getPlanById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    planId: assertUuid((d as { planId?: unknown })?.planId, "plan_id"),
  }))
  .handler(async ({ context, data }): Promise<TravelPlanWithItems | null> => {
    const { data: planRow, error: pErr } = await context.supabase
      .from("travel_plans")
      .select("*")
      .eq("id", data.planId)
      .maybeSingle();
    if (pErr) throw new Error(`plan_read_failed: ${pErr.message}`);
    if (!planRow) return null;

    const { data: itemRows, error: iErr } = await context.supabase
      .from("travel_plan_items")
      .select("*")
      .eq("plan_id", data.planId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (iErr) throw new Error(`items_read_failed: ${iErr.message}`);

    return {
      plan: mapPlan(planRow as PlanRow),
      items: (itemRows ?? []).map((r) => mapItem(r as ItemRow)),
    };
  });

// =========================================================================
// ESCRITURA
// =========================================================================

/**
 * ensureActivePlan — Devuelve el id del plan activo (creándolo si no
 * existe). Delegado directamente al RPC SECURITY DEFINER.
 */
export const ensureActivePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ planId: string }> => {
    const { data, error } = await context.supabase.rpc(
      "travel_plan_ensure_active",
    );
    if (error) throw new Error(`ensure_active_failed: ${error.message}`);
    return { planId: data as string };
  });

/**
 * addPlanItem — Agrega un item al plan indicado (o al activo si se omite).
 * Idempotente por `(plan_id, item_kind, target_id)` (kind ≠ 'note').
 * Devuelve el item resultante.
 *
 * `kind` es `string` para no romper el contrato al añadir futuros kinds;
 * se valida contra la whitelist actual dentro del handler.
 */
export const addPlanItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const src = (d ?? {}) as {
      planId?: unknown;
      kind?: unknown;
      targetId?: unknown;
      notes?: unknown;
      snapshot?: unknown;
      dayIndex?: unknown;
    };
    const kind = assertKind(src.kind);
    const isNote = kind === "note";
    return {
      planId:
        src.planId === undefined || src.planId === null
          ? null
          : assertUuid(src.planId, "plan_id"),
      kind,
      targetId: isNote ? null : assertUuid(src.targetId, "target_id"),
      notes: clampStr(src.notes, 2000),
      snapshot: clampSnapshot(src.snapshot),
      dayIndex:
        src.dayIndex === undefined || src.dayIndex === null
          ? null
          : Math.max(0, Math.min(365, Math.round(Number(src.dayIndex) || 0))),
    };
  })
  .handler(
    async ({
      context,
      data,
    }): Promise<{ item: TravelPlanItem; created: boolean }> => {
      // Resolver plan destino (activo si no viene explícito).
      let planId = data.planId;
      if (!planId) {
        const { data: pid, error } = await context.supabase.rpc(
          "travel_plan_ensure_active",
        );
        if (error) throw new Error(`ensure_active_failed: ${error.message}`);
        planId = pid as string;
      }

      // Posición siguiente (server-side, evita colisiones cliente).
      const { data: last, error: posErr } = await context.supabase
        .from("travel_plan_items")
        .select("position")
        .eq("plan_id", planId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (posErr) throw new Error(`position_read_failed: ${posErr.message}`);
      const nextPos = ((last?.position as number | undefined) ?? -1) + 1;

      // Notas: sin dedupe → insert directo.
      if (data.kind === "note") {
        const { data: row, error } = await context.supabase
          .from("travel_plan_items")
          .insert({
            plan_id: planId,
            item_kind: "note",
            target_id: null,
            position: nextPos,
            day_index: data.dayIndex,
            notes: data.notes,
            snapshot: data.snapshot as unknown as Json,
          })
          .select("*")
          .single();
        if (error) throw new Error(`item_insert_failed: ${error.message}`);
        return { item: mapItem(row as ItemRow), created: true };
      }

      // Kinds con target_id: idempotente. Si ya existe, devolverlo.
      const { data: existing } = await context.supabase
        .from("travel_plan_items")
        .select("*")
        .eq("plan_id", planId)
        .eq("item_kind", data.kind)
        .eq("target_id", data.targetId!)
        .maybeSingle();
      if (existing) {
        return { item: mapItem(existing as ItemRow), created: false };
      }

      const { data: row, error } = await context.supabase
        .from("travel_plan_items")
        .insert({
          plan_id: planId,
          item_kind: data.kind,
          target_id: data.targetId!,
          position: nextPos,
          day_index: data.dayIndex,
          notes: data.notes,
          snapshot: data.snapshot as unknown as Json,
        })
        .select("*")
        .single();
      if (error) {
        // Race con unique constraint → releer y devolver.
        if (/duplicate key/i.test(error.message)) {
          const { data: after } = await context.supabase
            .from("travel_plan_items")
            .select("*")
            .eq("plan_id", planId)
            .eq("item_kind", data.kind)
            .eq("target_id", data.targetId!)
            .single();
          if (after) {
            return { item: mapItem(after as ItemRow), created: false };
          }
        }
        throw new Error(`item_insert_failed: ${error.message}`);
      }
      return { item: mapItem(row as ItemRow), created: true };
    },
  );

/**
 * removePlanItem — Elimina un item por id. Idempotente.
 */
export const removePlanItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    itemId: assertUuid((d as { itemId?: unknown })?.itemId, "item_id"),
  }))
  .handler(async ({ context, data }): Promise<{ removed: boolean }> => {
    const { data: rows, error } = await context.supabase
      .from("travel_plan_items")
      .delete()
      .eq("id", data.itemId)
      .select("id");
    if (error) throw new Error(`item_delete_failed: ${error.message}`);
    return { removed: (rows ?? []).length > 0 };
  });

/**
 * updatePlanItem — Actualiza notas / snapshot / day_index de un item.
 * Whitelist estricta; no permite cambiar `plan_id`, `item_kind`,
 * `target_id`, `position` (reorden va por RPC dedicado).
 */
export const updatePlanItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const src = (d ?? {}) as {
      itemId?: unknown;
      notes?: unknown;
      snapshot?: unknown;
      dayIndex?: unknown;
    };
    const patch: {
      notes?: string | null;
      snapshot?: Json;
      day_index?: number | null;
    } = {};
    if ("notes" in src) patch.notes = clampStr(src.notes, 2000);
    if ("snapshot" in src)
      patch.snapshot = clampSnapshot(src.snapshot) as unknown as Json;
    if ("dayIndex" in src) {
      patch.day_index =
        src.dayIndex === null || src.dayIndex === undefined
          ? null
          : Math.max(0, Math.min(365, Math.round(Number(src.dayIndex) || 0)));
    }
    return {
      itemId: assertUuid(src.itemId, "item_id"),
      patch,
    };
  })
  .handler(async ({ context, data }): Promise<TravelPlanItem> => {
    if (Object.keys(data.patch).length === 0) {
      throw new Error("empty_patch");
    }
    const { data: row, error } = await context.supabase
      .from("travel_plan_items")
      .update(data.patch)
      .eq("id", data.itemId)
      .select("*")
      .single();
    if (error) throw new Error(`item_update_failed: ${error.message}`);
    return mapItem(row as ItemRow);
  });

/**
 * reorderPlanItems — Reordena items del plan. `orderedItemIds` define la
 * posición absoluta (0..n-1). Ids fuera del plan se ignoran.
 */
export const reorderPlanItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const src = (d ?? {}) as { planId?: unknown; orderedItemIds?: unknown };
    const planId = assertUuid(src.planId, "plan_id");
    if (!Array.isArray(src.orderedItemIds)) {
      throw new Error("invalid_ordered_item_ids");
    }
    if (src.orderedItemIds.length > 500) {
      throw new Error("too_many_items");
    }
    const ordered = src.orderedItemIds.map((v, i) =>
      assertUuid(v, `ordered_item_ids[${i}]`),
    );
    return { planId, orderedItemIds: ordered };
  })
  .handler(
    async ({ context, data }): Promise<{ updated: number }> => {
      // Verificar que todos los items pertenecen al plan (RLS lo refuerza).
      const { data: rows, error: rErr } = await context.supabase
        .from("travel_plan_items")
        .select("id")
        .eq("plan_id", data.planId)
        .in("id", data.orderedItemIds);
      if (rErr) throw new Error(`reorder_read_failed: ${rErr.message}`);
      const valid = new Set((rows ?? []).map((r) => r.id as string));

      let updated = 0;
      for (let i = 0; i < data.orderedItemIds.length; i++) {
        const id = data.orderedItemIds[i];
        if (!valid.has(id)) continue;
        const { error } = await context.supabase
          .from("travel_plan_items")
          .update({ position: i })
          .eq("id", id);
        if (error) throw new Error(`reorder_write_failed: ${error.message}`);
        updated += 1;
      }
      return { updated };
    },
  );

/**
 * updatePlanMeta — Actualiza metadatos del plan: título, fechas,
 * party_size, notas, cover_image_url, meta libre. Whitelist estricta.
 */
export const updatePlanMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const src = (d ?? {}) as {
      planId?: unknown;
      title?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      partySize?: unknown;
      notes?: unknown;
      coverImageUrl?: unknown;
      meta?: unknown;
    };
    const patch: {
      title?: string;
      start_date?: string | null;
      end_date?: string | null;
      party_size?: number | null;
      notes?: string | null;
      cover_image_url?: string | null;
      meta?: Json;
    } = {};
    if ("title" in src) {
      const t = clampStr(src.title, 160);
      if (!t) throw new Error("invalid_title");
      patch.title = t;
    }
    if ("startDate" in src) patch.start_date = clampDate(src.startDate);
    if ("endDate" in src) patch.end_date = clampDate(src.endDate);
    if ("partySize" in src) patch.party_size = clampParty(src.partySize);
    if ("notes" in src) patch.notes = clampStr(src.notes, 4000);
    if ("coverImageUrl" in src)
      patch.cover_image_url = clampStr(src.coverImageUrl, 500);
    if ("meta" in src) {
      if (
        src.meta === null ||
        typeof src.meta !== "object" ||
        Array.isArray(src.meta)
      ) {
        throw new Error("invalid_meta");
      }
      patch.meta = src.meta as Json;
    }
    return { planId: assertUuid(src.planId, "plan_id"), patch };
  })
  .handler(async ({ context, data }): Promise<TravelPlan> => {
    if (Object.keys(data.patch).length === 0) {
      throw new Error("empty_patch");
    }
    const { data: row, error } = await context.supabase
      .from("travel_plans")
      .update(data.patch)
      .eq("id", data.planId)
      .select("*")
      .single();
    if (error) throw new Error(`plan_update_failed: ${error.message}`);
    return mapPlan(row as PlanRow);
  });

// =========================================================================
// ACCIONES
// =========================================================================

/**
 * importFavorites — Importa los favoritos del usuario al plan indicado
 * (o al activo si se omite). Delega en RPC `travel_plan_import_favorites`
 * que respeta la unique constraint de dedupe.
 */
export const importFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    planId:
      (d as { planId?: unknown })?.planId === undefined ||
      (d as { planId?: unknown })?.planId === null
        ? null
        : assertUuid((d as { planId?: unknown }).planId, "plan_id"),
  }))
  .handler(
    async ({ context, data }): Promise<{ imported: number; planId: string }> => {
      let planId = data.planId;
      if (!planId) {
        const { data: pid, error } = await context.supabase.rpc(
          "travel_plan_ensure_active",
        );
        if (error) throw new Error(`ensure_active_failed: ${error.message}`);
        planId = pid as string;
      }
      const { data: count, error } = await context.supabase.rpc(
        "travel_plan_import_favorites",
        { _plan_id: planId },
      );
      if (error) throw new Error(`import_favorites_failed: ${error.message}`);
      return { imported: (count as number) ?? 0, planId };
    },
  );

/**
 * buildSnapshot — Devuelve el snapshot completo del plan (plan + items)
 * como estructura serializable estable, fuente única de contexto para
 * Concierge, Alux, recomendaciones y futuras reservas.
 */
export const buildSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    planId: assertUuid((d as { planId?: unknown })?.planId, "plan_id"),
  }))
  .handler(async ({ context, data }): Promise<TravelPlanSnapshot> => {
    const { data: json, error } = await context.supabase.rpc(
      "travel_plan_build_snapshot",
      { _plan_id: data.planId },
    );
    if (error) throw new Error(`build_snapshot_failed: ${error.message}`);
    const raw = (json ?? {}) as {
      plan?: PlanRow;
      items?: ItemRow[];
    };
    if (!raw.plan) throw new Error("snapshot_empty");
    return {
      plan: mapPlan(raw.plan),
      items: (raw.items ?? []).map((r) => mapItem(r)),
    };
  });

/**
 * promotePlanToCase — Convierte el plan en un caso de Concierge.
 *
 * Flujo:
 *  1. `buildSnapshot(plan)` → payload serializable.
 *  2. `cc_case_create_from_plan(summary, items)` — reutiliza el contrato
 *     ya existente de la Fase 2 (15.10.4).
 *  3. Vincula el caso al plan (`travel_plans.case_id`) y marca el plan
 *     como `shared_with_concierge`.
 *
 * El plan permanece visible en el historial del usuario y para el
 * concierge asignado (vía RLS).
 */
export const promotePlanToCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const src = (d ?? {}) as { planId?: unknown; summary?: unknown };
    const summary = clampStr(src.summary, 500);
    if (!summary || summary.length < 8) throw new Error("invalid_summary");
    return { planId: assertUuid(src.planId, "plan_id"), summary };
  })
  .handler(
    async ({
      context,
      data,
    }): Promise<{ caseId: string; planId: string }> => {
      // 1. Snapshot vía RPC (aplica RLS/visibility).
      const { data: snapJson, error: snapErr } = await context.supabase.rpc(
        "travel_plan_build_snapshot",
        { _plan_id: data.planId },
      );
      if (snapErr) throw new Error(`build_snapshot_failed: ${snapErr.message}`);
      const snap = (snapJson ?? {}) as { items?: ItemRow[] };

      // 2. Traducir items a contrato `cc_case_create_from_plan`
      //    (product_id/business_id conocidos; el resto viaja como notas).
      const ccItems = (snap.items ?? []).slice(0, 20).map((r) => {
        const kind = r.item_kind as TravelItemKind;
        const snapshot = (r.snapshot as TravelPlanItemSnapshot) ?? {};
        return {
          title: snapshot.title ?? undefined,
          notes: r.notes ?? undefined,
          kind: "non_reservable" as const,
          product_id: kind === "product" ? r.target_id : null,
          business_id: kind === "business" ? r.target_id : null,
        };
      });

      const { data: caseId, error: ccErr } = await context.supabase.rpc(
        "cc_case_create_from_plan",
        {
          _summary: data.summary,
          _items: ccItems as unknown as never,
          _travel_plan_id: data.planId,
        } as never,
      );
      if (ccErr) throw new Error(`case_create_failed: ${ccErr.message}`);

      // 3. Vincular caso al plan y marcar estado.
      const { error: linkErr } = await context.supabase
        .from("travel_plans")
        .update({
          case_id: caseId as string,
          status: "shared_with_concierge",
        })
        .eq("id", data.planId);
      if (linkErr) throw new Error(`plan_link_failed: ${linkErr.message}`);

      // 4. CV2.1 · Handoff Context — Alux adjunta al expediente una
      //    fotografía compacta del contexto operativo del viajero
      //    (perfil M2, cupones activos, memoria territorial, plan).
      //    Best-effort: si falla, no rompemos la promoción del caso.
      try {
        await attachHandoffContext({
          caseId: caseId as string,
          planId: data.planId,
          userId: context.userId,
          userSupabase: context.supabase as unknown as AnySupabase,
          planItems: snap.items ?? [],
        });
      } catch (e) {
        console.warn("[cv2.1] handoff_context_attach_failed", e);
      }

      return { caseId: caseId as string, planId: data.planId };
    },
  );

// -------------------------------------------------------------------------
// CV2.1 · Handoff Context helper (Alux → Concierge)
// -------------------------------------------------------------------------

type AnySupabase = {
  from: (t: string) => any;
  rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>;
};

async function attachHandoffContext(args: {
  caseId: string;
  planId: string;
  userId: string;
  userSupabase: AnySupabase;
  planItems: ItemRow[];
}): Promise<void> {
  const { caseId, planId, userId, userSupabase, planItems } = args;

  // Perfil M2 (subset operativo, sin PII).
  const profilePromise = userSupabase
    .from("traveler_profiles")
    .select(
      "home_country,preferred_language,travel_style,budget_band,dietary,accessibility,languages,interests,is_public",
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Cupones activos (emitidos, no canjeados, vigentes).
  const nowIso = new Date().toISOString();
  const couponsPromise = userSupabase
    .from("traveler_coupons")
    .select(
      "id,title,code,business_slug,promotion_slug,discount_percent,valid_until,status",
    )
    .eq("user_id", userId)
    .eq("status", "issued")
    .gte("valid_until", nowIso)
    .order("valid_until", { ascending: true })
    .limit(20);

  // Memoria territorial (tabla sin grants a authenticated → admin client).
  let memory: unknown = null;
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: sess } = await (supabaseAdmin as unknown as AnySupabase)
      .from("alux_public_sessions")
      .select(
        "last_destination_slug,last_category_slug,last_spatial_state,visited_destinations,visited_categories,destination_visit_count,summary,summary_updated_at,last_signals,last_seen_at",
      )
      .eq("traveler_user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    memory = sess ?? null;
  } catch {
    memory = null;
  }

  const [profileRes, couponsRes] = await Promise.all([
    profilePromise,
    couponsPromise,
  ]);

  const planSnapshotItems = planItems.slice(0, 30).map((r) => {
    const snap = (r.snapshot as TravelPlanItemSnapshot) ?? {};
    return {
      kind: r.item_kind,
      target_id: r.target_id ?? null,
      title: snap.title ?? null,
      slug: snap.slug ?? null,
      subtitle: snap.subtitle ?? null,
    };
  });

  const payload = {
    version: "cv2.1",
    generated_at: nowIso,
    source: "travel_plan_promotion",
    plan_id: planId,
    profile: (profileRes as { data?: unknown }).data ?? null,
    active_coupons: (couponsRes as { data?: unknown }).data ?? [],
    territorial_memory: memory,
    plan_snapshot: {
      item_count: planItems.length,
      items: planSnapshotItems,
    },
  };

  const { error } = await userSupabase.rpc(
    "concierge_case_attach_handoff_context" as never,
    { _case_id: caseId, _payload: payload } as never,
  );
  if (error) {
    throw new Error(`attach_failed: ${(error as { message?: string }).message ?? "unknown"}`);
  }
}

// =========================================================================
// COMPARTIR (US-E4.3)
// =========================================================================

export interface SharedPlanItem {
  id: string;
  item_kind: TravelItemKind;
  target_id: string | null;
  position: number;
  day_index: number | null;
  snapshot: TravelPlanItemSnapshot;
}

export interface SharedPlanView {
  plan: {
    id: string;
    title: string;
    status: TravelPlanStatus;
    party_size: number | null;
    start_date: string | null;
    end_date: string | null;
    cover_image_url: string | null;
    shared_at: string | null;
    created_at: string;
    updated_at: string;
  };
  items: SharedPlanItem[];
}

/**
 * enableShareLink — Activa el link público del plan (genera token si no existe).
 * Owner-only vía RLS.
 */
export const enableShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    planId: assertUuid((d as { planId?: unknown })?.planId, "plan_id"),
  }))
  .handler(
    async ({ context, data }): Promise<{ token: string; sharedAt: string }> => {
      const { data: existing, error: readErr } = await context.supabase
        .from("travel_plans")
        .select("share_token, shared_at")
        .eq("id", data.planId)
        .single();
      if (readErr) throw new Error(`plan_read_failed: ${readErr.message}`);
      if (existing.share_token) {
        return {
          token: existing.share_token as string,
          sharedAt: (existing.shared_at as string) ?? new Date().toISOString(),
        };
      }
      const token = crypto.randomUUID();
      const sharedAt = new Date().toISOString();
      const { error } = await context.supabase
        .from("travel_plans")
        .update({ share_token: token, shared_at: sharedAt })
        .eq("id", data.planId);
      if (error) throw new Error(`share_enable_failed: ${error.message}`);
      return { token, sharedAt };
    },
  );

/**
 * disableShareLink — Revoca el link público (limpia token). Owner-only vía RLS.
 */
export const disableShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({
    planId: assertUuid((d as { planId?: unknown })?.planId, "plan_id"),
  }))
  .handler(async ({ context, data }): Promise<{ revoked: boolean }> => {
    const { error } = await context.supabase
      .from("travel_plans")
      .update({ share_token: null, shared_at: null })
      .eq("id", data.planId);
    if (error) throw new Error(`share_disable_failed: ${error.message}`);
    return { revoked: true };
  });

/**
 * getSharedPlan — Endpoint PÚBLICO. Devuelve el expediente read-only
 * asociado al token. Usa cliente publishable + RPC SECURITY DEFINER;
 * nunca expone user_id ni notas privadas del plan.
 */
export const getSharedPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const t = (d as { token?: unknown })?.token;
    if (typeof t !== "string" || !UUID_RE.test(t)) {
      throw new Error("invalid_token");
    }
    return { token: t };
  })
  .handler(async ({ data }): Promise<SharedPlanView | null> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("supabase_env_missing");
    const client = createClient<Database>(url, key, {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const { data: json, error } = await client.rpc("travel_plan_get_shared", {
      _token: data.token,
    });
    if (error) throw new Error(`shared_read_failed: ${error.message}`);
    if (!json) return null;
    const raw = json as unknown as {
      plan: SharedPlanView["plan"] | null;
      items: SharedPlanItem[] | null;
    };
    if (!raw.plan) return null;
    return {
      plan: raw.plan,
      items: Array.isArray(raw.items) ? raw.items : [],
    };
  });