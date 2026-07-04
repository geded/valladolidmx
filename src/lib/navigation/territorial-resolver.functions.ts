/**
 * Territorial Resolver — Servicio único de validación de rutas
 * territoriales `/oriente-maya/:destino/:categoria/:empresa/:producto`
 * (Navigation Blueprint v1.0 · Sub-ola N2.1).
 *
 * Cada segmento se valida contra la fuente pública correspondiente:
 *  - destino  ← `destinations`
 *  - categoría ← `business_categories`
 *  - empresa  ← `businesses` (debe pertenecer al destino y categoría)
 *  - producto ← `products` (debe pertenecer a la empresa)
 *
 * Devuelve un payload consolidado con slugs y etiquetas humanas para que
 * la ruta arme `NavigationContext` y `buildBreadcrumbs()` sin lookups
 * adicionales. Nulos = segmento no resuelto (la ruta decide 404).
 *
 * IDENTIDAD CANÓNICA (directiva Founder N2): la ruta territorial es la
 * identidad pública oficial de la entidad. Este resolver es la única
 * puerta autorizada para materializar esa identidad en superficies
 * públicas.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export interface TerritorialResolveInput {
  destino: string;
  categoria?: string | null;
  empresa?: string | null;
  producto?: string | null;
}

export interface TerritorialNode {
  slug: string;
  label: string;
}

export interface TerritorialResolution {
  destination: TerritorialNode | null;
  category: TerritorialNode | null;
  business: (TerritorialNode & { verified: boolean }) | null;
  product: (TerritorialNode & { product_type: string }) | null;
  /** Motivo del fallo cuando alguno de los segmentos no valida. */
  reason:
    | "ok"
    | "destination_not_found"
    | "category_not_found"
    | "business_not_found"
    | "business_out_of_territory"
    | "product_not_found"
    | "product_out_of_business";
}

function validSlug(v: string | null | undefined): v is string {
  return typeof v === "string" && SLUG_RE.test(v);
}

export const resolveTerritorialPath = createServerFn({ method: "GET" })
  .inputValidator((input: TerritorialResolveInput) => {
    if (!input || !validSlug(input.destino)) throw new Error("invalid_destino");
    if (input.categoria != null && !validSlug(input.categoria))
      throw new Error("invalid_categoria");
    if (input.empresa != null && !validSlug(input.empresa))
      throw new Error("invalid_empresa");
    if (input.producto != null && !validSlug(input.producto))
      throw new Error("invalid_producto");
    return {
      destino: input.destino,
      categoria: input.categoria ?? null,
      empresa: input.empresa ?? null,
      producto: input.producto ?? null,
    };
  })
  .handler(async ({ data }): Promise<TerritorialResolution> => {
    const sb = publicClient();
    const out: TerritorialResolution = {
      destination: null,
      category: null,
      business: null,
      product: null,
      reason: "ok",
    };

    // 1) Destino
    const { data: dest } = await sb
      .from("destinations")
      .select("slug, name")
      .eq("slug", data.destino)
      .maybeSingle();
    if (!dest) return { ...out, reason: "destination_not_found" };
    out.destination = { slug: dest.slug as string, label: dest.name as string };

    // 2) Categoría (opcional)
    if (data.categoria) {
      const { data: cat } = await sb
        .from("business_categories")
        .select("slug, name")
        .eq("slug", data.categoria)
        .maybeSingle();
      if (!cat) return { ...out, reason: "category_not_found" };
      out.category = { slug: cat.slug as string, label: cat.name as string };
    }

    // 3) Empresa (opcional; exige categoría)
    if (data.empresa) {
      if (!out.category) return { ...out, reason: "business_out_of_territory" };
      const { data: biz } = await sb
        .from("businesses")
        .select(
          "id, slug, display_name, verified, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
        )
        .eq("slug", data.empresa)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (!biz) return { ...out, reason: "business_not_found" };
      const destSlug = (biz.destinations as { slug?: unknown } | null)?.slug;
      const catSlug = (biz.business_categories as { slug?: unknown } | null)?.slug;
      if (destSlug !== out.destination.slug || catSlug !== out.category.slug) {
        return { ...out, reason: "business_out_of_territory" };
      }
      out.business = {
        slug: biz.slug as string,
        label: biz.display_name as string,
        verified: Boolean(biz.verified),
      };

      // 4) Producto (opcional; exige empresa)
      if (data.producto) {
        const { data: prod } = await sb
          .from("products")
          .select("slug, name, product_type, business_id, status, deleted_at")
          .eq("slug", data.producto)
          .eq("business_id", biz.id as string)
          .eq("status", "published")
          .is("deleted_at", null)
          .maybeSingle();
        if (!prod) return { ...out, reason: "product_not_found" };
        out.product = {
          slug: prod.slug as string,
          label: prod.name as string,
          product_type: String(prod.product_type ?? ""),
        };
      }
    } else if (data.producto) {
      // producto sin empresa: ruta inválida.
      return { ...out, reason: "product_out_of_business" };
    }

    return out;
  });

/**
 * Convierte una `TerritorialResolution` (server) al
 * `NavigationContext` (contrato N1) consumido por breadcrumbs y CTAs.
 */
export function resolutionToNavigationContext(
  r: TerritorialResolution,
  destinoParam: string,
): import("./types").NavigationContext {
  const region: import("./types").CanonicalRef = {
    kind: "region",
    slug: "oriente-maya",
  };
  const ctx: import("./types").NavigationContext = { region };
  const destSlug = r.destination?.slug ?? destinoParam;
  (ctx as any).destination = {
    kind: "destination",
    slug: destSlug,
    region: "oriente-maya",
    label: r.destination?.label,
  };
  if (r.category) {
    (ctx as any).category = {
      kind: "category",
      slug: r.category.slug,
      destination: destSlug,
      region: "oriente-maya",
      label: r.category.label,
    };
  }
  if (r.business) {
    (ctx as any).business = {
      kind: "business",
      slug: r.business.slug,
      destination: destSlug,
      category: r.category?.slug,
      region: "oriente-maya",
      label: r.business.label,
    };
  }
  if (r.product) {
    (ctx as any).entity = {
      kind: "product",
      slug: r.product.slug,
      destination: destSlug,
      category: r.category?.slug,
      business: r.business?.slug,
      region: "oriente-maya",
      label: r.product.label,
    };
  }
  return ctx;
}