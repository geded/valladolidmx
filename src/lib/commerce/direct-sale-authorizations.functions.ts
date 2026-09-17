/**
 * commerce/direct-sale-authorizations.functions.ts
 *
 * Paso 2 del plan "Experiencias: la sección que vende en línea".
 *
 * Solicitud de la empresa · autorización de Administración · comisión ·
 * historial de decisiones. Fuente única: `product_direct_sale_requests`
 * (una fila por solicitud/decisión) + `products.direct_sale_enabled`.
 *
 * Toda escritura pasa por los RPC SECURITY DEFINER que validan rol:
 * la empresa sólo solicita/retira; sólo admin/super_admin decide o revoca.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DirectSaleRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "revoked";

export interface DirectSaleRequestRow {
  id: string;
  product_id: string;
  business_id: string;
  status: DirectSaleRequestStatus;
  requested_at: string;
  request_note: string | null;
  proposed_price_amount: number | null;
  currency: string;
  decided_at: string | null;
  decision_note: string | null;
  commission_bps: number | null;
  product_name: string | null;
  product_type: string | null;
  business_name: string | null;
  direct_sale_enabled: boolean;
}

type RawRow = Record<string, unknown>;

function mapRow(r: RawRow): DirectSaleRequestRow {
  const product = (r.product as RawRow | null) ?? null;
  const business = (r.business as RawRow | null) ?? null;
  return {
    id: r.id as string,
    product_id: r.product_id as string,
    business_id: r.business_id as string,
    status: r.status as DirectSaleRequestStatus,
    requested_at: r.requested_at as string,
    request_note: (r.request_note as string | null) ?? null,
    proposed_price_amount: (r.proposed_price_amount as number | null) ?? null,
    currency: (r.currency as string) ?? "MXN",
    decided_at: (r.decided_at as string | null) ?? null,
    decision_note: (r.decision_note as string | null) ?? null,
    commission_bps: (r.commission_bps as number | null) ?? null,
    product_name: product ? ((product.name as string | null) ?? null) : null,
    product_type: product ? ((product.product_type as string | null) ?? null) : null,
    business_name: business
      ? ((business.display_name as string | null) ?? (business.legal_name as string | null))
      : null,
    direct_sale_enabled: product ? Boolean(product.direct_sale_enabled) : false,
  };
}

const SELECT_SHAPE = `
  id, product_id, business_id, status, requested_at, request_note,
  proposed_price_amount, currency, decided_at, decision_note, commission_bps,
  product:products(name, product_type, direct_sale_enabled),
  business:businesses(display_name, legal_name)
`;

// ------------------------ lectura ------------------------

const ListInput = z
  .object({
    status: z
      .enum(["all", "pending", "approved", "rejected", "cancelled", "revoked"])
      .default("all"),
    businessId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .default({ status: "all", limit: 100 });

/**
 * Lista solicitudes visibles para quien consulta.
 * RLS decide el alcance: la empresa ve las suyas, el personal ve todas.
 */
export const listDirectSaleRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => ListInput.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<DirectSaleRequestRow[]> => {
    let query = context.supabase
      .from("product_direct_sale_requests")
      .select(SELECT_SHAPE)
      .order("requested_at", { ascending: false })
      .limit(data.limit);

    if (data.status !== "all") query = query.eq("status", data.status);
    if (data.businessId) query = query.eq("business_id", data.businessId);
    if (data.productId) query = query.eq("product_id", data.productId);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as RawRow[]).map(mapRow);
  });

// ------------------------ empresa ------------------------

export const submitDirectSaleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        productId: z.string().uuid(),
        note: z.string().trim().max(600).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ requestId: string }> => {
    const { data: id, error } = await context.supabase.rpc(
      "product_direct_sale_request_submit",
      { _product_id: data.productId, _note: data.note ?? undefined },
    );
    if (error) throw new Error(error.message);
    return { requestId: id as unknown as string };
  });

export const cancelDirectSaleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        requestId: z.string().uuid(),
        note: z.string().trim().max(600).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("product_direct_sale_request_cancel", {
      _request_id: data.requestId,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------ Administración ------------------------

export const decideDirectSaleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        requestId: z.string().uuid(),
        approve: z.boolean(),
        commissionBps: z.number().int().min(0).max(10000).nullable().optional(),
        note: z.string().trim().max(600).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("product_direct_sale_request_decide", {
      _request_id: data.requestId,
      _approve: data.approve,
      _commission_bps: data.approve ? (data.commissionBps ?? undefined) : undefined,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeDirectSaleAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        productId: z.string().uuid(),
        note: z.string().trim().max(600).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("product_direct_sale_revoke", {
      _product_id: data.productId,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------ etiquetas ------------------------

export const DIRECT_SALE_REQUEST_LABEL: Record<DirectSaleRequestStatus, string> = {
  pending: "En revisión",
  approved: "Autorizada",
  rejected: "No autorizada",
  cancelled: "Retirada por la empresa",
  revoked: "Autorización retirada",
};
