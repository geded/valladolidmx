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

export interface BusinessSearchResult {
  rows: BusinessSearchHit[];
  total: number;
  page: number;
  page_size: number;
}

export const searchBusinessesForClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      q?: string;
      destination_id?: string | null;
      category_id?: string | null;
      page?: number;
      page_size?: number;
    }) => ({
      q: z.string().trim().max(120).parse(data?.q ?? ""),
      destination_id: data?.destination_id
        ? z.string().uuid().parse(data.destination_id)
        : null,
      category_id: data?.category_id
        ? z.string().uuid().parse(data.category_id)
        : null,
      page: z.number().int().min(1).max(500).parse(data?.page ?? 1),
      page_size: z.number().int().min(1).max(50).parse(data?.page_size ?? 10),
    }),
  )
  .handler(async ({ data, context }): Promise<BusinessSearchResult> => {
    const { supabase } = context;
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;

    // If filtering by category, first resolve matching business ids.
    let idFilter: string[] | null = null;
    if (data.category_id) {
      const { data: links, error: linkErr } = await supabase
        .from("business_category_links")
        .select("business_id")
        .eq("category_id", data.category_id);
      if (linkErr) throw new Error(linkErr.message);
      idFilter = (links ?? []).map((l: any) => l.business_id);
      if (idFilter.length === 0) {
        return { rows: [], total: 0, page: data.page, page_size: data.page_size };
      }
    }

    let query = supabase
      .from("businesses")
      .select(
        "id, slug, display_name, destination_id, destinations!inner(name), business_users(user_id, role, status), business_ownership_transfers(status)",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .range(from, to);

    if (data.q.length >= 2) query = query.ilike("display_name", `%${data.q}%`);
    if (data.destination_id) query = query.eq("destination_id", data.destination_id);
    if (idFilter) query = query.in("id", idFilter);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return {
      rows: (rows ?? []).map((r: any) => ({
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
      })),
      total: count ?? 0,
      page: data.page,
      page_size: data.page_size,
    };
  });

export const listBusinessCategoriesForClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ id: string; name: string; slug: string }[]> => {
      const { data, error } = await context.supabase
        .from("business_categories")
        .select("id, name, slug")
        .is("deleted_at", null)
        .eq("status", "published")
        .order("sort_order")
        .order("name");
      if (error) throw new Error(error.message);
      return (data as { id: string; name: string; slug: string }[]) ?? [];
    },
  );

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
      address_line1?: string | null;
      address_line2?: string | null;
      postal_code?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      email?: string | null;
      website?: string | null;
      verification_document_url: string;
    }) => ({
      display_name: z.string().trim().min(2).max(120).parse(data?.display_name),
      destination_id: z.string().uuid().parse(data?.destination_id),
      primary_category_id: data?.primary_category_id
        ? z.string().uuid().parse(data.primary_category_id)
        : null,
      tagline: data?.tagline
        ? z.string().trim().max(160).parse(data.tagline)
        : null,
      description: z.string().trim().min(80).max(2000).parse(data?.description ?? ""),
      address_line1: data?.address_line1
        ? z.string().trim().max(200).parse(data.address_line1)
        : null,
      address_line2: data?.address_line2
        ? z.string().trim().max(200).parse(data.address_line2)
        : null,
      postal_code: data?.postal_code
        ? z.string().trim().max(20).parse(data.postal_code)
        : null,
      phone: data?.phone ? z.string().trim().max(40).parse(data.phone) : null,
      whatsapp: data?.whatsapp ? z.string().trim().max(40).parse(data.whatsapp) : null,
      email: data?.email ? z.string().trim().email().max(200).parse(data.email) : null,
      website: data?.website ? z.string().trim().url().max(300).parse(data.website) : null,
      verification_document_url: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .parse(data?.verification_document_url),
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
        _address_line1: data.address_line1,
        _address_line2: data.address_line2,
        _postal_code: data.postal_code,
        _phone: data.phone,
        _whatsapp: data.whatsapp,
        _email: data.email,
        _website: data.website,
        _verification_document_url: data.verification_document_url,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { business_id: businessId as string };
  });

