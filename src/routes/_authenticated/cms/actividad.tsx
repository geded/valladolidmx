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
      description="Feed unificado de eventos transaccionales, operativos, de seguridad y alertas del sistema, priorizado por severidad."
    />
  );
}
