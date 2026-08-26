import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { cn } from "@/lib/utils";

const OPTIONS: readonly [PremiumPresentation, string][] = [
  ["editorial", "Editorial"],
  ["cinematic", "Cinematográfica"],
];

export function PremiumPresentationControl({
  value,
  onChange,
  note,
}: {
  value: PremiumPresentation;
  onChange: (value: PremiumPresentation) => void;
  note?: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Dirección visual
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {OPTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={cn(
              "rounded-2xl border px-3 py-2 text-xs transition-colors",
              value === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {note ? <p className="mt-2 text-[11px] text-muted-foreground">{note}</p> : null}
    </fieldset>
  );
}
