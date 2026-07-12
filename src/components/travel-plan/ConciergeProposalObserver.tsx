/**
 * ConciergeProposalObserver — CV3.3
 *
 * Suscripción global Realtime a `concierge_proposals`. Cuando el concierge
 * envía una propuesta nueva o la actualiza a `sent`, el viajero recibe un
 * toast in-site invitándolo a abrir su plan sin salir del recorrido.
 *
 * Sólo autenticado. RLS restringe los eventos entregados a expedientes del
 * usuario, así que aquí no filtramos por caso — confiamos en la política.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { emitPlanChanged } from "@/lib/alux/plan-signals";

type ProposalRow = {
  id: string;
  status: string;
  case_id: string;
  summary: string | null;
};

export function ConciergeProposalObserver() {
  const { user } = useAuth();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    seen.current = new Set();

    const handle = (row: ProposalRow | null, kind: "INSERT" | "UPDATE") => {
      if (!row || row.status !== "sent") return;
      const key = `${row.id}:sent`;
      if (seen.current.has(key)) return;
      seen.current.add(key);

      toast.message("Nueva propuesta de tu concierge", {
        description:
          row.summary?.trim() ||
          "Tu concierge acaba de enviarte una propuesta. Ábrela desde tu viaje.",
        action: {
          label: "Ver",
          onClick: () => {
            window.location.assign(`/cuenta/concierge/${row.case_id}`);
          },
        },
      });
      emitPlanChanged({ reason: `concierge:proposal:${kind.toLowerCase()}` });
    };

    const channel = supabase
      .channel(`concierge-proposals:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "concierge_proposals" },
        (payload) => handle(payload.new as ProposalRow, "INSERT"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "concierge_proposals" },
        (payload) => handle(payload.new as ProposalRow, "UPDATE"),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Link import kept for potential future in-toast navigation; suppress unused.
  void Link;
  return null;
}