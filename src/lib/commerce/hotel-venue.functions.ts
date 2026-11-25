/**
 * Restaurante del hotel · funciones de servidor (Portal).
 *
 * Todo se resuelve con RPC que ya validan el acceso: `business_venue_link_add`
 * exige acceso de edición a los DOS negocios (o rol editor/administrador), así
 * un hotel no puede apropiarse del restaurante de otro.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LinkedBusiness, VenueCandidate } from "@/lib/commerce/hotel-venue";

type Loose = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const uuid = z.string().uuid();

const unwrap = <T,>(res: { data: unknown; error: { message: string } | null }, fallback: T): T => {
  if (res.error) throw new Error(res.error.message);
  const value = res.data as T & { error?: string };
  if (value && typeof value === "object" && "error" in value && value.error) throw new Error(value.error);
  return value ?? fallback;
};

export const listVenueLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => z.object({ businessId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    const view = unwrap<{ can_manage?: boolean; venues?: LinkedBusiness[]; hosts?: LinkedBusiness[] }>(
      await sb.rpc("business_venue_links_view", { _business_id: data.businessId }),
      {},
    );
    return {
      canManage: view.can_manage === true,
      venues: view.venues ?? [],
      hosts: view.hosts ?? [],
    };
  });

export const searchVenueCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { term?: string }) => z.object({ term: z.string().max(80).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    const rows = unwrap<VenueCandidate[]>(
      await sb.rpc("business_venue_candidates", { _term: data.term ?? "" }),
      [],
    );
    return Array.isArray(rows) ? rows : [];
  });

export const linkVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { hostBusinessId: string; venueBusinessId: string }) =>
    z.object({ hostBusinessId: uuid, venueBusinessId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    unwrap(await sb.rpc("business_venue_link_add", { _host: data.hostBusinessId, _venue: data.venueBusinessId }), {});
    return { ok: true as const };
  });

export const unlinkVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { linkId: string }) => z.object({ linkId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    unwrap(await sb.rpc("business_venue_link_remove", { _link_id: data.linkId }), {});
    return { ok: true as const };
  });
