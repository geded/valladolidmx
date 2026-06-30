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
      eyebrow="Panel Fundador · 15.10.4R"
      title="Inteligencia (Alux)"
      description="Acceso operativo a las capacidades de Alux Intelligence ya disponibles. Esta superficie solo orquesta; las funciones de IA viven en sus módulos."
      domains={["Alux Intelligence", "UNC", "Experience Builder"]}
      sections={[
        {
          title: "Conversación con Alux",
          links: [
            { to: "/alux", label: "Alux Concierge", description: "Asistente IA público." },
          ],
        },
        {
          title: "Feed inteligente",
          description: "Feed estructurado que consume Alux para razonar sobre la actividad del sistema.",
          links: [
            { to: "/cms/actividad", label: "Activity Center (admin)" },
            { to: "/portal/actividad", label: "Activity Center (empresa)" },
            { to: "/cuenta/actividad", label: "Activity Center (viajero)" },
          ],
        },
      ]}
      footer={
        <p className="text-[11px] text-muted-foreground">
          Capacidades diferidas a olas posteriores (Embeddings Queue, AI Prompts panel,
          AI Usage Log) están documentadas como deuda en la Matriz de Trazabilidad
          15.10.4R y no forman parte del alcance de esta superficie.
        </p>
      }
    />
  );
}