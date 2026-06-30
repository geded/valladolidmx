/**
 * portal/ownership-transfers.functions.ts — Etapa 6 · 14.40.6
 *
 * Transferencia de propiedad de empresa con aceptación explícita del
 * destinatario. Toda mutación va por RPC SECURITY DEFINER; toda lectura
 * usa supabase autenticado con RLS. Sin SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OwnershipTransferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";

export interface OwnershipTransfer {
  id: string;
  business_id: string;
  from_user_id: string;
  to_user_id: string;
  status: OwnershipTransferStatus;
  notes: string | null;
  requested_at: string;
  responded_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** Solicitudes de transferencia donde la empresa activa es origen. */
export const listBusinessOwnershipTransfers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => {
    if (!input || typeof input.businessId !== "string") {
      throw new Error("invalid_input");
    }
    return { businessId: input.businessId };
  })
  .handler(async ({ data, context }): Promise<OwnershipTransfer[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("business_ownership_transfers")
      .select(
        "id, business_id, from_user_id, to_user_id, status, notes, requested_at, responded_at, expires_at, created_at, updated_at",
      )
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`list_transfers_failed: ${error.message}`);
    return (rows ?? []) as OwnershipTransfer[];
  });

/** Solicitudes dirigidas al usuario autenticado (cualquier empresa). */
export const listIncomingOwnershipTransfers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<
      Array<OwnershipTransfer & { business_name: string | null }>
    > => {
      const { supabase, userId } = context;
      const { data: rows, error } = await supabase
        .from("business_ownership_transfers")
        .select(
          "id, business_id, from_user_id, to_user_id, status, notes, requested_at, responded_at, expires_at, created_at, updated_at, businesses(display_name)",
        )
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false });
      if (error)
        throw new Error(`list_incoming_transfers_failed: ${error.message}`);
      return (rows ?? []).map((r: Record<string, unknown>) => {
        const biz = r.businesses as { display_name?: string } | null;
        const { businesses: _b, ...rest } = r as Record<string, unknown>;
        return {
          ...(rest as unknown as OwnershipTransfer),
          business_name: biz?.display_name ?? null,
        };
      });
    },
  );

export const requestOwnershipTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { businessId: string; toUserId: string; notes?: string }) => {
      if (!input || typeof input.businessId !== "string")
        throw new Error("invalid_business");
      if (typeof input.toUserId !== "string" || !input.toUserId)
        throw new Error("invalid_recipient");
      return {
        businessId: input.businessId,
        toUserId: input.toUserId,
        notes: typeof input.notes === "string" ? input.notes : undefined,
      };
    },
  )
  .handler(async ({ data, context }): Promise<{ transferId: string }> => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc(
      "request_business_ownership_transfer",
      {
        _business_id: data.businessId,
        _to_user_id: data.toUserId,
        _notes: data.notes ?? null,
      },
    );
    if (error) throw new Error(error.message);
    return { transferId: id as string };
  });

export const acceptOwnershipTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transferId: string }) => {
    if (!input || typeof input.transferId !== "string")
      throw new Error("invalid_transfer");
    return { transferId: input.transferId };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc(
      "accept_business_ownership_transfer",
      { _transfer_id: data.transferId },
    );
    if (error) throw new Error(error.message);
    return result as {
      transfer_id: string;
      business_id: string;
      new_owner_user_id: string;
      previous_owner_user_id: string;
    };
  });

export const rejectOwnershipTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transferId: string; notes?: string }) => {
    if (!input || typeof input.transferId !== "string")
      throw new Error("invalid_transfer");
    return {
      transferId: input.transferId,
      notes: typeof input.notes === "string" ? input.notes : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc(
      "reject_business_ownership_transfer",
      { _transfer_id: data.transferId, _notes: data.notes ?? null },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelOwnershipTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transferId: string }) => {
    if (!input || typeof input.transferId !== "string")
      throw new Error("invalid_transfer");
    return { transferId: input.transferId };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc(
      "cancel_business_ownership_transfer",
      { _transfer_id: data.transferId },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });