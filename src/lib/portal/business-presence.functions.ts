/**
 * portal/business-presence.functions.ts — Contactos, ubicaciones, horarios
 * y redes sociales editables desde el Portal Empresarial
 * (Ola 3 · Etapa 4 · Plan 14.30).
 *
 * Garantías:
 *  - Toda escritura usa requireSupabaseAuth (RLS aplica como user).
 *  - Doble check server-side via has_business_access('editor') antes de
 *    cada INSERT / UPDATE / DELETE.
 *  - Whitelist estricta de campos por entidad. Ningún payload puede
 *    cambiar business_id, created_by, ni columnas administrativas.
 *  - Soft-delete (deleted_at) en business_contacts y business_locations
 *    para mantener historial referencial.
 *  - Auditoría en content_audit_log con entity_kind='business' por cada
 *    cambio relevante (acciones contact.*, location.*, hours.*, social.*).
 *  - Sin DDL ni cambios a RLS. Sin SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --- Tipos públicos -------------------------------------------------------

export interface PortalContact {
  id: string;
  business_id: string;
  contact_type: string;
  label: string | null;
  value: string;
  is_public: boolean;
  sort_order: number;
  updated_at: string;
}

export interface PortalLocation {
  id: string;
  business_id: string;
  label: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  destination_zone_id: string | null;
  is_primary: boolean;
  updated_at: string;
}

export interface PortalHour {
  id: string;
  business_id: string;
  day_of_week: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
  notes: string | null;
  updated_at: string;
}

export interface PortalSocialLink {
  id: string;
  business_id: string;
  platform: string;
  url: string;
  sort_order: number;
  updated_at: string;
}

// --- Helpers --------------------------------------------------------------

const CONTACT_TYPES = new Set([
  "phone",
  "whatsapp",
  "email",
  "website",
  "other",
]);

const SOCIAL_PLATFORMS = new Set([
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "twitter",
  "linkedin",
  "threads",
  "other",
]);

function assertBusinessId(input: unknown): string {
  if (!input || typeof input !== "object") throw new Error("invalid_input");
  const id = (input as { businessId?: unknown }).businessId;
  if (typeof id !== "string" || id.length < 8)
    throw new Error("invalid_business");
  return id;
}

function assertId(input: unknown, key = "id"): string {
  if (!input || typeof input !== "object") throw new Error("invalid_input");
  const id = (input as Record<string, unknown>)[key];
  if (typeof id !== "string" || id.length < 8)
    throw new Error(`invalid_${key}`);
  return id;
}

function trimOrNull(value: unknown, max: number, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const t = value.trim();
  if (!t.length) return null;
  if (t.length > max) throw new Error(`invalid_${field}_length`);
  return t;
}

function trimRequired(value: unknown, max: number, field: string): string {
  const t = trimOrNull(value, max, field);
  if (!t) throw new Error(`required_${field}`);
  return t;
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  field: string,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n))
    throw new Error(`invalid_${field}`);
  if (n < min || n > max) throw new Error(`invalid_${field}_range`);
  return n;
}

function optionalNumber(
  value: unknown,
  min: number,
  max: number,
  field: string,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`invalid_${field}`);
  if (n < min || n > max) throw new Error(`invalid_${field}_range`);
  return n;
}

function timeOrNull(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  // Accept HH:MM or HH:MM:SS
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw new Error(`invalid_${field}_format`);
  return value.length === 5 ? `${value}:00` : value;
}

function urlOrThrow(value: unknown, field: string): string {
  const t = trimRequired(value, 500, field);
  try {
    const u = new URL(t);
    if (!["http:", "https:"].includes(u.protocol))
      throw new Error(`invalid_${field}_protocol`);
  } catch {
    throw new Error(`invalid_${field}`);
  }
  return t;
}

/**
 * Verifica acceso editor sobre la empresa y devuelve el supabase scoped.
 * Lanza forbidden_business_access si el usuario no es editor+/admin.
 */
