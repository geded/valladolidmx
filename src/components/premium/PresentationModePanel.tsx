/**
 * G8-R1-F1C-A · Panel productivo de Presentación (Portal Empresa y CMS).
 *
 * Un único panel reutilizable en las nueve familias de ficha individual:
 *  - Equipo de la empresa (owner/manager/editor): elige Editorial o SOLICITA
 *    Cinematográfica. No aprueba, no publica, no cambia familia.
 *  - Staff (editor/admin/super_admin): además aprueba o devuelve, y ve historial.
 *
 * Nunca publica, nunca cambia el estado de contenido y no toca el flag global.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PremiumPresentationControl } from "./PremiumPresentationControl";
import {
  PRESENTATION_CONTROL_COPY,
  presentationCapabilities,
  type PresentationActorRole,
} from "@/lib/omxds/presentation/entity-presentation";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import {
  getEntityPresentationMode,
  listEntityPresentationHistory,
  reviewEntityPresentationMode,
  setEntityPresentationMode,
  type PresentationHistoryEntry,
  type PresentationModeState,
} from "@/lib/omxds/presentation/entity-presentation.functions";

const ACTION_LABEL: Record<string, string> = {
  request: "Solicitud del equipo",
  set: "Modo fijado",
  approve: "Aprobado",
  reject: "Devuelto a Editorial",
  fallback: "Caída automática por portada",
};

export function PresentationModePanel({
  entityKind,
  entityId,
  role,
  ownsEntity = false,
}: {
  entityKind: "business" | "product" | "event" | "place";
  entityId: string;
  role: PresentationActorRole;
  ownsEntity?: boolean;
}) {
  const caps = presentationCapabilities(role, ownsEntity);
  const getMode = useServerFn(getEntityPresentationMode);
  const setMode = useServerFn(setEntityPresentationMode);
  const review = useServerFn(reviewEntityPresentationMode);
  const listHistory = useServerFn(listEntityPresentationHistory);

  const [state, setState] = useState<PresentationModeState | null>(null);
  const [history, setHistory] = useState<PresentationHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getMode({ data: { entityKind, entityId } });
    setState(next as PresentationModeState);
    if (caps.canApprove) {
      const rows = await listHistory({ data: { entityKind, entityId } });
      setHistory(rows as PresentationHistoryEntry[]);
    }
  }, [caps.canApprove, entityId, entityKind, getMode, listHistory]);

  useEffect(() => {
    void refresh().catch(() => setState(null));
  }, [refresh]);

  if (!caps.canChooseEditorial) return null;

  const effective = (state?.effective_mode ?? "editorial") as PremiumPresentation;
  const requested = (state?.requested_mode ?? "editorial") as PremiumPresentation;
  const reviewState = state?.review_state ?? "not_requested";
  const coverEligible = state?.cover_eligible ?? false;

  const note =
    reviewState === "pending"
      ? PRESENTATION_CONTROL_COPY.pending
      : reviewState === "rejected"
        ? PRESENTATION_CONTROL_COPY.rejected
        : requested === "cinematic" && effective === "editorial" && reviewState === "approved"
          ? PRESENTATION_CONTROL_COPY.fallback
          : undefined;

  const onChange = async (mode: PremiumPresentation) => {
    setBusy(true);
    try {
      await setMode({ data: { entityKind, entityId, mode } });
      await refresh();
      toast.success(
        mode === "cinematic" && !caps.canApprove
          ? PRESENTATION_CONTROL_COPY.pending
          : "Presentación actualizada.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el cambio.");
    } finally {
      setBusy(false);
    }
  };

  const onReview = async (decision: "approve" | "reject") => {
    setBusy(true);
    try {
      await review({ data: { entityKind, entityId, decision } });
      await refresh();
      toast.success(decision === "approve" ? "Solicitud aprobada." : "Solicitud devuelta.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible revisar la solicitud.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <PremiumPresentationControl
        value={requested}
        onChange={(mode) => void onChange(mode)}
        cinematicBlocked={!coverEligible}
        disabled={busy}
        note={note}
      />

      <p className="mt-3 text-[11px] text-muted-foreground">
        Vista actual de la ficha:{" "}
        <strong className="text-foreground">
          {effective === "cinematic" ? "Cinematográfica" : "Editorial"}
        </strong>
        . Cambiar la presentación no publica la ficha.
      </p>

      {caps.canApprove && reviewState === "pending" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onReview("approve")}
            className="inline-flex min-h-11 items-center rounded-pill bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            Aprobar solicitud
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onReview("reject")}
            className="inline-flex min-h-11 items-center rounded-pill border border-border px-4 text-xs font-medium disabled:opacity-60"
          >
            Devolver a Editorial
          </button>
        </div>
      ) : null}

      {caps.canApprove && history.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Historial de presentación ({history.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((entry) => (
              <li key={entry.id} className="text-[11px] text-muted-foreground">
                <span className="text-foreground">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>{" "}
                · {entry.from_mode ?? "—"} → {entry.to_mode ?? "—"} ·{" "}
                {new Date(entry.created_at).toLocaleString("es-MX")}
                {entry.reason ? ` · ${entry.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
