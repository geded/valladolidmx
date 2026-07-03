/**
 * OnboardingTour — US-16 (15.10.4d)
 *
 * Tour contextual de primer uso para el Experience Builder.
 *  - 4 pasos: elegir sección → editar → previsualizar → publicar.
 *  - Dismissable con "No volver a mostrar" (localStorage por usuario/dispositivo).
 *  - Reinvocable desde el botón "Ayuda" del topbar.
 *  - Sin nueva infraestructura: componente autónomo, sin engine ni provider.
 */

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";

const STORAGE_KEY = "eb-onboarding-dismissed-v1";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

type Step = {
  title: string;
  body: string;
  hint?: string;
};

const STEPS: Step[] = [
  {
    title: "1 · Elige una sección",
    body: "Haz clic en cualquier bloque del canvas (Hero, Destinos, Rutas…) o en la lista lateral 'Secciones'. La sección seleccionada se resalta y se abre el panel de edición a la derecha.",
    hint: "Tip: puedes arrastrar los bloques en la barra lateral para reordenar la página.",
  },
  {
    title: "2 · Edita sin código",
    body: "En el panel derecho verás campos simples (texto, imagen, enlaces). Los cambios se guardan solos como Borrador — no publican nada todavía.",
    hint: "Doble clic sobre un texto en el canvas enfoca directamente su campo.",
  },
  {
    title: "3 · Previsualiza",
    body: "Usa 'Vista previa' para ocultar los controles y ver la página tal como la verá el visitante. Cambia entre Móvil / Tablet / Escritorio para revisar en cada dispositivo.",
    hint: "También puedes generar un enlace temporal con 'Compartir vista previa' para mostrarlo a tu equipo antes de publicar.",
  },
  {
    title: "4 · Publica",
    body: "Cuando estés a gusto, pulsa 'Publicar cambios'. Tu página quedará en línea al instante. Si algo sale mal, en 'Versiones' puedes volver a cualquier versión anterior con un clic.",
    hint: "Solo administradores pueden publicar; los editores dejan la página lista como Borrador.",
  },
];

export function OnboardingTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(true);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    if (dontShow) markOnboardingSeen();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eb-tour-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-2 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Guía rápida · Editor visual
            </p>
            <h2 id="eb-tour-title" className="mt-1 text-sm font-semibold">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar guía"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-foreground/90">{current.body}</p>
          {current.hint ? (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-foreground/80">
              {current.hint}
            </p>
          ) : null}

          <div className="flex items-center gap-1.5 pt-1" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="size-3.5 rounded border-border"
            />
            No volver a mostrar
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Atrás
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
              >
                <Check className="size-3.5" aria-hidden />
                Empezar a editar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
              >
                Siguiente
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export function HelpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
      title="Volver a mostrar la guía rápida"
      aria-label="Ayuda: guía rápida del editor"
    >
      <HelpCircle className="size-3.5" aria-hidden />
      Ayuda
    </button>
  );
}
