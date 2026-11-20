/**
 * Punto de enfoque compartido: el editor toca la parte de la foto que siempre
 * debe verse y ve al instante cómo queda recortada en móvil y escritorio.
 */
import { focalStyle } from "@/components/omxds/EditorialMediaFrame";

export interface FocalPoint {
  x: number;
  y: number;
}

export function FocalPointPicker({
  src,
  value,
  onChange,
}: {
  src: string;
  value: FocalPoint;
  onChange: (next: FocalPoint) => void;
}) {
  const pick = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    onChange({
      x: Math.round(clamp((e.clientX - r.left) / r.width) * 100) / 100,
      y: Math.round(clamp((e.clientY - r.top) / r.height) * 100) / 100,
    });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Toca la parte de la foto que siempre debe verse (por ejemplo, la torre o las personas).
      </p>
      <button
        type="button"
        onPointerDown={pick}
        aria-label="Elegir el punto que siempre debe verse"
        className="relative block w-full overflow-hidden rounded-xl bg-muted ring-focus"
      >
        <img src={src} alt="" className="block max-h-72 w-full object-contain" draggable={false} />
        <span
          aria-hidden
          className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary/60 shadow-elevated"
          style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}
        />
      </button>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <figure className="space-y-1">
          <img
            src={src}
            alt=""
            className="aspect-[3/4] w-full rounded-lg object-cover"
            style={focalStyle(value)}
          />
          <figcaption className="text-xs text-muted-foreground">Así en móvil</figcaption>
        </figure>
        <figure className="space-y-1">
          <img
            src={src}
            alt=""
            className="aspect-[16/9] w-full rounded-lg object-cover"
            style={focalStyle(value)}
          />
          <figcaption className="text-xs text-muted-foreground">Así en escritorio</figcaption>
        </figure>
      </div>
    </div>
  );
}
