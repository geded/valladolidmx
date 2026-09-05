/**
 * Experiencias · Lectura CMS-first del listado maestro.
 *
 * Fuente única: `public.products` (`product_type = 'experiencia'`) con su
 * empresa operadora, destino, portada gobernada y los atributos turísticos
 * administrables (`products.filter_attributes`, contrato
 * `tourism_attribute_definitions` familia `experiencias`).
 *
 * Lote 3E:
 *  - La lectura PÚBLICA usa el cliente publishable (RLS `TO anon`): sólo
 *    productos publicados de empresas publicadas. Nunca service role para
 *    datos; el service role sólo firma URLs de un bucket privado
 *    (mismo patrón que `marketplace-reads.functions.ts`).
 *  - La revisión INTERNA (`in_review`) sólo existe a través de una sesión
 *    de editor/admin (`getExperiencesReviewListing`), con RLS aplicada
 *    como esa persona.
 *  - No inventa datos: cada eje de filtro y cada valor provienen del
 *    catálogo real; los registros sin dato simplemente no aportan opciones.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import {
  LISTING_PUBLIC_CONTRACT_VERSION,
  listingFamilyContract,
  type PublicListingDTO,
} from "@/lib/listings/listing-public-contract";
import {
  normalizeFilterAttributes,
  type TourismAttributeDefinition,
} from "@/lib/business-attributes/types";
import type {
  MarketplaceProductDetail,
  ProductAttributeItem,
} from "@/lib/catalog/marketplace-reads.functions";
import {
  EXPERIENCE_ATTRIBUTE_FAMILY,
  EXPERIENCE_TYPE_ATTRIBUTE_KEY,
} from "@/lib/experiences/experience-attributes";

export interface ExperienceAxisDTO {
  readonly key: string;
  readonly label: string;
}

export interface ExperiencesListingResult {
  readonly dto: PublicListingDTO;
  readonly axes: readonly ExperienceAxisDTO[];
  readonly valueLabels: Record<string, string>;
}

export interface ListExperiencesInput {
  readonly destino?: string | null;
}

/** Estados editoriales que la lectura puede incluir (RLS decide lo visible). */
export type ExperienceListingStatus = "published" | "in_review";

export interface ListExperiencesDeps {
  /** Cliente ya autenticado (revisión interna). Por defecto: publishable/anon. */
  readonly client?: SupabaseClient<Database>;
  /** Por defecto sólo `published`. */
  readonly statuses?: readonly ExperienceListingStatus[];
  /** Aviso de revisión interna que se antepone al eyebrow de registros DEMO. */
  readonly markDemo?: boolean;
}

export { EXPERIENCE_TYPE_ATTRIBUTE_KEY };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- proyecciones parciales.
type Row = Record<string, any>;

function publicClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Catálogo administrable de la familia `experiencias` (definiciones +
 * opciones activas), en el mismo formato que consume el editor CMS/Portal.
 */