async function ensureEditor(context: {
  supabase: ReturnType<
    typeof Object
  >; // simplified — real type lives in middleware
  userId: string;
}, businessId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = context.supabase as any;
  const { data: allowed, error } = await sb.rpc("has_business_access", {
    _user_id: context.userId,
    _business_id: businessId,
    _min_role: "editor",
  });
  if (error) throw new Error(`access_check_failed: ${error.message}`);
  if (!allowed) throw new Error("forbidden_business_access");
}

async function ensureViewer(context: {
  supabase: ReturnType<typeof Object>;
  userId: string;
}, businessId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = context.supabase as any;
  const { data: allowed, error } = await sb.rpc("has_business_access", {
    _user_id: context.userId,
    _business_id: businessId,
    _min_role: "viewer",
  });
  if (error) throw new Error(`access_check_failed: ${error.message}`);
  if (!allowed) throw new Error("forbidden_business_access");
}

async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    businessId: string;
    action: string;
    actorId: string;
    notes?: string | null;
  },
) {
  // Best-effort: si el RLS de content_audit_log no permite al editor
  // escribir, no rompemos la operación principal — la auditoría
  // editorial (transiciones) ya está cubierta en RPCs SECURITY DEFINER.
  await supabase.from("content_audit_log").insert({
    entity_kind: "business",
    entity_id: args.businessId,
    action: args.action,
    actor_user_id: args.actorId,
    notes: args.notes ?? null,
  });
}

// --- Contactos ------------------------------------------------------------

export const listBusinessContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessId(input),
  }))
  .handler(async ({ data, context }): Promise<PortalContact[]> => {
    await ensureViewer(context, data.businessId);
    const { data: rows, error } = await context.supabase
      .from("business_contacts")
      .select(
        "id, business_id, contact_type, label, value, is_public, sort_order, updated_at, deleted_at",
      )
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`list_contacts_failed: ${error.message}`);
    return (rows ?? []).map(({ deleted_at: _d, ...r }) => r) as PortalContact[];
  });

export const createBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      contact_type: string;
      value: string;
      label?: string | null;
      is_public?: boolean;
      sort_order?: number;
    }) => {
      const businessId = assertBusinessId(input);
      const contact_type = trimRequired(input.contact_type, 32, "contact_type");
      if (!CONTACT_TYPES.has(contact_type))
        throw new Error("invalid_contact_type");
      const value = trimRequired(input.value, 500, "value");
      const label = trimOrNull(input.label ?? null, 120, "label");
      const is_public = Boolean(input.is_public);
      const sort_order = clampInt(input.sort_order ?? 0, 0, 9999, "sort_order");
      return { businessId, contact_type, value, label, is_public, sort_order };
    },
  )
  .handler(async ({ data, context }): Promise<PortalContact> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_contacts")
      .insert({
        business_id: data.businessId,
        contact_type: data.contact_type,
        value: data.value,
        label: data.label,
        is_public: data.is_public,
        sort_order: data.sort_order,
        created_by: userId,
        updated_by: userId,
      })
      .select(
        "id, business_id, contact_type, label, value, is_public, sort_order, updated_at",
      )
      .single();
    if (error) throw new Error(`create_contact_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "contact.create",
      actorId: userId,
      notes: `${data.contact_type}`,
    });
    return row as PortalContact;
  });

export const updateBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      id: string;
      patch: Partial<{
        contact_type: string;
        value: string;
        label: string | null;
        is_public: boolean;
        sort_order: number;
      }>;
    }) => {
      const businessId = assertBusinessId(input);
      const id = assertId(input);
      if (!input.patch || typeof input.patch !== "object")
        throw new Error("invalid_patch");
      const p: Record<string, unknown> = {};
      if ("contact_type" in input.patch) {
        const v = trimRequired(input.patch.contact_type, 32, "contact_type");
        if (!CONTACT_TYPES.has(v)) throw new Error("invalid_contact_type");
        p.contact_type = v;
      }
      if ("value" in input.patch)
        p.value = trimRequired(input.patch.value, 500, "value");
      if ("label" in input.patch)
        p.label = trimOrNull(input.patch.label ?? null, 120, "label");
      if ("is_public" in input.patch)
        p.is_public = Boolean(input.patch.is_public);
      if ("sort_order" in input.patch)
        p.sort_order = clampInt(input.patch.sort_order, 0, 9999, "sort_order");
      if (Object.keys(p).length === 0) throw new Error("empty_patch");
      return { businessId, id, patch: p };
    },
  )
  .handler(async ({ data, context }): Promise<PortalContact> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const patch = {
      ...data.patch,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase
      .from("business_contacts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .select(
        "id, business_id, contact_type, label, value, is_public, sort_order, updated_at",
      )
      .single();
    if (error) throw new Error(`update_contact_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "contact.update",
      actorId: userId,
      notes: data.id,
    });
    return row as PortalContact;
  });

