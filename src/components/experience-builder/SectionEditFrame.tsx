/**
 * SectionEditFrame — Chunk aislado del overlay editorial (H2·P2).
 *
 * Separado de `SectionEditOverlay` para que el marco visual y sus
 * dependencias (Link tipado, icono Pencil) NO viajen en el entry
 * principal. Sólo se descarga cuando `useSectionEditWrap` decide que
 * el usuario actual es editor (super_admin / admin / editor).
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import type { CompositionNode } from "@/lib/experience-builder/composition-tree";

export function SectionEditFrame({
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