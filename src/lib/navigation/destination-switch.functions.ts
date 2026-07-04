/**
 * Destination Switch — Continuidad territorial (Sub-ola N2.4).
 *
 * Servicio único que resuelve el destino objetivo del switcher preservando
 * la mayor cantidad de contexto posible (producto > empresa > categoría >
 * destino) y degradando de forma predecible al nivel territorial más
 * cercano cuando no existe equivalencia.
 *
 * REGLA (Navigation Blueprint v1.0): la URL de salida SIEMPRE se compone
 * vía `resolveCanonicalPath()`. Prohibido interpolar rutas manualmente.
 *
 * Reservado — Navigation Intelligence: los campos `motivation`, `temporal`,
 * `profile` del `NavigationContext` NO se consumen aquí (Ola N1..N9).
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolveCanonicalPath } from "./canonical-paths";
import { DEFAULT_REGION_SLUG } from "./types";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;

function slugOk(v: string | null | undefined): v is string {
  return typeof v === "string" && SLUG_RE.test(v);
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Slugs de la cadena territorial de origen. Todos opcionales. */
export interface SwitchFromRef {
  readonly destination?: string | null;
  readonly category?: string | null;
  readonly business?: string | null;
  readonly product?: string | null;
}

export interface DestinationSwitchInput {
  /** Slug del destino objetivo. */
  readonly to: string;
  readonly from?: SwitchFromRef;
}

export type SwitchKeptLevel = "product" | "business" | "category" | "destination" | "region";

export interface DestinationSwitchResult {
  /** Path canónico resuelto en el destino objetivo. */
  readonly path: string;
  /** Nivel de contexto realmente preservado. */
  readonly kept: SwitchKeptLevel;
  /** Nivel de contexto que traía el origen (para diagnosticar degradación). */
  readonly requested: SwitchKeptLevel;
  /** `true` cuando `kept` es más superficial que `requested`. */
  readonly degraded: boolean;
  /** Motivo estructurado. Consumidores pueden mapearlo a UX. */
  readonly reason:
    | "ok"
    | "destination_not_found"
    | "product_not_in_destination"
    | "business_not_in_destination"
    | "category_not_in_destination"
    | "insufficient_context";
  /** Slugs efectivos consultados en el destino objetivo. */
  readonly resolved: {
    readonly destination: string | null;
    readonly category: string | null;
    readonly business: string | null;
    readonly product: string | null;
  };
}

function levelFrom(from: SwitchFromRef | undefined): SwitchKeptLevel {
  if (from?.product) return "product";
  if (from?.business) return "business";
  if (from?.category) return "category";
  if (from?.destination) return "destination";
  return "region";
}

/**
 * Resuelve el switcher de destino aplicando la política de continuidad:
 *   producto → misma empresa/categoría en destino objetivo
 *   empresa  → mismo slug de empresa en destino objetivo
 *   categoría → misma categoría con ≥1 negocio publicado en destino
 *   destino → siempre resoluble si el destino existe
 * Ante cualquier fallo, degrada al nivel inmediatamente superior — nunca
 * a una página arbitraria.
 */
