/**
 * Alux · Resumen oficial de reseñas de Google dentro del concierge.
 *
 * - `auto`: se muestra solo al abrir Alux desde una ficha (no hace falta pedirlo).
 * - `on-demand`: en tarjetas de recomendación, el viajero lo despliega.
 *
 * El texto de Google se muestra sin cambios, con el encabezado, la
 * divulgación y los enlaces que Google exige. Si no hay resumen, no se
 * muestra nada.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, MessageSquareQuote, Sparkles } from "lucide-react";

import { getAluxReviewSummary } from "@/lib/alux/review-summary.functions";
import {
  GOOGLE_SUMMARY_ABOUT_URL,
  REVIEW_SUMMARY_HEADING,
  buildReviewSummaryIntro,
  parseReviewEntityRef,
  resolveTravelerMoment,
  type AluxReviewSummaryDTO,
} from "@/lib/alux/review-summary-contract";
import { cn } from "@/lib/utils";

interface Coords {
  readonly lat: number;
  readonly lng: number;
}

function useReviewSummary(entityRef: string, enabled: boolean) {
  const fetchSummary = useServerFn(getAluxReviewSummary);
  return useQuery({
    queryKey: ["alux", "review-summary", entityRef],
    queryFn: () => fetchSummary({ data: { entityRef } }),
    enabled,
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function SummaryBody({
  summary,
  travelerCoords,
  showIntro,
}: {
  summary: AluxReviewSummaryDTO;
  travelerCoords: Coords | null;
  showIntro: boolean;
}) {
  const { moment, distanceKm } = resolveTravelerMoment(travelerCoords, summary.subjectCoords);
  const linkClass =
    "inline-flex min-h-11 items-center text-[11px] font-medium text-alux underline-offset-2 hover:underline";
  return (
    <div className="min-w-0">
      {showIntro ? (
        <p className="flex items-start gap-1.5 text-[12px] font-medium leading-snug text-foreground">
          <Sparkles className="mt-0.5 size-3 shrink-0 text-alux" aria-hidden />
          <span>{buildReviewSummaryIntro({ name: summary.subjectName, moment, distanceKm })}</span>
        </p>
      ) : null}
      <h3 className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <MessageSquareQuote className="size-3" aria-hidden />
        {REVIEW_SUMMARY_HEADING}
      </h3>
      <p className="mt-1 text-[13px] leading-snug text-foreground">{summary.text}</p>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
        {summary.disclosureText}
      </p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0">
        {summary.reviewsUri ? (
          <a
            href={summary.reviewsUri}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Ver reseñas
          </a>
        ) : null}
        <a
          href={GOOGLE_SUMMARY_ABOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Acerca de este resumen
        </a>
        {summary.flagContentUri ? (
          <a
            href={summary.flagContentUri}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Reportar
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Se muestra solo al abrir Alux desde una ficha publicada. */
export function AluxReviewSummaryCard({
  entityRef,
  travelerCoords,
  className,
}: {
  entityRef: string | null | undefined;
  travelerCoords: Coords | null;
  className?: string;
}) {
  const ref = parseReviewEntityRef(entityRef) ? (entityRef as string) : null;
  const { data } = useReviewSummary(ref ?? "", Boolean(ref));
  if (!ref || !data?.available) return null;
  return (
    <section
      aria-label={`${REVIEW_SUMMARY_HEADING} de ${data.subjectName}`}
      className={cn(
        "mt-3 rounded-xl border border-alux/25 bg-background/70 px-3 py-2.5",
        className,
      )}
    >
      <SummaryBody summary={data} travelerCoords={travelerCoords} showIntro />
    </section>
  );
}

/** Despliegue a petición dentro de una tarjeta de recomendación. */
export function AluxReviewSummaryToggle({
  entityRef,
  travelerCoords,
}: {
  entityRef: string;
  travelerCoords: Coords | null;
}) {
  const [open, setOpen] = useState(false);
  const valid = Boolean(parseReviewEntityRef(entityRef));
  const { data, isFetching } = useReviewSummary(entityRef, valid && open);
  if (!valid) return null;
  return (
    <div className="mt-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1 text-[12px] font-medium text-alux"
      >
        <MessageSquareQuote className="size-3.5" aria-hidden />
        {REVIEW_SUMMARY_HEADING}
        {isFetching ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <ChevronDown
            className={cn("size-3 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        )}
      </button>
      {open && !isFetching && data ? (
        data.available ? (
          <SummaryBody summary={data} travelerCoords={travelerCoords} showIntro />
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Aún no hay un resumen de reseñas disponible para esta opción.
          </p>
        )
      ) : null}
    </div>
  );
}
