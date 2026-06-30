/**
 * /_authenticated/cuenta — Layout de la Cuenta del viajero (Ola 4 · Etapa 3).
 *
 * Aislado bajo _authenticated/cuenta/*. La autenticación dura ya está
 * cubierta por el layout _authenticated (gate del proyecto, ssr:false).
 * Aquí montamos navegación lateral + Outlet. No toca Portal ni CMS.
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

export const Route = createFileRoute("/_authenticated/cuenta")({
  component: CuentaLayout,
});

function CuentaLayout() {
  const { user, profile, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = useMemo(
    () => [
      { to: "/cuenta" as const, label: "Resumen" },
      { to: "/cuenta/perfil" as const, label: "Mi perfil de viaje" },
      { to: "/cuenta/favoritos" as const, label: "Favoritos" },
      { to: "/cuenta/carrito" as const, label: "Carrito" },
      { to: "/cuenta/historial" as const, label: "Historial" },
      { to: "/cuenta/actividad" as const, label: "Actividad" },
      { to: "/cuenta/notificaciones" as const, label: "Notificaciones" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-card/60 px-5 py-6 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto" />
            <span className="text-sm font-semibold tracking-wide">Mi cuenta</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Marketplace · Ola 4
          </p>

          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to || pathname === `${item.to}/`;
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
            <p className="mt-0.5 text-muted-foreground">Cuenta del viajero</p>
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