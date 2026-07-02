/**
 * translate-content.server.ts — Auto-traducción del contenido CMS.
 *
 * Al guardar un destino / empresa / producto / zona / región, traduce
 * name, tagline, description, short_description a todos los idiomas
 * activos ≠ default y guarda el resultado en `translations` con
 * status='draft' para que un editor humano pueda revisar.
 *
 * Best-effort: si falla la IA, no bloquea el guardado.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";

const TRANSLATABLE_FIELDS = ["name", "display_name", "legal_name", "tagline", "description", "short_description"];

type EntityKind = Database["public"]["Enums"]["entity_kind"];

const TABLE_TO_ENTITY_KIND: Record<string, EntityKind> = {
  tourism_regions: "tourism_region",
  destinations: "destination",
  destination_zones: "destination_zone",
  business_categories: "business_category",
  businesses: "business",
  products: "product",
};

export async function translateEntityContentBestEffort(
  supabase: SupabaseClient<Database>,
  params: {
    table: string;
    entityId: string;
    payload: Record<string, unknown>;
    userId: string;
  },
): Promise<{ translated: number; skipped: boolean; reason?: string }> {
  const kind = TABLE_TO_ENTITY_KIND[params.table];
  if (!kind) return { translated: 0, skipped: true, reason: "table-not-supported" };

  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { translated: 0, skipped: true, reason: "no-key" };

  const fields: Record<string, string> = {};
  for (const f of TRANSLATABLE_FIELDS) {
    const v = params.payload[f];
    if (typeof v === "string" && v.trim()) fields[f] = v.trim();
  }
  if (Object.keys(fields).length === 0) {
    return { translated: 0, skipped: true, reason: "no-text" };
  }

  const { data: locales } = await supabase
    .from("platform_locales")
    .select("code, is_default, is_active")
    .eq("is_active", true);
  const rows = (locales ?? []) as Array<{ code: string; is_default: boolean }>;
  const base = rows.find((r) => r.is_default)?.code ?? "es";
  const targets = rows.map((r) => r.code).filter((c) => c !== base);
  if (targets.length === 0) return { translated: 0, skipped: true, reason: "no-targets" };

  const system =
    "Eres traductor profesional para una plataforma turística mexicana (Valladolid, Yucatán, Oriente Maya). Traduce cada campo del idioma base al idioma destino conservando: nombres propios (Valladolid, Yucatán, Oriente Maya, Alux, Chichén Itzá, Cenote), tono cálido y comercial, y longitud similar. No traduzcas 'name' si es un nombre propio (déjalo igual). Devuelve exclusivamente JSON con la forma {\"<locale>\":{\"<field>\":\"<traducción>\"}}.";
  const prompt = `Idioma base: ${base}. Idiomas destino: ${targets.join(", ")}\n\nCampos:\n${JSON.stringify(fields, null, 2)}`;

  let raw = "";
  try {
    const provider = createLovableAiGatewayProvider(key);
    const res = await generateText({ model: provider(MODEL), system, prompt });
    raw = res.text ?? "";
  } catch (e) {
    return { translated: 0, skipped: true, reason: `ai-error:${(e as Error).message}` };
  }

  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return { translated: 0, skipped: true, reason: "no-json" };
  let parsed: Record<string, Record<string, string>>;
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    return { translated: 0, skipped: true, reason: "parse-error" };
  }

  const inserts: Array<{
    entity_kind: EntityKind;
    entity_id: string;
    locale: Database["public"]["Enums"]["locale_code"];
    field: string;
    value: string;
    status: Database["public"]["Enums"]["content_status"];
    created_by: string;
    updated_by: string;
  }> = [];
  let translated = 0;
  for (const loc of targets) {
    const tr = parsed[loc];
    if (!tr) continue;
    for (const [field, value] of Object.entries(tr)) {
      if (typeof value !== "string" || !value.trim()) continue;
      if (!(field in fields)) continue;
      inserts.push({
        entity_kind: kind,
        entity_id: params.entityId,
        locale: loc as Database["public"]["Enums"]["locale_code"],
        field,
        value: value.trim(),
        status: "draft",
        created_by: params.userId,
        updated_by: params.userId,
      });
      translated++;
    }
  }

  if (inserts.length === 0) return { translated: 0, skipped: true, reason: "empty-response" };

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("translations")
      .upsert(inserts, { onConflict: "entity_kind,entity_id,locale,field" });
  } catch (e) {
    return { translated: 0, skipped: true, reason: `db-error:${(e as Error).message}` };
  }

  return { translated, skipped: false };
}