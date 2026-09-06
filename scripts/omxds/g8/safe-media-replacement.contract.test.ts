/**
 * G8-M1 · Safe Media Replacement MVP — contrato fail-closed.
 *
 * Verifica el flujo mínimo seguro de selección, subida, aprobación y
 * sustitución de imágenes en el Experience Builder.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildRightsMetadata,
  validateMediaRights,
  type MediaRightsInput,
} from "../../../src/lib/experience-builder/media-rights";
import {
  decodeSlotMedia,
  encodeSlotMedia,
  focalObjectPosition,
  slotImageProps,
} from "../../../src/lib/media/slot-media";

const read = (p: string) => readFileSync(p, "utf8");
const INSPECTOR = read("src/components/experience-builder/AutoInspector.tsx");
const PICKER = read("src/components/experience-builder/MediaPickerDialog.tsx");
const FUNCTIONS = read("src/lib/experience-builder/studio-media.functions.ts");

const baseRights: MediaRightsInput = {
  alt: "Fachada del convento de Valladolid",
  author: "Equipo Valladolid.mx",
  credit: "Valladolid.mx",
  source: "Archivo propio",
  license: "Uso interno autorizado",
  nature: "documentary",
  rightsConfirmed: true,
};

describe("DEF-M-01 · flujo único del inspector", () => {
  test("expone un botón primario de selección/subida", () => {
    expect(INSPECTOR).toContain("Seleccionar o subir imagen");
    expect(INSPECTOR).toContain("Cambiar imagen");
  });

  test("usa 'Quitar de este slot' y no 'Eliminar' para vaciar el slot", () => {
    expect(INSPECTOR).toContain("Quitar de este slot");
    expect(INSPECTOR).not.toContain("Quitar imagen");
    expect(INSPECTOR).not.toContain("Eliminar imagen");
  });
});

describe("DEF-M-02 · subida segura sin referencias base64", () => {
  test("el inspector no usa FileReader ni data: URI", () => {
    expect(INSPECTOR).not.toContain("new FileReader");
    expect(INSPECTOR).not.toContain("readAsDataURL");
    expect(INSPECTOR).not.toContain("readAsDataURL(");
  });

  test("el diálogo conserva los bytes al elegir y usa la subida gobernada", () => {
    expect(PICKER).not.toContain("new FileReader");
    expect(PICKER).toContain("uploadStudioMediaViaServer");
    expect(PICKER).toContain("setFileBytesBase64");
    expect(PICKER).toContain("bytesBase64: fileBytesBase64");
    expect(PICKER).not.toContain("bytesBase64: await fileToBase64(file)");
    expect(PICKER).not.toContain("prepareImageForRole");
  });

  test("el servidor conserva bytes, permisos, checksum y limpia si falla el registro", () => {
    expect(FUNCTIONS).toContain("uploadStudioMediaViaServer");
    expect(FUNCTIONS).toContain("await assertEditorial(context)");
    expect(FUNCTIONS).toContain("upload_size_mismatch");
    expect(FUNCTIONS).toContain("insertMediaAsset");
    expect(FUNCTIONS).toContain("remove([path])");
    expect(FUNCTIONS).toContain("upsert: false");
  });
});

describe("DEF-M-07/10 · activo nuevo, checksum y revisión previa", () => {
  test("registerStudioMedia calcula checksum y nace draft/unreviewed", () => {
    expect(FUNCTIONS).toContain("sha256Hex");
    expect(FUNCTIONS).toContain("original_checksum: checksum");
    expect(FUNCTIONS).toContain('status: "draft"');
    expect(FUNCTIONS).toContain('review_state: "unreviewed"');
    expect(FUNCTIONS).toContain(".insert(");
    expect(FUNCTIONS).not.toContain(".upsert(");
  });

  test("la aprobación es gobernada y sella revisor y fecha", () => {
    expect(FUNCTIONS).toContain("approveStudioMedia");
    expect(FUNCTIONS).toContain("forbidden_requires_admin");
    expect(FUNCTIONS).toContain("self_approval_not_allowed");
    expect(FUNCTIONS).toContain("reviewed_by: context.userId");
    expect(FUNCTIONS).toContain("reviewed_at: reviewedAt");
  });

  test("la biblioteca sólo lista activos vivos", () => {
    expect(FUNCTIONS).toContain('.is("deleted_at", null)');
  });
});

describe("DEF-M-05/08 · derechos y procedencia fail-closed", () => {
  test("acepta metadata documental completa", () => {
    expect(validateMediaRights(baseRights)).toBeNull();
  });

  test("una imagen IA nunca puede quedar marcada como documental", () => {
    const meta = buildRightsMetadata({ ...baseRights, nature: "ai_generated" });
    expect(meta.rights.documentary).toBe(false);
    expect(validateMediaRights({ ...baseRights, nature: "ai_generated" })).toBeNull();
  });

  test("rechaza documental sin fuente, autor o licencia", () => {
    expect(validateMediaRights({ ...baseRights, source: "" })).toBe("documentary_requires_source");
    expect(validateMediaRights({ ...baseRights, author: "" })).toBe("documentary_requires_author");
    expect(validateMediaRights({ ...baseRights, license: "" })).toBe(
      "documentary_requires_license",
    );
  });

  test("rechaza ALT vacío y falta de confirmación de derechos", () => {
    expect(validateMediaRights({ ...baseRights, alt: "" })).toBe("alt_required");
    expect(validateMediaRights({ ...baseRights, rightsConfirmed: false })).toBe(
      "rights_confirmation_required",
    );
  });

  test("el contenido IA se marca ai_generated/conceptual", () => {
    const meta = buildRightsMetadata({ ...baseRights, nature: "ai_generated" });
    expect(meta.rights.ai_generated).toBe(true);
    expect(meta.rights.documentary).toBe(false);
    expect(meta.rights.conceptual).toBe(true);
    expect(meta.lifecycle.temporary).toBe(true);
    expect(meta.lifecycle.production_eligible).toBe(false);
    expect(meta.lifecycle.replacement_required).toBe(true);
    expect(meta.lifecycle.usage).toBe("preview_only");
  });
});

describe("DEF-M-04/06 · ALT, crédito y punto focal", () => {
  test("ALT y crédito viajan con la referencia del slot", () => {
    const url = encodeSlotMedia({
      src: "/api/public/studio-media/2026/foo.jpg",
      alt: "Convento",
      credit: "Valladolid.mx",
      nature: "documentary",
      reviewState: "approved",
    });
    const decoded = decodeSlotMedia(url);
    expect(decoded.alt).toBe("Convento");
    expect(decoded.credit).toBe("Valladolid.mx");
    expect(decoded.nature).toBe("documentary");
    expect(decoded.reviewState).toBe("approved");
    expect(decoded.src).toBe("/api/public/studio-media/2026/foo.jpg");
  });

  test("focal por defecto es 0.5/0.5 y se traduce a object-position", () => {
    const plain = decodeSlotMedia("/api/public/studio-media/2026/foo.jpg");
    expect(plain.focalX).toBe(0.5);
    expect(plain.focalY).toBe(0.5);
    expect(focalObjectPosition(plain)).toBe("50% 50%");

    const focal = encodeSlotMedia({
      src: "/api/public/studio-media/2026/foo.jpg",
      focalX: 0.25,
      focalY: 0.8,
    });
    const props = slotImageProps(focal);
    expect(props.style.objectPosition).toBe("25% 80%");
  });

  test("los valores focales quedan acotados a 0–1", () => {
    const decoded = decodeSlotMedia("/api/public/studio-media/2026/foo.jpg?vmxFocal=9,-4");
    expect(decoded.focalX).toBe(1);
    expect(decoded.focalY).toBe(0);
  });
});
