/**
 * MediaPickerDialog — Biblioteca visual de imágenes reutilizables
 * para el Experience Builder (US-05).
 *
 *  - Lista las imágenes ya subidas al bucket `studio-media`.
 *  - Permite subir una imagen nueva (pipeline `prepareImageForRole` +
 *    firma de upload + registro en `media_assets`).
 *  - Devuelve una URL estable `/api/public/studio-media/<path>` que puede
 *    guardarse dentro de la composición sin que expire.
 *
 * Aditivo: se abre desde AutoInspector; no reemplaza el input URL clásico.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import {
  listStudioMediaLibrary,
  registerStudioMedia,
  signStudioMediaUpload,
} from "@/lib/experience-builder/studio-media.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  prepareImageForRole,
  validateImageFile,
  type ImageRole,
} from "@/lib/cms/image-upload";

export interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, alt?: string | null) => void;
  /** Rol para el pipeline (define ratio + tamaño). Default: gallery. */
  role?: ImageRole;
}

interface Row {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  mime: string | null;
}

export function MediaPickerDialog({
  open,
  onClose,
  onPick,
  role = "gallery",
}: MediaPickerDialogProps) {
  const list = useServerFn(listStudioMediaLibrary);
  const sign = useServerFn(signStudioMediaUpload);
  const register = useServerFn(registerStudioMedia);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    list({ data: { search: search.trim() || undefined, limit: 80 } })
      .then((res) => {
        if (!cancelled) setRows(res.rows as Row[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar la biblioteca.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, search, list]);

  async function handleUpload(file: File) {
    setError(null);
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid.reason);
      return;
    }
    setUploading(true);
    try {
      const prepared = await prepareImageForRole(file, role);
      const { path, token, bucket } = await sign({
        data: { filename: prepared.name, contentType: prepared.type },
      });
      // Upload directo con la URL firmada
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = (supabase.storage as any).from(bucket);
      const { error: upErr } = await storage.uploadToSignedUrl(path, token, prepared, {
        contentType: prepared.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const registered = await register({
        data: {
          storagePath: path,
          mime: prepared.type,
          sizeBytes: prepared.size,
          alt: null,
        },
      });
      onPick(registered.url, null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de imágenes"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Biblioteca de imágenes</h2>
            <p className="text-[11px] text-muted-foreground">
              Elige una imagen ya subida o sube una nueva. Se recorta y optimiza automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              placeholder="Buscar por texto alternativo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs"
            />
          </div>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent">
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-3.5" aria-hidden />
            )}
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleUpload(f);
              }}
            />
          </label>
        </div>

        {error ? (
          <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Cargando…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ImageIcon className="size-8" aria-hidden />
              <p className="text-xs">
                Aún no hay imágenes en la biblioteca. Sube la primera con el botón de arriba.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onPick(r.url, r.alt);
                    onClose();
                  }}
                  className="group flex flex-col overflow-hidden rounded-md border border-border bg-card text-left transition hover:border-primary hover:shadow-md"
                  title={r.alt ?? "Elegir esta imagen"}
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    <img
                      src={r.url}
                      alt={r.alt ?? ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  {r.alt ? (
                    <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">{r.alt}</p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}