import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/alux")({
  head: () => ({
    meta: [
      { title: `Alux — Inteligencia del Oriente Maya · ${SITE.name}` },
      {
        name: "description",
        content:
          "Alux es la inteligencia que acompaña el trabajo del concierge humano en el Oriente Maya.",
      },
    ],
  }),
  component: AluxPage,
});

function AluxPage() {
  return (
    <PageShell
      eyebrow="Inteligencia"
      title="Alux"
      description="La inteligencia que acompaña el trabajo del concierge humano: resume expedientes, sugiere productos y prepara borradores revisables."
      crumbs={[{ label: "Alux" }]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Qué hará Alux</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· Resumir expedientes del Concierge Workspace</li>
            <li>· Sugerir productos candidatos</li>
            <li>· Preparar borradores de propuesta</li>
            <li>· Detectar riesgos y oportunidades operativas</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <ComingSoonBadge label="Activo para Concierge" />
          <h2 className="mt-4 text-lg font-semibold">Workspace operativo</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            El asistente está disponible dentro de los expedientes internos del
            Concierge Workspace. El acceso público conversacional queda separado.
          </p>
          <Link
            to="/concierge"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Abrir Concierge Workspace
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
