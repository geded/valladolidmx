/**
 * /marketplace/* — Splat 301 hacia el hub territorial.
 *
 * US-E3.3 · Retiro de código legacy. Antes existían rutas dedicadas
 * (`/marketplace/buscar`, `/marketplace/:slug`); ahora un único splat
 * resuelve todos los backlinks históricos:
 *  - Si el primer segmento coincide con una empresa publicada con
 *    destino/categoría, redirige 301 a su ruta canónica territorial.
 *  - En cualquier otro caso redirige 301 a `/oriente-maya`.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMarketplaceBusinessBySlug } from "@/lib/catalog/marketplace-reads.functions";
import { resolveCanonicalPath } from "@/lib/navigation";

export const Route = createFileRoute("/marketplace/$")({
  beforeLoad: async ({ params }) => {
    const splat = params._splat ?? "";
    const first = splat.split("/")[0] ?? "";
    if (first && first !== "buscar") {
      const business = await getMarketplaceBusinessBySlug({
        data: { slug: first },
      }).catch(() => null);
      if (business?.destination_slug && business?.category_slug) {
        throw redirect({
          href: resolveCanonicalPath({
            kind: "business",
            slug: business.slug,
            category: business.category_slug,
            destination: business.destination_slug,
          }),
          code: 301,
        });
      }
    }
    throw redirect({ href: "/oriente-maya", code: 301 });
  },
  component: () => null,
});