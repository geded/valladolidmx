/**
 * /cms/actividad — Intelligent Activity Center (Administrador)
 * Etapa 14.50.6 · vista completa con feed Alux + agregaciones.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeedView } from "@/components/notifications/ActivityFeedView";

export const Route = createFileRoute("/_authenticated/cms/actividad")({
  component: AdminActivityPage,
});

function AdminActivityPage() {
  return (
    <ActivityFeedView
      scope="admin"
      eyebrow="Centro de actividad inteligente"
      title="Actividad administrativa"
      description="Todo lo que pasa en la plataforma en un solo lugar: reservaciones, pagos, mensajes, casos del concierge, seguridad y alertas, con lo más urgente primero."
    />
  );
}
