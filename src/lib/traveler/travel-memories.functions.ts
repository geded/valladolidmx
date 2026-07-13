import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TravelMemory = {
  id: string;
  plan_id: string | null;
  order_id: string | null;
  item_id: string | null;
  title: string | null;
  body: string;
  photo_url: string | null;
  rating: number | null;
  created_at: string;
};

export const listMyMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelMemory[]> => {
    const { data, error } = await context.supabase
      .from("travel_memories")
      .select("id, plan_id, order_id, item_id, title, body, photo_url, rating, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TravelMemory[];
  });

const createSchema = z.object({
  planId: z.string().uuid().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  itemId: z.string().uuid().nullable().optional(),
  title: z.string().trim().max(120).nullable().optional(),
  body: z.string().trim().min(1).max(4000),
  photoUrl: z.string().url().max(2000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export const createMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createSchema.parse(raw))
  .handler(async ({ data, context }): Promise<TravelMemory> => {
    const { data: row, error } = await context.supabase
      .from("travel_memories")
      .insert({
        user_id: context.userId,
        plan_id: data.planId ?? null,
        order_id: data.orderId ?? null,
        item_id: data.itemId ?? null,
        title: data.title ?? null,
        body: data.body,
        photo_url: data.photoUrl ?? null,
        rating: data.rating ?? null,
      })
      .select("id, plan_id, order_id, item_id, title, body, photo_url, rating, created_at")
      .single();
    if (error) throw error;
    return row as TravelMemory;
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("travel_memories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true as const };
  });