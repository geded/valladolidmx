/**
 * AluxSurface — plantilla oficial de la página pública de Alux.
 *
 * US-R3 · Ola 1 (Singletons). Contenido del cuerpo de `/alux`,
 * desacoplado de la ruta para ser renderizable desde una composición
 * del Experience Builder (bloque `vmx.surface.alux`). Paridad visual
 * y funcional 1:1 con la implementación previa. Rediseño en US-R4+.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";

export function AluxSurface() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Tu siguiente mejor paso</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· Revisar los destinos y experiencias de tu viaje</li>
          <li>· Detectar qué puede faltar según tu tiempo y ritmo</li>
          <li>· Sugerir lugares cercanos sin cambiar tu plan</li>
        </ul>
        <Link
          to="/arma-tu-viaje"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Ver mi viaje
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Cuando quieras hacerlo realidad</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu expediente conserva lo que elegiste. Cuando tú lo decidas, un concierge humano podrá
          revisarlo contigo, coordinar opciones y ayudarte a convertirlo en un viaje real.
        </p>
        <Link
          to="/arma-tu-viaje"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Preparar mi viaje
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
