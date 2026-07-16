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
  useLocation,
} from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  // SEO.A1.2 · D6 — Defensa en profundidad: todo el árbol autenticado
  // hereda `noindex, nofollow`. Las hojas pueden añadir title/description
  // para UX, pero nunca deben sobrescribir esta política de indexación.
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;
  const searchStr = location.searchStr ?? "";

  useEffect(() => {
    if (!loading && !user) {
      const next = pathname + searchStr;
      // Persist intended destination for post-login (survives OAuth round-trip).
      if (typeof window !== "undefined" && next && next !== "/auth") {
        try { window.sessionStorage.setItem("vmx.auth.next", next); } catch { /* noop */ }
      }
      void navigate({ to: "/auth" });
    }
  }, [loading, user, navigate, pathname, searchStr]);

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