/**
 * /_authenticated/cms — Layout del CMS Studio (Ola 1 · Etapa 1).
 *
 * Shell administrativo aislado del shell público de Fase 1.
 * Sólo verifica rol editorial en cliente para UX; la autorización
 * dura ocurre server-side en cada server function.
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

const EDITORIAL_ROLES: AppRole[] = ["super_admin", "admin", "editor"];

interface NavItem {
  to:
    | "/cms"
    | "/cms/regiones"
    | "/cms/destinos"
    | "/cms/zonas"
    | "/cms/categorias"
    | "/cms/empresas"
    | "/cms/productos"
    | "/cms/media"
    | "/cms/reviews"
    | "/cms/pagos"
    | "/cms/observabilidad"
    | "/cms/alertas"
    | "/cms/actividad";
  label: string;
}

const NAV: NavItem[] = [
  { to: "/cms", label: "Resumen" },
  { to: "/cms/regiones", label: "Regiones" },
  { to: "/cms/destinos", label: "Destinos" },
  { to: "/cms/zonas", label: "Zonas" },
  { to: "/cms/categorias", label: "Categorías" },
  { to: "/cms/empresas", label: "Empresas" },
  { to: "/cms/productos", label: "Productos" },
  { to: "/cms/media", label: "Media" },
  { to: "/cms/reviews", label: "Reseñas" },
  { to: "/cms/pagos", label: "Pagos" },
  { to: "/cms/observabilidad", label: "Observabilidad" },
  { to: "/cms/alertas", label: "Alertas" },
  { to: "/cms/actividad", label: "Actividad" },
];

export const Route = createFileRoute("/_authenticated/cms")({
  component: CmsLayout,
});

function CmsLayout() {
  const { role, roles, signOut, profile, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isEditorial = useMemo(
    () => roles.some((r) => EDITORIAL_ROLES.includes(r)),
    [roles],
  );

  if (!isEditorial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            403
          </p>
          <h1 className="mt-2 text-3xl">Acceso restringido</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            El CMS Studio está reservado a los roles editoriales de
            Valladolid.mx. Si crees que deberías tener acceso, contacta al
            administrador del Blueprint.
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
            <span className="text-sm font-semibold tracking-wide">
              CMS Studio
            </span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Fase 2 · Ola 1
          </p>

          <nav className="mt-6 grid gap-1">
            {NAV.map((item) => {
              const active =
                item.to === "/cms"
                  ? pathname === "/cms" || pathname === "/cms/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-accent",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-border bg-background p-3 text-xs">
            <p className="font-semibold">
              {profile?.display_name ?? user?.email}
            </p>
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