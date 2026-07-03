import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
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
        <h2 className="text-2xl">Calendario en preparación</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Estamos integrando el calendario de fiestas, festivales y celebraciones del
          Oriente Maya. Mientras tanto, explora los hoteles, restaurantes y experiencias
          publicadas.
        </p>
      </div>
    </PublicShell>
  );
}
