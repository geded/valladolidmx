import type { AnonymousTravelDraft } from "./contract";

/** Garantiza el orden crítico: remoto primero; borrado local sólo con éxito. */
export async function importThenClearAnonymousDraft<TResult>(
  draft: AnonymousTravelDraft,
  dependencies: {
    importDraft: (draft: AnonymousTravelDraft) => Promise<TResult>;
    clearDraft: () => Promise<void>;
  },
): Promise<TResult> {
  const result = await dependencies.importDraft(draft);
  await dependencies.clearDraft();
  return result;
}
