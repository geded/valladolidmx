/**
 * /portal/actividad — Intelligent Activity Center (Empresario)
 * Etapa 14.50.6 · feed acotado a la empresa activa.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeedView } from "@/components/notifications/ActivityFeedView";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/actividad")({
  component: BusinessActivityPage,
});

function BusinessActivityPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setBusinessId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  return (
    <ActivityFeedView
      scope="business"
      businessId={businessId}
      eyebrow="Portal Empresarial"
      title="Actividad de tu empresa"
      description="Órdenes, pagos y notificaciones relevantes a tu empresa, agrupadas por entidad y priorizadas por severidad."
    />
  );
}
