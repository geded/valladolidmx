/**
 * WorkspaceOnboardingTour — Ola CV5.12.
 *
 * Tour ligero de bienvenida al Workspace del Viajero (/cuenta/mi-viaje).
 * Se muestra una sola vez por usuario (persistencia local) e introduce las
 * 7 vistas oficiales + las capacidades clave (bell de avisos, focus por
 * deep-link, Alux, Concierge). Saltable siempre; no bloquea.
 *
 * Reglas:
 *  - No escribe en Lovable Cloud (contenido estático + preferencia local).
 *  - Respeta State Preservation Policy: no altera la vista actual.
 *  - Reabrible desde el header del workspace vía botón "?" (evento custom).
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Route as RouteIcon,
  ReceiptText,
  Headset,
  Sparkles,
  FileText,
  Heart,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STORAGE_PREFIX = "vmx.workspace.tour.v1";
export const WORKSPACE_TOUR_REOPEN_EVENT = "vmx:workspace-tour:reopen";

type Step = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  {
    title: "Tu viaje, en un solo lugar",
    body:
      "Mi Viaje es tu compañero digital del Oriente Maya — antes, durante y después. Todas las vistas comparten el mismo viaje, así nada se pierde.",
    icon: LayoutDashboard,
  },
  {
    title: "Siete vistas, un mismo expediente",
    body:
      "Resumen, Itinerario, Reservas, Concierge, Alux, Documentos y Recuerdos. Cambias de vista sin salir del contexto; el orden se adapta a la fase de tu viaje.",
    icon: RouteIcon,
  },
  {
    title: "Alux y el Concierge trabajan contigo",
    body:
      "Alux propone y explica; el Concierge humano confirma y coordina. Acepta o compara propuestas y confirma tu viaje sin sentir que estás pagando: estás confirmando lo que armaron juntos.",
    icon: Sparkles,
  },
  {
    title: "Avisos y deep-links",
    body:
      "La campanita reúne propuestas por confirmar, cuenta regresiva y mensajes del Concierge. Cada aviso te lleva justo a la sección relevante con un resaltado breve.",
    icon: Bell,
  },
];

const ICON_ROW: React.ComponentType<{ className?: string }>[] = [
  LayoutDashboard,
  RouteIcon,
  ReceiptText,
  Headset,
  Sparkles,
  FileText,
  Heart,
];

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}`;
}

export function WorkspaceOnboardingTour({
  userId,
}: {
  userId: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-apertura la primera vez.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(storageKey(userId));
      if (!seen) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [userId]);

  // Reabrible por evento (botón "?" en el header).
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(WORKSPACE_TOUR_REOPEN_EVENT, handler);
    return () => window.removeEventListener(WORKSPACE_TOUR_REOPEN_EVENT, handler);
  }, []);

  const close = (persist: boolean) => {
    setOpen(false);
    if (persist) {
      try {
        window.localStorage.setItem(storageKey(userId), new Date().toISOString());
      } catch {
        /* ignore */
      }
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close(true);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-center text-sm">
            {current.body}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {ICON_ROW.map((I, i) => (
              <span
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/50 text-muted-foreground"
                aria-hidden
              >
                <I className="h-4 w-4" />
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
              aria-hidden
            />
          ))}
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => close(true)}
            className="text-muted-foreground"
          >
            Saltar
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
            ) : null}
            {isLast ? (
              <Button size="sm" onClick={() => close(true)}>
                Empezar
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Helper para disparar el tour desde otro componente (p. ej. botón "?"). */
export function openWorkspaceTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_TOUR_REOPEN_EVENT));
}