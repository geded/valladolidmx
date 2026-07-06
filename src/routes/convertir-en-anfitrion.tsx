/**
 * /convertir-en-anfitrion — E-PS · US-EPS.3
 *
 * Landing pública estilo Airbnb "Become a host": explica el valor de
 * publicar un negocio en el Oriente Maya y CTA al Portal Empresarial
 * (que ya orquesta el alta de empresa y sus invitaciones). Si el
 * visitante no está autenticado, el CTA los lleva a /auth y desde ahí
 * el flujo continúa hacia /portal.
 *
 * No introduce infraestructura: reutiliza PublicShell + navegación
 * existente. El switcher de perfil (US-EPS.2) expondrá el modo
 * "Empresa" automáticamente en cuanto el usuario tenga fila en
 * business_users.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { Briefcase, Compass, Sparkles, Users } from "lucide-react";
import { BecomeHostFlow } from "@/components/hosting/BecomeHostFlow";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/convertir-en-anfitrion")({
  head: () =>
    buildPublicHead({
      title: `Convierte tu negocio en anfitrión · ${SITE.name}`,
      description:
        "Publica tu hotel, restaurante, experiencia o tienda en Valladolid.mx y llega a los viajeros del Oriente Maya.",
      path: "/convertir-en-anfitrion",
    }),
  component: BecomeHostRoute,
});

const BENEFITS = [
  {
    Icon: Compass,
    title: "Descúbrete en el Oriente Maya",
    body: "Aparece en Discovery, catálogo turístico, destinos y rutas editoriales curadas por el equipo de Valladolid.mx.",
  },
  {
    Icon: Users,
    title: "Viajeros reales, no directorio",
    body: "Tu ficha se muestra a viajeros que están planeando ahora — con Alux y el Concierge del Oriente Maya como aliados.",
  },
  {
    Icon: Sparkles,
    title: "Herramientas incluidas",
    body: "Ficha pública, galería, contactos, horarios, productos, promociones y estadísticas — todo desde tu Portal.",
  },
];

function BecomeHostRoute() {
  const { authUser } = useAuth();

  if (authUser) {
    return (
      <PublicShell
        eyebrow="Para empresas turísticas"
        title="Convierte tu negocio en anfitrión del Oriente Maya"
        description="Reclama tu negocio o registra uno nuevo. Un administrador lo revisará y podrás alternar entre Viajero y Empresa."
        crumbs={[{ label: "Convertir en anfitrión" }]}
      >
        <BecomeHostFlow />
      </PublicShell>
    );
  }

  return (
    <PublicShell
      eyebrow="Para empresas turísticas"
      title="Convierte tu negocio en anfitrión del Oriente Maya"
      description="Publica tu propuesta en Valladolid.mx y conecta con viajeros que ya están planeando su experiencia."
      crumbs={[{ label: "Convertir en anfitrión" }]}
    >
      <section className="grid gap-4 sm:grid-cols-3">
        {BENEFITS.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <Icon className="mb-3 size-5 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-accent/40 p-6">
        <div className="flex items-start gap-3">
          <Briefcase className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              ¿Cómo funciona?
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Crea tu cuenta o inicia sesión.</li>
              <li>Registra tu empresa desde el Portal Empresarial.</li>
              <li>
                Activa el modo <strong className="text-foreground">Empresa</strong>{" "}
                desde tu menú de usuario — al estilo Airbnb, puedes alternar
                entre Viajero y Empresa sin cerrar sesión.
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/portal"
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Ir al Portal Empresarial
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Crear cuenta / Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}