/**
 * AluxSuggestionCard — Iniciativa 7 · Sub-ola H.
 *
 * Tarjeta de sugerencia explicable de Alux Traveler. Sigue la regla UX
 * aprobada (Sub-ola H):
 *
 *   1. Recomendación principal.
 *   2. Por qué la recomienda (rationale).
 *   3. Qué información utilizó (sources).
 *   4. Qué cambiaría en el viaje (effect / disclaimer).
 *   5. Acción disponible (CTA explícito del usuario, nunca automática).
 *
 * La CTA reutiliza AddToTravelPlanButton (Sub-ola C) cuando la fuente
 * corresponde a un tipo del Travel Workspace (destination/business/
 * product/event). Alux nunca modifica el plan por su cuenta.
 */
import { Sparkles, ShieldCheck, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type {
  AluxTravelerSource,
  AluxTravelerSuggestion,
} from "@/lib/traveler/alux-traveler.functions";
import { AddToTravelPlanButton } from "./AddToTravelPlanButton";
import { AluxSourcesFooter } from "./AluxSourcesFooter";
import type { TravelItemKind } from "@/lib/traveler/travel-plans.functions";

const ADDABLE_KINDS: TravelItemKind[] = [
  "destination",
  "business",
  "product",
  "event",
  "note",
];

function isAddable(
  s: AluxTravelerSource,
): s is AluxTravelerSource & { target_id: string } {
  return (
    !!s.target_id &&
    (ADDABLE_KINDS as string[]).includes(s.kind) &&
    s.kind !== "note"
  );
}

export interface AluxSuggestionCardProps {
  capabilityLabel: string;
  suggestion: AluxTravelerSuggestion;
}

export function AluxSuggestionCard({
  capabilityLabel,
  suggestion,
}: AluxSuggestionCardProps) {
  const addable = suggestion.sources.filter(isAddable).slice(0, 4);

  return (
    <article className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      {/* Header */}
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Alux · {capabilityLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Sugerencia · no modifica tu viaje sin tu confirmación
          </p>
        </div>
      </header>

      {/* 1. Recomendación */}
      <div className="prose prose-sm max-w-none text-sm text-foreground [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:my-2 [&_p]:my-1.5">
        <ReactMarkdown>{suggestion.text || "(sin contenido)"}</ReactMarkdown>
      </div>

      {/* 2. Rationale */}
      {suggestion.rationale ? (
        <div className="mt-3 rounded-lg bg-background/60 p-3">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="size-3" aria-hidden /> Por qué te lo recomiendo
          </p>
          <div className="prose prose-sm max-w-none text-xs text-muted-foreground [&_p]:my-1">
            <ReactMarkdown>{suggestion.rationale}</ReactMarkdown>
          </div>
        </div>
      ) : null}

      {/* 3. Sources */}
      <div className="mt-3">
        <AluxSourcesFooter sources={suggestion.sources} />
      </div>

      {/* 4. Effect / disclaimer */}
      <p className="mt-3 flex items-start gap-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3 shrink-0 text-success" aria-hidden />
        <span>{suggestion.disclaimer}</span>
      </p>

      {/* 5. CTA explícito del usuario */}
      {addable.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Acción disponible
          </p>
          <div className="flex flex-wrap gap-1.5">
            {addable.map((s) => (
              <AddToTravelPlanButton
                key={`${s.kind}:${s.target_id}`}
                kind={s.kind as TravelItemKind}
                targetId={s.target_id}
                title={s.title ?? s.slug ?? "Elemento sugerido"}
                slug={s.slug ?? undefined}
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}