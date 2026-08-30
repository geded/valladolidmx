/**
 * G8-M1 · Safe Media Replacement MVP
 *
 * Contrato de "slot media": una referencia de imagen dentro de un borrador
 * del Experience Builder se guarda como una URL estable del proxy
 * (`/api/public/studio-media/<path>`) más parámetros declarativos que
 * transportan ALT, crédito, naturaleza (documental/conceptual/IA), estado de
 * revisión y punto focal.
 *
 * Diseño deliberado:
 *  - No se crean columnas nuevas ni se cambian los Block Contracts: el campo
 *    sigue siendo un `string`.
 *  - Nada se descarta en silencio: ALT y crédito viajan con la referencia.
 *  - El punto focal se traduce a `object-position` en el renderer.
 */

export const SLOT_PARAM = {
  alt: "vmxAlt",
  credit: "vmxCredit",
  nature: "vmxNature",
  review: "vmxReview",
  focal: "vmxFocal",
} as const;

export type MediaNature = "documentary" | "conceptual" | "ai_generated";

export interface SlotMedia {
  /** URL limpia, sin parámetros de slot. */
  src: string;
  alt: string | null;
  credit: string | null;
  nature: MediaNature | null;
  reviewState: string | null;
  focalX: number;
  focalY: number;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

function splitUrl(raw: string): { base: string; params: URLSearchParams; hash: string } {
  const hashIndex = raw.indexOf("#");
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const qIndex = withoutHash.indexOf("?");
  const base = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const params = new URLSearchParams(qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "");
  return { base, params, hash };
}

export function decodeSlotMedia(raw: unknown): SlotMedia {
  const value = typeof raw === "string" ? raw : "";
  if (!value) {
    return {
      src: "",
      alt: null,
      credit: null,
      nature: null,
      reviewState: null,
      focalX: 0.5,
      focalY: 0.5,
    };
  }
  const { base, params, hash } = splitUrl(value);
  const focalRaw = params.get(SLOT_PARAM.focal);
  let focalX = 0.5;
  let focalY = 0.5;
  if (focalRaw) {
    const [fx, fy] = focalRaw.split(",");
    focalX = clamp01(Number.parseFloat(fx ?? ""));
    focalY = clamp01(Number.parseFloat(fy ?? ""));
  }
  // Preservamos parámetros ajenos al contrato (p.ej. cache busting).
  const foreign = new URLSearchParams();
  const known = new Set<string>(Object.values(SLOT_PARAM));
  params.forEach((v, k) => {
    if (!known.has(k)) foreign.append(k, v);
  });
  const query = foreign.toString();
  const nature = params.get(SLOT_PARAM.nature);
  return {
    src: `${base}${query ? `?${query}` : ""}${hash}`,
    alt: params.get(SLOT_PARAM.alt),
    credit: params.get(SLOT_PARAM.credit),
    nature:
      nature === "documentary" || nature === "conceptual" || nature === "ai_generated"
        ? nature
        : null,
    reviewState: params.get(SLOT_PARAM.review),
    focalX,
    focalY,
  };
}

export function encodeSlotMedia(input: {
  src: string;
  alt?: string | null;
  credit?: string | null;
  nature?: MediaNature | null;
  reviewState?: string | null;
  focalX?: number | null;
  focalY?: number | null;
}): string {
  if (!input.src) return "";
  const { base, params, hash } = splitUrl(input.src);
  const known = new Set<string>(Object.values(SLOT_PARAM));
  const next = new URLSearchParams();
  params.forEach((v, k) => {
    if (!known.has(k)) next.append(k, v);
  });
  if (input.alt) next.set(SLOT_PARAM.alt, input.alt);
  if (input.credit) next.set(SLOT_PARAM.credit, input.credit);
  if (input.nature) next.set(SLOT_PARAM.nature, input.nature);
  if (input.reviewState) next.set(SLOT_PARAM.review, input.reviewState);
  const fx = clamp01(input.focalX ?? 0.5);
  const fy = clamp01(input.focalY ?? 0.5);
  if (fx !== 0.5 || fy !== 0.5) {
    next.set(SLOT_PARAM.focal, `${round2(fx)},${round2(fy)}`);
  }
  const query = next.toString();
  return `${base}${query ? `?${query}` : ""}${hash}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** `object-position` derivado del punto focal (default centro). */
export function focalObjectPosition(media: Pick<SlotMedia, "focalX" | "focalY">): string {
  return `${round2(clamp01(media.focalX)) * 100}% ${round2(clamp01(media.focalY)) * 100}%`;
}

/** Props listas para un `<img>` a partir del valor guardado en el slot. */
export function slotImageProps(
  raw: unknown,
  fallbackAlt = "",
): {
  src: string;
  alt: string;
  style: { objectPosition: string };
} {
  const media = decodeSlotMedia(raw);
  return {
    src: media.src,
    alt: media.alt ?? fallbackAlt,
    style: { objectPosition: focalObjectPosition(media) },
  };
}
