/**
 * portal/invitations.functions.ts — Onboarding e invitaciones del Portal
 * Empresarial (Ola 3 · Etapa 2 · Plan 14.30).
 *
 * Garantías:
 *  - Toda escritura usa requireSupabaseAuth (RLS aplica como user).
 *  - Creación/listado/revocación: restringidas por RLS de invitations al
 *    owner del business (o admin).
 *  - Aceptación: vía RPC SECURITY DEFINER accept_business_invitation que
 *    valida destinatario, expiración y estado pendiente.
 *  - Sin SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PortalInvitationRole =
  | "business_owner"
  | "editor"
  | "admin"
  | "concierge"
  | "traveler"
  | "super_admin";

export interface PortalInvitation {
  id: string;
  email: string;
  role: PortalInvitationRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitationPreview {
  found: boolean;
  status?: "pending" | "accepted" | "revoked" | "expired";
  expires_at?: string;
  accepted_at?: string | null;
  role?: PortalInvitationRole;
  scope_type?: string;
  business_id?: string;
  business_name?: string | null;
  email?: string;
}

function randomToken(): string {
  // 32 bytes hex — server-side, Worker crypto API.
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * listBusinessInvitations — Lista invitaciones de una empresa. RLS exige
 * owner del business (o admin) para SELECT.
 */
export const listBusinessInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => {
    if (!input || typeof input.businessId !== "string") {
      throw new Error("invalid_input");
    }
    return { businessId: input.businessId };
  })
  .handler(async ({ data, context }): Promise<PortalInvitation[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("invitations")
      .select(
        "id, email, role, status, token, expires_at, accepted_at, created_at",
      )
      .eq("scope_type", "business")
      .eq("scope_id", data.businessId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`list_invitations_failed: ${error.message}`);
    return (rows ?? []) as PortalInvitation[];
  });

/**
 * createBusinessInvitation — Crea una invitación pendiente. La RLS de
 * invitations exige que el caller tenga rol owner sobre el business.
 */
export const createBusinessInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      email: string;
      role?: PortalInvitationRole;
      ttlDays?: number;
    }) => {
      if (!input || typeof input.businessId !== "string")
        throw new Error("invalid_business");
      const email = String(input.email ?? "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("invalid_email");
      const role: PortalInvitationRole = input.role ?? "editor";
      const ttlDays = Math.min(Math.max(input.ttlDays ?? 7, 1), 30);
      return { businessId: input.businessId, email, role, ttlDays };
    },
  )
  .handler(async ({ data, context }): Promise<PortalInvitation> => {
    const { supabase, userId } = context;
    // Doble verificación server-side: el caller debe ser owner.
    const { data: allowed, error: aErr } = await supabase.rpc(
      "has_business_access",
      {
        _user_id: userId,
        _business_id: data.businessId,
        _min_role: "owner",
      },
    );
    if (aErr) throw new Error(`access_check_failed: ${aErr.message}`);
    if (!allowed) throw new Error("forbidden_not_owner");

    const expiresAt = new Date(
      Date.now() + data.ttlDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: inserted, error } = await supabase
      .from("invitations")
      .insert({
        email: data.email,
        role: data.role,
        scope_type: "business",
        scope_id: data.businessId,
        token: randomToken(),
        expires_at: expiresAt,
        status: "pending",
        invited_by: userId,
      })
      .select(
        "id, email, role, status, token, expires_at, accepted_at, created_at",
      )
      .single();
    if (error) throw new Error(`create_invitation_failed: ${error.message}`);
    return inserted as PortalInvitation;
  });

/**
 * revokeBusinessInvitation — Marca una invitación pendiente como revocada.
 * RLS exige owner del business.
 */
export const revokeBusinessInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { invitationId: string }) => {
    if (!input || typeof input.invitationId !== "string")
      throw new Error("invalid_input");
    return { invitationId: input.invitationId };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", data.invitationId)
      .eq("status", "pending");
    if (error) throw new Error(`revoke_invitation_failed: ${error.message}`);
    return { ok: true };
  });

/**
 * previewInvitation — Devuelve los datos básicos de una invitación al
 * destinatario actual. Si el caller no es el destinatario, responde
 * found:false (no se revela existencia).
 */
export const previewInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    if (!input || typeof input.token !== "string" || input.token.length < 16)
      throw new Error("invalid_token");
    return { token: input.token };
  })
  .handler(async ({ data, context }): Promise<InvitationPreview> => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc(
      "preview_business_invitation",
      { _token: data.token },
    );
    if (error) throw new Error(`preview_failed: ${error.message}`);
    return (res ?? { found: false }) as unknown as InvitationPreview;
  });

/**
 * acceptInvitation — Acepta la invitación dirigida al usuario actual
 * mediante RPC SECURITY DEFINER. Cubre:
 *  - destinatario previsto (email match);
 *  - estado pendiente (no reutilizable si ya aceptada/revocada);
 *  - expiración (marca expired y rechaza);
 *  - idempotencia de membresía vía ON CONFLICT.
 */
export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    if (!input || typeof input.token !== "string" || input.token.length < 16)
      throw new Error("invalid_token");
    return { token: input.token };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc(
      "accept_business_invitation",
      { _token: data.token },
    );
    if (error) {
      throw new Error(error.message ?? "accept_failed");
    }
    return res as { business_id: string; role: string };
  });