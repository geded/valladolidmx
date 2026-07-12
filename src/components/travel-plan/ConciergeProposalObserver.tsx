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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyPlanChanged } from "@/lib/alux/plan-signals";

type ProposalRow = {
  id: string;
  status: string;
  case_id: string;
  summary: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  folio: string | null;
  user_id: string | null;
  editorial_title: string | null;
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
      notifyPlanChanged(`concierge:proposal:${kind.toLowerCase()}`);
    };

    const handleOrder = (row: OrderRow | null) => {
      if (!row || row.user_id !== user.id) return;
      const key = `order:${row.id}:${row.status}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);

      if (row.status === "paid" || row.status === "fulfilled") {
        toast.success("Tu viaje está confirmado", {
          description:
            row.editorial_title ??
            "Reservamos tu experiencia. Tu concierge sigue contigo.",
          action: {
            label: "Ver",
            onClick: () => {
              window.location.assign(`/cuenta/pagos/exito?order=${row.id}`);
            },
          },
        });
        notifyPlanChanged("concierge:order:paid");
      } else if (row.status === "cancelled" || row.status === "expired") {
        toast.message("Tu viaje ya no está en proceso", {
          description: "Puedes retomarlo desde tu recorrido cuando quieras.",
        });
        notifyPlanChanged("concierge:order:cancelled");
      }
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "concierge_orders" },
        (payload) => handleOrder(payload.new as OrderRow),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "concierge_orders" },
        (payload) => handleOrder(payload.new as OrderRow),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}