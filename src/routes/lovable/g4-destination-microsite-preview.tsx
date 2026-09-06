/**
 * G4-A · Vista previa visual del micrositio de destino (Valladolid).
 *
 * G8-E · Esta vista ya NO contiene JSX propio del micrositio: consume la
 * autoridad visual compartida `DestinationPremiumSurface`, el mismo
 * componente que renderizan Studio y producción vía el bloque compuesto
 * `vmx.destination.premium-g4`. Aquí sólo viven el ribbon interno, la nota
 * de gobernanza y el panel local de afinación (sin persistencia).
 *
 * Reglas conservadas:
 *  - Sólo medios gobernados existentes vía la ruta pública estable.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - Iconografía de categorías con los glifos bordados G6.
 *  - Pueblo Mágico se resuelve desde el registro institucional y su
 *    marca oficial acreditada.
 *  - Vista interna, no indexable y sin persistencia.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DestinationMicrositeReviewSurface } from "@/components/destination-premium/DestinationMicrositeReviewSurface";

export const Route = createFileRoute("/lovable/g4-destination-microsite-preview")({
  head: () => ({
    meta: [
      { title: "G4-A · Vista previa micrositio Valladolid (interna)" },
      {
        name: "description",
        content: "Vista previa interna del micrositio premium de Valladolid. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4DestinationMicrositePreview,
});

function G4DestinationMicrositePreview() {
  return <DestinationMicrositeReviewSurface />;
}
