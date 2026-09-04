/**
 * cms/editorial-route-stops.functions.ts — Paradas de una ruta editorial
 * (Lote 3C · autoridad CMS-first de Rutas / Itinerarios).
 *
 * Reglas:
 *  - `requireSupabaseAuth` + verificación explícita de rol editorial vía RPC
 *    `is_editor_or_admin`. Nunca `supabaseAdmin`.
 *  - Las paradas referencian entidades canónicas ya publicadas; el CMS guarda
 *    la referencia (kind + id) y el texto editorial, no una copia del
 *    contenido.
 *  - El guardado es declarativo: se reemplaza el conjunto completo de paradas
 *    de la ruta, preservando el orden enviado por el editor.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ROUTE_STOP_KINDS = [
  "place",
  "experience",
  "event",
  "business",
  "product",
  "destination",
  "note",
] as const;
export type RouteStopKind = (typeof ROUTE_STOP_KINDS)[number];

export interface RouteStopInput {
  entityKind: RouteStopKind;
  entityId: string | null;
  title: string | null;
  note: string | null;
  dayNumber: number | null;
  durationMinutes: number | null;
}

export interface RouteStopRow extends RouteStopInput {
  id: string;
  position: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeStop(raw: unknown): RouteStopInput {
  const s = raw as Partial<RouteStopInput> | undefined;
  const kind = String(s?.entityKind ?? "note") as RouteStopKind;
  if (!(ROUTE_STOP_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`invalid_stop_kind:${kind}`);
  }
  const entityId = s?.entityId ? String(s.entityId) : null;
  if (entityId && !UUID_RE.test(entityId)) throw new Error("invalid_stop_entity_id");
  if (kind !== "note" && !entityId) throw new Error("missing_stop_entity_id");
  const title = s?.title ? String(s.title).slice(0, 200) : null;
  if (kind === "note" && !title) throw new Error("missing_note_title");
  return {
    entityKind: kind,
    entityId,
    title,
    note: s?.note ? String(s.note).slice(0, 600) : null,
    dayNumber:
      s?.dayNumber === null || s?.dayNumber === undefined ? null : Math.max(1, Number(s.dayNumber)),
    durationMinutes:
      s?.durationMinutes === null || s?.durationMinutes === undefined
        ? null
        : Math.max(0, Number(s.durationMinutes)),
  };
}

/** Lee las paradas de una ruta, ordenadas por posición. */
export const listRouteStopsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { routeId: string }) => {
    if (!d?.routeId || !UUID_RE.test(d.routeId)) throw new Error("invalid_route_id");
    return d;
  })
  .handler(async ({ data, context }): Promise<RouteStopRow[]> => {
    await assertEditorial(context);
    const { data: rows, error } = await context.supabase
      .from("editorial_route_stops")
      .select("id, position, day_number, entity_kind, entity_id, title, note, duration_minutes")
      .eq("route_id", data.routeId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      position: Number(r.position),
      entityKind: r.entity_kind as RouteStopKind,
      entityId: (r.entity_id as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      dayNumber: r.day_number === null ? null : Number(r.day_number),
      durationMinutes: r.duration_minutes === null ? null : Number(r.duration_minutes),
    }));
  });

/** Reemplaza el conjunto completo de paradas de una ruta. */
export const saveRouteStopsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { routeId: string; stops: unknown[] }) => {
    if (!d?.routeId || !UUID_RE.test(d.routeId)) throw new Error("invalid_route_id");
    if (!Array.isArray(d.stops)) throw new Error("invalid_stops");
    if (d.stops.length > 60) throw new Error("too_many_stops");
    return { routeId: d.routeId, stops: d.stops.map(normalizeStop) };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    const { error: delErr } = await context.supabase
      .from("editorial_route_stops")
      .delete()
      .eq("route_id", data.routeId);
    if (delErr) throw delErr;

    if (data.stops.length === 0) return { count: 0 };

    const payload = data.stops.map((s, i) => ({
      route_id: data.routeId,
      position: i + 1,
      day_number: s.dayNumber,
      entity_kind: s.entityKind,
      entity_id: s.entityId,
      title: s.title,
      note: s.note,
      duration_minutes: s.durationMinutes,
    }));
    const { error: insErr } = await context.supabase
      .from("editorial_route_stops")
      .insert(payload);
    if (insErr) throw insErr;
    return { count: payload.length };
  });

/** Catálogo de entidades publicadas que pueden usarse como parada. */
export const listRouteStopCandidatesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: string } | undefined) => ({ kind: d?.kind ?? "place" }))
  .handler(async ({ data, context }): Promise<{ id: string; label: string }[]> => {
    await assertEditorial(context);
    const kind = data.kind as RouteStopKind;
    const map: Record<string, { table: string; label: string }> = {
      place: { table: "points_of_interest", label: "name" },
      destination: { table: "destinations", label: "name" },
      business: { table: "businesses", label: "display_name" },
      product: { table: "products", label: "name" },
      experience: { table: "products", label: "name" },
      event: { table: "events", label: "title" },
    };
    const conf = map[kind];
    if (!conf) return [];
    const { data: rows, error } = await context.supabase
      .from(conf.table)
      .select(`id, ${conf.label}`)
      .eq("status", "published")
      .is("deleted_at", null)
      .order(conf.label, { ascending: true })
      .limit(200);
    if (error) throw error;
    return (rows ?? []).map((r) => ({
      id: String((r as Record<string, unknown>).id),
      label: String((r as Record<string, unknown>)[conf.label] ?? "—"),
    }));
  });