export const deleteBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; id: string }) => ({
    businessId: assertBusinessId(input),
    id: assertId(input),
  }))
  .handler(async ({ data, context }) => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("business_contacts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ deleted_at: now, deleted_by: userId, updated_by: userId } as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .is("deleted_at", null);
    if (error) throw new Error(`delete_contact_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "contact.delete",
      actorId: userId,
      notes: data.id,
    });
    return { ok: true };
  });

// --- Ubicaciones ----------------------------------------------------------

export const listBusinessLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessId(input),
  }))
  .handler(async ({ data, context }): Promise<PortalLocation[]> => {
    await ensureViewer(context, data.businessId);
    const { data: rows, error } = await context.supabase
      .from("business_locations")
      .select(
        "id, business_id, label, address_line1, address_line2, postal_code, latitude, longitude, destination_zone_id, is_primary, updated_at, deleted_at",
      )
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`list_locations_failed: ${error.message}`);
    return (rows ?? []).map(({ deleted_at: _d, ...r }) => r) as PortalLocation[];
  });

function buildLocationPayload(input: {
  label?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  destination_zone_id?: string | null;
  is_primary?: boolean;
}) {
  return {
    label: trimOrNull(input.label ?? null, 120, "label"),
    address_line1: trimOrNull(input.address_line1 ?? null, 240, "address_line1"),
    address_line2: trimOrNull(input.address_line2 ?? null, 240, "address_line2"),
    postal_code: trimOrNull(input.postal_code ?? null, 24, "postal_code"),
    latitude: optionalNumber(input.latitude ?? null, -90, 90, "latitude"),
    longitude: optionalNumber(input.longitude ?? null, -180, 180, "longitude"),
    destination_zone_id:
      input.destination_zone_id === null ||
      input.destination_zone_id === undefined ||
      input.destination_zone_id === ""
        ? null
        : assertId({ destination_zone_id: input.destination_zone_id }, "destination_zone_id"),
    is_primary: Boolean(input.is_primary),
  };
}

export const createBusinessLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      label?: string | null;
      address_line1?: string | null;
      address_line2?: string | null;
      postal_code?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
      destination_zone_id?: string | null;
      is_primary?: boolean;
    }) => {
      const businessId = assertBusinessId(input);
      const payload = buildLocationPayload(input);
      return { businessId, payload };
    },
  )
  .handler(async ({ data, context }): Promise<PortalLocation> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_locations")
      .insert({
        business_id: data.businessId,
        ...data.payload,
        created_by: userId,
        updated_by: userId,
      })
      .select(
        "id, business_id, label, address_line1, address_line2, postal_code, latitude, longitude, destination_zone_id, is_primary, updated_at",
      )
      .single();
    if (error) throw new Error(`create_location_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "location.create",
      actorId: userId,
    });
    return row as PortalLocation;
  });

