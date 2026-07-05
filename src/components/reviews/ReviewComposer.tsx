/**
 * Trust Engine v1 · US-G.1 — ReviewComposer.
 *
 * Diálogo controlado que resuelve elegibilidad server-side, muestra la
 * política que aplica (compra verificada · visita gestionada · declarada
 * bajo protesta) y envía la reseña vía `submitReview`.
 *
 * - Sólo se renderiza el trigger si el usuario está autenticado.
 * - Frenos anti-abuso críticos viven en el servidor. La UI aplica
 *   validaciones espejo (rating 1..5, body 30..2000, declaración D).
 */
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  checkReviewEligibility,
  submitReview,
  type EligibilityPolicy,
} from "@/lib/reviews/composer.functions";
import type { PublicReviewSubjectKind } from "@/lib/reviews/public-reads.functions";

const POLICY_LABEL: Record<EligibilityPolicy, string> = {
  verified_purchase: "Compra verificada — se publica al enviar",
  managed_visit: "Visita gestionada por Concierge — se publica al enviar",
  declared_visitor: "Declarada bajo protesta — pasa por moderación antes de publicarse",
};

export interface ReviewComposerProps {
  subjectKind: PublicReviewSubjectKind;
  subjectId: string;
  subjectName?: string;
  triggerLabel?: string;
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <Star
            className={cn(
              "h-6 w-6",
              n <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewComposer({
  subjectKind,
  subjectId,
  subjectName,
  triggerLabel = "Escribir reseña",
}: ReviewComposerProps) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [declaredVisit, setDeclaredVisit] = useState(false);

  const checkFn = useServerFn(checkReviewEligibility);
  const submitFn = useServerFn(submitReview);

  const eligibilityQuery = useQuery({
    queryKey: ["review-eligibility", subjectKind, subjectId, user?.id ?? "anon"],
    queryFn: () => checkFn({ data: { subjectKind, subjectId } }),
    enabled: open && !!user,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: {
      rating: number;
      title: string | null;
      body: string;
      visitDate: string | null;
      declaredVisit: boolean;
      authorDisplayName: string | null;
    }) =>
      submitFn({
        data: {
          subjectKind,
          subjectId,
          ...payload,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.status === "published"
          ? "Reseña publicada. ¡Gracias por compartir tu experiencia!"
          : "Reseña enviada a moderación. La publicaremos tras revisarla.",
      );
      qc.invalidateQueries();
      setOpen(false);
      setRating(0);
      setTitle("");
      setBody("");
      setVisitDate("");
      setDeclaredVisit(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "error";
      if (msg.includes("already_reviewed")) {
        toast.error("Ya dejaste una reseña sobre este contenido.");
      } else if (msg.includes("declaration_required")) {
        toast.error("Debes confirmar la declaración bajo protesta.");
      } else if (msg.includes("visit_date_required")) {
        toast.error("Indica la fecha aproximada de tu visita.");
      } else {
        toast.error("No pudimos enviar tu reseña. Intenta más tarde.");
      }
    },
  });

  useEffect(() => {
    if (!open) submitMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!user) return null;

  const elig = eligibilityQuery.data;
  const disableSubmit =
    submitMutation.isPending ||
    !elig?.eligible ||
    rating < 1 ||
    body.trim().length < 30 ||
    (elig?.requiresDeclaration && (!declaredVisit || !visitDate));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Comparte tu experiencia</DialogTitle>
          <DialogDescription>
            {subjectName ? `Tu reseña sobre ${subjectName}.` : "Cuéntanos cómo fue tu experiencia."}
          </DialogDescription>
        </DialogHeader>

        {eligibilityQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Verificando elegibilidad…</p>
        ) : eligibilityQuery.error ? (
          <p className="text-sm text-destructive">
            No pudimos verificar tu elegibilidad. Intenta nuevamente.
          </p>
        ) : elig && !elig.eligible ? (
          <p className="text-sm text-destructive">
            {elig.hasExistingReview
              ? "Ya dejaste una reseña sobre este contenido."
              : "Actualmente no eres elegible para reseñar este contenido."}
          </p>
        ) : elig && elig.policy ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="font-medium">Política aplicada:</span>{" "}
              {POLICY_LABEL[elig.policy]}
            </div>

            <div className="space-y-2">
              <Label>Calificación</Label>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-title">Título (opcional)</Label>
              <Input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Un resumen breve de tu experiencia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-body">
                Tu reseña ({body.trim().length}/2000, mín. 30)
              </Label>
              <Textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Describe qué te gustó, qué mejorarías y consejos para futuros visitantes."
              />
            </div>

            {elig.requiresDeclaration ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="review-visit-date">Fecha aproximada de tu visita</Label>
                  <Input
                    id="review-visit-date"
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={declaredVisit}
                    onChange={(e) => setDeclaredVisit(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Declaro bajo protesta que efectivamente visité este lugar y que
                    mi reseña refleja mi experiencia real. Sé que reseñas falsas
                    pueden ser retiradas y mi cuenta suspendida.
                  </span>
                </label>
              </>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              submitMutation.mutate({
                rating,
                title: title.trim() || null,
                body: body.trim(),
                visitDate: visitDate || null,
                declaredVisit,
                authorDisplayName: profile?.display_name ?? null,
              })
            }
            disabled={disableSubmit}
          >
            {submitMutation.isPending ? "Enviando…" : "Enviar reseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}