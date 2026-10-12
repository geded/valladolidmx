/**
 * cms/business-locations.functions.ts — Ubicación primaria de negocios.
 *
 * Todo negocio en la plataforma debe tener coordenadas geográficas para
 * que el visitante vea distancia/tiempo y para que Alux calcule cercanía
 * y recomendaciones territoriales. Este módulo expone la mutación única
 * que crea o actualiza la fila `is_primary=true` de `business_locations`
 * ligada al negocio, y una lectura conveniente para el editor.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface BusinessPrimaryLocationDTO {
  id: string | null;
  latitude: number | null;
  longitude: number | null;
  address_line1: string | null;
  label: string | null;
}

function coerceCoord(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new Error("Coordenadas inválidas");
  }
  return v;
}

export const getBusinessPrimaryLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => {
    if (!input?.businessId || typeof input.businessId !== "string") {
      throw new Error("businessId requerido");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<BusinessPrimaryLocationDTO> => {
    const { data: row, error } = await context.supabase
      .from("business_locations")
      .select("id, latitude, longitude, address_line1, label, is_primary")
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (row?.id as string) ?? null,
      latitude: row?.latitude ?? null,
      longitude: row?.longitude ?? null,
      address_line1: row?.address_line1 ?? null,
      label: row?.label ?? null,
    };
  });

export const upsertBusinessPrimaryLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      latitude: number;
      longitude: number;
      address_line1?: string | null;
      label?: string | null;
    }) => {
      if (!input?.businessId || typeof input.businessId !== "string") {
        throw new Error("businessId requerido");
      }
      const lat = coerceCoord(input.latitude, -90, 90);
      const lng = coerceCoord(input.longitude, -180, 180);
      const address_line1 =
        typeof input.address_line1 === "string"
          ? input.address_line1.trim().slice(0, 200) || null
          : null;
      const label =
        typeof input.label === "string" ? input.label.trim().slice(0, 80) || null : null;
      return { businessId: input.businessId, latitude: lat, longitude: lng, address_line1, label };
    },
  )
  .handler(async ({ data, context }): Promise<BusinessPrimaryLocationDTO> => {
    const { supabase, userId } = context;
    const { data: existing, error: readErr } = await supabase
      .from("business_locations")
      .select("id")
      .eq("business_id", data.businessId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from("business_locations")
        .update({
          latitude: data.latitude,
          longitude: data.longitude,
          address_line1: data.address_line1,
          label: data.label ?? "Ubicación principal",
          updated_by: userId,
        })
        .eq("id", existing.id)
        .select("id, latitude, longitude, address_line1, label")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return {
        id: (updated?.id as string) ?? existing.id,
        latitude: updated?.latitude ?? data.latitude,
        longitude: updated?.longitude ?? data.longitude,
        address_line1: updated?.address_line1 ?? data.address_line1,
        label: updated?.label ?? data.label,
      };
    }

    const { data: inserted, error } = await supabase
      .from("business_locations")
      .insert({
        business_id: data.businessId,
        latitude: data.latitude,
        longitude: data.longitude,
        address_line1: data.address_line1,
        label: data.label ?? "Ubicación principal",
        is_primary: true,
        created_by: userId,
        updated_by: userId,
      })
      .select("id, latitude, longitude, address_line1, label")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (inserted?.id as string) ?? null,
      latitude: inserted?.latitude ?? data.latitude,
      longitude: inserted?.longitude ?? data.longitude,
      address_line1: inserted?.address_line1 ?? data.address_line1,
      label: inserted?.label ?? data.label,
    };
  });

/* ───────────── Zona de la ubicación + alta rápida de zona ───────────── */

export interface BusinessZoneOption {
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente tipado de Supabase
async function assertEditorialAccess(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_editor_or_admin", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No tienes permiso para administrar zonas.");
}

function slugifyZone(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Destino de la empresa, zonas activas de ese destino y zona actual. */
export const getBusinessZoneContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => {
    if (!input?.businessId || typeof input.businessId !== "string") {
      throw new Error("businessId requerido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: biz, error } = await supabase
      .from("businesses")
      .select("destination_id, destinations(name)")
      .eq("id", data.businessId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const destinationId = (biz?.destination_id as string | null) ?? null;
    const destinationName =
      ((biz as { destinations?: { name?: string } | null } | null)?.destinations?.name as
        | string
        | undefined) ?? null;
    const [zonesRes, locRes] = await Promise.all([
      destinationId
        ? supabase
            .from("destination_zones")
            .select("id, name")
            .eq("destination_id", destinationId)
            .is("deleted_at", null)
            .neq("status", "archived")
            .order("name", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("business_locations")
        .select("destination_zone_id")
        .eq("business_id", data.businessId)
        .eq("is_primary", true)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);
    if (zonesRes.error) throw new Error(zonesRes.error.message);
    return {
      destinationId,
      destinationName,
      zones: (zonesRes.data ?? []) as BusinessZoneOption[],
      zoneId: (locRes.data?.destination_zone_id as string | null) ?? null,
    };
  });

/** Alta rápida de una zona dentro del destino, sin salir de la ficha. */
export const createZoneQuick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { destinationId: string; name: string; description?: string | null }) => {
    const name = typeof input?.name === "string" ? input.name.trim().slice(0, 120) : "";
    if (name.length < 2) throw new Error("Escribe el nombre de la zona.");
    if (!input?.destinationId || typeof input.destinationId !== "string") {
      throw new Error("La empresa necesita un destino antes de crear zonas.");
    }
    const description =
      typeof input.description === "string" ? input.description.trim().slice(0, 1000) || null : null;
    return { destinationId: input.destinationId, name, description };
  })
  .handler(async ({ data, context }): Promise<BusinessZoneOption> => {
    const { supabase, userId } = context;
    await assertEditorialAccess(supabase, userId);
    const { data: existing } = await supabase
      .from("destination_zones")
      .select("id, name")
      .eq("destination_id", data.destinationId)
      .ilike("name", data.name)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing?.id) return { id: existing.id as string, name: existing.name as string };

    const base = slugifyZone(data.name) || "zona";
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { data: row, error } = await supabase
        .from("destination_zones")
        .insert({
          destination_id: data.destinationId,
          name: data.name,
          slug,
          description: data.description,
          created_by: userId,
          updated_by: userId,
        })
        .select("id, name")
        .maybeSingle();
      if (!error && row) return { id: row.id as string, name: row.name as string };
      if (error && error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Ya existe una zona con un nombre parecido. Usa otro nombre.");
  });

/** Asigna (o quita) la zona de la ubicación principal de la empresa. */
export const setBusinessPrimaryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; zoneId: string | null }) => {
    if (!input?.businessId || typeof input.businessId !== "string") {
      throw new Error("businessId requerido");
    }
    return { businessId: input.businessId, zoneId: input.zoneId || null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: loc, error } = await supabase
      .from("business_locations")
      .select("id")
      .eq("business_id", data.businessId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!loc?.id) throw new Error("Guarda primero la ubicación en el mapa.");
    const { error: upErr } = await supabase
      .from("business_locations")
      .update({ destination_zone_id: data.zoneId, updated_by: userId })
      .eq("id", loc.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true as const };
  });
