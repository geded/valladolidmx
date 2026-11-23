/* eslint-disable @typescript-eslint/no-explicit-any -- tabla aditiva; los tipos generados pueden ir un paso atrás. */
/**
 * Carta de restaurantes y cafeterías — lectura, guardado y lectura de fotos/PDF.
 *
 * Acceso: miembro de la empresa con rol de edición (Portal) o equipo editorial
 * (CMS), igual que las características del establecimiento. La escritura sigue
 * sujeta a RLS (`business_menu_items_owner_manage`).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MENU_FILE_MAX_BYTES,
  MENU_FILE_MAX_COUNT,
  MENU_TAG_KEYS,
  normalizeMenuItems,
  type MenuItem,
} from "@/lib/menu/menu-model";

const MENU_FAMILIES = new Set(["restaurantes", "hoteles"]);
const MENU_READ_MODEL = "openai/gpt-6-astra";
const MENU_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function businessIdOf(input: unknown): string {
  const id = (input as { businessId?: unknown } | null)?.businessId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_business");
  return id;
}

async function assertAccess(supabase: any, userId: string, businessId: string, role: "viewer" | "editor") {
  const { data, error } = await supabase.rpc("has_business_access", {
    _user_id: userId,
    _business_id: businessId,
    _min_role: role,
  });
  if (error) throw new Error(`access_check_failed: ${error.message}`);
  if (data) return;
  const { data: editorial, error: editorialError } = await supabase.rpc("is_editor_or_admin", {
    _user_id: userId,
  });
  if (editorialError) throw new Error(`access_check_failed: ${editorialError.message}`);
  if (!editorial) throw new Error("forbidden_business_access");
}

function rowToItem(row: any): MenuItem {
  return normalizeMenuItems([
    {
      id: row.id,
      section: row.section,
      name: row.name,
      description: row.description,
      priceAmount: row.price_amount === null ? null : Number(row.price_amount),
      priceCurrency: row.price_currency,
      tags: row.tags ?? [],
      isAvailable: row.is_available,
    },
  ])[0] as MenuItem;
}

export interface BusinessMenuEditorDTO {
  businessId: string;
  businessName: string;
  /** La carta aplica a restaurantes, cafeterías y hoteles con restaurante. */
  applies: boolean;
  items: MenuItem[];
}

export const getBusinessMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({ businessId: businessIdOf(input) }))
  .handler(async ({ data, context }): Promise<BusinessMenuEditorDTO> => {
    const supabase = context.supabase as any;
    await assertAccess(supabase, context.userId, data.businessId, "viewer");
    const [{ data: business, error: bErr }, { data: rows, error: rErr }] = await Promise.all([
      supabase
        .from("businesses")
        .select(
          "id, display_name, business_categories!businesses_primary_category_id_fkey(slug,listing_family_key)",
        )
        .eq("id", data.businessId)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("business_menu_items")
        .select("id, section, name, description, price_amount, price_currency, tags, is_available")
        .eq("business_id", data.businessId)
        .order("section_order", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(1000),
    ]);
    if (bErr || !business) throw new Error(`get_menu_failed:${bErr?.message ?? "not_found"}`);
    if (rErr) throw new Error(`get_menu_failed:${rErr.message}`);
    const family = business.business_categories?.listing_family_key ?? null;
    const items = (rows ?? []).map(rowToItem);
    return {
      businessId: data.businessId,
      businessName: String(business.display_name ?? ""),
      applies: MENU_FAMILIES.has(String(family)) || items.length > 0,
      items,
    };
  });

export const saveBusinessMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; items: unknown }) => ({
    businessId: businessIdOf(input),
    items: normalizeMenuItems(input.items),
  }))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertAccess(supabase, context.userId, data.businessId, "editor");

    const { data: existing, error: exErr } = await supabase
      .from("business_menu_items")
      .select("id")
      .eq("business_id", data.businessId)
      .limit(1000);
    if (exErr) throw new Error(`save_menu_failed:${exErr.message}`);
    const existingIds = new Set<string>((existing ?? []).map((r: any) => String(r.id)));

    const sectionOrder = new Map<string, number>();
    const rows = data.items.map((item, index) => {
      if (!sectionOrder.has(item.section)) sectionOrder.set(item.section, sectionOrder.size);
      return {
        ...(item.id && existingIds.has(item.id) ? { id: item.id } : {}),
        business_id: data.businessId,
        section: item.section,
        section_order: sectionOrder.get(item.section) ?? 0,
        name: item.name,
        description: item.description,
        price_amount: item.priceAmount,
        price_currency: item.priceCurrency,
        tags: item.tags,
        is_available: item.isAvailable,
        sort_order: index,
        updated_by: context.userId,
      };
    });
    const keep = new Set(rows.filter((r) => "id" in r).map((r) => (r as { id: string }).id));
    const toDelete = [...existingIds].filter((id) => !keep.has(id));
    if (toDelete.length) {
      const { error } = await supabase.from("business_menu_items").delete().in("id", toDelete);
      if (error) throw new Error(`save_menu_failed:${error.message}`);
    }
    const updates = rows.filter((r) => "id" in r);
    const inserts = rows.filter((r) => !("id" in r));
    if (updates.length) {
      const { error } = await supabase.from("business_menu_items").upsert(updates, { onConflict: "id" });
      if (error) throw new Error(`save_menu_failed:${error.message}`);
    }
    if (inserts.length) {
      const { error } = await supabase.from("business_menu_items").insert(inserts);
      if (error) throw new Error(`save_menu_failed:${error.message}`);
    }
    return { saved: rows.length, removed: toDelete.length };
  });

