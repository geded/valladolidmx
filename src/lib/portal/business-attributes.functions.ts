/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types cannot include additive tables until the migration is applied remotely. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeFilterAttributes,
  type BusinessAttributeEditorDTO,
  type TourismAttributeDefinition,
  type TourismFilterAttributes,
} from "@/lib/business-attributes/types";

function businessIdOf(input: unknown): string {
  const id = (input as { businessId?: unknown } | null)?.businessId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_business");
  return id;
}

async function assertAccess(
  supabase: any,
  userId: string,
  businessId: string,
  role: "viewer" | "editor",
) {
  const { data, error } = await supabase.rpc("has_business_access", {
    _user_id: userId,
    _business_id: businessId,
    _min_role: role,
  });
  if (error) throw new Error(`access_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden_business_access");
}

async function readEditorDTO(
  supabase: any,
  businessId: string,
): Promise<BusinessAttributeEditorDTO> {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select(
      "id, status, filter_attributes, business_categories!businesses_primary_category_id_fkey(slug,listing_family_key)",
    )
    .eq("id", businessId)
    .is("deleted_at", null)
    .single();
  if (businessError || !business)
    throw new Error(`get_business_attributes_failed:${businessError?.message ?? "not_found"}`);
  // Lote 3C — la familia proviene del CMS (`business_categories.listing_family_key`).
  // Las listas de slugs quedan sólo como fallback fail-safe.
  const categorySlug = business.business_categories?.slug ?? null;
  const normalizedCategory = String(categorySlug).toLowerCase();
  const administeredFamily = business.business_categories?.listing_family_key ?? null;
  const family: string | null =
    typeof administeredFamily === "string" && administeredFamily.trim()
      ? administeredFamily.trim()
      : ["hotel", "hoteles", "hospedaje", "hospedajes"].includes(normalizedCategory)
        ? "hoteles"
        : ["restaurante", "restaurantes", "gastronomia", "gastronomía"].includes(normalizedCategory)
          ? "restaurantes"
          : [
                "casa-de-vacaciones",
                "casas-de-vacaciones",
                "casas-vacacionales",
                "villas",
                "renta-vacacional",
                "rentas-vacacionales",
                "casas",
              ].includes(normalizedCategory)
            ? "casas-de-vacaciones"
            : null;
  if (!family) {
    return { businessId, family: null, editable: false, values: {}, definitions: [] };
  }

  const { data: definitions, error: definitionsError } = await supabase
    .from("tourism_attribute_definitions")
    .select(
      "id, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, tourism_attribute_options(value,label,sort_order,active)",
    )
    .eq("family_key", family)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (definitionsError) throw new Error(`get_attribute_catalog_failed:${definitionsError.message}`);

  const mapped: TourismAttributeDefinition[] = (definitions ?? []).map((definition: any) => ({
    key: String(definition.attribute_key),
    label: String(definition.label),
    helpText: typeof definition.help_text === "string" ? definition.help_text : null,
    inputType: definition.input_type === "multi" ? "multi" : "single",
    filterGroup: definition.filter_group,
    filterable: Boolean(definition.filterable),
    required: Boolean(definition.required),
    sortOrder: Number(definition.sort_order ?? 0),
    options: (definition.tourism_attribute_options ?? [])
      .filter((option: any) => option.active !== false)
      .map((option: any) => ({
        value: String(option.value),
        label: String(option.label),
        sort_order: Number(option.sort_order ?? 0),
      }))
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));
  return {
    businessId,
    family,
    editable: true,
    values: normalizeFilterAttributes(business.filter_attributes),
    definitions: mapped,
  };
}

export const getBusinessAttributeEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({ businessId: businessIdOf(input) }))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertAccess(supabase, context.userId, data.businessId, "viewer");
    return readEditorDTO(supabase, data.businessId);
  });

export const updateBusinessAttributes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; values: TourismFilterAttributes }) => ({
    businessId: businessIdOf(input),
    values: normalizeFilterAttributes(input.values),
  }))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertAccess(supabase, context.userId, data.businessId, "editor");
    const editor = await readEditorDTO(supabase, data.businessId);
    if (!editor.editable) throw new Error("attributes_not_supported_for_category");

    const cleaned: TourismFilterAttributes = {};
    for (const definition of editor.definitions) {
      const raw = data.values[definition.key];
      const allowed = new Set(definition.options.map((option) => option.value));
      if (definition.inputType === "single") {
        if (typeof raw === "string" && allowed.has(raw)) cleaned[definition.key] = raw;
      } else {
        const values = Array.isArray(raw)
          ? Array.from(new Set(raw.filter((value) => allowed.has(value))))
          : [];
        if (values.length) cleaned[definition.key] = values;
      }
      if (definition.required && !(definition.key in cleaned))
        throw new Error(`required_attribute:${definition.key}`);
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        filter_attributes: cleaned,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.businessId)
      .is("deleted_at", null);
    if (error) throw new Error(`update_business_attributes_failed:${error.message}`);
    return { ...editor, values: cleaned } satisfies BusinessAttributeEditorDTO;
  });
