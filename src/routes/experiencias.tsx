import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/common/PageShell";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/experiencias")({
  head: () => ({
    meta: [
      { title: `Experiencias · ${SITE.name}` },
      { name: "description", content: "Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya." },
      { property: "og:title", content: `Experiencias · ${SITE.name}` },
      { property: "og:description", content: "Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya." },
    ],
  }),
  component: PlaceholderRoute,
});

function PlaceholderRoute() {
  return (
    <PageShell
      eyebrow="Categoría"
      title="Experiencias"
      description="Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya."
      crumbs={[{ label: "Experiencias" }]}
    >
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <ComingSoonBadge label="Llega en Fase 1" />
        <h2 className="mt-4 text-2xl">Estamos preparando esta vista</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          La estructura ya está lista. Pronto encontrarás aquí el contenido completo
          con buscador, filtros y tarjetas detalladas.
        </p>
      </div>
    </PageShell>
  );
}
