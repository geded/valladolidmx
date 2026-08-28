/**
 * G8-M1 · Safe Media Replacement MVP — reglas de derechos y naturaleza.
 *
 * Módulo puro (sin server functions) para poder compartir las validaciones
 * entre el inspector del Studio y las server functions.
 */

export type MediaNature = "documentary" | "conceptual" | "ai_generated";

export interface MediaRightsInput {
  /** ALT / descripción. Obligatorio. */
  alt: string;
  author?: string | null;
  credit?: string | null;
  source?: string | null;
  license?: string | null;
  place?: string | null;
  capturedOn?: string | null;
  nature: MediaNature;
  rightsConfirmed: boolean;
  focalX?: number | null;
  focalY?: number | null;
}

const clamp01 = (n: unknown) => {
  const v = typeof n === "number" ? n : Number.parseFloat(String(n ?? ""));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
};

/**
 * Reglas fail-closed de derechos (G8-M1 · DEF-M-05/08/10).
 * Devuelve un mensaje de error o `null` si la metadata es válida.
 */
export function validateMediaRights(r: MediaRightsInput): string | null {
  if (!r || typeof r.alt !== "string" || r.alt.trim().length < 3) {
    return "alt_required";
  }
  if (!r.nature) return "nature_required";
  if (!r.rightsConfirmed) return "rights_confirmation_required";
  const aiGenerated = r.nature === "ai_generated";
  if (r.nature === "documentary") {
    if (aiGenerated) return "ai_cannot_be_documentary";
    if (!r.source || !String(r.source).trim()) return "documentary_requires_source";
    if (!r.author || !String(r.author).trim()) return "documentary_requires_author";
    if (!r.license || !String(r.license).trim()) return "documentary_requires_license";
    const credit = String(r.credit ?? "").trim();
    if (credit && !String(r.author ?? "").trim()) {
      return "credit_without_author";
    }
  }
  return null;
}

export function buildRightsMetadata(r: MediaRightsInput) {
  const aiGenerated = r.nature === "ai_generated";
  return {
    rights: {
      author: r.author?.trim() || null,
      credit: r.credit?.trim() || null,
      source: r.source?.trim() || null,
      license: r.license?.trim() || null,
      place: r.place?.trim() || null,
      captured_on: r.capturedOn?.trim() || null,
      nature: r.nature,
      ai_generated: aiGenerated,
      documentary: r.nature === "documentary",
      conceptual: r.nature !== "documentary",
      rights_confirmed: true,
    },
    focal: { x: clamp01(r.focalX ?? 0.5), y: clamp01(r.focalY ?? 0.5) },
  };
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

