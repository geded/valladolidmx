/**
 * /admin/empresas — Thin shell de orquestación (15.10.4R · Paso C).
 * Dominios consumidos: Portal Empresarial, CMS (Empresas), Pagos, UNC (Actividad).
 * Sin lógica nueva, sin server functions nuevas, sin RPCs nuevas.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminHub } from "@/components/admin/AdminHub";

export const Route = createFileRoute("/_authenticated/admin/empresas")({
  component: AdminEmpresasHub,
  head: () => ({
    meta: [
      { title: "Admin · Empresas · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminEmpresasHub() {
  return (
    <AdminHub
      eyebrow="Panel Fundador · 15.10.4R"
      title="Empresas"
      description="Capa de orquestación sobre Portal Empresarial y CMS de Empresas. Todas las pantallas reutilizan superficies existentes."
      domains={["Portal Empresarial", "CMS", "Pagos", "UNC"]}
      sections={[
        {
          title: "Gobierno (super_admin)",
          links: [
            { to: "/portal/empresas", label: "Listado de empresas", description: "Tabla global con búsqueda y filtros." },
          ],
        },
        {
          title: "Operación por empresa",
          description: "Vistas que un super_admin puede consultar en nombre de cualquier empresa.",
          links: [
            { to: "/portal", label: "Resumen Portal" },
            { to: "/portal/ficha", label: "Ficha pública" },
            { to: "/portal/catalogo", label: "Catálogo de productos" },
            { to: "/portal/galeria", label: "Galería" },
            { to: "/portal/presencia", label: "Presencia digital" },
            { to: "/portal/propiedad", label: "Propiedad / transferencias" },
            { to: "/portal/invitaciones", label: "Invitaciones" },
            { to: "/portal/pagos", label: "Pagos del Portal" },
            { to: "/portal/actividad", label: "Actividad (UNC)" },
          ],
        },
        {
          title: "Contenido editorial",
          links: [
            { to: "/cms/empresas", label: "Empresas (CMS)", description: "Curaduría editorial." },
            { to: "/cms/productos", label: "Productos" },
          ],
        },
      ]}
    />
  );
}