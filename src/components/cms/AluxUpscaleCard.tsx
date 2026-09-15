/**
 * AluxUpscaleCard — Tarjeta ámbar que aparece al elegir una foto pequeña.
 * Ofrece ampliarla con Alux IA o subirla tal cual. Sólo se renderiza desde
 * paneles del CMS (editores/administradores).
 */
import { Sparkles, Loader2 } from "lucide-react";
import { describeRoleFit, type RoleFit } from "@/lib/cms/image-upload";

interface Props {
  fit: RoleFit;
  upscaling: boolean;
  busy: boolean;
  onUpscale: () => void;
  onSkip: () => void;
}

export function AluxUpscaleCard({ fit, upscaling, busy, onUpscale, onSkip }: Props) {
  return (
    <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="flex-1">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {describeRoleFit(fit)} Alux IA puede ampliarla conservando la misma escena.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUpscale}
              disabled={upscaling || busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {upscaling ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {upscaling ? "Ampliando…" : "Ampliar con Alux IA"}
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={upscaling || busy}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
            >
              Subir así
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
