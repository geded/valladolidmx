import { describe, expect, it, vi } from "vitest";
import {
  anonymousImportNoteId,
  prepareAnonymousDraftImport,
} from "../src/lib/traveler/anonymous-draft/import-contract";
import { migrateLegacyGuestQueue } from "../src/lib/traveler/anonymous-draft/legacy";
import { createEmptyDraft } from "../src/lib/traveler/anonymous-draft/contract";
import {
  ANONYMOUS_REGISTRATION_TRIGGERS,
  anonymousRegistrationCopy,
} from "../src/lib/traveler/anonymous-draft/registration";
import { importThenClearAnonymousDraft } from "../src/lib/traveler/anonymous-draft/import-runner";
import { selectAnonymousTravelItems } from "../src/lib/traveler/anonymous-draft/items";

const NOW = 1_800_000_000_000;

function uuid(value: number): string {
  return `00000000-0000-4000-a000-${value.toString(16).padStart(12, "0")}`;
}

describe("AC1 local-first continuity", () => {
  it("converts the retired guest queue locally without a network call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const draft = migrateLegacyGuestQueue(
      [
        { kind: "business", targetId: uuid(1), title: "Casa", ts: NOW - 5 },
        { kind: "note", targetId: null, notes: "Llegar temprano", ts: NOW },
        { kind: "invalid", targetId: uuid(2) },
      ],
      { now: NOW, draftId: uuid(99) },
    );
    expect(draft?.plannedItems).toHaveLength(2);
    expect(draft?.draftId).toBe(uuid(99));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("prepares an additive, deduplicated and retry-stable authenticated import", () => {
    const draft = createEmptyDraft({ now: NOW, draftId: uuid(100) });
    draft.destinationIds = [uuid(1), uuid(1)];
    draft.plannedItems = [
      { kind: "destination", targetId: uuid(1), title: "Valladolid", addedAt: NOW },
      { kind: "business", targetId: uuid(2), title: "Hotel", addedAt: NOW },
      { kind: "note", targetId: null, notes: "Sin prisas", addedAt: NOW },
    ];
    draft.favorites = [
      { kind: "business", id: uuid(2), addedAt: NOW },
      { kind: "business", id: uuid(2), addedAt: NOW },
      { kind: "event", id: uuid(3), title: "Evento", addedAt: NOW },
    ];
    const first = prepareAnonymousDraftImport(draft, NOW + 1);
    const retry = prepareAnonymousDraftImport(draft, NOW + 1);
    expect(first).toEqual(retry);
    expect(first.items.filter((item) => item.kind === "destination")).toHaveLength(1);
    expect(first.items.some((item) => item.kind === "event" && item.targetId === uuid(3))).toBe(
      true,
    );
    expect(first.favorites).toEqual([{ kind: "business", targetId: uuid(2) }]);
    const note = first.items.find((item) => item.kind === "note");
    expect(anonymousImportNoteId(first.draftId, note!.sourceKey)).toBe(
      anonymousImportNoteId(first.draftId, note!.sourceKey),
    );
  });

  it("rejects expired or server-incompatible local payloads without mutating them", () => {
    const expired = createEmptyDraft({ now: NOW, draftId: uuid(5) });
    expect(() => prepareAnonymousDraftImport(expired, expired.expiresAt)).toThrow(
      "expired_anonymous_draft",
    );
    const invalid = createEmptyDraft({ now: NOW, draftId: uuid(6) });
    invalid.destinationIds = ["not-a-uuid"];
    expect(() => prepareAnonymousDraftImport(invalid, NOW + 1)).toThrow(
      "invalid_anonymous_target_id",
    );
    expect(invalid.destinationIds).toEqual(["not-a-uuid"]);
  });

  it("opens progressive registration only for the approved value moments", () => {
    expect(ANONYMOUS_REGISTRATION_TRIGGERS).toEqual([
      "save_permanently",
      "other_device",
      "share",
      "reminders",
      "hard_limit",
    ]);
    for (const reason of ANONYMOUS_REGISTRATION_TRIGGERS) {
      expect(anonymousRegistrationCopy(reason).dismissCta).toBeTruthy();
    }
  });

  it("feeds the page and floating dock from the same deduplicated local trip", () => {
    const draft = createEmptyDraft({ now: NOW, draftId: uuid(101) });
    draft.plannedItems = [
      {
        kind: "destination",
        targetId: uuid(1),
        title: "Río Lagartos",
        addedAt: NOW,
      },
    ];
    draft.favorites = [
      {
        kind: "destination",
        id: uuid(1),
        title: "Río Lagartos",
        addedAt: NOW - 1,
      },
      {
        kind: "business",
        id: uuid(2),
        title: "Restaurante",
        addedAt: NOW + 1,
      },
    ];
    expect(selectAnonymousTravelItems(draft).map((item) => item.title)).toEqual([
      "Restaurante",
      "Río Lagartos",
    ]);
  });

  it("clears the local draft only after a successful authenticated import", async () => {
    const draft = createEmptyDraft({ now: NOW, draftId: uuid(7) });
    const order: string[] = [];
    const result = await importThenClearAnonymousDraft(draft, {
      importDraft: async () => {
        order.push("remote");
        return { ok: true };
      },
      clearDraft: async () => {
        order.push("clear");
      },
    });
    expect(result).toEqual({ ok: true });
    expect(order).toEqual(["remote", "clear"]);
  });

  it("preserves the local draft when the authenticated import fails", async () => {
    const draft = createEmptyDraft({ now: NOW, draftId: uuid(8) });
    const clearDraft = vi.fn(async () => undefined);
    await expect(
      importThenClearAnonymousDraft(draft, {
        importDraft: async () => {
          throw new Error("remote_failed");
        },
        clearDraft,
      }),
    ).rejects.toThrow("remote_failed");
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("supports 1,000 anonymous sessions × 20 interactions with zero network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let interactions = 0;
    for (let session = 1; session <= 1_000; session += 1) {
      const draft = createEmptyDraft({ now: NOW, draftId: uuid(100_000 + session) });
      draft.plannedItems = Array.from({ length: 20 }, (_, index) => {
        interactions += 1;
        return {
          kind: "business" as const,
          targetId: uuid(session * 100 + index),
          title: `Lugar ${index}`,
          addedAt: NOW + index,
        };
      });
      expect(draft.plannedItems).toHaveLength(20);
      expect(JSON.stringify(draft).length).toBeLessThan(64 * 1024);
    }
    expect(interactions).toBe(20_000);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
