/**
 * BusinessMediaPanels — Paneles de logo, portada y galería para una
 * empresa. Sube al bucket `companies` con signed upload URLs. Autorización
 * server-side admite admins/editores O dueños (≥editor).
 */
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listBusinessMedia,
  registerBusinessMedia,
  removeBusinessMedia,
  reorderBusinessGallery,
  signBusinessImageUpload,
} from "@/lib/cms/businesses-media.functions";
import {
  compressImageIfNeeded,
  validateImageFile,
  withRetry,
} from "@/lib/cms/image-upload";

type MediaRow = Awaited<ReturnType<typeof listBusinessMedia>>[number];

interface Props {
  businessId: string;
  onChanged?: () => void;
}

export function BusinessMediaPanels({ businessId, onChanged }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBusinessMedia);
  const signFn = useServerFn(signBusinessImageUpload);
  const registerFn = useServerFn(registerBusinessMedia);
  const removeFn = useServerFn(removeBusinessMedia);
  const reorderFn = useServerFn(reorderBusinessGallery);

  const media = useQuery({
    queryKey: ["cms", "business_media", businessId],
    queryFn: () => listFn({ data: { businessId } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: ["cms", "business_media", businessId],
    });
    onChanged?.();
  };

  const uploadOne = async (
    file: File,
    role: "logo" | "cover" | "gallery",
  ) => {
    const invalid = validateImageFile(file);
    if (invalid) throw new Error(invalid.reason);
    const prepared = await compressImageIfNeeded(file);
    await withRetry(async () => {
      const signed = await signFn({
        data: {
          businessId,
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
          businessId,
          storagePath: signed.path,
          role,
          alt: file.name,
          mime: prepared.type,
          sizeBytes: prepared.size,
        },
      });
    });
  };

  const singleUpload = useMutation({
    mutationFn: async (v: { file: File; role: "logo" | "cover" }) =>
      uploadOne(v.file, v.role),
    onSuccess: (_res, v) => {
      invalidate();
      toast.success(`${v.role === "logo" ? "Logo" : "Portada"} actualizada.`);
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
    mutationFn: (businessMediaId: string) =>
      removeFn({ data: { businessMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderFn({ data: { businessId, orderedIds } }),
    onSuccess: invalidate,
  });

  const rows = media.data ?? [];
  const logo = rows.find((r) => r.role === "logo") ?? null;
  const cover = rows.find((r) => r.role === "cover") ?? null;
  const gallery = rows.filter((r) => r.role === "gallery");

  return (
    <div className="space-y-6">
      <SinglePanel
        title="Logo"
        subtitle="Imagen cuadrada que representa a la empresa."
        media={logo}
        onUpload={(f) => singleUpload.mutate({ file: f, role: "logo" })}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={singleUpload.isPending && singleUpload.variables?.role === "logo"}
        error={singleUpload.error}
        aspect="h-32 w-32 object-contain bg-muted"
      />
      <SinglePanel
        title="Portada"
        subtitle="Se usa como cover en la ficha pública."
        media={cover}
        onUpload={(f) => singleUpload.mutate({ file: f, role: "cover" })}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={singleUpload.isPending && singleUpload.variables?.role === "cover"}
        error={singleUpload.error}
        aspect="h-52 w-full object-cover"
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

function SinglePanel(props: {
  title: string;
  subtitle: string;
  media: MediaRow | null;
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  uploading: boolean;
  error: unknown;
  aspect: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{props.title}</h2>
          <p className="text-xs text-muted-foreground">{props.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={props.uploading}
          className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {props.uploading ? "Subiendo…" : props.media ? "Reemplazar" : "Subir"}
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
      {props.media?.previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={props.media.previewUrl}
            alt={props.media.alt ?? props.title}
            className={props.aspect}
          />
          <button
            type="button"
            onClick={() => props.media && props.onRemove(props.media.id)}
            className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
          Sin {props.title.toLowerCase()}
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
            Imágenes adicionales de la empresa. Arrastra o selecciona varias.
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
                      title="Mover a la izquierda"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onMove(m.id, 1)}
                      disabled={idx === props.items.length - 1}
                      className="rounded px-1.5 py-0.5 hover:bg-white/20 disabled:opacity-40"
                      title="Mover a la derecha"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onRemove(m.id)}
                    className="rounded px-1.5 py-0.5 hover:bg-white/20"
                    title="Eliminar"
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