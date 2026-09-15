/**
 * image-upload.ts — Utilidades compartidas para preparar imágenes antes
 * de subirlas al Storage (destinos, empresas, productos):
 *  - Validación de formato y tamaño con mensajes en español.
 *  - Compresión y redimensionado en cliente (canvas → JPEG/WebP) para
 *    reducir peso sin sacrificar calidad razonable.
 *  - Reintentos con backoff exponencial para subidas puntuales.
 */

export const ACCEPTED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/** Peso máximo aceptado por archivo antes de comprimir (20 MB). */
export const MAX_ORIGINAL_SIZE_BYTES = 20 * 1024 * 1024;
/** Peso máximo aceptado después de comprimir (5 MB — margen de seguridad). */
export const MAX_COMPRESSED_SIZE_BYTES = 5 * 1024 * 1024;
/** Lado mayor máximo al comprimir (px). */
export const MAX_DIMENSION = 2000;
/** Calidad de JPEG/WebP (0-1). */
export const OUTPUT_QUALITY = 0.82;

/**
 * Roles de imagen soportados por el pipeline. Cada rol define:
 *  - `ratio`: proporción destino (ancho / alto). null = mantener original.
 *  - `maxLongSide`: lado mayor máximo tras redimensionar (px).
 *  - `quality`: calidad de salida (0-1).
 */
export type ImageRole = "hero" | "cover" | "gallery" | "logo" | "thumbnail";

interface RoleSpec {
  ratio: number | null;
  maxLongSide: number;
  quality: number;
}

export const ROLE_SPECS: Record<ImageRole, RoleSpec> = {
  hero: { ratio: 21 / 9, maxLongSide: 2400, quality: 0.82 },
  cover: { ratio: 4 / 3, maxLongSide: 1600, quality: 0.82 },
  gallery: { ratio: 4 / 3, maxLongSide: 1600, quality: 0.82 },
  logo: { ratio: 1, maxLongSide: 512, quality: 0.9 },
  thumbnail: { ratio: 1, maxLongSide: 400, quality: 0.82 },
};

export interface ImageValidationError {
  file: string;
  reason: string;
}

export function validateImageFile(file: File): ImageValidationError | null {
  if (!file) return { file: "(sin nombre)", reason: "Archivo vacío." };
  if (!(ACCEPTED_IMAGE_MIME as readonly string[]).includes(file.type)) {
    return {
      file: file.name,
      reason: `Formato no permitido (${file.type || "desconocido"}). Usa JPG, PNG, WebP, AVIF o GIF.`,
    };
  }
  if (file.size > MAX_ORIGINAL_SIZE_BYTES) {
    return {
      file: file.name,
      reason: `Pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo permitido: 20 MB.`,
    };
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falló la compresión."))),
      type,
      quality,
    );
  });
}

/**
 * Redimensiona y recomprime la imagen si excede `MAX_DIMENSION` o
 * `MAX_COMPRESSED_SIZE_BYTES`. Mantiene formato original cuando es
 * seguro (WebP/JPEG); PNG con transparencia potencial se pasa a WebP;
 * GIFs y AVIF se dejan intactos (canvas no preserva animación / AVIF
 * encoder no está garantizado).
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  // Formatos que no vale la pena reprocesar en canvas.
  if (file.type === "image/gif" || file.type === "image/avif") return file;

  // Si ya es pequeño y no muy grande de dimensiones, respétalo.
  if (file.size <= MAX_COMPRESSED_SIZE_BYTES / 2) {
    // Aún así puede tener dimensiones enormes; hacemos una comprobación rápida.
    try {
      const img = await loadImage(file);
      if (Math.max(img.naturalWidth, img.naturalHeight) <= MAX_DIMENSION) {
        return file;
      }
    } catch {
      return file;
    }
  }

  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const targetW = Math.round(img.naturalWidth * scale);
  const targetH = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Preferimos WebP para PNG/otros; JPEG para JPEG.
  const outType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const blob = await canvasToBlob(canvas, outType, OUTPUT_QUALITY);

  // Si tras comprimir sigue pesando más que el original, devuelve el original.
  if (blob.size >= file.size) return file;

  const ext = outType === "image/jpeg" ? "jpg" : "webp";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
  const compressed = new File([blob], `${baseName}.${ext}`, {
    type: outType,
    lastModified: Date.now(),
  });
  return compressed;
}

/**
 * Detecta si un PNG probablemente tiene canal alfa (transparencia).
 * Se lee el header + chunk IHDR (byte 25 = colorType). Bit 2 (valor 4)
 * indica canal alfa. Fallback: si no se puede leer, asume que sí.
 */
