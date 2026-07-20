/**
 * CV2.2 · Bandeja de propuestas Alux → Plan
 *
 * Muestra las adiciones sugeridas por Alux al plan del viajero.
 * El viajero confirma o descarta explícitamente (Travel Plan Contract v1.0).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { Sparkles, Check, X, Building2, ShoppingBag, Ticket, MapPin } from "lucide-react";
import {
  acceptAluxPlanProposal,
  dismissAluxPlanProposal,
  listMyAluxPlanProposals,
  type AluxPlanProposal,
} from "@/lib/alux/plan-proposals.functions";

const ENTITY_ICON = {
  business: Building2,
  product: ShoppingBag,
  event: Ticket,
  destination: MapPin,
} as const;

const ENTITY_LABEL = {
  business: "Empresa",
  product: "Experiencia",
  event: "Evento",
  destination: "Destino",
} as const;

export function AluxPlanProposalsInbox({ onChanged }: { onChanged?: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAluxPlanProposals);
  const acceptFn = useServerFn(acceptAluxPlanProposal);
  const dismissFn = useServerFn(dismissAluxPlanProposal);

  const q = useQuery({
    queryKey: ["alux", "plan-proposals", "pending"],
    queryFn: () => listFn({ data: { status: "pending", limit: 30 } }),
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["alux", "plan-proposals"] });
    onChanged?.();
  };

  const accept = useMutation({
    mutationFn: (id: string) => acceptFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Añadido a tu viaje");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "No se pudo añadir"),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sugerencia descartada");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "No se pudo descartar"),
  });

  const items = q.data ?? [];
  if (q.isLoading) return null;
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4 md:p-5">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-base font-semibold">Alux sugiere para tu viaje</h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {items.length} pendiente{items.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="grid gap-3">
        {items.map((p) => (
          <ProposalRow
            key={p.id}
            proposal={p}
            busy={accept.isPending || dismiss.isPending}
            onAccept={() => accept.mutate(p.id)}
            onDismiss={() => dismiss.mutate(p.id)}
          />
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Alux propone; tú decides. Nada se añade a tu plan sin tu confirmación.
      </p>
    </section>
  );
}

function ProposalRow({
  proposal,
  busy,
  onAccept,
  onDismiss,
}: {
  proposal: AluxPlanProposal;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const Icon = ENTITY_ICON[proposal.entity_type] ?? MapPin;
  const label = ENTITY_LABEL[proposal.entity_type] ?? "Sugerencia";
  const [expanded, setExpanded] = useState(false);
  const canAccept = !!proposal.entity_id;

  return (
    <li className="rounded-xl border border-border bg-card p-3 md:p-4">
      <div className="flex items-start gap-3">
        {proposal.image_url ? (
          <img
            src={proposal.image_url}
            alt=""
            className="h-14 w-14 flex-none rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {proposal.title}
          </p>
          {proposal.subtitle && (
            <p className="truncate text-xs text-muted-foreground">
              {proposal.subtitle}
            </p>
          )}
          {proposal.rationale && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[11px] font-medium text-primary hover:underline"
              >
                {expanded ? "Ocultar por qué" : "Por qué Alux lo sugiere"}
              </button>
              {expanded && (
                <p className="mt-1 rounded-md bg-muted/50 p-2 text-xs text-foreground/80">
                  {proposal.rationale}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Descartar
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={busy || !canAccept}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          title={canAccept ? undefined : "Sugerencia sin referencia; no se puede añadir automáticamente"}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Añadir a mi viaje
        </button>
      </div>
    </li>
  );
}