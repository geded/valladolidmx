/**
 * /privacidad — Aviso de privacidad (requerido por Google OAuth Consent Screen).
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/privacidad")({
  head: () =>
    buildPublicHead({
      title: `Aviso de Privacidad · ${SITE.name}`,
      description:
        "Cómo Valladolid.mx (quehacerenvalladolid.com) recopila, usa y protege tus datos personales.",
      path: "/privacidad",
    }),
  component: PrivacidadRoute,
});

function PrivacidadRoute() {
  return (
    <PublicShell
      eyebrow="Legal"
      title="Aviso de Privacidad"
      description="Última actualización: 10 de julio de 2026."
      crumbs={[{ label: "Privacidad" }]}
    >
      <article className="prose prose-neutral max-w-3xl dark:prose-invert">
        <h2>1. Responsable</h2>
        <p>
          Valladolid.mx — operado en Valladolid, Yucatán, México — es el
          responsable del tratamiento de tus datos personales recabados a
          través de <strong>quehacerenvalladolid.com</strong> y dominios
          asociados.
        </p>

        <h2>2. Datos que recabamos</h2>
        <ul>
          <li>Nombre, correo electrónico y foto de perfil al iniciar sesión (incluyendo Google Sign-In).</li>
          <li>Preferencias de viaje, favoritos, itinerarios y solicitudes al concierge.</li>
          <li>Datos técnicos: dirección IP, tipo de dispositivo, idioma, cookies esenciales.</li>
          <li>Ubicación aproximada, sólo si otorgas permiso, para mostrar distancias y recomendaciones cercanas.</li>
        </ul>

        <h2>3. Finalidades</h2>
        <ul>
          <li>Crear y administrar tu cuenta.</li>
          <li>Personalizar recomendaciones, mostrar tus favoritos y armar tu viaje.</li>
          <li>Conectarte con empresas locales, concierge y experiencias.</li>
          <li>Enviarte comunicaciones operativas (confirmaciones, recuperación de contraseña).</li>
          <li>Mejorar la plataforma mediante analítica agregada.</li>
        </ul>

        <h2>4. Google Sign-In</h2>
        <p>
          Cuando inicias sesión con Google recibimos únicamente tu nombre,
          correo electrónico y foto de perfil. No accedemos a tus contactos,
          correos, calendario ni archivos. Puedes revocar el acceso en
          cualquier momento desde{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            myaccount.google.com/permissions
          </a>.
        </p>

        <h2>5. Compartir datos</h2>
        <p>
          No vendemos tus datos. Los compartimos únicamente con: (a) empresas
          locales cuando reservas o solicitas un servicio; (b) proveedores
          tecnológicos que operan la plataforma bajo contrato de
          confidencialidad; (c) autoridades cuando la ley lo requiera.
        </p>

        <h2>6. Tus derechos ARCO</h2>
        <p>
          Puedes acceder, rectificar, cancelar u oponerte al tratamiento de
          tus datos, así como revocar tu consentimiento, escribiendo a{" "}
          <a href="mailto:privacidad@quehacerenvalladolid.com">
            privacidad@quehacerenvalladolid.com
          </a>.
        </p>

        <h2>7. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y administrativas razonables (cifrado en
          tránsito, control de accesos, RLS en base de datos) para proteger
          tu información.
        </p>

        <h2>8. Cambios</h2>
        <p>
          Publicaremos cualquier cambio a este aviso en esta misma página con
          la fecha de actualización correspondiente.
        </p>

        <h2>9. Contacto</h2>
        <p>
          ¿Dudas? Escríbenos a{" "}
          <a href="mailto:privacidad@quehacerenvalladolid.com">
            privacidad@quehacerenvalladolid.com
          </a>.
        </p>
      </article>
    </PublicShell>
  );
}