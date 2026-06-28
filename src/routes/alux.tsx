import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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
          "Alux es la inteligencia que acompaña tu viaje al Oriente Maya: recomienda, resume y prepara tu expediente. Llega pronto.",
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
      description="La inteligencia que acompaña tu viaje. No reemplaza al concierge humano: lo potencia."
      crumbs={[{ label: "Alux" }]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Qué hará Alux</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· Responder preguntas sobre destinos y cultura</li>
            <li>· Recomendar rutas según tus intereses</li>
            <li>· Resumir reseñas con cuidado</li>
            <li>· Preparar tu expediente para el concierge humano</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6">
          <ComingSoonBadge label="Llega en Fase 5" />
          <h2 className="mt-4 text-lg font-semibold">Disponibilidad</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Alux es transversal: lo verás disponible en cada pantalla cuando se
            active. Hoy ya está reservado su lugar.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
