import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/eventos")({
  head: () =>
    buildPublicHead({
      title: `Eventos · ${SITE.name}`,
      description: "Fiestas, festivales y celebraciones del calendario maya.",
      path: "/eventos",
    }),
  component: PlaceholderRoute,
});

function PlaceholderRoute() {
  return (
    <PublicShell
      eyebrow="Categoría"
      title="Eventos"
      description="Fiestas, festivales y celebraciones del calendario maya."
      crumbs={[{ label: "Eventos" }]}
    >
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <ComingSoonBadge label="Llega en Fase 1" />
        <h2 className="mt-4 text-2xl">Estamos preparando esta vista</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          La estructura ya está lista. Pronto encontrarás aquí el contenido completo
          con buscador, filtros y tarjetas detalladas.
        </p>
      </div>
    </PublicShell>
  );
}
