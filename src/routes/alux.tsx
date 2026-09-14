import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { useNavigationSession } from "@/lib/navigation";
import {
  hasVisitedTravelPlanner,
  readJourneyPrefix,
  readPreviousRoute,
  type JourneyStep,
} from "@/lib/navigation/session-context";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { AluxSurface } from "@/components/surfaces/AluxSurface";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { PublicAluxChat } from "@/components/alux/PublicAluxChat";
import { AluxConverseChat } from "@/components/alux/AluxConverseChat";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/context";
import { useAluxBrand } from "@/lib/brand/brand-context";

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
  const alux = useAluxBrand();
  const session = useNavigationSession();
  /**
   * Continuidad de ruta: si el explorador llegó desde "Arma tu Viaje",
   * ese paso permanece visible en la ruta territorial.
   */
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  useEffect(() => {
    const trail = readJourneyPrefix("/alux");
    const prev = readPreviousRoute();
    const cameFromPlanner =
      Boolean(prev && prev.startsWith("/arma-tu-viaje")) || hasVisitedTravelPlanner();
    const hasPlanner = trail.some((s) => s.path === "/arma-tu-viaje");
    setJourney(
      cameFromPlanner && !hasPlanner
        ? [...trail, { path: "/arma-tu-viaje", label: "Arma tu Viaje" }]
        : trail,
    );
  }, []);

  const crumbs = [
    { label: "Oriente Maya", to: "/oriente-maya" },
    ...(session?.destination
      ? [
          {
            label: session.destination.label,
            to: "/oriente-maya/$destino",
            params: { destino: session.destination.slug },
          },
        ]
      : []),
    ...journey.map((step) => ({ label: step.label, to: step.path })),
    { label: "Alux" },
  ];

  return (
    <PublicShell
      eyebrow={alux.copy("pageEyebrow")}
      title={alux.copy("pageTitle")}
      description={alux.copy("pageDescription")}
      crumbs={crumbs}
      compactCrumbsOnMobile
    >
      <div className="mx-auto mb-10 w-full min-w-0 max-w-3xl px-4">
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