async function pngHasAlpha(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 32).arrayBuffer();
    const view = new Uint8Array(buf);
    // colorType en offset 25 tras firma PNG (8) + IHDR len(4)+type(4)+width(4)+height(4)+depth(1)
    const colorType = view[25];
    // 4 = grayscale+alpha, 6 = rgb+alpha
    return colorType === 4 || colorType === 6;
  } catch {
    return true;
  }
}

/**
 * Pipeline canónico para preparar una imagen antes de subirla al bucket:
 *  1) Valida formato / tamaño (mensaje en español si falla).
 *  2) Auto-recorta al ratio del rol usando el centro (cover crop).
 *     — Garantiza que las galerías se vean uniformes aunque el
 *       empresario suba fotos verticales, cuadradas o panorámicas.
 *  3) Redimensiona al `maxLongSide` del rol.
 *  4) Convierte a WebP (o JPEG si el original era JPEG; PNG con alfa
 *     se preserva como PNG para no perder transparencia — logos).
 *  5) Si el resultado pesa más que el original, devuelve el original
 *     ya validado.
 *
 * GIF y AVIF se dejan intactos (canvas no preserva animación / encoder
 * AVIF no está garantizado en el navegador).
 */
export async function prepareImageForRole(file: File, role: ImageRole): Promise<File> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid.reason);

  if (file.type === "image/gif" || file.type === "image/avif") return file;

  const spec = ROLE_SPECS[role];
  const img = await loadImage(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) return file;

  // 1) Determinar rectángulo fuente para el crop (cover-center).
  let cropW = srcW;
  let cropH = srcH;
  let cropX = 0;
  let cropY = 0;
  if (spec.ratio !== null) {
    const srcRatio = srcW / srcH;
    if (srcRatio > spec.ratio) {
      // Fuente más ancha → recortar laterales.
      cropW = Math.round(srcH * spec.ratio);
      cropH = srcH;
      cropX = Math.round((srcW - cropW) / 2);
    } else if (srcRatio < spec.ratio) {
      // Fuente más alta → recortar arriba/abajo.
      cropW = srcW;
      cropH = Math.round(srcW / spec.ratio);
      cropY = Math.round((srcH - cropH) / 2);
    }
  }

  // 2) Escala al maxLongSide del rol.
  const longest = Math.max(cropW, cropH);
  const scale = longest > spec.maxLongSide ? spec.maxLongSide / longest : 1;
  const targetW = Math.max(1, Math.round(cropW * scale));
  const targetH = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

  // 3) Elegir formato de salida.
  const isPng = file.type === "image/png";
  const keepPng = isPng && (await pngHasAlpha(file));
  const outType = keepPng ? "image/png" : file.type === "image/jpeg" ? "image/jpeg" : "image/webp";

  // Techo de peso compartido: ninguna subida (portada, galería, logo) debe
  // entrar por encima de `INGEST_TARGET_BYTES`, aunque su rol lo permitiera.
  let blob: Blob;
  if (outType === "image/png") {
    blob = await canvasToBlob(canvas, outType, 1);
  } else {
    blob = await canvasToBlob(canvas, outType, spec.quality);
    for (const quality of INGEST_QUALITY_STEPS) {
      if (blob.size <= INGEST_TARGET_BYTES || quality >= spec.quality) break;
      blob = await canvasToBlob(canvas, outType, quality);
    }
  }

  // Si tras procesar sigue pesando más que el original Y ya está dentro
  // de los límites de dimensión, devuelve el original.
  if (blob.size >= file.size && Math.max(srcW, srcH) <= spec.maxLongSide && spec.ratio === null) {
    return file;
  }

  const ext = outType === "image/jpeg" ? "jpg" : outType === "image/png" ? "png" : "webp";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${baseName}.${ext}`, {
    type: outType,
    lastModified: Date.now(),
  });
}

/* ───────────────  Carga inteligente para la Biblioteca  ─────────────── */

/**
 * Ingreso gobernado (H3·A4): la Biblioteca conserva un ORIGINAL, pero ese
 * original no debe ser un archivo de cámara sin procesar. Antes de subir se
 * normaliza de forma NO destructiva:
 *   · Nunca recorta: preserva encuadre y proporción del archivo elegido.
 *   · Limita el lado mayor a `INGEST_MAX_LONG_SIDE`.
 *   · Recomprime en pasos de calidad hasta quedar bajo `INGEST_TARGET_BYTES`.
 *   · Respeta PNG con transparencia (logos) y no toca GIF/AVIF.
 *   · Si el resultado no mejora al archivo elegido, devuelve el archivo tal cual.
 *
 * El pipeline de variantes derivadas sigue siendo la única autoridad de los
 * tamaños de entrega; esto sólo evita que entren archivos innecesariamente
 * pesados a la plataforma cuando cientos de empresas suben fotos el mismo día.
 */
export const INGEST_MAX_LONG_SIDE = 2560;
export const INGEST_TARGET_BYTES = 2.5 * 1024 * 1024;
const INGEST_QUALITY_STEPS = [0.85, 0.75, 0.65];

export interface IngestResult {
  file: File;
  originalBytes: number;
  bytes: number;
  width: number | null;
  height: number | null;
  optimized: boolean;
}

export async function prepareImageForIngest(file: File): Promise<IngestResult> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid.reason);

  const untouched: IngestResult = {
    file,
    originalBytes: file.size,
    bytes: file.size,
    width: null,
    height: null,
    optimized: false,
  };

  if (file.type === "image/gif" || file.type === "image/avif") return untouched;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return untouched;
  }
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) return untouched;

  const longest = Math.max(srcW, srcH);
  const needsResize = longest > INGEST_MAX_LONG_SIDE;
  const needsRecompress = file.size > INGEST_TARGET_BYTES;
  if (!needsResize && !needsRecompress) {
    return { ...untouched, width: srcW, height: srcH };
  }

  const scale = needsResize ? INGEST_MAX_LONG_SIDE / longest : 1;
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ...untouched, width: srcW, height: srcH };
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const keepPng = file.type === "image/png" && (await pngHasAlpha(file));
  const outType = keepPng ? "image/png" : file.type === "image/jpeg" ? "image/jpeg" : "image/webp";

  let blob: Blob | null = null;
  if (outType === "image/png") {
    blob = await canvasToBlob(canvas, outType, 1).catch(() => null);
  } else {
    for (const quality of INGEST_QUALITY_STEPS) {
      const candidate = await canvasToBlob(canvas, outType, quality).catch(() => null);
      if (!candidate) break;
      blob = candidate;
      if (candidate.size <= INGEST_TARGET_BYTES) break;
    }
  }

  if (!blob || blob.size >= file.size) {
    return { ...untouched, width: srcW, height: srcH };
  }

  const ext = outType === "image/jpeg" ? "jpg" : outType === "image/png" ? "png" : "webp";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
  const prepared = new File([blob], `${baseName}.${ext}`, {
    type: outType,
    lastModified: Date.now(),
  });

  return {
    file: prepared,
    originalBytes: file.size,
    bytes: prepared.size,
    width: targetW,
    height: targetH,
    optimized: true,
  };
}

/** Texto legible para editores: "6.4 MB → 1.2 MB (−81%)". */
export function describeIngestSavings(result: IngestResult): string | null {
  if (!result.optimized) return null;
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const pct = Math.round((1 - result.bytes / result.originalBytes) * 100);
  return `${mb(result.originalBytes)} → ${mb(result.bytes)} (−${pct}%)`;
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  onAttempt?: (attempt: number, err?: unknown) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      opts.onAttempt?.(attempt);
      return await fn();
    } catch (err) {
      lastErr = err;
      opts.onAttempt?.(attempt, err);
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, base * Math.pow(2, attempt)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Subida fallida.");
}
