/**
 * UserMenu — Slot de acceso (auth) con soporte para 6 roles (Blueprint 11.2).
 *
 * Propósito: dejar visible la entrada "Iniciar sesión" desde Fase 0;
 * la lógica real de auth llega en Fase 1. Recibe `role` y `user` como
 * props para permitir simular roles durante desarrollo.
 *
 * Dependencias: types/auth, useTranslation.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserRound, LogOut, ChevronDown, Shield, LayoutDashboard, Briefcase, Headphones, Compass } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { ROLE_LABELS, type AppRole } from "@/types/auth";
import { useAuth } from "@/hooks/useAuth";

type MenuLink = { to: "/admin" | "/cms" | "/empresa" | "/concierge" | "/mi-viaje" | "/cuenta"; label: string; icon: typeof UserRound };

function buildMenuLinks(role: AppRole | null): MenuLink[] {
  const links: MenuLink[] = [];
  if (!role) return links;
  if (role === "super_admin" || role === "admin") {
    links.push({ to: "/admin", label: "Panel de administración", icon: Shield });
    links.push({ to: "/cms", label: "CMS", icon: LayoutDashboard });
  }
  if (role === "editor") links.push({ to: "/cms", label: "CMS", icon: LayoutDashboard });
  if (role === "business_owner") links.push({ to: "/empresa", label: "Mi empresa", icon: Briefcase });
  if (role === "concierge" || role === "concierge_lead")
    links.push({ to: "/concierge", label: "Concierge", icon: Headphones });
  links.push({ to: "/mi-viaje", label: "Mi viaje", icon: Compass });
  links.push({ to: "/cuenta", label: "Mi cuenta", icon: UserRound });
  return links;
}

export function UserMenu() {
  const { t } = useTranslation();
  const { authUser, role, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
        aria-busy="true"
      >
        <UserRound className="size-4 opacity-60" aria-hidden />
      </span>
    );
  }

  if (authUser) {
    const links = buildMenuLinks(role);
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
          title={role ? ROLE_LABELS[role] : undefined}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <UserRound className="size-4" aria-hidden />
          <span className="hidden max-w-[120px] truncate sm:inline">
            {authUser.display_name ?? authUser.email}
          </span>
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
              <div className="truncate font-medium text-foreground">
                {authUser.display_name ?? authUser.email}
              </div>
              {role ? <div className="mt-0.5">{ROLE_LABELS[role]}</div> : null}
            </div>
            {links.length > 0 ? (
              <div className="border-b border-border py-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <l.icon className="size-4" aria-hidden />
                    {l.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                void signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      to="/auth"
      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
      title={t("nav.sign_in")}
    >
      <UserRound className="size-4" aria-hidden />
      <span>{t("nav.sign_in")}</span>
    </Link>
  );
}
