import { AnonymousTravelDraftSchema, type AnonymousTravelDraft } from "./contract";
import { ANON_LIMITS } from "./limits";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type AnonymousImportItemKind = "destination" | "business" | "product" | "event" | "note";
export type AnonymousImportFavoriteKind = "business" | "product" | "promotion";

export interface AnonymousImportItem {
  kind: AnonymousImportItemKind;
  targetId: string | null;
  notes: string | null;
  sourceKey: string;
  snapshot: {
    title?: string;
    slug?: string;
    image_url?: string;
    subtitle?: string;
  };
}

export interface AnonymousImportPlan {
  draftId: string;
  items: AnonymousImportItem[];
  favorites: Array<{ kind: AnonymousImportFavoriteKind; targetId: string }>;
  startDate: string | null;
  endDate: string | null;
  partySize: number | null;
}

function validUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function noteForLegacy(
  kind: "promotion" | "custom",
  title?: string,
  notes?: string,
): AnonymousImportItem {
  const label =
    title?.trim() || (kind === "promotion" ? "Promoción guardada" : "Idea para el viaje");
  return {
    kind: "note",
    targetId: null,
    notes: [label, notes?.trim()].filter(Boolean).join(" — ").slice(0, 2000),
    sourceKey: `${kind}:${label}:${notes ?? ""}`,
    snapshot: title ? { title } : {},
  };
}

/** Valida y normaliza el payload local antes de cualquier escritura remota. */
export function prepareAnonymousDraftImport(
  raw: unknown,
  now: number = Date.now(),
): AnonymousImportPlan {
  const parsed = AnonymousTravelDraftSchema.safeParse(raw);
  if (!parsed.success) throw new Error("invalid_anonymous_draft");
  const draft: AnonymousTravelDraft = parsed.data;
  if (draft.expiresAt <= now) throw new Error("expired_anonymous_draft");
  if (new TextEncoder().encode(JSON.stringify(draft)).byteLength > ANON_LIMITS.payloadBytes) {
    throw new Error("anonymous_draft_too_large");
  }

  const items = new Map<string, AnonymousImportItem>();
  const favorites = new Map<string, { kind: AnonymousImportFavoriteKind; targetId: string }>();
  const addTargetItem = (
    kind: Exclude<AnonymousImportItemKind, "note">,
    targetId: string,
    snapshot: AnonymousImportItem["snapshot"] = {},
    notes: string | null = null,
  ) => {
    if (!validUuid(targetId)) throw new Error("invalid_anonymous_target_id");
    items.set(`${kind}:${targetId}`, {
      kind,
      targetId,
      notes,
      snapshot,
      sourceKey: `${kind}:${targetId}`,
    });
  };

  for (const destinationId of draft.destinationIds) addTargetItem("destination", destinationId);
  for (const item of draft.plannedItems) {
    const snapshot = {
      ...(item.title ? { title: item.title } : {}),
      ...(item.slug ? { slug: item.slug } : {}),
      ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
      ...(item.subtitle ? { subtitle: item.subtitle } : {}),
    };
    if (item.kind === "promotion" || item.kind === "custom") {
      const note = noteForLegacy(item.kind, item.title, item.notes);
      items.set(`note:${note.notes}`, note);
    } else if (item.kind === "note") {
      const note: AnonymousImportItem = {
        kind: "note",
        targetId: null,
        notes: item.notes ?? item.title ?? null,
        snapshot,
        sourceKey: `note:${item.notes ?? ""}:${item.title ?? ""}`,
      };
      items.set(`note:${note.notes ?? ""}:${snapshot.title ?? ""}`, note);
    } else {
      if (!item.targetId) throw new Error("missing_anonymous_target_id");
      addTargetItem(item.kind, item.targetId, snapshot, item.notes ?? null);
    }
  }

  for (const favorite of draft.favorites) {
    if (!validUuid(favorite.id)) throw new Error("invalid_anonymous_favorite_id");
    if (
      favorite.kind === "business" ||
      favorite.kind === "product" ||
      favorite.kind === "promotion"
    ) {
      favorites.set(`${favorite.kind}:${favorite.id}`, {
        kind: favorite.kind,
        targetId: favorite.id,
      });
    } else if (favorite.kind === "destination" || favorite.kind === "event") {
      addTargetItem(favorite.kind, favorite.id, {
        ...(favorite.title ? { title: favorite.title } : {}),
        ...(favorite.slug ? { slug: favorite.slug } : {}),
        ...(favorite.imageUrl ? { image_url: favorite.imageUrl } : {}),
      });
    }
  }

  const startDate =
    draft.tentativeDates?.from && ISO_DATE_RE.test(draft.tentativeDates.from)
      ? draft.tentativeDates.from
      : null;
  const endDate =
    draft.tentativeDates?.to && ISO_DATE_RE.test(draft.tentativeDates.to)
      ? draft.tentativeDates.to
      : null;
  const partySize = draft.travelerCount
    ? draft.travelerCount.adults + (draft.travelerCount.children ?? 0)
    : null;
  return {
    draftId: draft.draftId,
    items: [...items.values()],
    favorites: [...favorites.values()],
    startDate,
    endDate,
    partySize,
  };
}

/** UUID estable por borrador/nota para que reintentos no creen duplicados. */
export function anonymousImportNoteId(draftId: string, sourceKey: string): string {
  const input = `${draftId}:${sourceKey}`;
  const words = [2166136261, 2246822519, 3266489917, 668265263];
  for (let w = 0; w < words.length; w += 1) {
    let hash = words[w] >>> 0;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index) + w * 31;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    words[w] = hash;
  }
  const hex = words.map((word) => word.toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
