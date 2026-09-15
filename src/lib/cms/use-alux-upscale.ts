/**
 * useAluxUpscale — Hook y utilidades para ampliar fotos pequeñas con
 * Alux IA en los paneles de subida del CMS (sólo editores/admins).
 *
 * - Paneles de un solo archivo (logo, portada, hero): el hook evalúa la
 *   foto al elegirla y, si queda por debajo del tamaño recomendado,
 *   expone `pending` para que la UI muestre la tarjeta de ampliación.
 * - Paneles de galería (lote): `upscaleIfUndersized` amplía cada foto
 *   pequeña de forma automática cuando el usuario activa la opción.
 *
 * Nunca es automático ni silencioso en el caso de un solo archivo: el
 * usuario decide. En galería, el usuario activa la casilla explícitamente.
 */
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aluxUpscaleImage } from "@/lib/cms/alux-upscale.functions";
import {
  evaluateRoleFit,
  ROLE_LABELS,
  type ImageRole,
  type RoleFit,
} from "@/lib/cms/image-upload";

/* ───────────  Helpers compartidos  ─────────── */

export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

/** Convierte la respuesta base64 de Alux IA en un File descargable. */
function base64ToFile(b64: string, mime: string, baseName: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], `${baseName}-alux.png`, {
    type: mime,
    lastModified: Date.now(),
  });
}

/* ───────────  Hook para un solo archivo  ─────────── */

export interface PendingFile {
  file: File;
  fit: RoleFit;
}

export function useAluxUpscale(role: ImageRole) {
  const upscaleFn = useServerFn(aluxUpscaleImage);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [upscaling, setUpscaling] = useState(false);

  /**
   * Evalúa la foto al elegirla. Si queda por debajo del tamaño recomendado,
   * guarda el estado pendiente y devuelve `true` para que la UI muestre la
   * tarjeta. Si no, devuelve `false` y el llamador puede subir directo.
   */
  const evaluate = useCallback(
    async (file: File): Promise<boolean> => {
      const dims = await readImageDimensions(file);
      const fit = evaluateRoleFit(dims?.width ?? null, dims?.height ?? null, role);
      if (fit?.undersized) {
        setPending({ file, fit });
        return true;
      }
      return false;
    },
    [role],
  );

  /** Amplía la foto pendiente con Alux IA. Devuelve el File ampliado o null. */
  const upscale = useCallback(async (): Promise<File | null> => {
    if (!pending || upscaling) return null;
    setUpscaling(true);
    try {
      const bytesBase64 = await fileToBase64(pending.file);
      const res = await upscaleFn({
        data: {
          bytesBase64,
          mime: pending.file.type,
          width: pending.fit.width,
          height: pending.fit.height,
          targetLongSide: pending.fit.recommendedLongSide,
          roleLabel: ROLE_LABELS[role],
        },
      });
      const baseName = pending.file.name.replace(/\.[^.]+$/, "") || "imagen";
      const enlarged = base64ToFile(res.bytesBase64, res.mime, baseName);
      setPending(null);
      return enlarged;
    } catch {
      return null;
    } finally {
      setUpscaling(false);
    }
  }, [pending, upscaling, role, upscaleFn]);

  /** Descarta la ampliación y devuelve el archivo original. */
  const proceedAsIs = useCallback((): File | null => {
    const f = pending?.file ?? null;
    setPending(null);
    return f;
  }, [pending]);

  const cancel = useCallback(() => setPending(null), []);

  return { pending, upscaling, evaluate, upscale, proceedAsIs, cancel };
}

/* ───────────  Utilidad para lotes (galería)  ─────────── */

/**
 * Si la foto es pequeña para el uso, la amplía con Alux IA y devuelve la
 * versión ampliada. Si no, la devuelve sin cambios. Pensado para lotes
 * donde el usuario ya activó la casilla "Ampliar con Alux IA".
 */
export async function upscaleIfUndersized(
  file: File,
  role: ImageRole,
  upscaleFn: ReturnType<typeof useServerFn<typeof aluxUpscaleImage>>,
): Promise<{ file: File; upscaled: boolean }> {
  const dims = await readImageDimensions(file);
  const fit = evaluateRoleFit(dims?.width ?? null, dims?.height ?? null, role);
  if (!fit?.undersized) return { file, upscaled: false };
  const bytesBase64 = await fileToBase64(file);
  const res = await upscaleFn({
    data: {
      bytesBase64,
      mime: file.type,
      width: fit.width,
      height: fit.height,
      targetLongSide: fit.recommendedLongSide,
      roleLabel: ROLE_LABELS[role],
    },
  });
  const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return { file: base64ToFile(res.bytesBase64, res.mime, baseName), upscaled: true };
}
