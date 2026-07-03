/**
 * AluxSurface — plantilla oficial de la página pública de Alux.
 *
 * US-R3 · Ola 1 (Singletons). Contenido del cuerpo de `/alux`,
 * desacoplado de la ruta para ser renderizable desde una composición
 * del Experience Builder (bloque `vmx.surface.alux`). Paridad visual
 * y funcional 1:1 con la implementación previa. Rediseño en US-R4+.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";

export function AluxSurface() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Qué hará Alux</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· Resumir expedientes del Concierge Workspace</li>
          <li>· Sugerir productos candidatos</li>
          <li>· Preparar borradores de propuesta</li>
          <li>· Detectar riesgos y oportunidades operativas</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <ComingSoonBadge label="Activo para Concierge" />
        <h2 className="mt-4 text-lg font-semibold">Workspace operativo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          El asistente está disponible dentro de los expedientes internos del
          Concierge Workspace. El acceso público conversacional queda separado.
        </p>
        <Link
          to="/concierge"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Abrir Concierge Workspace
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}