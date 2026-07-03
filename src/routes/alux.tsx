import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { AluxSurface } from "@/components/surfaces/AluxSurface";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";

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
  return (
    <PublicShell
      eyebrow="Inteligencia"
      title="Alux"
      description="La inteligencia que acompaña el trabajo del concierge humano: resume expedientes, sugiere productos y prepara borradores revisables."
      crumbs={[{ label: "Alux" }]}
    >
      {composition ? (
        <CompositionRenderer tree={composition.snapshot} />
      ) : (
        <AluxSurface />
      )}
    </PublicShell>
  );
}