export interface PendingRequestRow {
  kind: "claim" | "registration" | "publication";
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

/* ── Puerta 2: publicación ─────────────────────────────────────── */

export const submitBusinessForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { business_id: string }) => ({
    business_id: z.string().uuid().parse(data?.business_id),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "submit_business_for_review",
      { _business_id: data.business_id } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { business_id: string; approve: boolean; notes?: string }) => ({
      business_id: z.string().uuid().parse(data?.business_id),
      approve: z.boolean().parse(data?.approve),
      notes: data?.notes ? z.string().max(500).parse(data.notes) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("publish_business", {
      _business_id: data.business_id,
      _approve: data.approve,
      _notes: data.notes,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Documento de verificación (admin) ─────────────────────────── */

export const getVerificationDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { business_id: string }) => ({
    business_id: z.string().uuid().parse(data?.business_id),
  }))
  .handler(async ({ data, context }): Promise<{ url: string | null }> => {
    const { supabase } = context;
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("verification_document_url")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!biz?.verification_document_url) return { url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("business-verification")
      .createSignedUrl(biz.verification_document_url, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

/* ── Mis empresas + checklist de publicación ───────────────────── */

export interface MyBusinessRow {
  id: string;
  display_name: string;
  slug: string;
  status: string;
  destination_name: string | null;
  review_notes: string | null;
  submitted_for_review_at: string | null;
}

export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyBusinessRow[]> => {
    const { supabase, userId } = context;
    const { data: memberships, error: mErr } = await supabase
      .from("business_users")
      .select("business_id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .in("status", ["pending", "active"]);
    if (mErr) throw new Error(mErr.message);
    const ids = (memberships ?? []).map((m: any) => m.business_id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, display_name, slug, status, review_notes, submitted_for_review_at, destinations(name)",
      )
      .in("id", ids)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((b: any) => ({
      id: b.id,
      display_name: b.display_name,
      slug: b.slug,
      status: b.status,
      destination_name: b.destinations?.name ?? null,
      review_notes: b.review_notes,
      submitted_for_review_at: b.submitted_for_review_at,
    }));
  });

export interface PublishChecklist {
  business_id: string;
  display_name: string;
  status: string;
  review_notes: string | null;
  submitted_for_review_at: string | null;
  checks: {
    logo: boolean;
    cover: boolean;
    gallery_count: number;
    description: boolean;
    category: boolean;
    location: boolean;
    contact: boolean;
  };
  ready: boolean;
}

export const getBusinessPublishChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { business_id: string }) => ({
    business_id: z.string().uuid().parse(data?.business_id),
  }))
  .handler(async ({ data, context }): Promise<PublishChecklist> => {
    const { supabase } = context;
    const { data: b, error } = await supabase
      .from("businesses")
      .select(
        "id, display_name, status, review_notes, submitted_for_review_at, logo_media_id, cover_media_id, description, primary_category_id",
      )
      .eq("id", data.business_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!b) throw new Error("business_not_found");
    const [{ count: galleryCount }, { count: locationCount }, { count: contactCount }] =
      await Promise.all([
        supabase
          .from("business_media")
          .select("id", { count: "exact", head: true })
          .eq("business_id", data.business_id),
        supabase
          .from("business_locations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", data.business_id)
          .is("deleted_at", null),
        supabase
          .from("business_contacts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", data.business_id)
          .is("deleted_at", null),
      ]);
    const checks = {
      logo: !!b.logo_media_id,
      cover: !!b.cover_media_id,
      gallery_count: galleryCount ?? 0,
      description: !!(b.description && b.description.trim().length >= 80),
      category: !!b.primary_category_id,
      location: (locationCount ?? 0) > 0,
      contact: (contactCount ?? 0) > 0,
    };
    const ready =
      checks.logo &&
      checks.cover &&
      checks.gallery_count >= 3 &&
      checks.description &&
      checks.category &&
      checks.location &&
      checks.contact;
    return {
      business_id: b.id,
      display_name: b.display_name,
      status: b.status,
      review_notes: b.review_notes,
      submitted_for_review_at: b.submitted_for_review_at,
      checks,
      ready,
    };
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