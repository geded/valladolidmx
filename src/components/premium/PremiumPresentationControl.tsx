/**
 * G8-R1-F1C-A · Control de Presentación (copy oficial, sin lenguaje técnico).
 *
 * Nunca muestra nombres de presets, contratos ni identificadores internos.
 */
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PRESENTATION_CONTROL_COPY } from "@/lib/omxds/presentation/entity-presentation";
import { cn } from "@/lib/utils";

const OPTIONS: readonly {
  key: PremiumPresentation;
  label: string;
  help: string;
}[] = [
  {
    key: "editorial",
    label: PRESENTATION_CONTROL_COPY.editorial.label,
    help: PRESENTATION_CONTROL_COPY.editorial.help,
  },
  {
    key: "cinematic",
    label: PRESENTATION_CONTROL_COPY.cinematic.label,
    help: PRESENTATION_CONTROL_COPY.cinematic.help,
  },
];

export function PremiumPresentationControl({
  value,
  onChange,
  note,
  cinematicBlocked = false,
  disabled = false,
}: {
  value: PremiumPresentation;
  onChange: (value: PremiumPresentation) => void;
  note?: string;
  /** Sin portada aprobada: Cinematográfica queda bloqueada (fail-closed). */
  cinematicBlocked?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {PRESENTATION_CONTROL_COPY.legend}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const blocked = option.key === "cinematic" && cinematicBlocked;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => !blocked && onChange(option.key)}
              aria-pressed={value === option.key}
              aria-disabled={blocked || undefined}
              title={blocked ? PRESENTATION_CONTROL_COPY.blocked : undefined}
              className={cn(
                "flex min-h-11 flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 text-left transition-colors",
                value === option.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent",
                blocked && "cursor-not-allowed opacity-60 hover:bg-background",
              )}
            >
              <span className="text-xs font-medium">{option.label}</span>
              <span
                className={cn(
                  "text-[11px]",
                  value === option.key ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {option.help}
              </span>
            </button>
          );
        })}
      </div>
      {cinematicBlocked ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {PRESENTATION_CONTROL_COPY.blocked}
        </p>
      ) : null}
      {note ? <p className="mt-2 text-[11px] text-muted-foreground">{note}</p> : null}
    </fieldset>
  );
}
