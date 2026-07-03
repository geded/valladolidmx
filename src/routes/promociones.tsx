/**
 * /promociones — Landings de campaña publicadas (Sprint 5).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { createServerFn } from "@tanstack/react-start";

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
  return (
    <PublicShell
      eyebrow="Ofertas"
      title="Promociones"
      description="Campañas y ofertas vigentes de hoteles, restaurantes y experiencias del Oriente Maya."
      crumbs={[{ label: "Promociones" }]}
    >
      {promos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay promociones activas. Explora el{" "}
          <Link to="/marketplace" className="text-primary hover:underline">Marketplace</Link>{" "}
          para ver todas las empresas verificadas.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((p: PromoCard) => (
            <li key={p.slug}>
              <Link
                to="/l/$slug"
                params={{ slug: p.slug }}
                className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                {p.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}