/**
 * G8-Q2D-B · Fase 3 — Sección “Presentación de la ficha” del CMS de Lugares.
 *
 * Selector Editorial / Cinematográfica persistible en
 * `points_of_interest.metadata.presentation_mode`.
 *
 * Reglas vinculantes (autoridad G8-Q2D-0 / plantilla G8-Q2D-A):
 *  - Recomendación por tipo de lugar (variante cerrada).
 *  - Cinematográfica bloqueada sin portada gobernada aprobada.
 *  - Cambiar la presentación nunca publica ni cambia el estado del lugar.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import {
  PLACE_PREMIUM_FALLBACK_NOTICE,
  getPlacePremiumVariant,
} from "@/components/place-premium/place-premium-config";
import { setPlacePresentationMode } from "@/lib/places/place-presentation.functions";
import { PlaceSection } from "./PlaceSection";
import { cn } from "@/lib/utils";

interface Props {
  placeId: string;
  /** Slug de `place_types` — determina la recomendación oficial. */
  typeSlug: string | null;
  /** Dirección persistida (`metadata.presentation_mode`). */
  value: PremiumPresentation | null;
  /** ¿Existe portada gobernada, aprobada y atribuida? */
  hasApprovedCover: boolean;
  onChanged: () => void;
}

const OPTIONS: readonly [PremiumPresentation, string][] = [
  ["editorial", "Editorial"],
  ["cinematic", "Cinematográfica"],
];

export function PlacePresentationPanel({
  placeId,
  typeSlug,
  value,
  hasApprovedCover,
  onChanged,
}: Props) {
  const variant = getPlacePremiumVariant(typeSlug);
  const recommended: PremiumPresentation = variant?.defaultPresentation ?? "editorial";
  const [selected, setSelected] = useState<PremiumPresentation>(value ?? recommended);
  const saveFn = useServerFn(setPlacePresentationMode);

  const save = useMutation({
    mutationFn: (mode: PremiumPresentation) => saveFn({ data: { placeId, mode } }),
    onSuccess: (_res, mode) => {
      setSelected(mode);
      toast.success("Presentación guardada. El lugar sigue sin publicarse.");
      onChanged();
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "";
      toast.error(
        message.includes("cinematic_requires_approved_cover")
          ? PLACE_PREMIUM_FALLBACK_NOTICE
          : message || "No se pudo guardar la presentación.",
      );
    },
  });

  const blocked = !hasApprovedCover;

  return (
    <PlaceSection
      id="place-presentation"
      title="Presentación de la ficha"
      description="Elige la dirección visual de la plantilla premium-entity-place. Cambiar la presentación nunca publica el lugar."
    >
      <fieldset className="md:col-span-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dirección visual
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
          {OPTIONS.map(([key, label]) => {
            const disabled = key === "cinematic" && blocked;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled || save.isPending}
                aria-pressed={selected === key}
                onClick={() => save.mutate(key)}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-pill border px-3 py-2 text-xs transition-colors disabled:opacity-50",
                  selected === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Recomendada para {variant ? variant.label.toLowerCase() : "este tipo de lugar"}:{" "}
          <strong>{recommended === "cinematic" ? "Cinematográfica" : "Editorial"}</strong>.
        </p>
        {blocked && (
          <p
            role="status"
            className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-foreground"
          >
            {PLACE_PREMIUM_FALLBACK_NOTICE}
          </p>
        )}
      </fieldset>

      <p className="md:col-span-2 text-[11px] text-muted-foreground">
        La ficha pública sólo existe cuando el lugar está publicado; hasta entonces la
        previsualización interna se muestra como “Borrador · no publicado”.
      </p>
    </PlaceSection>
  );
}
