/**
 * portal/portal-product-faqs.functions.ts — Sub-ola 2.4a · Fase B.
 *
 * FAQs de producto gestionables por el equipo editor de la empresa dueña
 * sin ampliar la RLS de `faqs`. Todas las escrituras van por RPCs
 * SECURITY DEFINER (`create/update/delete/reorder_business_product_faq`)
 * que validan `has_business_access('editor')` y auditan en
 * `content_audit_log`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PortalProductFaq = {
  id: string;
  question: string;
  answer: string;
  position: number;
  status: "draft" | "in_review" | "approved" | "published" | "archived";
};

export const listPortalProductFaqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalProductFaq[]> => {
    const { supabase, userId } = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = supabase.rpc as any;
    const { data: prod } = await supabase
      .from("products")
      .select("business_id")
      .eq("id", data.productId)
      .maybeSingle();
    if (!prod) throw new Error("product_not_found");
    const { data: ok } = await rpc("has_business_access", {
      _user_id: userId,
      _business_id: prod.business_id,
      _min_role: "viewer",
    });
    if (!ok) throw new Error("forbidden");
    const { data: rows, error } = await supabase
      .from("faqs")
      .select("id, question, answer, position, status")
      .eq("entity_kind", "product")
      .eq("entity_id", data.productId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PortalProductFaq[];
  });

export const createPortalProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      productId: string;
      question: string;
      answer: string;
      publish?: boolean;
    }) => {
      if (!data?.productId) throw new Error("productId required");
      if (!data.question?.trim() || data.question.length > 300)
        throw new Error("invalid_question");
      if (!data.answer?.trim() || data.answer.length > 4000)
        throw new Error("invalid_answer");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: id, error } = await (context.supabase.rpc as any)(
      "create_business_product_faq",
      {
        _product_id: data.productId,
        _question: data.question,
        _answer: data.answer,
        _position: null,
        _publish: data.publish ?? true,
      },
    );
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updatePortalProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      faqId: string;
      question?: string | null;
      answer?: string | null;
      publish?: boolean | null;
    }) => {
      if (!data?.faqId) throw new Error("faqId required");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.rpc as any)(
      "update_business_product_faq",
      {
        _faq_id: data.faqId,
        _question: data.question ?? null,
        _answer: data.answer ?? null,
        _publish: data.publish ?? null,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePortalProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { faqId: string }) => {
    if (!data?.faqId) throw new Error("faqId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.rpc as any)(
      "delete_business_product_faq",
      { _faq_id: data.faqId },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderPortalProductFaqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string; orderedIds: string[] }) => {
    if (!data?.productId) throw new Error("productId required");
    if (!Array.isArray(data.orderedIds)) throw new Error("invalid_order");
    return data;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.rpc as any)(
      "reorder_business_product_faqs",
      { _product_id: data.productId, _ordered_ids: data.orderedIds },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });