/**
 * AluxFeedbackButtons — Ola A4
 *
 * 👍 / 👎 discretos bajo cada sugerencia de Alux. El 👎 abre un textarea
 * opcional con motivo (máx. 500 chars). Se envía al servidor con
 * `submitAluxFeedback`. Persistimos localmente para no permitir doble
 * envío del mismo hash+capacidad.
 */
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { submitAluxFeedback } from "@/lib/alux/feedback.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AluxTravelerSuggestion } from "@/lib/traveler/alux-traveler.functions";

export interface AluxFeedbackButtonsProps {
  suggestion: AluxTravelerSuggestion;
}

export function AluxFeedbackButtons({ suggestion }: AluxFeedbackButtonsProps) {
  const submit = useServerFn(submitAluxFeedback);
  const [sent, setSent] = useState<null | 1 | -1>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: (rating: 1 | -1) =>
      submit({
        data: {
          capability: suggestion.capability,
          rating,
          reason: reason.trim() ? reason.trim() : undefined,
          suggestionText: suggestion.text,
          knowledgeIds: suggestion.knowledge_ids ?? [],
          model: suggestion.model,
          latencyMs: suggestion.latency_ms,
        },
      }),
    onSuccess: (_data, rating) => {
      setSent(rating);
      setShowReason(false);
      toast.success(
        rating === 1
          ? "Gracias, me ayuda a recomendarte mejor."
          : "Gracias, aprenderé de esto.",
      );
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo enviar"),
  });

  if (sent !== null) {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Check className="size-3 text-success" aria-hidden />
        <span>
          Feedback registrado ({sent === 1 ? "útil" : "poco útil"}).
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-dashed border-border/60 pt-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          ¿Te sirvió?
        </span>
        <button
          type="button"
          onClick={() => mutation.mutate(1)}
          disabled={mutation.isPending}
          className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-success/40 hover:bg-success/10 hover:text-success disabled:opacity-50"
          aria-label="Sí, me sirvió"
          title="Sí, me sirvió"
        >
          <ThumbsUp className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setShowReason((v) => !v)}
          disabled={mutation.isPending}
          className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          aria-label="No, poco útil"
          title="No, poco útil"
        >
          <ThumbsDown className="size-3.5" aria-hidden />
        </button>
      </div>

      {showReason ? (
        <div className="mt-2 space-y-2 rounded-lg bg-background/60 p-2.5">
          <Textarea
            rows={2}
            maxLength={500}
            placeholder="¿Qué faltó o falló? (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowReason(false);
                setReason("");
              }}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => mutation.mutate(-1)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Enviando…" : "Enviar feedback"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}