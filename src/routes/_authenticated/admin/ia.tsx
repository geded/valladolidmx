/**
 * /admin/ia — Thin shell (15.10.4R · Paso C).
 * Dominios consumidos: Alux Intelligence, UNC (Intelligent Activity Center),
 * Experience Builder (variables dinámicas).
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminHub } from "@/components/admin/AdminHub";

export const Route = createFileRoute("/_authenticated/admin/ia")({
  component: AdminIaHub,
  head: () => ({
    meta: [
      { title: "Admin · Inteligencia · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminIaHub() {
  return (
    <AdminHub
      eyebrow="Panel del fundador"
      title="Inteligencia (Alux)"
      description="Accesos rápidos a Alux y al registro de actividad. Desde aquí sólo se llega a cada sección; cada una tiene sus propios ajustes."
      domains={["Alux", "Avisos y actividad", "Constructor de páginas"]}
      sections={[
        {
          title: "Conversación con Alux",
          links: [
            {
              to: "/alux",
              label: "Alux Concierge",
              description: "El concierge que ven los viajeros.",
            },
          ],
        },
        {
          title: "Registro de actividad",
          description:
            "Lo que pasa en la plataforma (reservas, pagos, mensajes, alertas). Alux también lo lee para entender qué está ocurriendo.",
          links: [
            { to: "/cms/actividad", label: "Actividad (administración)" },
            { to: "/portal/actividad", label: "Actividad (empresa)" },
            { to: "/cuenta/actividad", label: "Actividad (viajero)" },
          ],
        },
      ]}
      footer={
        <p className="text-[11px] text-muted-foreground">
          Más adelante se sumarán aquí otras herramientas de inteligencia artificial (por ejemplo,
          el consumo de IA). Ya están anotadas como pendientes.
        </p>
      }
    />
  );
}
