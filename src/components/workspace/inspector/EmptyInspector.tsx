import { MousePointerClick } from "lucide-react";

export function EmptyInspector() {
  return (
    <section
      className="flex h-full flex-col items-center justify-center gap-3 border-l border-border bg-surface p-6 text-center"
      aria-label="Inspector vacío"
    >
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <MousePointerClick className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-base">Selecciona un elemento</h3>
      <p className="max-w-[260px] text-sm text-muted-foreground">
        El Inspector mostrará aquí los detalles, acciones rápidas y
        recomendaciones de Alux para el elemento enfocado.
      </p>
    </section>
  );
}