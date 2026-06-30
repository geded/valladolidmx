/**
 * /admin/concierge — Thin shell (15.10.4R · Paso C).
 * Dominios consumidos: Concierge, Alux Intelligence, UNC.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminHub } from "@/components/admin/AdminHub";

export const Route = createFileRoute("/_authenticated/admin/concierge")({
  component: AdminConciergeHub,
  head: () => ({
    meta: [
      { title: "Admin · Concierge · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminConciergeHub() {
  return (
    <AdminHub
      eyebrow="Panel Fundador · 15.10.4R"
      title="Concierge"
      description="Orquestación del Centro Concierge. Reutiliza las rutas /concierge y /portal/concierge sin duplicar lógica."
      domains={["Concierge", "Alux Intelligence", "UNC"]}
      sections={[
        {
          title: "Centro operativo",
          links: [
            { to: "/concierge", label: "Centro Concierge", description: "Expedientes, propuestas y asignaciones." },
            { to: "/portal/concierge", label: "Concierge (Portal)", description: "Vista del empresario." },
            { to: "/cuenta/concierge", label: "Concierge (Viajero)", description: "Vista del solicitante." },
          ],
        },
      ]}
    />
  );
}