/**
 * MediaIdField — Campo de portada del CMS.
 *
 * Sustituye la captura manual de un identificador de medio por el selector
 * oficial de la Biblioteca (`MediaPickerDialog`), que ya permite buscar,
 * seleccionar y subir con metadata de derechos. No crea flujos ni buckets
 * nuevos: reutiliza la autoridad existente del Experience Builder.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/experience-builder/MediaPickerDialog";
import { getStudioMediaAssetById } from "@/lib/experience-builder/studio-media.functions";
import type { ImageRole } from "@/lib/cms/image-upload";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpText?: string;
  required?: boolean;
  role?: ImageRole;
}

export function MediaIdField({
  label,
  value,
  onChange,
  helpText,
  required,
  role = "hero",
}: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; alt: string | null } | null>(null);
  const resolve = useServerFn(getStudioMediaAssetById);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreview(null);
      return;
    }
    resolve({ data: { mediaId: value } })
      .then((res) => {
        if (!cancelled) setPreview(res ? { url: res.previewUrl || res.url, alt: res.alt } : null);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, resolve]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>

      <div className="flex items-center gap-3">
        <div className="h-20 w-32 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          {preview ? (
            <img
              src={preview.url}
              alt={preview.alt ?? ""}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
              Sin portada
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <ImagePlus className="h-4 w-4" />
            {value ? "Cambiar imagen" : "Seleccionar o subir imagen"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
              Quitar
            </button>
          )}
        </div>
      </div>

      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}

      <MediaPickerDialog
        open={open}
        role={role}
        onClose={() => setOpen(false)}
        onPick={(media) => {
          onChange(media.id);
          setPreview({ url: media.url, alt: media.alt });
          setOpen(false);
        }}
      />
    </div>
  );
}
