/**
 * E-PS · US-EPS.3 v2 — Convertirse en anfitrión
 *
 * Server fns que orquestan reclamos, alta propia y aprobaciones.
 * Todos los procesos privilegiados son SECURITY DEFINER en la BD:
 * aquí sólo envolvemos, validamos y proyectamos columnas seguras.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface BusinessSearchHit {
  id: string;
  slug: string;
  display_name: string;
  destination_id: string;
  destination_name: string | null;
  has_owner: boolean;
  has_pending_claim: boolean;
}

export const searchBusinessesForClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { q: string }) => ({
    q: z.string().trim().min(2).max(120).parse(data?.q),
  }))
  .handler(async ({ data, context }): Promise<BusinessSearchHit[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, destination_id, destinations!inner(name), business_users(user_id, role, status), business_ownership_transfers(status)",
      )
      .ilike("display_name", `%${data.q}%`)
      .is("deleted_at", null)
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      display_name: r.display_name,
      destination_id: r.destination_id,
      destination_name: r.destinations?.name ?? null,
      has_owner: (r.business_users ?? []).some(
        (m: any) => m.role === "owner" && m.status === "active",
      ),
      has_pending_claim: (r.business_ownership_transfers ?? []).some(
        (t: any) => t.status === "pending",
      ),
    }));
  });

export const claimBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { business_id: string; notes?: string }) => ({
    business_id: z.string().uuid().parse(data?.business_id),
    notes: data?.notes ? z.string().max(500).parse(data.notes) : null,
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("claim_business", {
      _business_id: data.business_id,
      _notes: data.notes,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createOwnedBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      display_name: string;
      destination_id: string;
      primary_category_id?: string | null;
      tagline?: string | null;
      description?: string | null;
    }) => ({
      display_name: z.string().trim().min(2).max(120).parse(data?.display_name),
      destination_id: z.string().uuid().parse(data?.destination_id),
      primary_category_id: data?.primary_category_id
        ? z.string().uuid().parse(data.primary_category_id)
        : null,
      tagline: data?.tagline
        ? z.string().trim().max(160).parse(data.tagline)
        : null,
      description: data?.description
        ? z.string().trim().max(2000).parse(data.description)
        : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: businessId, error } = await context.supabase.rpc(
      "create_owned_business",
      {
        _display_name: data.display_name,
        _destination_id: data.destination_id,
        _primary_category_id: data.primary_category_id,
        _tagline: data.tagline,
        _description: data.description,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { business_id: businessId as string };
  });

export interface PendingRequestRow {
  kind: "claim" | "registration";
  ref_id: string;
  business_id: string;
  business_name: string;
  destination_id: string;
  requester_id: string;
  requester_email: string | null;
  requester_name: string | null;
  notes: string | null;
  created_at: string;
}

export const listPendingBusinessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingRequestRow[]> => {
    const { data, error } = await context.supabase.rpc(
      "list_pending_business_requests",
    );
    if (error) throw new Error(error.message);
    return (data as PendingRequestRow[]) ?? [];
  });

export const approveOwnershipClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { transfer_id: string; approve: boolean; notes?: string }) => ({
      transfer_id: z.string().uuid().parse(data?.transfer_id),
      approve: z.boolean().parse(data?.approve),
      notes: data?.notes ? z.string().max(500).parse(data.notes) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("approve_ownership_claim", {
      _transfer_id: data.transfer_id,
      _approve: data.approve,
      _notes: data.notes,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveBusinessRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { business_id: string; approve: boolean; notes?: string }) => ({
      business_id: z.string().uuid().parse(data?.business_id),
      approve: z.boolean().parse(data?.approve),
      notes: data?.notes ? z.string().max(500).parse(data.notes) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "approve_business_registration",
      {
        _business_id: data.business_id,
        _approve: data.approve,
        _notes: data.notes,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPublicDestinations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ id: string; name: string; slug: string }[]> => {
      const { data, error } = await context.supabase
        .from("destinations")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      if (error) throw new Error(error.message);
      return (data as { id: string; name: string; slug: string }[]) ?? [];
    },
  );