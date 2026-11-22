/**
 * Entrenamiento de Alux (Fase 4 del CRM, solo administradores):
 * ficha oficial por destino (Base de conocimiento, categoría «destinos»)
 * y preguntas que Alux no supo contestar.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  destinationBriefSlug,
  type GapChannel,
  type GapReason,
  type GapStatus,
} from "./knowledge-gaps";

async function assertAdmin(context: {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown }> };
  userId: string;
}) {
  const [a, s] = await Promise.all([
    context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "admin" } as never,
    ),
    context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "super_admin" } as never,
    ),
  ]);
  if (a.data !== true && s.data !== true) throw new Error("forbidden");
}

export interface DestinationBriefRow {
  readonly destinationId: string;
  readonly slug: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly highlights: string[];
  readonly openGaps: number;
  readonly brief: {
    readonly id: string;
    readonly title: string;
    readonly summary: string | null;
    readonly body: string;
    readonly tags: string[];
    readonly status: string;
    readonly updatedAt: string;
  } | null;
}

export interface KnowledgeGapRow {
  readonly id: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly channel: GapChannel;
  readonly destinationSlug: string | null;
  readonly question: string;
  readonly reason: GapReason;
  readonly occurrences: number;
  readonly status: GapStatus;
}

export const listDestinationBriefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DestinationBriefRow[]> => {
    await assertAdmin(context as never);
    const sb = context.supabase;
    const [dest, entries, gaps] = await Promise.all([
      sb
        .from("destinations")
        .select("id, slug, name, tagline, highlights")
        .eq("status", "published")
        .is("deleted_at", null)
        .order("name"),
      sb
        .from("alux_knowledge_entries")
        .select("id, slug, title, summary, body, tags, status, updated_at")
        .like("slug", "destino-%")
        .limit(500),
      sb.from("alux_knowledge_gaps").select("destination_slug").eq("status", "abierta").limit(5000),
    ]);
    if (dest.error) throw new Error(dest.error.message);
    if (entries.error) throw new Error(entries.error.message);
    const bySlug = new Map((entries.data ?? []).map((e) => [e.slug, e]));
    const gapCount = new Map<string, number>();
    for (const g of gaps.data ?? []) {
      if (g.destination_slug)
        gapCount.set(g.destination_slug, (gapCount.get(g.destination_slug) ?? 0) + 1);
    }
    return (dest.data ?? []).map((d) => {
      const slug = String(d.slug);
      const e = bySlug.get(destinationBriefSlug(slug));
      return {
        destinationId: d.id,
        slug,
        name: d.name,
        tagline: d.tagline ?? null,
        highlights: (d.highlights as string[] | null) ?? [],
        openGaps: gapCount.get(slug) ?? 0,
        brief: e
          ? {
              id: e.id,
              title: e.title,
              summary: e.summary ?? null,
              body: e.body,
              tags: (e.tags as string[] | null) ?? [],
              status: String(e.status),
              updatedAt: e.updated_at,
            }
          : null,
      };
    });
  });

export const listKnowledgeGaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["abierta", "resuelta", "ignorada"]).default("abierta") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<KnowledgeGapRow[]> => {
    await assertAdmin(context as never);
    const { data: rows, error } = await context.supabase
      .from("alux_knowledge_gaps")
      .select(
        "id, created_at, last_seen_at, channel, destination_slug, question, reason, occurrences, status",
      )
      .eq("status", data.status)
      .order("occurrences", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      channel: r.channel as GapChannel,
      destinationSlug: r.destination_slug,
      question: r.question,
      reason: r.reason as GapReason,
      occurrences: r.occurrences,
      status: r.status as GapStatus,
    }));
  });

export const updateKnowledgeGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["abierta", "resuelta", "ignorada"]),
        knowledgeEntryId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const done = data.status !== "abierta";
    const { error } = await context.supabase
      .from("alux_knowledge_gaps")
      .update({
        status: data.status,
        resolved_at: done ? new Date().toISOString() : null,
        resolved_by: done ? context.userId : null,
        ...(data.knowledgeEntryId !== undefined
          ? { knowledge_entry_id: data.knowledgeEntryId }
          : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
