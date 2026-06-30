/**
 * /admin/operaciones — Thin shell (15.10.4R · Paso C).
 * Dominios consumidos: Pagos, Marketplace, UNC, Observabilidad.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminHub } from "@/components/admin/AdminHub";

export const Route = createFileRoute("/_authenticated/admin/operaciones")({
  component: AdminOperacionesHub,
  head: () => ({
    meta: [
      { title: "Admin · Operaciones · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminOperacionesHub() {
  return (
    <AdminHub
      eyebrow="Panel Fundador · 15.10.4R"
      title="Operaciones"
      description="Pagos, órdenes y actividad transaccional. Las tablas y métricas se reutilizan de CMS y Portal."
      domains={["Pagos", "Marketplace", "UNC", "Observabilidad"]}
      sections={[
        {
          title: "Pagos y órdenes",
          links: [
            { to: "/cms/pagos", label: "Pagos y órdenes (global)" },
            { to: "/portal/pagos", label: "Pagos del Portal" },
          ],
        },
        {
          title: "Actividad",
          links: [
            { to: "/cms/actividad", label: "Centro de actividad (global)" },
            { to: "/portal/actividad", label: "Actividad del Portal" },
            { to: "/cuenta/actividad", label: "Actividad del viajero" },
          ],
        },
      ]}
    />
  );
}