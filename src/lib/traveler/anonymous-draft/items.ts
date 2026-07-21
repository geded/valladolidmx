import type { AnonymousItemKind, AnonymousTravelDraft } from "./contract";

export interface AnonymousTravelDisplayItem {
  kind: AnonymousItemKind;
  targetId: string | null;
  title?: string;
  slug?: string;
  imageUrl?: string;
  subtitle?: string;
  notes?: string;
  addedAt: number;
}

/**
 * Proyección visible única del viaje local. Un favorito que ya forma parte
 * del itinerario aparece una sola vez, tanto en la página como en el dock.
 */
export function selectAnonymousTravelItems(
  trip: AnonymousTravelDraft | null | undefined,
): AnonymousTravelDisplayItem[] {
  const planned = trip?.plannedItems ?? [];
  const plannedKeys = new Set(planned.map((item) => `${item.kind}:${item.targetId ?? ""}`));
  const favorites = (trip?.favorites ?? [])
    .filter((favorite) => !plannedKeys.has(`${favorite.kind}:${favorite.id}`))
    .map((favorite) => ({
      kind: favorite.kind as AnonymousItemKind,
      targetId: favorite.id,
      title: favorite.title,
      slug: favorite.slug,
      imageUrl: favorite.imageUrl,
      subtitle: undefined,
      notes: undefined,
      addedAt: favorite.addedAt,
    }));
  return [...planned, ...favorites].sort((a, b) => b.addedAt - a.addedAt);
}
