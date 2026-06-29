/**
 * _authenticated — Layout gate (13.3 Identity & Permissions).
 *
 * Pathless layout que protege todas las rutas administrativas.
 * Redirige a /auth si no hay sesión. La verificación dura de roles
 * ocurre en cada server function vía requireSupabaseAuth + has_role.
 */
import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión…</p>
      </div>
    );
  }

  if (!user) return null;

  return <Outlet />;
}