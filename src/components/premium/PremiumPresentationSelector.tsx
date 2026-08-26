/**
 * G4-SYSTEM-01 · Selector interno de presentación.
 *
 * NO es público. Se renderiza únicamente cuando el actor está
 * autorizado (admin / propietario / editor). El visitante siempre
 * recibe la variante publicada.
 */
import { cn } from "@/lib/utils";
import {
  canSelectPremiumPresentation,
  PREMIUM_PRESENTATIONS,
  PREMIUM_PRESENTATION_LABELS,
  type PremiumPresentation,
  type PremiumPresentationActor,
} from "@/lib/omxds/presentation/premium-presentation";

export function PremiumPresentationSelector({
  actor,
  value,
  onChange,
  className,
}: {
  actor: PremiumPresentationActor;
  value: PremiumPresentation;
  onChange: (next: PremiumPresentation) => void;
  className?: string;
}) {
  if (!canSelectPremiumPresentation(actor)) return null;
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-pill bg-muted p-1", className)}
      role="group"
      aria-label="Dirección visual (interno)"
    >
      {PREMIUM_PRESENTATIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === option
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {PREMIUM_PRESENTATION_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