export const updateBusinessLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      id: string;
      patch: {
        label?: string | null;
        address_line1?: string | null;
        address_line2?: string | null;
        postal_code?: string | null;
        latitude?: number | string | null;
        longitude?: number | string | null;
        destination_zone_id?: string | null;
        is_primary?: boolean;
      };
    }) => {
      const businessId = assertBusinessId(input);
      const id = assertId(input);
      if (!input.patch || typeof input.patch !== "object")
        throw new Error("invalid_patch");
      const built = buildLocationPayload(input.patch);
      const p: Record<string, unknown> = {};
      for (const k of Object.keys(input.patch)) {
        if (k in built) p[k] = (built as Record<string, unknown>)[k];
      }
      if (Object.keys(p).length === 0) throw new Error("empty_patch");
      return { businessId, id, patch: p };
    },
  )
  .handler(async ({ data, context }): Promise<PortalLocation> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const patch = {
      ...data.patch,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase
      .from("business_locations")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .select(
        "id, business_id, label, address_line1, address_line2, postal_code, latitude, longitude, destination_zone_id, is_primary, updated_at",
      )
      .single();
    if (error) throw new Error(`update_location_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "location.update",
      actorId: userId,
      notes: data.id,
    });
    return row as PortalLocation;
  });

export const deleteBusinessLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; id: string }) => ({
    businessId: assertBusinessId(input),
    id: assertId(input),
  }))
  .handler(async ({ data, context }) => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("business_locations")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ deleted_at: now, deleted_by: userId, updated_by: userId } as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .is("deleted_at", null);
    if (error) throw new Error(`delete_location_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "location.delete",
      actorId: userId,
      notes: data.id,
    });
    return { ok: true };
  });

// --- Horarios -------------------------------------------------------------

export const listBusinessHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessId(input),
  }))
  .handler(async ({ data, context }): Promise<PortalHour[]> => {
    await ensureViewer(context, data.businessId);
    const { data: rows, error } = await context.supabase
      .from("business_hours")
      .select(
        "id, business_id, day_of_week, is_closed, opens_at, closes_at, notes, updated_at",
      )
      .eq("business_id", data.businessId)
      .order("day_of_week", { ascending: true });
    if (error) throw new Error(`list_hours_failed: ${error.message}`);
    return (rows ?? []) as PortalHour[];
  });

/**
 * upsertBusinessHour — Inserta o reemplaza el horario de un día (0..6).
 * No usamos día como PK en BD (la tabla acepta varias franjas), pero el
 * Portal modela un horario por día. La server fn permite crear, editar
 * o cerrar un día específico identificado por su `id`; si no hay `id`
 * crea una nueva franja.
 */
function buildHourPayload(input: {
  day_of_week: number;
  is_closed?: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
  notes?: string | null;
}) {
  const day_of_week = clampInt(input.day_of_week, 0, 6, "day_of_week");
  const is_closed = Boolean(input.is_closed);
  const opens_at = is_closed ? null : timeOrNull(input.opens_at ?? null, "opens_at");
  const closes_at = is_closed ? null : timeOrNull(input.closes_at ?? null, "closes_at");
  if (!is_closed && (!opens_at || !closes_at))
    throw new Error("hours_open_close_required");
  return {
    day_of_week,
    is_closed,
    opens_at,
    closes_at,
    notes: trimOrNull(input.notes ?? null, 200, "notes"),
  };
}

export const createBusinessHour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      day_of_week: number;
      is_closed?: boolean;
      opens_at?: string | null;
      closes_at?: string | null;
      notes?: string | null;
    }) => ({
      businessId: assertBusinessId(input),
      payload: buildHourPayload(input),
    }),
  )
  .handler(async ({ data, context }): Promise<PortalHour> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_hours")
      .insert({ business_id: data.businessId, ...data.payload })
      .select(
        "id, business_id, day_of_week, is_closed, opens_at, closes_at, notes, updated_at",
      )
      .single();
    if (error) throw new Error(`create_hour_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "hours.create",
      actorId: userId,
      notes: `day=${data.payload.day_of_week}`,
    });
    return row as PortalHour;
  });

export const updateBusinessHour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      id: string;
      day_of_week: number;
      is_closed?: boolean;
      opens_at?: string | null;
      closes_at?: string | null;
      notes?: string | null;
    }) => ({
      businessId: assertBusinessId(input),
      id: assertId(input),
      payload: buildHourPayload(input),
    }),
  )
  .handler(async ({ data, context }): Promise<PortalHour> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_hours")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ ...data.payload, updated_at: new Date().toISOString() } as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .select(
        "id, business_id, day_of_week, is_closed, opens_at, closes_at, notes, updated_at",
      )
      .single();
    if (error) throw new Error(`update_hour_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "hours.update",
      actorId: userId,
      notes: `day=${data.payload.day_of_week}`,
    });
    return row as PortalHour;
  });