export async function loadExperienceAttributeCatalog(
  client: SupabaseClient<Database>,
): Promise<TourismAttributeDefinition[]> {
  const { data, error } = await client
    .from("tourism_attribute_definitions")
    .select(
      "attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, tourism_attribute_options(value,label,sort_order,active)",
    )
    .eq("family_key", EXPERIENCE_ATTRIBUTE_FAMILY)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`experience_attribute_catalog_failed:${error.message}`);
  return ((data ?? []) as Row[]).map((definition) => ({
    key: String(definition.attribute_key),
    label: String(definition.label),
    helpText: typeof definition.help_text === "string" ? definition.help_text : null,
    inputType: definition.input_type === "multi" ? "multi" : "single",
    filterGroup: definition.filter_group,
    filterable: Boolean(definition.filterable),
    required: Boolean(definition.required),
    sortOrder: Number(definition.sort_order ?? 0),
    options: ((definition.tourism_attribute_options ?? []) as Row[])
      .filter((option) => option.active !== false)
      .map((option) => ({
        value: String(option.value),
        label: String(option.label),
        sort_order: Number(option.sort_order ?? 0),
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

/** Mapa valor → etiqueta legible de todo el catálogo de la familia. */
export function catalogValueLabels(
  definitions: readonly TourismAttributeDefinition[],
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const definition of definitions) {
    for (const option of definition.options) labels[option.value] = option.label;
  }
  return labels;
}

/**
 * Etiqueta del "Tipo de experiencia" a partir de los atributos reales del
 * registro. Fallback legado: `metadata.category_label` (dato administrable
 * del propio registro, no fixture). Sin dato → "Experiencia".
 */
export function resolveExperienceTypeLabel(
  filterAttributes: Record<string, string | string[]>,
  metadata: Record<string, unknown> | null | undefined,
  valueLabels: Record<string, string>,
): string {
  const raw = filterAttributes[EXPERIENCE_TYPE_ATTRIBUTE_KEY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && valueLabels[value]) return valueLabels[value];
  const legacy = metadata?.category_label;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return "Experiencia";
}

async function signCovers(
  client: SupabaseClient<Database>,
  productIds: readonly string[],
): Promise<Map<string, { url: string; alt: string | null }>> {
  const coverByProduct = new Map<string, { url: string; alt: string | null }>();
  if (!productIds.length) return coverByProduct;

  const { data: links } = await client
    .from("product_media")
    .select(
      "product_id, media_asset_id, role, sort_order, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text )",
    )
    .in("product_id", [...productIds])
    .order("sort_order", { ascending: true });
  const mediaLinks = (links ?? []) as Row[];
  if (!mediaLinks.length) return coverByProduct;

  // El bucket de productos es privado: la firma (no la lectura de datos)
  // requiere service role. Best-effort: sin firma, la tarjeta va sin portada.
  let storage: SupabaseClient<Database>["storage"] | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    storage = supabaseAdmin.storage;
  } catch {
    storage = null;
  }
  if (!storage) return coverByProduct;

  for (const productId of productIds) {
    const own = mediaLinks
      .filter((link) => link.product_id === productId)
      .sort(
        (a, b) =>
          (a.role === "cover" ? -1 : 0) - (b.role === "cover" ? -1 : 0) ||
          Number(a.sort_order) - Number(b.sort_order),
      );
    for (const link of own) {
      const asset = link.media_assets as Row | null;
      if (!asset?.storage_bucket || !asset?.storage_path) continue;
      const { data: signed } = await storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      if (signed?.signedUrl) {
        coverByProduct.set(productId, {
          url: signed.signedUrl,
          alt: (asset.alt_text as string | null) ?? null,
        });
        break;
      }
    }
  }
  return coverByProduct;
}

export async function listExperiencesListing(
  input: ListExperiencesInput,
  deps: ListExperiencesDeps = {},
): Promise<ExperiencesListingResult> {
  const contract = listingFamilyContract("experiencias");
  const destino = input.destino?.trim() || null;
  const client = deps.client ?? publicClient();
  const statuses: ExperienceListingStatus[] = deps.statuses?.length
    ? [...deps.statuses]
    : ["published"];

  const [productsRes, definitions] = await Promise.all([
    client
      .from("products")
      .select(
        "id, slug, name, tagline, price_amount, price_currency, status, filter_attributes, metadata, business_id, is_demo_seed, businesses:businesses!products_business_id_fkey ( id, slug, display_name, destination_id, destinations!businesses_destination_id_fkey ( slug, name ) )",
      )
      .eq("product_type", "experiencia")
      .in("status", statuses)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    loadExperienceAttributeCatalog(client),
  ]);
  if (productsRes.error) throw new Error(`experiences_listing_failed:${productsRes.error.message}`);

  const products = (productsRes.data ?? []) as Row[];
  const valueLabels = catalogValueLabels(definitions);
  const coverByProduct = await signCovers(
    client,
    products.map((product) => String(product.id)),
  );

  const items: TourismCardVM[] = products
    .map((product) => {
      const business = (product.businesses as Row | null) ?? null;
      const destination = (business?.destinations as Row | null) ?? null;
      const cover = coverByProduct.get(product.id) ?? null;
      const attributes = normalizeFilterAttributes(product.filter_attributes);
      const filterAttributes: Record<string, string[]> = {};
      for (const definition of definitions) {
        const raw = attributes[definition.key];
        const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
        if (values.length) filterAttributes[definition.key] = values;
      }
      const metadata = (product.metadata ?? {}) as Record<string, unknown>;
      const typeLabel = resolveExperienceTypeLabel(attributes, metadata, valueLabels);
      const isDemo = Boolean(product.is_demo_seed) || product.status !== "published";
      return {
        id: product.id as string,
        entityKind: "product" as TourismCardVM["entityKind"],
        eyebrow: typeLabel,
        name: String(product.name),
        href: `/producto/${product.slug}`,
        tagline: (product.tagline as string | null) ?? null,
        businessName: (business?.display_name as string | null) ?? null,
        mediaUrl: cover?.url ?? null,
        mediaAlt: cover?.alt ?? String(product.name),
        rating: null,
        location: destination ? { label: String(destination.name), distanceKm: null } : null,
        territorialContext: destination ? String(destination.name) : null,
        highlights: [],
        badges: deps.markDemo && isDemo ? [{ label: "DEMO · en revisión", tone: "warning" }] : [],
        institutionalBadges: [],
        dateLabel: null,
        availabilityLabel: null,
        priceAmount: product.price_amount != null ? Number(product.price_amount) : null,
        priceCurrency: (product.price_currency as string | null) ?? null,
        priceHint: null,
        primaryAction: null,
        secondaryAction: null,
        filterAttributes,
        destinationSlug: destination ? String(destination.slug) : null,
      } as TourismCardVM & { destinationSlug: string | null };
    })
    .filter((item) => !destino || item.destinationSlug === destino);

  const destinationLabel = destino
    ? ((items[0] as { territorialContext: string | null } | undefined)?.territorialContext ??
      destino.replace(/-/g, " "))
    : null;

  const dto: PublicListingDTO = {
    contractVersion: LISTING_PUBLIC_CONTRACT_VERSION,
    family: contract.id,
    label: contract.label,
    route: contract.route,
    source: contract.source,
    provenance: "real_reads",
    hero: {
      eyebrow: contract.hero.eyebrow,
      title: destino ? `${contract.hero.title} en ${destinationLabel}` : contract.hero.title,
      subtitle: contract.hero.subtitle,
      metaLabel: items.length ? `${items.length} experiencias publicadas` : null,
    },
    items,
    destinationSlug: destino,
    destinationLabel,
    emptyMessage: destino
      ? `Aún no hay experiencias publicadas en ${destinationLabel}.`
      : contract.emptyMessage,
  };

  return {
    dto,
    // El eje "Tipo de experiencia" ya se deriva del eyebrow en la superficie
    // (facet `tipo`); no se duplica como eje de atributo.
    axes: definitions
      .filter((definition) => definition.filterable && definition.key !== EXPERIENCE_TYPE_ATTRIBUTE_KEY)
      .map((definition) => ({ key: definition.key, label: definition.label })),
    valueLabels,
  };
}
