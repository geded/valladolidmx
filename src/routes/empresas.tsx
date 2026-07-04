import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, BarChart3, Megaphone, ShieldCheck, ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";

/**
 * H-02 · I7 · Fila 2 — Categoría plana `empresas`.
 * Reutiliza el contrato consolidado (patrón I4 `hoteles`): sin ancestros
 * explícitos, hereda `region + destination` cuando existe `previous`.
 * `canonical` = `/empresas` (SEO intacto).
 */
function buildEmpresasContext(): RouteContextDeclaration {
  return defineRouteContext({
    current: { kind: "category", slug: "empresas", label: "Empresas", href: "/empresas" },
    ancestors: [],
    inherit: ["region", "destination"],
    canonical: "/empresas",
  });
}

export const Route = createFileRoute("/empresas")({
  head: () =>
    buildPublicHead({
      title: `Empresas · ${SITE.name}`,
      description:
        "Hoteles, restaurantes, experiencias y servicios del Oriente Maya: administra tu presencia con visibilidad real basada en confianza.",
      path: "/empresas",
    }),
  component: EmpresasLanding,
});

function EmpresasLanding() {
  return (
    <PublicShell
      eyebrow="Para empresas"
      title="Tu negocio en el Oriente Maya"
      description="Administra tu presencia, conecta con viajeros reales y crece con un motor de visibilidad basado en confianza, no en publicidad invasiva."
      crumbs={[{ label: "Empresas" }]}
      contextDeclaration={buildEmpresasContext()}
      useContextCrumbs
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

      <div className="mt-10 rounded-2xl border border-border bg-card/60 p-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          Portal Empresarial activo
        </span>
        <h2 className="mt-4 text-2xl">Gestiona tu empresa</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Accede a ficha pública, presencia, galería, catálogo, pagos,
          actividad, concierge, invitaciones y propiedad desde el portal.
        </p>
        <Link
          to="/portal"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Entrar al Portal Empresarial
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </PublicShell>
  );
}
