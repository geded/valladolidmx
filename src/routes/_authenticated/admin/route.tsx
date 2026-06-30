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
  to: "/admin" | "/cms" | "/concierge" | "/portal";
  label: string;
  external?: boolean;
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Visión global" },
  { to: "/cms", label: "CMS Studio" },
  { to: "/concierge", label: "Concierge" },
  { to: "/portal", label: "Portal Empresarial" },
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
            {NAV.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
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