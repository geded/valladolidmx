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
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { CompositionNode } from "@/lib/experience-builder/composition-tree";

// H2·P2 — Aislamiento del Studio: el `SectionEditFrame` (icono Pencil,
// `Link` con búsqueda tipada y clases del overlay) sólo lo renderizan
// editores autenticados. Antes viajaba en el entry principal para el
// 100 % de visitantes. Al diferirlo dinámicamente, los anónimos se
// llevan sólo el hook (dos `useState` + una decisión sincrónica).
const SectionEditFrame = lazy(() =>
  import("./SectionEditFrame").then((m) => ({ default: m.SectionEditFrame })),
);

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
    <Suspense fallback={content}>
      <SectionEditFrame node={node} pageSlug={pageSlug}>
        {content}
      </SectionEditFrame>
    </Suspense>
  );
}