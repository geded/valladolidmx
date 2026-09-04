/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types cannot include additive columns until the migration is applied remotely. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeFilterAttributes,
  type TourismAttributeDefinition,
  type TourismFilterAttributes,
} from "@/lib/business-attributes/types";

export interface ProductAttributeEditorDTO {
  productId: string;
  family: string | null;
  editable: boolean;
  values: TourismFilterAttributes;
  definitions: TourismAttributeDefinition[];
}

/** Familia de atributos turísticos por tipo de producto. Aditivo: los tipos sin familia no editan. */
const FAMILY_BY_PRODUCT_TYPE: Record<string, string> = {
  experiencia: "experiencias",
  tour: "experiencias",
};

function productIdOf(input: unknown): string {
  const id = (input as { productId?: unknown } | null)?.productId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_product");
  return id;
}

async function loadProduct(supabase: any, productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, business_id, product_type, filter_attributes")
    .eq("id", productId)
    .is("deleted_at", null)
    .single();
  if (error || !data) throw new Error(`get_product_failed:${error?.message ?? "not_found"}`);
  return data;
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

async function readEditorDTO(supabase: any, product: any): Promise<ProductAttributeEditorDTO> {
  const family = FAMILY_BY_PRODUCT_TYPE[String(product.product_type)] ?? null;
  if (!family) {
    return { productId: product.id, family: null, editable: false, values: {}, definitions: [] };
  }
  const { data: definitions, error } = await supabase
    .from("tourism_attribute_definitions")
    .select(
      "id, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, tourism_attribute_options(value,label,sort_order,active)",
    )
    .eq("family_key", family)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`get_attribute_catalog_failed:${error.message}`);

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
    productId: product.id,
    family,
    editable: true,
    values: normalizeFilterAttributes(product.filter_attributes),
    definitions: mapped,
  };
}

export const getProductAttributeEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => ({ productId: productIdOf(input) }))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const product = await loadProduct(supabase, data.productId);
    await assertAccess(supabase, context.userId, product.business_id, "viewer");
    return readEditorDTO(supabase, product);
  });

export const updateProductAttributes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; values: TourismFilterAttributes }) => ({
    productId: productIdOf(input),
    values: normalizeFilterAttributes(input.values),
  }))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const product = await loadProduct(supabase, data.productId);
    await assertAccess(supabase, context.userId, product.business_id, "editor");
    const editor = await readEditorDTO(supabase, product);
    if (!editor.editable) throw new Error("attributes_not_supported_for_product_type");

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
      .from("products")
      .update({ filter_attributes: cleaned, updated_at: new Date().toISOString() })
      .eq("id", data.productId)
      .is("deleted_at", null);
    if (error) throw new Error(`update_product_attributes_failed:${error.message}`);
    return { ...editor, values: cleaned } satisfies ProductAttributeEditorDTO;
  });
