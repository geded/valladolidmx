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
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserRound, LogOut, ChevronDown, Shield, LayoutDashboard, Briefcase, Headphones, Compass, Globe } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { ROLE_LABELS, type AppRole } from "@/types/auth";
import { useAuth } from "@/hooks/useAuth";
import { ProfileModeSwitcher } from "@/components/layout/ProfileModeSwitcher";
import {
  getProfileModeState,
  type ProfileMode,
} from "@/lib/profile-mode/mode.functions";

type MenuLink = { to: "/admin" | "/cms" | "/portal" | "/portal/ficha" | "/concierge" | "/mi-viaje" | "/cuenta"; label: string; icon: typeof UserRound };

// Los enlaces del menú se derivan del MODO ACTIVO (Airbnb-style), no
// solo del rol. En modo Empresa/Concierge/Staff no debe aparecer "Mi
// viaje"; en modo Viajero no deben aparecer los paneles operativos.
function buildMenuLinks(role: AppRole | null, mode: ProfileMode): MenuLink[] {
  const links: MenuLink[] = [];
  if (!role) return links;

  if (mode === "staff") {
    if (role === "super_admin" || role === "admin") {
      links.push({ to: "/admin", label: "Panel de administración", icon: Shield });
    }
    if (role === "super_admin" || role === "admin" || role === "editor") {
      links.push({ to: "/cms", label: "CMS", icon: LayoutDashboard });
    }
  }

  if (mode === "business") {
    links.push({ to: "/portal", label: "Portal empresarial", icon: Briefcase });
  }

  if (mode === "concierge") {
    links.push({ to: "/concierge", label: "Concierge", icon: Headphones });
  }

  if (mode === "traveler") {
    links.push({ to: "/mi-viaje", label: "Mi viaje", icon: Compass });
  }

  // "Mi cuenta" es sensible al MODO ACTIVO: cada perfil tiene su propia
  // superficie de cuenta. Antes apuntaba siempre a /cuenta (viajero),
  // por lo que un usuario en modo Empresa veía datos del viajero.
  if (mode === "business") {
    links.push({ to: "/portal/ficha", label: "Mi empresa", icon: UserRound });
  } else if (mode === "concierge") {
    links.push({ to: "/concierge", label: "Mi panel", icon: UserRound });
  } else if (mode === "staff") {
    // Staff no tiene ficha de cuenta separada; su "cuenta" es su panel.
    // Se omite el enlace duplicado (ya está el panel arriba).
  } else {
    links.push({ to: "/cuenta", label: "Mi cuenta", icon: UserRound });
  }
  return links;
}

export function UserMenu() {
  const { t } = useTranslation();
  const { authUser, role, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const fetchMode = useServerFn(getProfileModeState);
  const modeQ = useQuery({
    queryKey: ["profile-mode-state"],
    queryFn: () => fetchMode(),
    enabled: Boolean(authUser),
    staleTime: 60_000,
  });
  const activeMode: ProfileMode = modeQ.data?.active ?? "traveler";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Contexto: ¿estamos dentro de un workspace autenticado o en la parte pública?
  const WORKSPACE_PREFIXES = ["/cuenta", "/portal", "/concierge", "/admin", "/cms", "/mi-viaje"];
  const inWorkspace = WORKSPACE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  // Landing canónico del modo activo (para "Mi cuenta" desde la parte pública).
  const MODE_LANDING: Record<ProfileMode, "/cuenta" | "/portal" | "/concierge" | "/cms" | "/mi-viaje" | "/admin"> = {
    traveler: "/mi-viaje",
    business: "/portal",
    concierge: "/concierge",
    staff: role === "editor" ? "/cms" : "/admin",
  };

  if (loading) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-[13px] text-muted-foreground"
        aria-busy="true"
      >
        <UserRound className="size-4 opacity-60" aria-hidden />
      </span>
    );
  }

  if (authUser) {
    const links = inWorkspace ? buildMenuLinks(role, activeMode) : [];
    const accountTarget = MODE_LANDING[activeMode] ?? "/cuenta";
    return (
      <div className="relative z-[60]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-[13px] font-medium hover:bg-accent transition-all active:scale-[0.98]"
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
            className="absolute right-0 mt-2 w-56 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-[200]"
          >
            <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
              <div className="truncate font-medium text-foreground">
                {authUser.display_name ?? authUser.email}
              </div>
              {role ? <div className="mt-0.5">{ROLE_LABELS[role]}</div> : null}
            </div>
            {inWorkspace && links.length > 0 ? (
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
            {inWorkspace ? (
              <>
                <ProfileModeSwitcher onSwitched={() => setOpen(false)} />
                <Link
                  to="/"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <Globe className="size-4" aria-hidden />
                  Ir al sitio público
                </Link>
              </>
            ) : (
              <Link
                to={accountTarget}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <UserRound className="size-4" aria-hidden />
                Mi cuenta
              </Link>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                void (async () => {
                  await signOut();
                  navigate({ to: "/", replace: true }).catch(() => undefined);
                })();
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
      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
      title={t("nav.sign_in")}
    >
      <UserRound className="size-4" aria-hidden />
      <span>{t("nav.sign_in")}</span>
    </Link>
  );
}
