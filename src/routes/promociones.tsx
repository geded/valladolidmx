/**
 * /promociones — Landings de campaña publicadas (Sprint 5).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { createServerFn } from "@tanstack/react-start";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";
import { TourismListingSurface } from "@/components/surfaces/TourismListingSurface";
import { promoLandingToTourismCard } from "@/lib/experience-builder/adapters/tourism-listing-adapters";
import { PromocionesGate } from "@/components/promociones/PromocionesGate";

/**
 * H-02 · I7 · Fila 3 — Categoría plana `promociones`.
 * Mismo contrato consolidado que `/hoteles` (I4). Sin ancestros
 * explícitos, hereda territorio si hay `previous`. SEO intacto.
 */
function buildPromocionesContext(): RouteContextDeclaration {
  return defineRouteContext({
    current: { kind: "category", slug: "promociones", label: "Promociones", href: "/promociones" },
    ancestors: [],
    inherit: ["region", "destination"],
    canonical: "/promociones",
  });
}

interface PromoCard {
  slug: string;
  title: string;
  description: string | null;
}

const listPromotions = createServerFn({ method: "GET" }).handler(async (): Promise<PromoCard[]> => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("page_compositions")
    .select("slug, title, description, kind, status, is_template")
    .eq("kind", "promotion")
    .eq("status", "published")
    .eq("is_template", false)
    .order("published_at", { ascending: false })
    .limit(24);
  if (error) return [];
  return (data ?? []).map((r) => ({
    slug: r.slug as string,
    title: (r.title as string) ?? (r.slug as string),
    description: (r.description as string) ?? null,
  }));
});

export const Route = createFileRoute("/promociones")({
  loader: async () => ({ promos: await listPromotions().catch(() => [] as PromoCard[]) }),
  head: () =>
    buildPublicHead({
      title: `Promociones · ${SITE.name}`,
      description: "Campañas y ofertas vigentes de hoteles, restaurantes y experiencias del Oriente Maya.",
      path: "/promociones",
    }),
  component: PromosRoute,
});

function PromosRoute() {
  const { promos } = Route.useLoaderData();
  const cards = (promos as PromoCard[]).map(promoLandingToTourismCard);
  return (
    <PublicShell
      crumbs={[{ label: "Promociones" }]}
      contextDeclaration={buildPromocionesContext()}
      useContextCrumbs
    >
      <PromocionesGate>
        <TourismListingSurface
          hero={{
            eyebrow: "Ofertas del Oriente Maya",
            title: "Promociones",
            subtitle:
              "Campañas y ofertas vigentes de hoteles, restaurantes y experiencias del Oriente Maya. Exclusivas para viajeros con perfil público completo.",
          }}
          items={cards}
          emptyMessage="Aún no hay promociones activas."
          emptyHint={
            <>
              Explora el{" "}
              <Link to="/oriente-maya" className="text-primary hover:underline">
                Catálogo Oriente Maya
              </Link>{" "}
              para ver todas las empresas verificadas.
            </>
          }
        />
      </PromocionesGate>
    </PublicShell>
  );
}