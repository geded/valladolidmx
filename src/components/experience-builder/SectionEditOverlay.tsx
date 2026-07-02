/**
 * SectionEditOverlay — US-03 (15.10.4d)
 *
 * Overlay editorial sobre cada bloque de la composición pública. Sólo
 * visible para usuarios con rol editor (super_admin, admin, editor).
 * Al hacer hover muestra un contorno + botón "Editar sección" que abre
 * el Experience Builder con la página y el bloque preseleccionados.
 *
 * Diseño aditivo: se aplica vía el render-prop `wrap` del
 * `CompositionRenderer`, sin modificar ninguna sección existente ni la
 * lógica del renderer. Para visitantes anónimos o roles no editores
 * devuelve el contenido tal cual, sin markup extra.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CompositionNode } from "@/lib/experience-builder/composition-tree";

const EDITOR_ROLES = new Set(["super_admin", "admin", "editor"]);

export function useEditorMode(): boolean {
  const { roles, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || loading) return false;
  return roles.some((r) => EDITOR_ROLES.has(r));
}

interface WrapArgs {
  pageSlug: string;
}

/**
 * Fabrica el render-prop `wrap` para `CompositionRenderer`. Cuando el
 * usuario no es editor, devuelve `undefined` para no envolver nada.
 */
export function useSectionEditWrap({ pageSlug }: WrapArgs):
  | ((node: CompositionNode, content: ReactNode) => ReactNode)
  | undefined {
  const editor = useEditorMode();
  if (!editor) return undefined;
  return (node, content) => (
    <SectionEditFrame node={node} pageSlug={pageSlug}>
      {content}
    </SectionEditFrame>
  );
}

function SectionEditFrame({
  node,
  pageSlug,
  children,
}: {
  node: CompositionNode;
  pageSlug: string;
  children: ReactNode;
}) {
  return (
    <div className="group/eb-section relative">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-md ring-2 ring-transparent transition group-hover/eb-section:ring-primary/60" />
      <Link
        to="/cms/experience-builder"
        search={{ mode: "visual", page: pageSlug, block: node.id }}
        aria-label={`Editar sección ${node.type}`}
        className="pointer-events-auto absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-primary/95 px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-0 shadow-lg ring-1 ring-black/5 transition group-hover/eb-section:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        <span>Editar sección</span>
      </Link>
      {children}
    </div>
  );
}