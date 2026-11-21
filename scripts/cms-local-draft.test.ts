import { describe, expect, it } from "vitest";
import {
  LOCAL_DRAFT_MAX_AGE_MS,
  localDraftKey,
  readStoredDraft,
  sameDraftValues,
  sanitizeStringRecord,
  writeStoredDraft,
} from "../src/lib/cms/local-draft";
import {
  EMPTY_NEW_PLACE,
  placeToForm,
  sanitizePlaceFormDraft,
} from "../src/components/cms/places/place-form-draft";
import { hasUnsavedWork, setUnsavedWork } from "../src/pwa/unsaved-work";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("CMS · respaldo local de formularios", () => {
  it("lo escrito vuelve al formulario con el punto de la pantalla donde iba el editor", () => {
    const storage = memoryStorage();
    const key = localDraftKey("businesses", null);
    writeStoredDraft(
      key,
      { display_name: "Casa Tía Micha" },
      { storage, now: 1000, scrollTop: 640 },
    );
    const draft = readStoredDraft(key, sanitizeStringRecord, { storage, now: 2000 });
    expect(draft?.values).toEqual({ display_name: "Casa Tía Micha" });
    expect(draft?.scrollTop).toBe(640);
  });

  it("conserva la llave de siempre para no perder respaldos ya guardados en los equipos", () => {
    expect(localDraftKey("destinations", "abc")).toBe("vmx.cms.local-draft.v1:destinations:abc");
    expect(localDraftKey("places", null)).toBe("vmx.cms.local-draft.v1:places:nuevo");
  });

  it("un respaldo de más de 7 días se descarta", () => {
    const storage = memoryStorage();
    const key = localDraftKey("zones", "z1");
    writeStoredDraft(key, { name: "Centro" }, { storage, now: 0 });
    expect(
      readStoredDraft(key, sanitizeStringRecord, { storage, now: LOCAL_DRAFT_MAX_AGE_MS + 1 }),
    ).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  });

  it("detecta cambios en Lugares aunque el orden de los datos sea distinto", () => {
    const saved = placeToForm({ official_name: "Cenote Zací", latitude: 20.69 }, ["c1"]);
    expect(sameDraftValues({ ...saved }, saved)).toBe(true);
    expect(sameDraftValues({ ...saved, latitude: "20.70" }, saved)).toBe(false);
    expect(sameDraftValues({ ...EMPTY_NEW_PLACE, name: "Ek Balam" }, EMPTY_NEW_PLACE)).toBe(false);
  });

  it("rechaza respaldos de Lugares dañados", () => {
    const saved = placeToForm({ official_name: "Cenote Zací" }, []);
    expect(sanitizePlaceFormDraft(saved)).toEqual(saved);
    expect(sanitizePlaceFormDraft({ ...saved, categoryIds: [1] })).toBeNull();
    expect(sanitizePlaceFormDraft({ values: {} })).toBeNull();
  });

  it("la app no se actualiza sola mientras haya cambios sin guardar", () => {
    expect(hasUnsavedWork()).toBe(false);
    setUnsavedWork("vmx.cms.local-draft.v1:places:p1", true);
    expect(hasUnsavedWork()).toBe(true);
    setUnsavedWork("vmx.cms.local-draft.v1:places:p1", false);
    expect(hasUnsavedWork()).toBe(false);
  });
});
