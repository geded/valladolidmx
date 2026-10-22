import { describe, expect, test } from "bun:test";
import { buildRightsMetadata, validateUploadRights, type MediaRightsInput } from "../../src/lib/experience-builder/media-rights";
import { isAccreditedDestinationMedia } from "../../src/lib/destinations/public-media-policy";

const rights: MediaRightsInput = {
  alt: "Fotografía del destino", author: "Fotógrafo acreditado", source: "Archivo propio",
  license: "Permiso de publicación en Valladolid.mx", nature: "documentary",
  ownership: "own", rightsConfirmed: true,
};
describe("Declaración del editor durante la subida", () => {
  test("las fotos propias con declaración completa no requieren autorización administrativa", () => {
    expect(validateUploadRights(rights)).toBeNull();
  });
  test("acepta permiso del autor con procedencia y condiciones declaradas", () => {
    expect(validateUploadRights({ ...rights, ownership: "permission", source: "Autorización del fotógrafo" })).toBeNull();
    expect(buildRightsMetadata({ ...rights, ownership: "permission" }).rights.ownership).toBe("permission");
  });
  test("no acredita fotografías sin declaración de propiedad o permiso", () => {
    expect(validateUploadRights({ ...rights, ownership: undefined })).toBe("ownership_required");
  });
  test("no acredita sin confirmación explícita", () => {
    expect(validateUploadRights({ ...rights, rightsConfirmed: false })).toBe("rights_confirmation_required");
  });
  test("no inventa autor ni permiso", () => {
    expect(validateUploadRights({ ...rights, author: "" })).toBe("documentary_requires_author");
    expect(validateUploadRights({ ...rights, license: "" })).toBe("documentary_requires_license");
  });
  test("fotografía real acreditada sigue siendo elegible con la autoridad pública vigente", () => {
    expect(isAccreditedDestinationMedia({ storage_bucket: "destinations", storage_path: "destino/foto.jpg", status: "published", review_state: "approved", original_checksum: "a".repeat(64), alt_text: rights.alt, credit: rights.author, metadata: buildRightsMetadata(rights) })).toBe(true);
  });
  test("IA nunca se acredita como fotografía documental aunque tenga derechos confirmados", () => {
    expect(isAccreditedDestinationMedia({ storage_bucket: "destinations", storage_path: "destino/ia.jpg", status: "published", review_state: "approved", original_checksum: "a".repeat(64), alt_text: rights.alt, credit: rights.author, metadata: buildRightsMetadata({ ...rights, nature: "ai_generated" }) })).toBe(false);
  });
});