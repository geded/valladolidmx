/**
 * ProductMediaPanels — Portada y galería de un producto. Sube al bucket
 * `products` con signed upload URLs. Autorización server-side admite
 * admins/editores O dueños (≥editor) de la empresa asociada.
 */
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listProductMedia,
  registerProductMedia,
  removeProductMedia,
  reorderProductGallery,
  signProductImageUpload,
} from "@/lib/cms/products-media.functions";
import {
  prepareImageForRole,
  withRetry,
} from "@/lib/cms/image-upload";

type MediaRow = Awaited<ReturnType<typeof listProductMedia>>[number];

interface Props {
  productId: string;
  onChanged?: () => void;
}

export function ProductMediaPanels({ productId, onChanged }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listProductMedia);
  const signFn = useServerFn(signProductImageUpload);
  const registerFn = useServerFn(registerProductMedia);
  const removeFn = useServerFn(removeProductMedia);
  const reorderFn = useServerFn(reorderProductGallery);

  const media = useQuery({
    queryKey: ["cms", "product_media", productId],
    queryFn: () => listFn({ data: { productId } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["cms", "product_media", productId] });
    onChanged?.();
  };

  const uploadOne = async (file: File, role: "cover" | "gallery") => {
    const prepared = await prepareImageForRole(file, role);
    await withRetry(async () => {
      const signed = await signFn({
        data: {
          productId,
          filename: prepared.name,
          contentType: prepared.type,
        },
      });
      const { error: upErr } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, prepared, {
          contentType: prepared.type,
          upsert: false,
        });
      if (upErr) throw upErr;
      await registerFn({
        data: {
          productId,
          storagePath: signed.path,
          role,
          alt: file.name,
          mime: prepared.type,
          sizeBytes: prepared.size,
        },
      });
    });
  };

  const coverUpload = useMutation({
    mutationFn: async (file: File) => uploadOne(file, "cover"),
    onSuccess: () => {
      invalidate();
      toast.success("Portada actualizada.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo subir."),
  });
  const galleryUpload = useMutation({
    mutationFn: async (files: File[]) => {
      let ok = 0;
      const errors: string[] = [];
      for (const f of files) {
        try {
          await uploadOne(f, "gallery");
          ok += 1;
        } catch (err) {
          errors.push(
            `${f.name}: ${err instanceof Error ? err.message : "error"}`,
          );
        }
      }
      return { ok, errors };
    },
    onSuccess: (res) => {
      invalidate();
      if (res.ok > 0)
        toast.success(`${res.ok} imagen${res.ok === 1 ? "" : "es"} subida${res.ok === 1 ? "" : "s"}.`);
      for (const msg of res.errors) toast.error(msg);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo subir."),
  });
  const removeMut = useMutation({
    mutationFn: (productMediaId: string) =>
      removeFn({ data: { productMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderFn({ data: { productId, orderedIds } }),
    onSuccess: invalidate,
  });

  const rows = media.data ?? [];
  const cover = rows.find((r) => r.role === "cover") ?? null;
  const gallery = rows.filter((r) => r.role === "gallery");

  return (
    <div className="space-y-6">
      <CoverPanel
        cover={cover}
        onUpload={(f) => coverUpload.mutate(f)}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={coverUpload.isPending}
        error={coverUpload.error}
      />
      <GalleryPanel
        items={gallery}
        onUpload={(files) => galleryUpload.mutate(files)}
        onRemove={(id) => removeMut.mutate(id)}
        onMove={(id, dir) => {
          const idx = gallery.findIndex((g) => g.id === id);
          if (idx < 0) return;
          const next = idx + dir;
          if (next < 0 || next >= gallery.length) return;
          const nextOrder = gallery.slice();
          const [it] = nextOrder.splice(idx, 1);
          nextOrder.splice(next, 0, it);
          reorderMut.mutate(nextOrder.map((g) => g.id));
        }}
        uploading={galleryUpload.isPending}
        error={galleryUpload.error}
      />
    </div>
  );
}

function CoverPanel(props: {
  cover: MediaRow | null;
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  uploading: boolean;
  error: unknown;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Portada</h2>
          <p className="text-xs text-muted-foreground">
            Imagen principal del producto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={props.uploading}
          className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {props.uploading ? "Subiendo…" : props.cover ? "Reemplazar" : "Subir"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onUpload(f);
            e.target.value = "";
          }}
        />
      </header>
      {props.cover?.previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={props.cover.previewUrl}
            alt={props.cover.alt ?? "portada"}
            className="h-52 w-full object-cover"
          />
          <button
            type="button"
            onClick={() => props.cover && props.onRemove(props.cover.id)}
            className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
          Sin portada
        </div>
      )}
      {props.error instanceof Error && (
        <p className="mt-2 text-xs text-destructive">{props.error.message}</p>
      )}
    </section>
  );
}

function GalleryPanel(props: {
  items: MediaRow[];
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  uploading: boolean;
  error: unknown;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Galería</h2>
          <p className="text-xs text-muted-foreground">
            Imágenes adicionales del producto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={props.uploading}
          className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {props.uploading ? "Subiendo…" : "Añadir imágenes"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) props.onUpload(files);
            e.target.value = "";
          }}
        />
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files ?? []).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length) props.onUpload(files);
        }}
        className={`rounded-lg border border-dashed p-3 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-background"
        }`}
      >
        {props.items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Sin imágenes en galería. Arrastra archivos aquí o pulsa "Añadir".
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {props.items.map((m, idx) => (
              <li
                key={m.id}
                className="group relative overflow-hidden rounded-md border border-border bg-card"
              >
                {m.previewUrl ? (
                  <img
                    src={m.previewUrl}
                    alt={m.alt ?? ""}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="h-28 w-full bg-muted" />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => props.onMove(m.id, -1)}
                      disabled={idx === 0}
                      className="rounded px-1.5 py-0.5 hover:bg-white/20 disabled:opacity-40"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onMove(m.id, 1)}
                      disabled={idx === props.items.length - 1}
                      className="rounded px-1.5 py-0.5 hover:bg-white/20 disabled:opacity-40"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onRemove(m.id)}
                    className="rounded px-1.5 py-0.5 hover:bg-white/20"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {props.error instanceof Error && (
        <p className="mt-2 text-xs text-destructive">{props.error.message}</p>
      )}
    </section>
  );
}