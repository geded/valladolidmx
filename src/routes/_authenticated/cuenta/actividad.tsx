/**
 * /cuenta/actividad — Intelligent Activity Center (Viajero)
 * Etapa 14.50.6 · feed acotado al usuario.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeedView } from "@/components/notifications/ActivityFeedView";

export const Route = createFileRoute("/_authenticated/cuenta/actividad")({
  component: TravelerActivityPage,
});

function TravelerActivityPage() {
  return (
    <ActivityFeedView
      scope="traveler"
      eyebrow="Tu cuenta"
      title="Tu actividad"
      description="Reservas, pagos y notificaciones suscritas, agrupadas por reserva y priorizadas por relevancia."
    />
  );
}
