/**
 * /viajero/:handle — Perfil público del viajero (E5.3).
 *
 * SSR-friendly. Fetch por RPC pública (SECURITY DEFINER) que sólo
 * devuelve datos si `is_public = true`. Sin bearer token.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicTravelerProfile } from "@/lib/traveler/traveler-public.functions";
import { getPublicReviewerStats } from "@/lib/reviews/reviewer-stats.functions";
import { TravelerPublicProfileSurface } from "@/components/surfaces/TravelerPublicProfileSurface";

export const Route = createFileRoute("/viajero/$handle")({
  loader: async ({ params }) => {
    const profile = await getPublicTravelerProfile({ data: { handle: params.handle } });
    if (!profile) throw notFound();
    const reviewerStats = await getPublicReviewerStats({
      data: { handle: params.handle },
    }).catch(() => ({ verifiedCount: 0, isReviewerVerified: false }));
    return { profile, reviewerStats };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return buildPublicHead({
        title: "Perfil no disponible",
        description: "Este perfil de viajero no existe o es privado.",
        path: `/viajero/${params.handle}`,
        noindex: true,
      });
    }
    const p = loaderData.profile;
    const displayName = p.display_name?.trim() || `@${p.handle}`;
    const title = `${displayName} · Viajero en ${SITE.name}`;
    const description =
      p.bio?.trim() ||
      `Perfil de viaje de ${displayName} en ${SITE.name}. Descubre sus destinos, gustos y estilo de viaje.`;
    return buildPublicHead({
      title,
      description,
      path: `/viajero/${p.handle}`,
      ogType: "profile",
      ogImage: p.avatar_url ?? undefined,
      // SEO.A1.1 · PR-1 · Founder Decision — /viajero fuera del índice.
      // Toda superficie personal permanece no indexable, aun cuando el
      // perfil sea público dentro del producto.
      noindex: true,
    });
  },
  component: ViajeroPublicRoute,
  notFoundComponent: () => (
    <PublicShell
      title="Perfil no encontrado"
      crumbs={[{ label: "Viajero" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">
        Este perfil no existe o su dueño lo mantiene privado.
      </p>
    </PublicShell>
  ),
  errorComponent: ({ error }) => (
    <PublicShell title="No pudimos cargar el perfil" crumbs={[{ label: "Viajero" }]}>
      <p className="text-sm text-destructive">{String((error as Error).message)}</p>
    </PublicShell>
  ),
});

function ViajeroPublicRoute() {
  const { profile, reviewerStats } = Route.useLoaderData();
  return (
    <TravelerPublicProfileSurface profile={profile} reviewerStats={reviewerStats} />
  );
}