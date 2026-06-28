/**
 * UserMenu — Slot de acceso (auth) con soporte para 6 roles (Blueprint 11.2).
 *
 * Propósito: dejar visible la entrada "Iniciar sesión" desde Fase 0;
 * la lógica real de auth llega en Fase 1. Recibe `role` y `user` como
 * props para permitir simular roles durante desarrollo.
 *
 * Dependencias: types/auth, useTranslation.
 */
import { UserRound } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { ROLE_LABELS, type AppRole, type AuthUserShape } from "@/types/auth";

interface Props {
  user?: AuthUserShape | null;
  role?: AppRole | null;
}

export function UserMenu({ user = null, role = null }: Props) {
  const { t } = useTranslation();

  if (user && role) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
        title={ROLE_LABELS[role]}
      >
        <UserRound className="size-4" aria-hidden />
        <span className="hidden sm:inline">{user.display_name ?? user.email}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
      title={t("nav.sign_in")}
    >
      <UserRound className="size-4" aria-hidden />
      <span>{t("nav.sign_in")}</span>
    </button>
  );
}
