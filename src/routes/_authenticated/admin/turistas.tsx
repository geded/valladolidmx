/**
 * /admin/turistas — Thin shell (15.10.4R · Paso C).
 * Dominios consumidos: Cuenta del Viajero, Marketplace, Concierge, UNC.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminHub } from "@/components/admin/AdminHub";

export const Route = createFileRoute("/_authenticated/admin/turistas")({
  component: AdminTuristasHub,
  head: () => ({
    meta: [
      { title: "Admin · Turistas · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminTuristasHub() {
  return (
    <AdminHub
      eyebrow="Panel Fundador · 15.10.4R"
      title="Turistas"
      description="Vista interna del Fundador sobre la experiencia del viajero. Todas las pantallas reutilizan las rutas /cuenta existentes."
      domains={["Cuenta del Viajero", "Marketplace", "Concierge", "UNC"]}
      sections={[
        {
          title: "Experiencia del viajero",
          links: [
            { to: "/cuenta", label: "Resumen de cuenta" },
            { to: "/cuenta/favoritos", label: "Favoritos" },
            { to: "/cuenta/carrito", label: "Carrito" },
            { to: "/cuenta/historial", label: "Historial de reservas" },
            { to: "/cuenta/notificaciones", label: "Notificaciones (UNC)" },
            { to: "/cuenta/actividad", label: "Centro de actividad" },
          ],
        },
        {
          title: "Concierge del viajero",
          links: [
            { to: "/cuenta/concierge", label: "Casos del viajero" },
          ],
        },
      ]}
    />
  );
}