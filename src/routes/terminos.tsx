/**
 * /terminos — Términos de Servicio (requerido por Google OAuth Consent Screen).
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/terminos")({
  head: () =>
    buildPublicHead({
      title: `Términos de Servicio · ${SITE.name}`,
      description:
        "Términos y condiciones de uso de Valladolid.mx (quehacerenvalladolid.com).",
      path: "/terminos",
    }),
  component: TerminosRoute,
});

function TerminosRoute() {
  return (
    <PublicShell
      eyebrow="Legal"
      title="Términos de Servicio"
      description="Última actualización: 10 de julio de 2026."
      crumbs={[{ label: "Términos" }]}
    >
      <article className="prose prose-neutral max-w-3xl dark:prose-invert">
        <h2>1. Aceptación</h2>
        <p>
          Al usar quehacerenvalladolid.com aceptas estos términos. Si no
          estás de acuerdo, por favor no utilices la plataforma.
        </p>

        <h2>2. Qué es Valladolid.mx</h2>
        <p>
          Somos una plataforma turística del Oriente Maya que conecta
          visitantes con destinos, hoteles, restaurantes, experiencias,
          productos y eventos locales.
        </p>

        <h2>3. Cuenta de usuario</h2>
        <ul>
          <li>Debes proporcionar información veraz.</li>
          <li>Eres responsable de mantener la confidencialidad de tu cuenta.</li>
          <li>Puedes cerrar tu cuenta en cualquier momento desde la sección "Mi Cuenta".</li>
        </ul>

        <h2>4. Uso permitido</h2>
        <p>
          Puedes usar la plataforma para planear viajes, guardar favoritos,
          contratar servicios y comunicarte con empresas locales. No puedes
          usarla para fines ilícitos, spam, scraping masivo, ni suplantación
          de identidad.
        </p>

        <h2>5. Contenido de terceros</h2>
        <p>
          Los hoteles, restaurantes, experiencias y productos publicados son
          operados por sus respectivos titulares. Valladolid.mx actúa como
          intermediario y no es responsable directo de la prestación de
          dichos servicios, salvo lo que expresamente se indique.
        </p>

        <h2>6. Reservas y pagos</h2>
        <p>
          Cuando reserves o pagues un servicio, aplicarán además las
          políticas del proveedor correspondiente (cancelación, reembolso,
          horarios). Los pagos se procesan mediante proveedores certificados
          (por ejemplo Stripe).
        </p>

        <h2>7. Propiedad intelectual</h2>
        <p>
          La marca, logotipos, textos, ilustraciones y código de la
          plataforma pertenecen a Valladolid.mx o a sus licenciantes. No
          pueden reproducirse sin autorización escrita.
        </p>

        <h2>8. Limitación de responsabilidad</h2>
        <p>
          La plataforma se ofrece "tal cual". No garantizamos disponibilidad
          ininterrumpida ni resultados específicos. En ningún caso
          Valladolid.mx será responsable por daños indirectos derivados del
          uso de la plataforma.
        </p>

        <h2>9. Modificaciones</h2>
        <p>
          Podemos actualizar estos términos. Publicaremos la nueva versión
          en esta página con la fecha correspondiente.
        </p>

        <h2>10. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos
          Mexicanos, con jurisdicción de los tribunales de Valladolid,
          Yucatán.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Escríbenos a{" "}
          <a href="mailto:legal@quehacerenvalladolid.com">
            legal@quehacerenvalladolid.com
          </a>.
        </p>
      </article>
    </PublicShell>
  );
}