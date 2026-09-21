/**
 * /_authenticated/cms/experience-builder — Experience Builder · Studio v0
 *
 * Etapa 15.10.2 · primer editor visual del Experience Builder.
 *
 * Principios arquitectónicos aplicados:
 *  - Canvas Agnóstico: el lienzo no conoce el tipo de página.
 *  - Layout Engine: la estructura visual reside en bloques contenedores
 *    reconocidos por el motor, no en los bloques de contenido.
 *  - Page-Type Agnostic: los tipos de página son configuración, no
 *    código del editor.
 *  - Block Contract / Block Registry: única fuente de bloques.
 *  - CMS First, BEA, Customer Case File, Alux read-only.
 */

import { useLayoutEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VisualStudio } from "@/components/experience-builder/VisualStudio";

export const Route = createFileRoute("/_authenticated/cms/experience-builder")({
  head: () => ({
    meta: [
      { title: "Experience Builder · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    page: typeof s.page === "string" ? s.page : undefined,
    mode: s.mode === "professional" || s.mode === "visual" ? s.mode : undefined,
    block: typeof s.block === "string" ? s.block : undefined,
  }),
  component: ExperienceBuilderShell,
});

/**
 * ExperienceBuilderShell — Studio único (15.10.4d).
 *
 * Un único editor visual para toda la plataforma con dos modos en el
 * mismo shell:
 *  - Modo Visual (predeterminado): WYSIWYG sobre la página real,
 *    apto para empresarios no técnicos. Sin JSON, sin IDs, sin slugs.
 *  - Modo Profesional (opcional, sólo admin/super_admin): canvas
 *    avanzado con inspector técnico, biblioteca de bloques, revisiones
 *    e historial. Es la superficie previa del Studio v0.
 *
 * Single Studio Principle: el tipo de página sólo determina plantilla,
 * bloques, validaciones, SEO y permisos — nunca un editor distinto.
 */
type StudioMode = "visual" | "professional";

function ExperienceBuilderShell() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const { roles } = useAuth();
  const canAdvanced = roles.includes("admin") || roles.includes("super_admin");
  const search = useSearch({ strict: false }) as {
    page?: string;
    mode?: StudioMode;
    block?: string;
  };
  const navigate = useNavigate();
  const mode: StudioMode = search.mode ?? "visual";
  const page = search.page ?? null;
  const setMode = (m: StudioMode) =>
    void navigate({
      to: "/cms/experience-builder",
      search: { page: search.page, mode: m, block: search.block },
      replace: true,
    });
  const setPage = (k: string | null) =>
    void navigate({
      to: "/cms/experience-builder",
      search: {
        mode: search.mode === "professional" ? search.mode : "visual",
        page: k ?? undefined,
        block: undefined,
      },
      replace: true,
    });

  // El bloqueo de desplazamiento del workspace sólo aplica cuando hay una
  // página abierta en el lienzo (el lienzo tiene su propio scroller). En el
  // panel de páginas la lista debe poder desplazarse con normalidad.
  const canvasOpen = Boolean(page);
  useLayoutEffect(() => {
    if (!canvasOpen) return;
    const workspaceMain = shellRef.current?.closest<HTMLElement>("main#main");
    if (!workspaceMain) return;
    const previousScrollTop = workspaceMain.scrollTop;
    const previousOverflow = workspaceMain.style.overflow;
    const previousOverscroll = workspaceMain.style.overscrollBehavior;
    // El listado puede estar desplazado al abrir una plantilla. El editor ocupa
    // su propio lienzo y debe iniciar bajo las barras del Workspace, no heredar
    // ese desplazamiento y dejar fuera de pantalla su acción de salida.
    const keepEditorAtTop = () => {
      if (workspaceMain.scrollTop !== 0) workspaceMain.scrollTop = 0;
    };
    keepEditorAtTop();
    workspaceMain.addEventListener("scroll", keepEditorAtTop, { passive: true });
    workspaceMain.style.overflow = "hidden";
    workspaceMain.style.overscrollBehavior = "none";
    return () => {
      workspaceMain.removeEventListener("scroll", keepEditorAtTop);
      workspaceMain.style.overflow = previousOverflow;
      workspaceMain.style.overscrollBehavior = previousOverscroll;
      // La lista vuelve a montarse después del editor; restaurar en el siguiente
      // cuadro evita que el navegador limite la posición mientras aún no existe.
      window.requestAnimationFrame(() => {
        workspaceMain.scrollTop = previousScrollTop;
      });
    };
  }, [canvasOpen]);

  return (
    <div
      ref={shellRef}
      className={`flex min-h-0 flex-col ${canvasOpen ? "overflow-hidden" : ""}`}
    >
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <Link
          to="/cms"
          aria-label="Volver a CMS Studio"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Studio
          </p>
          <h1 className="truncate text-sm font-semibold">
            Experience Builder{page ? ` · ${page}` : ""}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              mode === "visual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={mode === "visual"}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => canAdvanced && setMode("professional")}
            disabled={!canAdvanced}
            title={canAdvanced ? "Modo Profesional" : "Sólo administradores"}
            className={`rounded-full px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === "professional"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={mode === "professional"}
          >
            Profesional
          </button>
        </div>
      </div>
      <VisualStudio
        page={page}
        onSelectPage={setPage}
        advanced={mode === "professional" && canAdvanced}
      />
    </div>
  );
}
