/**
 * EditThisPageButton — US-02 (15.10.4d)
 *
 * Botón flotante "Editar esta página" visible sólo para roles con
 * permiso de edición del CMS (super_admin, admin, editor). Aparece en
 * superficies públicas y abre el Experience Builder en modo Visual con
 * la página actual preseleccionada.
 *
 * Diseño aditivo: no toca ningún componente existente. Se monta desde
 * `__root.tsx` únicamente en rutas públicas (mismo criterio que
 * `PublicChrome`). Renderiza `null` cuando:
 *   · la sesión aún no hidrata (evita mismatch SSR/CSR),
 *   · el usuario no tiene rol editor,
 *   · la ruta actual no mapea a una página conocida del Studio.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const EDITOR_ROLES = new Set(["super_admin", "admin", "editor"]);

/** Mapea el pathname actual al slug de página del Experience Builder. */
function resolvePageSlug(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return "home";
  return null;
}

export function EditThisPageButton({ pathname }: { pathname: string }) {
  const { roles, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || loading) return null;

  const canEdit = roles.some((r) => EDITOR_ROLES.has(r));
  if (!canEdit) return null;

  const pageSlug = resolvePageSlug(pathname);
  if (!pageSlug) return null;

  return (
    <Link
      to="/cms/experience-builder"
      search={{ mode: "visual", page: pageSlug, block: undefined }}
      aria-label="Editar esta página en el Experience Builder"
      className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg ring-1 ring-black/5 transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <Pencil className="h-4 w-4" aria-hidden />
      <span>Editar esta página</span>
    </Link>
  );
}