export const deleteBusinessHour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; id: string }) => ({
    businessId: assertBusinessId(input),
    id: assertId(input),
  }))
  .handler(async ({ data, context }) => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("business_hours")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(`delete_hour_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "hours.delete",
      actorId: userId,
      notes: data.id,
    });
    return { ok: true };
  });

// --- Redes sociales -------------------------------------------------------

export const listBusinessSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessId(input),
  }))
  .handler(async ({ data, context }): Promise<PortalSocialLink[]> => {
    await ensureViewer(context, data.businessId);
    const { data: rows, error } = await context.supabase
      .from("business_social_links")
      .select("id, business_id, platform, url, sort_order, updated_at")
      .eq("business_id", data.businessId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`list_social_failed: ${error.message}`);
    return (rows ?? []) as PortalSocialLink[];
  });

export const createBusinessSocialLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      platform: string;
      url: string;
      sort_order?: number;
    }) => {
      const businessId = assertBusinessId(input);
      const platform = trimRequired(input.platform, 32, "platform").toLowerCase();
      if (!SOCIAL_PLATFORMS.has(platform))
        throw new Error("invalid_platform");
      const url = urlOrThrow(input.url, "url");
      const sort_order = clampInt(input.sort_order ?? 0, 0, 9999, "sort_order");
      return { businessId, platform, url, sort_order };
    },
  )
  .handler(async ({ data, context }): Promise<PortalSocialLink> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_social_links")
      .insert({
        business_id: data.businessId,
        platform: data.platform,
        url: data.url,
        sort_order: data.sort_order,
      })
      .select("id, business_id, platform, url, sort_order, updated_at")
      .single();
    if (error) throw new Error(`create_social_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "social.create",
      actorId: userId,
      notes: data.platform,
    });
    return row as PortalSocialLink;
  });

export const updateBusinessSocialLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      id: string;
      patch: Partial<{ platform: string; url: string; sort_order: number }>;
    }) => {
      const businessId = assertBusinessId(input);
      const id = assertId(input);
      if (!input.patch || typeof input.patch !== "object")
        throw new Error("invalid_patch");
      const p: Record<string, unknown> = {};
      if ("platform" in input.patch) {
        const v = trimRequired(input.patch.platform, 32, "platform").toLowerCase();
        if (!SOCIAL_PLATFORMS.has(v)) throw new Error("invalid_platform");
        p.platform = v;
      }
      if ("url" in input.patch) p.url = urlOrThrow(input.patch.url, "url");
      if ("sort_order" in input.patch)
        p.sort_order = clampInt(input.patch.sort_order, 0, 9999, "sort_order");
      if (Object.keys(p).length === 0) throw new Error("empty_patch");
      return { businessId, id, patch: p };
    },
  )
  .handler(async ({ data, context }): Promise<PortalSocialLink> => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_social_links")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ ...data.patch, updated_at: new Date().toISOString() } as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .select("id, business_id, platform, url, sort_order, updated_at")
      .single();
    if (error) throw new Error(`update_social_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "social.update",
      actorId: userId,
      notes: data.id,
    });
    return row as PortalSocialLink;
  });

export const deleteBusinessSocialLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; id: string }) => ({
    businessId: assertBusinessId(input),
    id: assertId(input),
  }))
  .handler(async ({ data, context }) => {
    await ensureEditor(context, data.businessId);
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("business_social_links")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(`delete_social_failed: ${error.message}`);
    await logAudit(supabase, {
      businessId: data.businessId,
      action: "social.delete",
      actorId: userId,
      notes: data.id,
    });
    return { ok: true };
  });