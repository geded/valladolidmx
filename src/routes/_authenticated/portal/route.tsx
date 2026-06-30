/**
 * /_authenticated/portal — Layout del Portal Empresarial (Ola 3 · Etapa 1).
 *
 * Aislado bajo _authenticated/portal/*. La autenticación dura ya está
 * cubierta por _authenticated (gate del proyecto). Aquí montamos:
 *  - Selector de empresa persistido en localStorage (clave dedicada).
 *  - Outlet para las subrutas del Portal.
 *
 * La autorización por empresa se valida server-side en cada server fn
 * vía has_business_access (Plan 14.30 §5.3).
 */
import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  listMyBusinesses,
  type PortalBusinessSummary,
} from "@/lib/portal/portal-reads.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export interface PortalLayoutContext {
  businesses: PortalBusinessSummary[];
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string) => void;
}

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  const { user, profile, signOut, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading, error } = useQuery({
    queryKey: ["portal", "my-businesses", user?.id],
    queryFn: () => fetchBusinesses(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveBusinessIdState(stored);
  }, []);

  // Reconciliar: si la empresa activa no está en la lista, elegir la primera.
  useEffect(() => {
    if (!businesses.length) return;
    const stillAccessible = businesses.some(
      (b) => b.business_id === activeBusinessId,
    );
    if (!stillAccessible) {
      const next = businesses[0].business_id;
      setActiveBusinessIdState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    }
  }, [businesses, activeBusinessId]);

  const setActiveBusinessId = (id: string) => {
    const previous = activeBusinessId;
    setActiveBusinessIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
      window.dispatchEvent(
        new CustomEvent("portal:active-business-changed", { detail: id }),
      );
    }
    // Invalida contexto de la empresa anterior para que ninguna vista
    // muestre datos de un business al que el usuario ya no apunta.
    if (previous && previous !== id) {
      queryClient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey.includes(previous),
      });
    }
  };

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.business_id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );

  const navItems = useMemo(
    () => [
      { to: "/portal" as const, label: "Resumen" },
      { to: "/portal/empresas" as const, label: "Empresas" },
      { to: "/portal/ficha" as const, label: "Ficha pública" },
      { to: "/portal/presencia" as const, label: "Presencia" },
      { to: "/portal/galeria" as const, label: "Galería" },
      { to: "/portal/catalogo" as const, label: "Catálogo" },
      { to: "/portal/pagos" as const, label: "Pagos y visibilidad" },
      { to: "/portal/actividad" as const, label: "Actividad" },
      { to: "/portal/concierge" as const, label: "Concierge" },
      { to: "/portal/invitaciones" as const, label: "Invitaciones" },
      { to: "/portal/propiedad" as const, label: "Propiedad" },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando Portal…</p>
      </div>
    );
  }

  if (error) {
    return (
      <PortalShellMessage
        title="No pudimos cargar tus empresas"
        body={error instanceof Error ? error.message : "Error desconocido."}
      />
    );
  }

  if (!businesses.length) {
    return (
      <PortalShellMessage
        title="Aún no tienes empresas asignadas"
        body="Cuando una empresa te invite como propietario, gerente, editor o lector, aparecerá aquí para que puedas administrarla."
      />
    );
  }

  const ctx: PortalLayoutContext = {
    businesses,
    activeBusinessId,
    setActiveBusinessId,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-card/60 px-5 py-6 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto" />
            <span className="text-sm font-semibold tracking-wide">
              Portal Empresarial
            </span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Fase 2 · Ola 3
          </p>

          <div className="mt-6">
            <label
              htmlFor="portal-business-select"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Empresa activa
            </label>
            <select
              id="portal-business-select"
              value={activeBusinessId ?? ""}
              onChange={(e) => setActiveBusinessId(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {businesses.map((b) => (
                <option key={b.business_id} value={b.business_id}>
                  {b.display_name}
                </option>
              ))}
            </select>
            {activeBusiness && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tu rol: <span className="font-semibold">{formatRole(activeBusiness.role)}</span>
                {" · "}
                Estado: <span className="font-semibold">{activeBusiness.status}</span>
              </p>
            )}
          </div>

          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.to || pathname === `${item.to}/`;
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
            <p className="mt-0.5 text-muted-foreground">Portal Empresarial</p>
            {isAdmin ? (
              <div className="mt-3 grid gap-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Atajos administración
                </p>
                <Link
                  to="/admin"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-center text-xs font-medium hover:bg-accent"
                >
                  Panel admin
                </Link>
                <Link
                  to="/cms"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-center text-xs font-medium hover:bg-accent"
                >
                  CMS
                </Link>
                {isSuperAdmin ? (
                  <Link
                    to="/concierge"
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-center text-xs font-medium hover:bg-accent"
                  >
                    Concierge
                  </Link>
                ) : null}
                <Link
                  to="/"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-center text-xs font-medium hover:bg-accent"
                >
                  Inicio público
                </Link>
              </div>
            ) : null}
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

      {/* Contexto disponible para subrutas vía useRouteContext en etapas futuras */}
      <PortalContextBridge value={ctx} />
    </div>
  );
}

function formatRole(role: PortalBusinessSummary["role"]): string {
  const labels: Record<PortalBusinessSummary["role"], string> = {
    viewer: "lector",
    editor: "editor",
    manager: "gerente",
    owner: "propietario",
    admin: "administrador",
  };
  return labels[role] ?? role;
}

// Placeholder de bridge — en etapas posteriores se reemplazará por
// useRouteContext / loader context. Por ahora sólo evita unused warning.
function PortalContextBridge({ value: _value }: { value: PortalLayoutContext }) {
  return null;
}

function PortalShellMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial
        </p>
        <h1 className="mt-2 text-3xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{body}</p>
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