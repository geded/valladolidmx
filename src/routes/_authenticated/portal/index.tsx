/**
 * /portal — Landing del Portal Empresarial (Ola 3 · Etapa 1).
 *
 * Vista de resumen. En esta etapa muestra la lista de empresas
 * accesibles por el usuario y un placeholder de las secciones que
 * se habilitarán en etapas siguientes (Plan 14.30 §4).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@tanstack/react-router";
import { getMyBusinessesCompleteness } from "@/lib/portal/profile-completeness.functions";
import { ProfileCompletenessMeter } from "@/components/portal/ProfileCompletenessMeter";
import { listMyTableBookingShortcuts } from "@/lib/commerce/table-booking.functions";
import { activeTableBookingShortcut } from "@/lib/commerce/table-booking";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { portalStatusLabel } from "@/lib/portal/error-messages";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  owner: "Dueño",
  manager: "Gerente",
  editor: "Editor",
  viewer: "Lector",
};

const ACTIVE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalIndex,
});

const SHORTCUTS = [
  { to: "/portal/ficha" as const, label: "Ficha pública" },
  { to: "/portal/presencia" as const, label: "Contactos, ubicaciones, horarios, redes" },
  { to: "/portal/galeria" as const, label: "Galería de empresa" },
  { to: "/portal/catalogo" as const, label: "Productos y promociones" },
  { to: "/portal/metricas" as const, label: "Métricas de cupones" },
  { to: "/portal/canjes" as const, label: "Historial de canjes" },
  { to: "/portal/canjear" as const, label: "Canjear cupón" },
  { to: "/portal/invitaciones" as const, label: "Invitaciones y usuarios" },
  { to: "/portal/propiedad" as const, label: "Propiedad y transferencia" },
];

function PortalIndex() {
  const { user } = useAuth();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses", user?.id],
    queryFn: () => fetchBusinesses(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    setActiveId(window.localStorage.getItem(ACTIVE_KEY));
    const h = (e: Event) => setActiveId((e as CustomEvent<string>).detail ?? null);
    window.addEventListener("portal:active-business-changed", h);
    return () => window.removeEventListener("portal:active-business-changed", h);
  }, []);
  // Un administrador recibe todas las empresas; el Resumen muestra sólo la
  // empresa activa para verla como la ve su anfitrión.
  const isAdminView = businesses.some((b) => b.role === "admin");
  const visibleBusinesses = isAdminView
    ? businesses.filter((b) => b.business_id === activeId)
    : businesses;
  const fetchCompleteness = useServerFn(getMyBusinessesCompleteness);
  const businessIds = visibleBusinesses.map((b) => b.business_id);
  const { data: completeness = [] } = useQuery({
    queryKey: ["portal", "profile-completeness", businessIds],
    queryFn: () => fetchCompleteness({ data: { businessIds } }),
    enabled: businessIds.length > 0,
    staleTime: 60_000,
  });
  const completenessBy = new Map(completeness.map((c) => [c.businessId, c]));
  // El acceso y su resumen pertenecen únicamente a la empresa seleccionada.
  const fetchTables = useServerFn(listMyTableBookingShortcuts);
  const tableBusinessIds = activeId ? [activeId] : [];
  const { data: tableShortcuts = [] } = useQuery({
    queryKey: ["portal", "table-booking-shortcuts", tableBusinessIds],
    queryFn: () => fetchTables({ data: { businessIds: tableBusinessIds } }),
    enabled: tableBusinessIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const tableShortcut = activeTableBookingShortcut(tableShortcuts, activeId);
  const navigate = useNavigate();
  const openTables = (businessId: string) => {
    window.localStorage.setItem("valladolidmx.portal.activeBusinessId", businessId);
    window.dispatchEvent(new CustomEvent("portal:active-business-changed", { detail: businessId }));
    void navigate({ to: "/portal/reservaciones-mesa" });
  };
  const manage = (businessId: string) => {
    window.localStorage.setItem(ACTIVE_KEY, businessId);
    window.dispatchEvent(new CustomEvent("portal:active-business-changed", { detail: businessId }));
    setActiveId(businessId);
    void navigate({ to: "/portal/ficha" });
  };
  const queryClient = useQueryClient();
  const leave = async (businessId: string, name: string) => {
    if (!user?.id) return;
    if (!window.confirm(`¿Dejar de administrar ${name}? Su página pública no se borra.`)) return;
    const { error } = await supabase
      .from("business_users")
      .delete()
      .eq("business_id", businessId)
      .eq("user_id", user.id);
    if (error) {
      toast.error("No se pudo quitar la empresa. Intenta de nuevo.");
      return;
    }
    if (activeId === businessId) window.localStorage.removeItem(ACTIVE_KEY);
    toast.success(`${name} ya no está en tu cuenta.`);
    await queryClient.invalidateQueries({ queryKey: ["portal"] });
    window.location.reload();
  };
  const nameBy = new Map(businesses.map((b) => [b.business_id, b.display_name]));

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial
        </p>
        <h1 className="mt-2 text-3xl">Resumen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administra la presencia pública, el catálogo y la operación de tus empresas.
        </p>
      </header>

      {tableShortcut && (
        <section className="mt-6 grid gap-3" aria-label="Reservaciones de mesa">
          <button
            type="button"
            onClick={() => openTables(tableShortcut.businessId)}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <CalendarDays className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Reservaciones de mesa</span>
              <span className="block text-sm text-muted-foreground">
                {nameBy.get(tableShortcut.businessId) ?? "Tu restaurante"} · Hoy: {tableShortcut.today}
                {tableShortcut.pending > 0 ? ` · ${tableShortcut.pending} por confirmar` : ""}
              </span>
            </span>
            <span aria-hidden className="text-primary">→</span>
          </button>
        </section>
      )}

      <section className="mt-8">
        {isAdminView ? (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-medium">Estás viendo esta empresa como administrador.</p>
            <p className="mt-1 text-muted-foreground">
              Así la ve su anfitrión. Para cambiar de empresa usa «Empresa activa» arriba o{" "}
              <Link to="/portal/empresas" className="font-medium text-primary underline underline-offset-2">
                ve la lista de todas las empresas
              </Link>
              .
            </p>
          </div>
        ) : (
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tus empresas ({businesses.length})
          </h2>
        )}
        <ul className="mt-3 grid gap-3">
          {visibleBusinesses.map((b) => (
            <li key={b.business_id} className={`rounded-lg border bg-card p-4 ${activeId === b.business_id ? "border-primary ring-1 ring-primary/40" : "border-border"}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.display_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">/{b.slug}</p>
                </div>
                <div className="text-right text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <p>{ROLE_LABEL[b.role] ?? b.role}</p>
                  <p>{portalStatusLabel(b.status)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                {activeId === b.business_id ? (
                  <span className="text-xs font-medium text-primary">Estás administrando esta empresa</span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => manage(b.business_id)}
                  className="min-h-[40px] rounded-pill bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Administrar esta →
                </button>
              </div>
              {b.role === "owner" && (
                <button
                  type="button"
                  onClick={() => void leave(b.business_id, b.display_name)}
                  className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
                >
                  Dejar de administrar
                </button>
              )}
              {completenessBy.get(b.business_id) && (
                <ProfileCompletenessMeter
                  businessId={b.business_id}
                  completeness={completenessBy.get(b.business_id)!}
                  defaultOpen={
                    businesses.length <= 3 && completenessBy.get(b.business_id)!.percent < 100
                  }
                />
              )}
            </li>
          ))}
          {visibleBusinesses.length === 0 && !isAdminView && (
            <li className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No tienes empresas asignadas todavía.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Accesos rápidos
        </h2>
        <ul className="mt-3 grid gap-2">
          {SHORTCUTS.map((s) => (
            <li key={s.to}>
              <Link
                to={s.to}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span>{s.label}</span>
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
