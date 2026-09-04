/**
 * Experiencias · Lectura real (CMS) del listado maestro.
 *
 * Fuente única: `public.products` (`product_type = 'experiencia'`) con su
 * empresa operadora, destino, portada gobernada y los atributos turísticos
 * administrables (`products.filter_attributes`, contrato
 * `tourism_attribute_definitions` familia `experiencias`).
 *
 * No inventa datos: cada eje de filtro y cada valor provienen del catálogo
 * real; los registros sin dato simplemente no aportan opciones.
 */
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import {
  LISTING_PUBLIC_CONTRACT_VERSION,
  listingFamilyContract,
  type PublicListingDTO,
} from "@/lib/listings/listing-public-contract";

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
  /** Sólo superficies internas `/lovable/*` (noindex): incluye `in_review`. */
  readonly includeInReview?: boolean;
}

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  return typeof raw === "string" && raw.trim() ? [raw] : [];
}

export async function listExperiencesListing(
  input: ListExperiencesInput,
): Promise<ExperiencesListingResult> {
  const contract = listingFamilyContract("experiencias");
  const destino = input.destino?.trim() || null;
  const statuses: Array<"published" | "in_review"> = input.includeInReview
    ? ["published", "in_review"]
    : ["published"];

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [productsRes, defsRes] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select(
        "id, slug, name, tagline, description, price_amount, price_currency, conversion_mode, status, filter_attributes, metadata, cover_media_id, business_id, is_demo_seed",
      )
      .eq("product_type", "experiencia")
      .in("status", statuses)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("tourism_attribute_definitions")
      .select("id, attribute_key, label, sort_order, active")
      .eq("family_key", "experiencias")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const products = (productsRes.data ?? []) as Array<Record<string, any>>;
  const defs = (defsRes.data ?? []) as Array<Record<string, any>>;

  const valueLabels: Record<string, string> = {};
  if (defs.length) {
    const { data: options } = await supabaseAdmin
      .from("tourism_attribute_options")
      .select("definition_id, value, label, active")
      .in(
        "definition_id",
        defs.map((d) => d.id as string),
      )
      .eq("active", true);
    for (const opt of (options ?? []) as Array<Record<string, any>>) {
      valueLabels[String(opt.value)] = String(opt.label);
    }
  }

  const businessIds = [...new Set(products.map((p) => p.business_id).filter(Boolean))] as string[];
  const businessById = new Map<string, Record<string, any>>();
  const destinationById = new Map<string, Record<string, any>>();
  if (businessIds.length) {
    const { data: businesses } = await supabaseAdmin
      .from("businesses")
      .select("id, slug, display_name, destination_id")
      .in("id", businessIds);
    for (const b of (businesses ?? []) as Array<Record<string, any>>) businessById.set(b.id, b);

    const destinationIds = [
      ...new Set([...businessById.values()].map((b) => b.destination_id).filter(Boolean)),
    ] as string[];
    if (destinationIds.length) {
      const { data: destinations } = await supabaseAdmin
        .from("destinations")
        .select("id, slug, name")
        .in("id", destinationIds);
      for (const d of (destinations ?? []) as Array<Record<string, any>>)
        destinationById.set(d.id, d);
    }
  }

  /* Portada gobernada del propio producto (rol `cover`, luego galería). */
  const productIds = products.map((p) => p.id as string);
  const coverByProduct = new Map<string, { url: string; alt: string | null }>();
  if (productIds.length) {
    const { data: links } = await supabaseAdmin
      .from("product_media")
      .select("product_id, media_asset_id, role, sort_order")
      .in("product_id", productIds);
    const mediaLinks = (links ?? []) as Array<Record<string, any>>;
    const assetIds = [...new Set(mediaLinks.map((l) => l.media_asset_id as string))];
    const assetById = new Map<string, Record<string, any>>();
    if (assetIds.length) {
      const { data: assets } = await supabaseAdmin
        .from("media_assets")
        .select("id, storage_bucket, storage_path, alt_text, review_state, metadata")
        .in("id", assetIds);
      for (const a of (assets ?? []) as Array<Record<string, any>>) assetById.set(a.id, a);
    }
    for (const productId of productIds) {
      const own = mediaLinks
        .filter((l) => l.product_id === productId)
        .sort(
          (a, b) =>
            (a.role === "cover" ? -1 : 0) - (b.role === "cover" ? -1 : 0) ||
            Number(a.sort_order) - Number(b.sort_order),
        );
      for (const link of own) {
        const asset = assetById.get(link.media_asset_id);
        if (!asset?.storage_bucket || !asset?.storage_path) continue;
        const { data: signed } = await supabaseAdmin.storage
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
  }

  const items: TourismCardVM[] = products
    .map((product) => {
      const business = businessById.get(product.business_id) ?? null;
      const destination = business?.destination_id
        ? (destinationById.get(business.destination_id) ?? null)
        : null;
      const cover = coverByProduct.get(product.id) ?? null;
      const attrs = (product.filter_attributes ?? {}) as Record<string, unknown>;
      const filterAttributes: Record<string, string[]> = {};
      for (const def of defs) {
        const values = asStringArray(attrs[def.attribute_key as string]);
        if (values.length) filterAttributes[def.attribute_key as string] = values;
      }
      const metadata = (product.metadata ?? {}) as Record<string, unknown>;
      const eyebrow =
        typeof metadata.category_label === "string" && metadata.category_label
          ? metadata.category_label
          : "Experiencia";
      return {
        id: product.id as string,
        entityKind: "product" as TourismCardVM["entityKind"],
        eyebrow,
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
        badges: [],
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
    axes: defs.map((d) => ({ key: String(d.attribute_key), label: String(d.label) })),
    valueLabels,
  };
}
