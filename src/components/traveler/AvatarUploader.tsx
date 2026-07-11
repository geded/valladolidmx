/**
 * AvatarUploader — Sube foto de perfil al bucket privado `avatars`.
 *
 * - Valida tipo (image/*) y peso original ≤ 5 MB.
 * - Redimensiona en cliente a 512×512 JPEG (quality 0.85) → ≤ ~120 KB.
 * - Sube a `avatars/{userId}/avatar_{ts}.jpg` (upsert).
 * - Genera signed URL de larga duración (1 año) para renderizado público.
 * - Devuelve la URL final vía `onUploaded`.
 */
import { useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;
const TARGET_SIZE = 512;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 365;

export interface AvatarUploaderProps {
  userId: string | undefined;
  currentUrl: string | null | undefined;
  displayName?: string | null;
  onUploaded: (url: string) => void;
}

async function resizeToSquareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function initials(name?: string | null): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

export function AvatarUploader({
  userId,
  currentUrl,
  displayName,
  onUploaded,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sube una imagen (JPG, PNG o WEBP).");
      return;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      toast.error("La imagen debe pesar menos de 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const blob = await resizeToSquareJpeg(file);
      const path = `${userId}/avatar_${Date.now()}.jpg`;
      const up = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "3600",
        });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signed.error || !signed.data) throw signed.error ?? new Error("signed_url_failed");
      setPreview(signed.data.signedUrl);
      onUploaded(signed.data.signedUrl);
      toast.success("Foto actualizada");
    } catch (err) {
      toast.error((err as Error).message || "No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? currentUrl ?? null;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || !userId}
        className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40 shadow-soft ring-2 ring-background focus:outline-none focus:ring-primary"
        aria-label="Cambiar foto de perfil"
      >
        {shown ? (
          <img
            src={shown}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-2xl font-semibold text-muted-foreground">
            {initials(displayName)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          {busy ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <Camera className="size-5 text-white" />
          )}
        </span>
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !userId}
          className="inline-flex items-center gap-2 rounded-pill border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          <Upload className="size-3.5" aria-hidden />
          {shown ? "Cambiar foto" : "Subir foto"}
        </button>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          JPG, PNG o WEBP · hasta 5 MB<br />
          La recortamos cuadrada a 512 px.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}