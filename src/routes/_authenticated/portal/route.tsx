/**
 * /_authenticated/portal — Workspace "portal" (Adenda 15.10.5c.3 · Ola 3).
 *
 * Migrado al Workspace Engine v2.0. Toda la estructura visual (sidebar,
 * topbar, inspector, command palette, bottom-nav, sheets, toasts)
 * proviene del Workspace Engine y de los Registries oficiales. El
 * selector de empresa activa, la carga inicial de empresas y los
 * mensajes de estado (loading / error / empty) se preservan 1:1 dentro
 * del shell del workspace; no se introducen layouts paralelos.
 *
 * La autorización por empresa se valida server-side en cada server fn
 * vía has_business_access (Plan 14.30 §5.3).
 */
import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
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
  const { user } = useAuth();
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

  return (
    <WorkspaceProvider initialWorkspaceId="portal">
      <WorkspaceShell title="Portal Empresarial">
        <PortalBusinessSwitcher
          businesses={businesses}
          activeBusinessId={activeBusinessId}
          activeBusiness={activeBusiness}
          onChange={setActiveBusinessId}
        />
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}

function PortalBusinessSwitcher({
  businesses,
  activeBusinessId,
  activeBusiness,
  onChange,
}: {
  businesses: PortalBusinessSummary[];
  activeBusinessId: string | null;
  activeBusiness: PortalBusinessSummary | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="portal-business-select"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Empresa activa
        </label>
        <select
          id="portal-business-select"
          value={activeBusinessId ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {businesses.map((b) => (
            <option key={b.business_id} value={b.business_id}>
              {b.display_name}
            </option>
          ))}
        </select>
      </div>
      {activeBusiness && (
        <p className="text-[11px] text-muted-foreground sm:text-right">
          Tu rol:{" "}
          <span className="font-semibold">{formatRole(activeBusiness.role)}</span>
          {" · "}Estado:{" "}
          <span className="font-semibold">{activeBusiness.status}</span>
        </p>
      )}
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