interface MenuFileInput {
  name: string;
  mimeType: string;
  base64: string;
}

export interface MenuReadResult {
  items: MenuItem[];
  /** Mensaje para el editor cuando Alux no pudo leer la carta. */
  problem: string | null;
}

const READ_SYSTEM = [
  "Lees cartas (menús) de restaurantes, cafeterías y bares de Yucatán a partir de fotos o PDF.",
  "Transcribe EXACTAMENTE lo que aparece: nombres de platillos y bebidas, su sección y su precio.",
  "Prohibido inventar platillos, precios o descripciones. Si un precio no se lee con claridad, déjalo en null.",
  "Si un platillo tiene varios tamaños o precios, usa el precio más bajo y menciona los tamaños en la descripción.",
  "La descripción es una sola línea corta tomada de la carta; si la carta no trae descripción, déjala vacía.",
  "Usa las secciones de la carta (por ejemplo «Bebidas calientes», «Desayunos»); si no hay, usa «Carta».",
  `Etiquetas permitidas, sólo si la carta lo indica claramente: ${MENU_TAG_KEYS.join(", ")}.`,
  "Moneda: MXN salvo que la carta indique dólares (USD).",
].join(" ");

/** Esquema estricto de la respuesta (raíz objeto, todo requerido, opcionales como null). */
const READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "name", "description", "priceAmount", "priceCurrency", "tags"],
        properties: {
          section: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          priceAmount: { type: ["number", "null"] },
          priceCurrency: { type: "string", enum: ["MXN", "USD"] },
          tags: { type: "array", items: { type: "string", enum: MENU_TAG_KEYS } },
        },
      },
    },
  },
} as const;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Lee el flujo de eventos de Responses y devuelve el texto final (o el error del proveedor). */
async function readStreamedText(res: Response): Promise<{ text: string; failed: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: "", failed: true };
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let failed = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload);
        if (event?.type === "response.output_text.delta" && typeof event.delta === "string")
          text += event.delta;
        else if (event?.type === "response.failed" || event?.type === "error") {
          failed = true;
          console.error("[menu.read] la IA no terminó", JSON.stringify(event).slice(0, 400));
        }
      } catch {
        /* fragmento incompleto: se ignora */
      }
    }
  }
  return { text, failed };
}

export const readMenuFromFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; files: MenuFileInput[] }) => {
    const files = Array.isArray(input?.files) ? input.files.slice(0, MENU_FILE_MAX_COUNT) : [];
    if (!files.length) throw new Error("menu_files_required");
    return {
      businessId: businessIdOf(input),
      files: files.map((f) => {
        const mimeType = String(f?.mimeType ?? "").toLowerCase();
        const base64 = String(f?.base64 ?? "");
        if (!MENU_FILE_TYPES.has(mimeType)) throw new Error("menu_file_type");
        if (!base64 || (base64.length * 3) / 4 > MENU_FILE_MAX_BYTES) throw new Error("menu_file_size");
        return { name: String(f?.name ?? "carta").slice(0, 120), mimeType, base64 };
      }),
    };
  })
  .handler(async ({ data, context }): Promise<MenuReadResult> => {
    const supabase = context.supabase as any;
    await assertAccess(supabase, context.userId, data.businessId, "editor");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { items: [], problem: "Alux no está disponible en este momento para leer la carta." };

    const content: unknown[] = [
      { type: "input_text", text: "Transcribe esta carta completa, en el orden en que aparece." },
      ...data.files.map((f) =>
        f.mimeType === "application/pdf"
          ? {
              type: "input_file",
              filename: f.name.toLowerCase().endsWith(".pdf") ? f.name : `${f.name}.pdf`,
              file_data: `data:application/pdf;base64,${f.base64}`,
            }
          : { type: "input_image", image_url: `data:${f.mimeType};base64,${f.base64}` },
      ),
    ];

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: MENU_READ_MODEL,
          stream: true,
          store: false,
          instructions: READ_SYSTEM,
          reasoning: { effort: "low", summary: "auto" },
          include: ["reasoning.encrypted_content"],
          text: {
            format: { type: "json_schema", name: "carta", strict: true, schema: READ_SCHEMA },
          },
          input: [{ role: "user", content }],
        }),
      });
    } catch (err) {
      console.error("[menu.read] sin conexión con la IA", err instanceof Error ? err.message : err);
      return { items: [], problem: "No se pudo conectar con Alux. Intenta de nuevo en unos minutos." };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[menu.read] IA respondió ${res.status}: ${body.slice(0, 400)}`);
      const problem =
        res.status === 402
          ? "Se terminaron los créditos de IA del proyecto; agrega créditos para que Alux lea cartas."
          : res.status === 429
            ? "Alux está recibiendo muchas solicitudes. Intenta de nuevo en un minuto."
            : res.status === 400
              ? "Alux no pudo abrir este archivo. Prueba con una foto más clara o un PDF distinto."
              : "Alux no pudo leer la carta en este momento. Intenta de nuevo.";
      return { items: [], problem };
    }
    const { text, failed } = await readStreamedText(res);
    if (failed && !text)
      return { items: [], problem: "Alux no pudo leer la carta en este momento. Intenta de nuevo." };
    const parsed = extractJson(text) as { items?: unknown } | null;
    const items = normalizeMenuItems(parsed?.items).map((i) => ({ ...i, id: null }));
    if (!items.length)
      return {
        items: [],
        problem: "Alux no encontró platillos en el archivo. Revisa que la foto se vea completa y con buena luz.",
      };
    return { items, problem: null };
  });
