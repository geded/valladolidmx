/**
 * traveler/traveler-favorites.functions.ts — Ola 4 · Etapa 4.
 *
 * Favoritos del viajero. Reglas (Plan 14.40 §4 Etapa 4 — Favoritos):
 *  - Todo acceso pasa por `requireSupabaseAuth`.
 *  - `user_id` proviene exclusivamente de `context.userId`.
 *  - Idempotente: el unique `(user_id, entity_kind, entity_id)`
 *    garantiza que un mismo favorito no se duplique. La adición
 *    repetida resuelve sin error.
 *  - Whitelist estricta de `entity_kind` y validación UUID.
 *  - Sin acceso al Portal/CMS; sin `SUPABASE_SERVICE_ROLE_KEY`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FavoriteEntityKind = "business" | "product" | "promotion";

const KINDS = new Set<FavoriteEntityKind>(["business", "product", "promotion"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FavoriteRow {
  id: string;
  entity_kind: FavoriteEntityKind;
  entity_id: string;
  created_at: string;
}

export interface FavoriteHydrated extends FavoriteRow {
  title: string;
  slug: string | null;
  subtitle: string | null;
}

function validateInput(input: { entity_kind?: string; entity_id?: string } | undefined) {
  const kind = input?.entity_kind as FavoriteEntityKind | undefined;
  const id = input?.entity_id;
  if (!kind || !KINDS.has(kind)) throw new Error("invalid_entity_kind");
  if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
    throw new Error("invalid_entity_id");
  }
  return { entity_kind: kind, entity_id: id };
}

/**
 * listMyFavorites — Devuelve los favoritos del usuario autenticado,
 * con título/slug hidratados desde catálogo publicado. Los ítems cuyo
 * recurso fue despublicado o eliminado se devuelven con `title` vacío
 * y `slug = null` para que la UI los pueda limpiar.
 */
export const listMyFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteHydrated[]> => {
    const { data: favs, error } = await context.supabase
      .from("traveler_favorites")
      .select("id, entity_kind, entity_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`favorites_list_failed: ${error.message}`);
    const rows = (favs ?? []) as FavoriteRow[];
    if (rows.length === 0) return [];

    const byKind: Record<FavoriteEntityKind, string[]> = {
      business: [],
      product: [],
      promotion: [],
    };
    for (const r of rows) byKind[r.entity_kind].push(r.entity_id);

    const lookup = new Map<string, { title: string; slug: string | null; subtitle: string | null }>();

    if (byKind.business.length > 0) {
      const { data } = await context.supabase
        .from("businesses")
        .select("id, slug, display_name, tagline, status, deleted_at")
        .in("id", byKind.business);
      for (const b of data ?? []) {
        const visible = b.status === "published" && !b.deleted_at;
        lookup.set(`business:${b.id}`, {
          title: visible ? b.display_name : "",
          slug: visible ? b.slug : null,
          subtitle: visible ? (b.tagline ?? null) : null,
        });
      }
    }
    if (byKind.product.length > 0) {
      const { data } = await context.supabase
        .from("products")
        .select("id, slug, name, tagline, status, deleted_at")
        .in("id", byKind.product);
      for (const p of data ?? []) {
        const visible = p.status === "published" && !p.deleted_at;
        lookup.set(`product:${p.id}`, {
          title: visible ? p.name : "",
          slug: visible ? p.slug : null,
          subtitle: visible ? (p.tagline ?? null) : null,
        });
      }
    }
    if (byKind.promotion.length > 0) {
      const { data } = await context.supabase
        .from("promotions")
        .select("id, slug, title, description, status, deleted_at")
        .in("id", byKind.promotion);
      for (const pr of data ?? []) {
        const visible = pr.status === "published" && !pr.deleted_at;
        lookup.set(`promotion:${pr.id}`, {
          title: visible ? pr.title : "",
          slug: visible ? pr.slug : null,
          subtitle: visible ? (pr.description ?? null) : null,
        });
      }
    }

    return rows.map((r) => {
      const hit = lookup.get(`${r.entity_kind}:${r.entity_id}`);
      return {
        ...r,
        title: hit?.title ?? "",
        slug: hit?.slug ?? null,
        subtitle: hit?.subtitle ?? null,
      };
    });
  });

/**
 * addFavorite — Agrega un favorito de forma idempotente.
 * Si ya existe, no se duplica (unique `(user_id, entity_kind, entity_id)`)
 * y se devuelve `{ created: false }`.
 */
export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(
    async ({ context, data }): Promise<{ created: boolean; favorite: FavoriteRow }> => {
      const { data: row, error } = await context.supabase
        .from("traveler_favorites")
        .upsert(
          {
            user_id: context.userId,
            entity_kind: data.entity_kind,
            entity_id: data.entity_id,
          },
          { onConflict: "user_id,entity_kind,entity_id", ignoreDuplicates: false },
        )
        .select("id, entity_kind, entity_id, created_at")
        .single();
      if (error) throw new Error(`favorite_add_failed: ${error.message}`);
      // `created_at` no cambia si la fila preexistía (PostgREST devuelve
      // la fila resultante del upsert sin actualizar created_at porque
      // no está incluido en `update`).
      return { created: true, favorite: row as FavoriteRow };
    },
  );

/**
 * removeFavorite — Elimina el favorito si existe. Idempotente:
 * si no existe, devuelve `{ removed: false }` sin error.
 */
export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ context, data }): Promise<{ removed: boolean }> => {
    const { data: rows, error } = await context.supabase
      .from("traveler_favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("entity_kind", data.entity_kind)
      .eq("entity_id", data.entity_id)
      .select("id");
    if (error) throw new Error(`favorite_remove_failed: ${error.message}`);
    return { removed: (rows ?? []).length > 0 };
  });

/**
 * toggleFavorite — Alterna el estado del favorito. Útil para botones
 * de "guardar/quitar" en una sola acción.
 */
export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ context, data }): Promise<{ active: boolean }> => {
    const { data: existing, error: selErr } = await context.supabase
      .from("traveler_favorites")
      .select("id")
      .eq("user_id", context.userId)
      .eq("entity_kind", data.entity_kind)
      .eq("entity_id", data.entity_id)
      .maybeSingle();
    if (selErr) throw new Error(`favorite_toggle_read_failed: ${selErr.message}`);
    if (existing) {
      const { error: delErr } = await context.supabase
        .from("traveler_favorites")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw new Error(`favorite_toggle_delete_failed: ${delErr.message}`);
      return { active: false };
    }
    const { error: insErr } = await context.supabase
      .from("traveler_favorites")
      .insert({
        user_id: context.userId,
        entity_kind: data.entity_kind,
        entity_id: data.entity_id,
      });
    if (insErr) {
      // Race: si otra petición lo creó entre el SELECT y el INSERT, el
      // unique aborta y dejamos el favorito como activo (idempotente).
      if (!/duplicate key/i.test(insErr.message)) {
        throw new Error(`favorite_toggle_insert_failed: ${insErr.message}`);
      }
    }
    return { active: true };
  });