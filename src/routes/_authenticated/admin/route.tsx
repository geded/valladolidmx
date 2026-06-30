/**
 * /admin — Layout del Panel del Fundador / Administrador (Adenda 15.10.4).
 *
 * Gate de rol en cliente para UX; la autorización dura vive en cada
 * server function (founder_dashboard_kpis exige super_admin o admin).
 */
import { useMemo } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ROLE_LABELS, type AppRole } from "@/types/auth";

const ADMIN_ROLES: AppRole[] = ["super_admin", "admin"];

interface NavItem {
  to: string;
  label: string;
  hint?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Vista general",
    items: [
      { to: "/admin", label: "Visión global", hint: "KPIs y salud" },
    ],
  },
  {
    label: "Operación",
    items: [
      { to: "/cms/pagos", label: "Pagos y órdenes" },
      { to: "/cms/observabilidad", label: "Observabilidad" },
      { to: "/cms/alertas", label: "Alertas" },
      { to: "/cms/actividad", label: "Centro de actividad" },
      { to: "/portal/pagos", label: "Pagos (Portal)" },
      { to: "/portal/actividad", label: "Actividad (Portal)" },
    ],
  },
  {
    label: "Contenido",
    items: [
      { to: "/cms/experience-builder", label: "Constructor de páginas", hint: "Editar Home" },
      { to: "/cms/experience-builder/pages", label: "Páginas EB" },
      { to: "/cms/empresas", label: "Empresas (CMS)" },
      { to: "/cms/productos", label: "Productos" },
      { to: "/cms/destinos", label: "Destinos" },
      { to: "/cms/zonas", label: "Zonas" },
      { to: "/cms/regiones", label: "Regiones" },
      { to: "/cms/categorias", label: "Categorías" },
      { to: "/cms/media", label: "Media" },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { to: "/cms/reviews", label: "Reseñas / moderación" },
      { to: "/concierge", label: "Concierge" },
      { to: "/portal/concierge", label: "Concierge (Portal)" },
    ],
  },
  {
    label: "Empresas & Portal",
    items: [
      { to: "/portal/empresas", label: "Empresas (super)" },
      { to: "/portal", label: "Resumen Portal" },
      { to: "/portal/ficha", label: "Ficha pública" },
      { to: "/portal/catalogo", label: "Catálogo" },
      { to: "/portal/galeria", label: "Galería" },
      { to: "/portal/presencia", label: "Presencia digital" },
      { to: "/portal/propiedad", label: "Propiedad / transferencias" },
      { to: "/portal/invitaciones", label: "Invitaciones" },
    ],
  },
  {
    label: "Viajero (vista interna)",
    items: [
      { to: "/cuenta", label: "Cuenta" },
      { to: "/cuenta/favoritos", label: "Favoritos" },
      { to: "/cuenta/carrito", label: "Carrito" },
      { to: "/cuenta/historial", label: "Historial" },
      { to: "/cuenta/concierge", label: "Concierge viajero" },
      { to: "/cuenta/notificaciones", label: "Notificaciones" },
      { to: "/cuenta/actividad", label: "Actividad" },
    ],
  },
  {
    label: "Áreas",
    items: [
      { to: "/cms", label: "CMS Studio (todo)" },
      { to: "/portal", label: "Portal empresarial" },
      { to: "/concierge", label: "Centro Concierge" },
    ],
  },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, roles, signOut, profile, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allowed = useMemo(
    () => roles.some((r) => ADMIN_ROLES.includes(r)),
    [roles],
  );

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">403</p>
          <h1 className="mt-2 text-3xl">Acceso restringido</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            El Panel del Fundador está reservado a roles de gobierno de la plataforma.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-card/60 px-5 py-6 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto" />
            <span className="text-sm font-semibold tracking-wide">Panel Fundador</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Etapa 15.10.4
          </p>

          <nav className="mt-6 grid gap-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid gap-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.to ||
                      (item.to !== "/admin" && pathname.startsWith(`${item.to}/`)) ||
                      (item.to === "/admin" && pathname === "/admin");
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={[
                          "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-foreground hover:bg-accent",
                        ].join(" ")}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.hint ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {item.hint}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-8 rounded-lg border border-border bg-background p-3 text-xs">
            <p className="font-semibold">{profile?.display_name ?? user?.email}</p>
            <p className="mt-0.5 text-muted-foreground">
              {role ? ROLE_LABELS[role] : "Sin rol"}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-3 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 px-5 py-8 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}