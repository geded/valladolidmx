/**
 * /admin/sistema — Thin shell (15.10.4R · Paso C).
 * Dominios consumidos: Observabilidad, UNC (Alertas), CMS Media/Taxonomía,
 * Experience Builder (Studio).
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminHub } from "@/components/admin/AdminHub";

export const Route = createFileRoute("/_authenticated/admin/sistema")({
  component: AdminSistemaHub,
  head: () => ({
    meta: [
      { title: "Admin · Sistema · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminSistemaHub() {
  return (
    <AdminHub
      eyebrow="Panel Fundador · 15.10.4R"
      title="Sistema"
      description="Salud de plataforma, alertas, taxonomías y herramientas de composición. Cada enlace reutiliza una superficie existente."
      domains={["Observabilidad", "UNC", "CMS", "Experience Builder"]}
      sections={[
        {
          title: "Salud y observabilidad",
          links: [
            { to: "/cms/observabilidad", label: "Observabilidad" },
            { to: "/cms/alertas", label: "Alertas (Dead-Letter / system_alerts)" },
          ],
        },
        {
          title: "Taxonomías y media",
          links: [
            { to: "/cms/destinos", label: "Destinos" },
            { to: "/cms/zonas", label: "Zonas" },
            { to: "/cms/regiones", label: "Regiones" },
            { to: "/cms/categorias", label: "Categorías" },
            { to: "/cms/media", label: "Biblioteca de media" },
          ],
        },
        {
          title: "Composición",
          links: [
            { to: "/cms/experience-builder", label: "Experience Builder", description: "Editor visual." },
            { to: "/cms/experience-builder/pages", label: "Páginas EB", description: "Inventario de composiciones." },
          ],
        },
        {
          title: "Moderación",
          links: [
            { to: "/cms/reviews", label: "Reseñas / moderación" },
          ],
        },
      ]}
    />
  );
}