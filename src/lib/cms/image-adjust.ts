/**
 * image-adjust.ts — Ajustes de luz y color aplicados píxel a píxel.
 * No usa `ctx.filter` porque Safari/iOS no lo soporta en canvas; así la
 * vista previa y el archivo final coinciden en todos los navegadores.
 * El resultado siempre pasa después por `prepareImageForRole`, que mantiene
 * la optimización oficial (peso, formato y tamaño por tipo de imagen).
 */

export interface LightAdjust {
  /** -100..100 · aclara u oscurece toda la foto. */
  exposure: number;
  /** -100..100 · levanta (positivo) las sombras sin quemar las luces. */
  shadows: number;
  /** -100..100 */
  contrast: number;
  /** -100..100 */
  saturation: number;
  /** -100..100 · positivo = más cálido (piedra, atardecer). */
  warmth: number;
}

export const NEUTRAL_ADJUST: LightAdjust = {
  exposure: 0,
  shadows: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
};

export function isNeutral(a: LightAdjust): boolean {
  return (Object.keys(NEUTRAL_ADJUST) as (keyof LightAdjust)[]).every((k) => a[k] === 0);
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Tabla de tonos (exposición + sombras + contraste) para un canal 0..255. */
export function buildToneCurve(a: LightAdjust): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const gain = Math.pow(2, a.exposure / 100); // ±1 paso
  const c = a.contrast / 100;
  const contrastK = c >= 0 ? 1 + c * 0.8 : 1 + c * 0.6;
  const lift = a.shadows / 100;
  for (let i = 0; i < 256; i++) {
    let v = (i / 255) * gain;
    // Sombras: afecta sobre todo los tonos bajos (peso decrece con la luz).
    const w = Math.pow(1 - Math.min(1, v), 2);
    v = v + lift * 0.35 * w;
    v = (v - 0.5) * contrastK + 0.5;
    lut[i] = clamp255(Math.round(v * 255));
  }
  return lut;
}

export function applyAdjust(data: Uint8ClampedArray, a: LightAdjust): void {
  if (isNeutral(a)) return;
  const lut = buildToneCurve(a);
  const sat = 1 + a.saturation / 100;
  const warm = a.warmth / 100;
  const rW = 1 + warm * 0.12;
  const bW = 1 - warm * 0.12;
  for (let i = 0; i < data.length; i += 4) {
    let r = lut[data[i]];
    let g = lut[data[i + 1]];
    let b = lut[data[i + 2]];
    if (sat !== 1) {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
    }
    data[i] = clamp255(r * rW);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b * bW);
  }
}

/**
 * Mejora automática: analiza la luminosidad y propone ajustes suaves.
 * Las fotos oscuras se aclaran y se levantan sombras; nunca exagera.
 */
export function suggestAutoAdjust(data: Uint8ClampedArray): LightAdjust {
  let sum = 0;
  let n = 0;
  let dark = 0;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 16) {
    const l = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    hist[l]++;
    sum += l;
    n++;
    if (l < 60) dark++;
  }
  if (n === 0) return { ...NEUTRAL_ADJUST };
  const mean = sum / n / 255;
  const pct = (p: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= n * p) return i / 255;
    }
    return 1;
  };
  const spread = pct(0.98) - pct(0.02);
  const round = (v: number) => Math.round(Math.max(-60, Math.min(60, v)));
  return {
    exposure: round((0.5 - mean) * 110),
    shadows: round((dark / n) * 120),
    contrast: round(spread < 0.7 ? (0.7 - spread) * 60 : 0),
    saturation: 8,
    warmth: 0,
  };
}
