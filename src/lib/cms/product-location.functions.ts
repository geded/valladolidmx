import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ProductLocationDTO {
  mode: "inherited" | "specific";
  businessId: string;
  locationId: string | null;
  label: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  latitude: number | null;
  longitude: number | null;
}

function coordinate(value: unknown, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error("Coordenadas inválidas");
  }
  return parsed;
}

async function assertProductAccess(
  supabase: Parameters<Parameters<typeof createServerFn>[0]>[0] extends never ? never : any,
  userId: string,
  productId: string,
) {
  const { data: product, error } = await supabase
    .from("products")
    .select("id, business_id, location_id")
    .eq("id", productId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!product) throw new Error("Experiencia no encontrada");
  const { data: allowed } = await supabase.rpc("has_business_access", {
    _user_id: userId,
    _business_id: product.business_id,
    _min_role: "editor",
  });
  const { data: staff } = await supabase.rpc("is_editor_or_admin");
  if (!allowed && !staff) throw new Error("Sin permiso para editar esta experiencia");
  return product;
}

export const getProductLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => {
    if (!input?.productId) throw new Error("productId requerido");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProductLocationDTO> => {
    const product = await assertProductAccess(context.supabase, context.userId, data.productId);
    let query = context.supabase
      .from("business_locations")
      .select("id, label, address_line1, address_line2, latitude, longitude, is_primary")
      .eq("business_id", product.business_id)
      .is("deleted_at", null);
    query = product.location_id
      ? query.eq("id", product.location_id)
      : query.eq("is_primary", true);
    const { data: location, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return {
      mode: product.location_id ? "specific" : "inherited",
      businessId: product.business_id,
      locationId: product.location_id,
      label: location?.label ?? null,
      addressLine1: location?.address_line1 ?? null,
      addressLine2: location?.address_line2 ?? null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    };
  });

export const saveProductLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    productId: string;
    mode: "inherited" | "specific";
    label?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    if (!input?.productId) throw new Error("productId requerido");
    if (input.mode === "inherited") return { ...input, latitude: null, longitude: null };
    return {
      ...input,
      label: input.label?.trim().slice(0, 80) || "Punto de encuentro",
      addressLine1: input.addressLine1?.trim().slice(0, 200) || null,
      addressLine2: input.addressLine2?.trim().slice(0, 200) || null,
      latitude: coordinate(input.latitude, -90, 90),
      longitude: coordinate(input.longitude, -180, 180),
    };
  })
  .handler(async ({ data, context }) => {
    const product = await assertProductAccess(context.supabase, context.userId, data.productId);
    if (data.mode === "inherited") {
      const { error } = await context.supabase
        .from("products")
        .update({ location_id: null, updated_by: context.userId })
        .eq("id", data.productId);
      if (error) throw new Error(error.message);
      return { ok: true as const, locationId: null };
    }

    const payload = {
      business_id: product.business_id,
      is_primary: false,
      label: data.label ?? "Punto de encuentro",
      address_line1: data.addressLine1 ?? null,
      address_line2: data.addressLine2 ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      updated_by: context.userId,
    };
    const existingId = product.location_id as string | null;
    const result = existingId
      ? await context.supabase
          .from("business_locations")
          .update(payload)
          .eq("id", existingId)
          .eq("business_id", product.business_id)
          .select("id")
          .single()
      : await context.supabase
          .from("business_locations")
          .insert({ ...payload, created_by: context.userId })
          .select("id")
          .single();
    if (result.error) throw new Error(result.error.message);
    const { error } = await context.supabase
      .from("products")
      .update({ location_id: result.data.id, updated_by: context.userId })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true as const, locationId: result.data.id };
  });