export const resolveDestinationSwitch = createServerFn({ method: "GET" })
  .inputValidator((input: DestinationSwitchInput) => {
    if (!input || !slugOk(input.to)) throw new Error("invalid_to");
    const f = input.from ?? {};
    if (f.destination != null && !slugOk(f.destination)) throw new Error("invalid_from_destination");
    if (f.category != null && !slugOk(f.category)) throw new Error("invalid_from_category");
    if (f.business != null && !slugOk(f.business)) throw new Error("invalid_from_business");
    if (f.product != null && !slugOk(f.product)) throw new Error("invalid_from_product");
    return {
      to: input.to,
      from: {
        destination: f.destination ?? null,
        category: f.category ?? null,
        business: f.business ?? null,
        product: f.product ?? null,
      } satisfies Required<SwitchFromRef>,
    };
  })
  .handler(async ({ data }): Promise<DestinationSwitchResult> => {
    const sb = publicClient();
    const requested = levelFrom(data.from);
    const resolved = {
      destination: null as string | null,
      category: null as string | null,
      business: null as string | null,
      product: null as string | null,
    };

    // 1) Destino objetivo
    const { data: dest } = await sb
      .from("destinations")
      .select("id, slug")
      .eq("slug", data.to)
      .maybeSingle();
    if (!dest) {
      return {
        path: `/${DEFAULT_REGION_SLUG}`,
        kept: "region",
        requested,
        degraded: requested !== "region",
        reason: "destination_not_found",
        resolved,
      };
    }
    resolved.destination = dest.slug as string;

    // Base result (destination-only) — se sobrescribe si logramos preservar más.
    const baseDest: DestinationSwitchResult = {
      path: resolveCanonicalPath({
        kind: "destination",
        slug: resolved.destination,
        region: DEFAULT_REGION_SLUG,
      }),
      kept: "destination",
      requested,
      degraded: requested !== "destination" && requested !== "region",
      reason: "ok",
      resolved,
    };

    // 2) Intentar preservar EMPRESA (opcionalmente PRODUCTO)
    if (data.from.business) {
      const { data: biz } = await sb
        .from("businesses")
        .select(
          "id, slug, status, deleted_at, destination_id, business_categories!businesses_primary_category_id_fkey ( slug )",
        )
        .eq("slug", data.from.business)
        .eq("destination_id", dest.id as string)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (biz) {
        const catSlug = (biz.business_categories as { slug?: unknown } | null)?.slug;
        const category = typeof catSlug === "string" ? catSlug : null;
        if (category) {
          resolved.business = biz.slug as string;
          resolved.category = category;

          // 2b) Producto opcional
          if (data.from.product) {
            const { data: prod } = await sb
              .from("products")
              .select("slug, status, deleted_at, business_id")
              .eq("slug", data.from.product)
              .eq("business_id", biz.id as string)
              .eq("status", "published")
              .is("deleted_at", null)
              .maybeSingle();
            if (prod) {
              resolved.product = prod.slug as string;
              return {
                path: resolveCanonicalPath({
                  kind: "product",
                  slug: resolved.product,
                  business: resolved.business,
                  category: resolved.category,
                  destination: resolved.destination,
                  region: DEFAULT_REGION_SLUG,
                }),
                kept: "product",
                requested,
                degraded: false,
                reason: "ok",
                resolved,
              };
            }
            // producto no existe → degrada a empresa
          }
          return {
            path: resolveCanonicalPath({
              kind: "business",
              slug: resolved.business,
              category: resolved.category,
              destination: resolved.destination,
              region: DEFAULT_REGION_SLUG,
            }),
            kept: "business",
            requested,
            degraded: requested === "product",
            reason: data.from.product ? "product_not_in_destination" : "ok",
            resolved,
          };
        }
      }
      // empresa no existe en destino objetivo → intenta preservar categoría
    }

    // 3) Intentar preservar CATEGORÍA
    if (data.from.category) {
      const { data: cat } = await sb
        .from("business_categories")
        .select("id, slug")
        .eq("slug", data.from.category)
        .maybeSingle();
      if (cat) {
        const { count } = await sb
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("destination_id", dest.id as string)
          .eq("primary_category_id", cat.id as string)
          .eq("status", "published")
          .is("deleted_at", null);
        if ((count ?? 0) > 0) {
          resolved.category = cat.slug as string;
          const businessRequested = Boolean(data.from.business);
          const productRequested = Boolean(data.from.product);
          return {
            path: resolveCanonicalPath({
              kind: "category",
              slug: resolved.category,
              destination: resolved.destination,
              region: DEFAULT_REGION_SLUG,
            }),
            kept: "category",
            requested,
            degraded: businessRequested || productRequested,
            reason: businessRequested
              ? "business_not_in_destination"
              : productRequested
                ? "product_not_in_destination"
                : "ok",
            resolved,
          };
        }
      }
      // categoría inexistente o sin negocios en destino → degrada a destino
      return {
        ...baseDest,
        reason: "category_not_in_destination",
        degraded: true,
      };
    }

    // 4) Sin contexto útil o sólo destino → destino objetivo
    return baseDest;
  });

/** Destino publicable con datos mínimos para el switcher. */
export interface SwitchableDestination {
  readonly slug: string;
  readonly name: string;
}

/** Lista los destinos publicados de la región Oriente Maya. */
export const listSwitchableDestinations = createServerFn({ method: "GET" }).handler(
  async (): Promise<SwitchableDestination[]> => {
    const sb = publicClient();
    const { data } = await sb
      .from("destinations")
      .select("slug, name")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(200);
    return (data ?? [])
      .filter((r) => typeof r.slug === "string" && r.slug.length > 0)
      .map((r) => ({ slug: r.slug as string, name: (r.name as string) ?? (r.slug as string) }));
  },
);
