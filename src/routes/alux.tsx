import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { useNavigationSession } from "@/lib/navigation";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { AluxSurface } from "@/components/surfaces/AluxSurface";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { PublicAluxChat } from "@/components/alux/PublicAluxChat";
import { AluxConverseChat } from "@/components/alux/AluxConverseChat";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/context";

export const Route = createFileRoute("/alux")({
  loader: async () => {
    const composition = await getPublishedCompositionBySlug({ data: { slug: "alux" } });
    return { composition };
  },
  head: () =>
    buildPublicHead({
      title: `Alux — Inteligencia del Oriente Maya · ${SITE.name}`,
      description:
        "Alux es la inteligencia que acompaña el trabajo del concierge humano en el Oriente Maya.",
      path: "/alux",
    }),
  component: AluxPage,
});

function AluxPage() {
  const { composition } = Route.useLoaderData();
  const { user, loading } = useAuth();
  const { locale } = useTranslation();
  const session = useNavigationSession();
  /**
   * Continuidad de ruta: si el explorador llegó desde "Arma tu Viaje",
   * ese paso permanece visible en la ruta territorial.
   */
  const [fromPlanner, setFromPlanner] = useState(false);
  useEffect(() => {
    const prev = readPreviousRoute();
    setFromPlanner(Boolean(prev && prev.startsWith("/arma-tu-viaje")));
  }, []);

  const crumbs = [
    { label: "Oriente Maya de Yucatán", to: "/oriente-maya" },
    ...(session?.destination
      ? [
          {
            label: session.destination.label,
            to: "/oriente-maya/$destino",
            params: { destino: session.destination.slug },
          },
        ]
      : []),
    ...(fromPlanner ? [{ label: "Arma tu Viaje", to: "/arma-tu-viaje" }] : []),
    { label: "Alux" },
  ];

  return (
    <PublicShell
      eyebrow="Inteligencia"
      title="Alux"
      description="La inteligencia que acompaña el trabajo del concierge humano: resume expedientes, sugiere productos y prepara borradores revisables."
      crumbs={crumbs}
      compactCrumbsOnMobile
    >
      <div className="mx-auto w-full max-w-3xl px-4 mb-10">
        {loading ? (
          <div className="min-h-48 animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
        ) : user ? (
          <AluxConverseChat
            selection={null}
            coords={null}
            locale={locale}
            starters={[
              "Revisa lo que elegí y dime qué falta",
              "¿Cuál debería ser mi siguiente paso?",
              "Ayúdame a ordenar mi viaje",
            ]}
          />
        ) : (
          <PublicAluxChat />
        )}
      </div>
      {composition ? <CompositionRenderer tree={composition.snapshot} /> : <AluxSurface />}
    </PublicShell>
  );
}
