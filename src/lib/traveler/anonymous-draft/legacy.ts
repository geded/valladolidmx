import {
  AnonymousTravelDraftSchema,
  createEmptyDraft,
  type AnonymousPlannedItem,
  type AnonymousTravelDraft,
} from "./contract";

export const LEGACY_GUEST_QUEUE_KEY = "travel_plan_guest_queue";

export interface LegacyGuestQueueItem {
  kind?: unknown;
  targetId?: unknown;
  title?: unknown;
  slug?: unknown;
  imageUrl?: unknown;
  subtitle?: unknown;
  notes?: unknown;
  ts?: unknown;
}

const LEGACY_KINDS = new Set<AnonymousPlannedItem["kind"]>([
  "destination",
  "business",
  "product",
  "event",
  "note",
]);

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Convierte la cola local histórica sin red y sin crear identidad. */
export function migrateLegacyGuestQueue(
  raw: unknown,
  options?: { now?: number; draftId?: string },
): AnonymousTravelDraft | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const now = options?.now ?? Date.now();
  const plannedItems: AnonymousPlannedItem[] = [];

  for (const candidate of raw.slice(0, 40)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as LegacyGuestQueueItem;
    if (
      typeof item.kind !== "string" ||
      !LEGACY_KINDS.has(item.kind as AnonymousPlannedItem["kind"])
    )
      continue;
    const kind = item.kind as AnonymousPlannedItem["kind"];
    const targetId = kind === "note" ? null : (optionalString(item.targetId) ?? null);
    if (kind !== "note" && !targetId) continue;
    const imageUrl = optionalString(item.imageUrl);
    const mapped: AnonymousPlannedItem = {
      kind,
      targetId,
      addedAt:
        typeof item.ts === "number" && Number.isFinite(item.ts)
          ? Math.max(0, Math.round(item.ts))
          : now,
    };
    const title = optionalString(item.title);
    const slug = optionalString(item.slug);
    const subtitle = optionalString(item.subtitle);
    const notes = optionalString(item.notes);
    if (title) mapped.title = title.slice(0, 180);
    if (slug) mapped.slug = slug.slice(0, 180);
    if (imageUrl && isUrl(imageUrl)) mapped.imageUrl = imageUrl.slice(0, 500);
    if (subtitle) mapped.subtitle = subtitle.slice(0, 220);
    if (notes) mapped.notes = notes.slice(0, 280);
    plannedItems.push(mapped);
  }

  if (plannedItems.length === 0) return null;
  const draft = {
    ...createEmptyDraft({ now, draftId: options?.draftId }),
    plannedItems,
  };
  const parsed = AnonymousTravelDraftSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
}
