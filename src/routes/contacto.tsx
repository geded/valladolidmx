/**
 * /contacto — Página de contacto (Sprint 5).
 *
 * @context-engine legacy — institucional sin territorio (I7 · fila 8).
 * No monta `ContextEngineProvider`.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/contacto")({
  head: () =>
    buildPublicHead({
      title: `Contacto y directorio · ${SITE.name}`,
      description: "Habla con el equipo de Valladolid.mx: turistas, empresas y prensa.",
      path: "/contacto",
    }),
  component: ContactoRoute,
});

function ContactoRoute() {
  return (
    <PublicShell
      eyebrow="Contáctanos"
      title="Contacto y directorio de Valladolid.mx"
      description="Escríbenos según lo que necesites. Respondemos en horario del Oriente Maya."
      crumbs={[{ label: "Contacto" }]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/arma-tu-viaje"
          className="block rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-accent"
        >
          <p className="text-sm font-semibold text-foreground">Soy viajero</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Arma tu viaje con Alux y conecta con el Concierge del Oriente Maya.
          </p>
        </Link>
        <Link
          to="/empresas"
          className="block rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-accent"
        >
          <p className="text-sm font-semibold text-foreground">Soy empresa</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Únete al Portal Empresarial de Valladolid.mx y publica tu negocio.
          </p>
        </Link>
        <a
          href="mailto:hola@valladolid.mx"
          className="block rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-accent"
        >
          <p className="text-sm font-semibold text-foreground">Prensa y aliados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Escríbenos a hola@valladolid.mx y te canalizamos con el equipo indicado.
          </p>
        </a>
      </div>
    </PublicShell>
  );
}