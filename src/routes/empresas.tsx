import { createFileRoute } from "@tanstack/react-router";
import { Building2, BarChart3, Megaphone, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: `Empresas · ${SITE.name}` },
      {
        name: "description",
        content:
          "Hoteles, restaurantes, experiencias y servicios del Oriente Maya: administra tu presencia con visibilidad real basada en confianza.",
      },
    ],
  }),
  component: EmpresasLanding,
});

function EmpresasLanding() {
  return (
    <PageShell
      eyebrow="Para empresas"
      title="Tu negocio en el Oriente Maya"
      description="Administra tu presencia, conecta con viajeros reales y crece con un motor de visibilidad basado en confianza, no en publicidad invasiva."
      crumbs={[{ label: "Empresas" }]}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { Icon: Building2, t: "Tu panel propio", d: "Perfil, fotos, promociones, horarios y contacto." },
          { Icon: BarChart3, t: "Estadísticas reales", d: "Quién te ve, desde dónde, qué busca." },
          { Icon: Megaphone, t: "Visibilidad inteligente", d: "Orden por afinidad y confianza, no por mayor pago." },
          { Icon: ShieldCheck, t: "Confianza verificada", d: "Índice de Confianza Alux integrado a tu perfil." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <ComingSoonBadge label="Onboarding en Fase 3" />
        <h2 className="mt-4 text-2xl">Onboarding de empresas</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pronto podrás registrar tu empresa, crear tu perfil y conectar con viajeros
          listos para descubrir el territorio.
        </p>
      </div>
    </PageShell>
  );
}
