import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, FileText, MessageCircle } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { SITE } from "@/config/site";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";

export const Route = createFileRoute("/arma-tu-viaje")({
  head: () => ({
    meta: [
      { title: `Arma tu Viaje · ${SITE.name}` },
      {
        name: "description",
        content:
          "Tu expediente personal del Oriente Maya. Guarda destinos, experiencias y notas. Tu concierge humano lo recibe cuando estés listo.",
      },
    ],
  }),
  component: AYVPage,
});

function AYVPage() {
  return (
    <PageShell
      eyebrow="Plataforma"
      title="Arma tu Viaje"
      description="No es un carrito de compras. Es tu expediente personal. Cuando estés listo, lo recibe tu concierge humano."
      crumbs={[{ label: "Arma tu Viaje" }]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { Icon: Compass, t: "Guarda destinos", d: "Reúne lo que te llama de cada lugar." },
          { Icon: FileText, t: "Anota lo importante", d: "Fechas, intereses, viajeros, presupuesto." },
          { Icon: MessageCircle, t: "Tu concierge humano", d: "Lo recibe cuando estés listo. Nunca antes." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <ComingSoonBadge label="Llega en Fase 4" />
        <h2 className="mt-4 text-2xl">Tu expediente vive aquí</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pronto podrás agregar destinos y experiencias desde cualquier tarjeta y
          enviarlos a un concierge humano para cotizar tu viaje.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/oriente-maya"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-accent"
          >
            Explorar destinos
          </Link>
          <RequestConciergeButton
            kind="travel_plan"
            summary="Solicitud inicial desde Arma tu Viaje"
            label="Solicitar concierge ahora"
          />
        </div>
      </div>
    </PageShell>
  );
}
