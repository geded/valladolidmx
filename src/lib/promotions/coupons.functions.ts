/**
 * coupons.functions.ts — Ola 2 · Cupón Digital Valladolid.mx.
 *
 * Emisión, listado y canje de cupones digitales.
 *
 * Reglas:
 *  - Sólo viajeros con `traveler_profiles.is_public = true` pueden emitir.
 *  - Un cupón activo por viajero por promoción (UNIQUE index).
 *  - Snapshot del título / descuento / vigencia al momento de emitir.
 *  - Vigencia = `promotions.ends_at` cuando existe, si no 30 días.
 *  - Canje sólo por staff del negocio (business_users) o admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CouponStatus = "active" | "redeemed" | "expired" | "revoked";

export interface TravelerCoupon {
  id: string;
  code: string;
  qr_token: string;
  promotion_slug: string;
  promotion_id: string | null;
  business_id: string | null;
  title: string;
  discount_percent: number | null;
  terms: string | null;
  valid_until: string;
  status: CouponStatus;
  redeemed_at: string | null;
  created_at: string;
  business_name?: string | null;
}

function generateCode(): string {
  // 10 chars legibles, sin ambigüedad: sin 0/O/1/I.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[bytes[i] % alphabet.length];
  return `VMX-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export const issueCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { promotion_slug: string }) => {
    const s = String(input?.promotion_slug ?? "").trim().toLowerCase();
    if (!s || s.length > 200) throw new Error("invalid_slug");
    return { promotion_slug: s };
  })
  .handler(async ({ data, context }): Promise<TravelerCoupon> => {
    // 1. Eligibilidad: perfil público al 100%.
    const { data: tp } = await context.supabase
      .from("traveler_profiles")
      .select("is_public")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!tp || !(tp as { is_public: boolean }).is_public) {
      throw new Error("profile_incomplete");
    }

    // 2. ¿Ya tiene uno activo? Devolverlo.
    const { data: existing } = await context.supabase
      .from("traveler_coupons")
      .select("*")
      .eq("user_id", context.userId)
      .eq("promotion_slug", data.promotion_slug)
      .neq("status", "revoked")
      .maybeSingle();
    if (existing) return existing as unknown as TravelerCoupon;

    // 3. Snapshot desde page_compositions + promotions.
    const { data: comp } = await context.supabase
      .from("page_compositions")
      .select("slug, title, kind, status")
      .eq("slug", data.promotion_slug)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("kind", "promotion" as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("status", "published" as any)
      .maybeSingle();
    if (!comp) throw new Error("promotion_not_found");

    const { data: promo } = await context.supabase
      .from("promotions")
      .select("id, business_id, discount_percent, terms, ends_at, title")
      .eq("slug", data.promotion_slug)
      .maybeSingle();

    const now = new Date();
    const validUntil = promo?.ends_at
      ? new Date(promo.ends_at as string)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (validUntil.getTime() <= now.getTime()) {
      throw new Error("promotion_expired");
    }

    // 4. Insert con reintento por colisión de code.
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = generateCode();
      const { data: inserted, error } = await context.supabase
        .from("traveler_coupons")
        .insert({
          user_id: context.userId,
          promotion_slug: data.promotion_slug,
          promotion_id: (promo?.id as string | undefined) ?? null,
          business_id: (promo?.business_id as string | undefined) ?? null,
          code,
          title:
            (promo?.title as string | undefined) ??
            (comp.title as string | undefined) ??
            data.promotion_slug,
          discount_percent:
            (promo?.discount_percent as number | undefined) ?? null,
          terms: (promo?.terms as string | undefined) ?? null,
          valid_until: validUntil.toISOString(),
        })
        .select("*")
        .single();
      if (!error && inserted) return inserted as unknown as TravelerCoupon;
      // 23505 = unique violation → reintento con nuevo code
      if (error && (error as { code?: string }).code === "23505") {
        // Puede ser code o (user_id, promotion_slug). Si es lo segundo,
        // recargar el existente.
        if ((error as { message?: string }).message?.includes("one_per_promo")) {
          const { data: again } = await context.supabase
            .from("traveler_coupons")
            .select("*")
            .eq("user_id", context.userId)
            .eq("promotion_slug", data.promotion_slug)
            .neq("status", "revoked")
            .maybeSingle();
          if (again) return again as unknown as TravelerCoupon;
        }
        continue;
      }
      throw new Error(`coupon_issue_failed: ${error?.message ?? "unknown"}`);
    }
    throw new Error("coupon_code_generation_failed");
  });

export const listMyCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelerCoupon[]> => {
    // Marca como 'expired' los que ya vencieron antes de leer.
    await context.supabase.rpc("expire_stale_coupons").throwOnError();
    const { data, error } = await context.supabase
      .from("traveler_coupons")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`list_my_coupons_failed: ${error.message}`);
    const rows = (data ?? []) as unknown as TravelerCoupon[];
    // Enriquecer nombre del negocio (best-effort).
    const businessIds = Array.from(
      new Set(rows.map((r) => r.business_id).filter((x): x is string => !!x)),
    );
    if (businessIds.length) {
      const { data: bs } = await context.supabase
        .from("businesses")
        .select("id, display_name")
        .in("id", businessIds);
      const nameMap = new Map(
        ((bs ?? []) as { id: string; display_name: string }[]).map((b) => [
          b.id,
          b.display_name,
        ]),
      );
      for (const r of rows) {
        r.business_name = r.business_id ? nameMap.get(r.business_id) ?? null : null;
      }
    }
    return rows;
  });

export interface CouponLookupResult {
  coupon: TravelerCoupon | null;
  reason?: "not_found" | "not_your_business" | "already_redeemed" | "expired";
  traveler_display_name?: string | null;
}

export const lookupCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; business_id: string }) => {
    const key = String(input?.key ?? "").trim();
    const business_id = String(input?.business_id ?? "").trim();
    if (!key || !business_id) throw new Error("invalid_input");
    return { key, business_id };
  })
  .handler(async ({ data, context }): Promise<CouponLookupResult> => {
    // Aceptar code o qr_token (uuid).
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.key,
      );
    const col = isUuid ? "qr_token" : "code";
    const value = isUuid ? data.key : data.key.toUpperCase();

    const { data: row } = await context.supabase
      .from("traveler_coupons")
      .select("*")
      .eq(col, value)
      .maybeSingle();
    if (!row) return { coupon: null, reason: "not_found" };
    const coupon = row as unknown as TravelerCoupon;
    if (coupon.business_id !== data.business_id) {
      return { coupon: null, reason: "not_your_business" };
    }
    if (coupon.status === "redeemed") return { coupon, reason: "already_redeemed" };
    if (coupon.status === "expired" || new Date(coupon.valid_until) < new Date()) {
      return { coupon, reason: "expired" };
    }
    // Nombre del viajero (best-effort).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("display_name, first_name, last_name")
      .eq("user_id", (row as { user_id: string }).user_id)
      .maybeSingle();
    const p = (prof ?? {}) as Record<string, string | null>;
    const name =
      [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
      p.display_name ||
      null;
    return { coupon, traveler_display_name: name };
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { coupon_id: string; channel: "qr" | "code" }) => {
    const coupon_id = String(input?.coupon_id ?? "").trim();
    if (!coupon_id) throw new Error("invalid_coupon");
    return {
      coupon_id,
      channel: input.channel === "qr" ? ("qr" as const) : ("code" as const),
    };
  })
  .handler(async ({ data, context }): Promise<TravelerCoupon> => {
    const { data: row, error } = await context.supabase
      .from("traveler_coupons")
      .update({
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
        redeemed_by: context.userId,
        redeemed_channel: data.channel,
      })
      .eq("id", data.coupon_id)
      .eq("status", "active")
      .select("*")
      .single();
    if (error || !row) {
      throw new Error(`coupon_redeem_failed: ${error?.message ?? "not_active"}`);
    }
    return row as unknown as TravelerCoupon;
  });