/* eslint-disable @typescript-eslint/no-explicit-any -- catálogo aditivo de atributos turísticos. */
/**
 * cms/event-attributes.functions.ts — Atributos estructurados de eventos.
 *
 * Reutiliza el catálogo `tourism_attribute_definitions/_options` (familia
 * `eventos`) que ya alimenta hoteles, restaurantes y casas de vacaciones.
 * Escribe exclusivamente con la sesión del editor (RLS + gobernanza CMS);
 * nunca con service role. Lo que no se captura permanece vacío y se omite
 * en la superficie pública.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeFilterAttributes,
  type TourismAttributeDefinition,
  type TourismFilterAttributes,
} from "@/lib/business-attributes/types";

export interface EventAttributeEditorDTO {
  eventId: string;
  editable: boolean;
  values: TourismFilterAttributes;
  definitions: TourismAttributeDefinition[];
}

function eventIdOf(input: unknown): string {
  const id = (input as { eventId?: unknown } | null)?.eventId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_event");
  return id;
}

async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed:${error.message}`);
  if (!data) throw new Error("forbidden");
}

async function readEditorDTO(supabase: any, eventId: string): Promise<EventAttributeEditorDTO> {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, filter_attributes")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();
  if (error || !event) throw new Error(`get_event_attributes_failed:${error?.message ?? "404"}`);

  const { data: definitions, error: catalogError } = await supabase
    .from("tourism_attribute_definitions")
    .select(
      "attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, tourism_attribute_options(value,label,sort_order,active)",
    )
    .eq("family_key", "eventos")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (catalogError) throw new Error(`get_attribute_catalog_failed:${catalogError.message}`);

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
    eventId,
    editable: mapped.length > 0,
    values: normalizeFilterAttributes(event.filter_attributes),
    definitions: mapped,
  };
}

export const getEventAttributeEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => ({ eventId: eventIdOf(input) }))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    return readEditorDTO(context.supabase as any, data.eventId);
  });

export const updateEventAttributes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; values: TourismFilterAttributes }) => ({
    eventId: eventIdOf(input),
    values: normalizeFilterAttributes(input.values),
  }))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const supabase = context.supabase as any;
    const editor = await readEditorDTO(supabase, data.eventId);
    if (!editor.editable) throw new Error("attributes_catalog_unavailable");

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
    }

    const { error } = await supabase
      .from("events")
      .update({
        filter_attributes: cleaned,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.eventId)
      .is("deleted_at", null);
    if (error) throw new Error(`update_event_attributes_failed:${error.message}`);
    return { ...editor, values: cleaned } satisfies EventAttributeEditorDTO;
  });
