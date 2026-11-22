/**
 * Fase 5 · datos de la empresa para Alux en su propio WhatsApp (sólo servidor).
 *
 * Reutiliza lo que la empresa ya dio de alta en Valladolid.mx: ficha,
 * productos publicados con sus precios, horarios, ubicación principal y sus
 * preguntas y respuestas publicadas (`faqs` ligadas a la empresa). Nunca lee
 * contactos, teléfonos ni datos de clientes.
 */
import { resolveCanonicalPath } from "@/lib/navigation";
import { PUBLIC_BUSINESS_ELIGIBILITY_EQ } from "@/lib/omxds/public-eligibility";
import { DEFAULT_PUBLIC_DOMAIN } from "@/config/site";
import type {
  BusinessFaqFact,
  BusinessHourFact,
  BusinessProductFact,
  BusinessWhatsAppContext,
} from "./business-rules";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
type Row = Record<string, unknown>;

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function loadBusinessWhatsAppContext(
  admin: Admin,
  businessId: string,
): Promise<BusinessWhatsAppContext | null> {
  const { data: b, error } = await admin
    .from("businesses")
    .select(
      "id, slug, display_name, tagline, description, destination_id, status, source_review_state, primary_category:business_categories!businesses_primary_category_id_fkey ( name, slug )",
    )
    .eq("id", businessId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`business_read_failed: ${error.message}`);
  if (!b) return null;
  const biz = b as unknown as Row;

  const [dest, products, hours, locations, faqs] = await Promise.all([
    biz["destination_id"]
      ? admin
          .from("destinations")
          .select("slug, name")
          .eq("id", String(biz["destination_id"]))
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("products")
      .select(
        "name, product_type, tagline, description, price_amount, price_currency, duration_minutes, direct_sale_enabled, direct_sale_price_amount, direct_sale_currency",
      )
      .eq("business_id", businessId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("name")
      .limit(30),
    admin
      .from("business_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("business_id", businessId)
      .order("day_of_week"),
    admin
      .from("business_locations")
      .select("address_line1, address_line2, latitude, longitude, is_primary")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .limit(1),
    admin
      .from("faqs")
      .select("question, answer")
      .eq("entity_kind", "business")
      .eq("entity_id", businessId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("position")
      .limit(40),
  ]);

  const d = (dest.data ?? null) as Row | null;
  const cat = (biz["primary_category"] ?? null) as Row | null;
  const loc = ((locations.data ?? []) as Row[])[0] ?? null;
  const lat = num(loc?.["latitude"]);
  const lng = num(loc?.["longitude"]);
  const address = [str(loc?.["address_line1"]), str(loc?.["address_line2"])]
    .filter(Boolean)
    .join(", ");

  const isPublic =
    biz["status"] === "published" &&
    biz[PUBLIC_BUSINESS_ELIGIBILITY_EQ[0]] === PUBLIC_BUSINESS_ELIGIBILITY_EQ[1];
  const destSlug = str(d?.["slug"]);
  const catSlug = str(cat?.["slug"]);
  const publicUrl =
    isPublic && destSlug && catSlug
      ? `https://www.${DEFAULT_PUBLIC_DOMAIN}${resolveCanonicalPath({
          kind: "business",
          slug: String(biz["slug"]),
          category: catSlug,
          destination: destSlug,
        })}`
      : null;

  return {
    businessId,
    name: str(biz["display_name"]) ?? String(biz["slug"] ?? "la empresa"),
    category: str(cat?.["name"]),
    destinationName: str(d?.["name"]),
    tagline: str(biz["tagline"]),
    description: str(biz["description"]),
    address: address || null,
    mapsUrl:
      lat !== null && lng !== null
        ? `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`
        : null,
    publicUrl,
    products: ((products.data ?? []) as Row[]).flatMap((p): BusinessProductFact[] => {
      const name = str(p["name"]);
      if (!name) return [];
      return [
        {
          name,
          type: str(p["product_type"]),
          tagline: str(p["tagline"]),
          description: str(p["description"]),
          priceAmount: num(p["price_amount"]),
          priceCurrency: str(p["price_currency"]),
          directSaleCents:
            p["direct_sale_enabled"] === true ? num(p["direct_sale_price_amount"]) : null,
          directSaleCurrency: str(p["direct_sale_currency"]),
          durationMinutes: num(p["duration_minutes"]),
        },
      ];
    }),
    hours: ((hours.data ?? []) as Row[]).map(
      (h): BusinessHourFact => ({
        dayOfWeek: num(h["day_of_week"]) ?? -1,
        opensAt: str(h["opens_at"]),
        closesAt: str(h["closes_at"]),
        isClosed: h["is_closed"] === true,
      }),
    ),
    faqs: ((faqs.data ?? []) as Row[]).flatMap((f): BusinessFaqFact[] => {
      const q = str(f["question"]);
      const a = str(f["answer"]);
      return q && a ? [{ question: q, answer: a }] : [];
    }),
  };
}

/**
 * Pregunta que Alux no supo contestar en el WhatsApp de la empresa: queda
 * como pregunta pendiente (borrador sin respuesta) en sus Preguntas y
 * respuestas. Sin teléfonos ni correos; nunca rompe la respuesta.
 */
export async function recordBusinessQuestionGap(
  admin: Admin,
  businessId: string,
  question: string,
): Promise<void> {
  try {
    const { scrubGapQuestion, gapQuestionKey } = await import("@/lib/alux/knowledge-gaps");
    const q = scrubGapQuestion(question).slice(0, 300);
    if (gapQuestionKey(q).length < 3) return;
    const { data: existing } = await admin
      .from("faqs")
      .select("id, question")
      .eq("entity_kind", "business")
      .eq("entity_id", businessId)
      .is("deleted_at", null)
      .limit(200);
    const key = gapQuestionKey(q);
    if ((existing ?? []).some((f) => gapQuestionKey(String(f.question ?? "")) === key)) return;
    await admin.from("faqs").insert({
      question: q,
      answer: "",
      status: "draft",
      category: "alux-pendiente",
      entity_kind: "business",
      entity_id: businessId,
      locale: "es",
      position: 999,
    } as never);
  } catch (e) {
    console.warn("[biz.wa.gap] no se registró", e instanceof Error ? e.message.slice(0, 160) : e);
  }
}
