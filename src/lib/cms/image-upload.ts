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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
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
      if (
        Math.max(img.naturalWidth, img.naturalHeight) <= MAX_DIMENSION
      ) {
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

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  onAttempt?: (attempt: number, err?: unknown) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
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