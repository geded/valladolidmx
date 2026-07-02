/**
 * ZoneMediaPanels — Panel de imagen destacada (hero) y galería para una
 * zona. Réplica exacta del patrón de `DestinationMediaPanels`.
 */
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listZoneMedia,
  registerZoneMedia,
  removeZoneMedia,
  reorderZoneGallery,
  signZoneImageUpload,
} from "@/lib/cms/zones-media.functions";
import { prepareImageForRole, withRetry } from "@/lib/cms/image-upload";

type MediaRow = Awaited<ReturnType<typeof listZoneMedia>>[number];

interface Props {
  zoneId: string;
  onChanged?: () => void;
}

export function ZoneMediaPanels({ zoneId, onChanged }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listZoneMedia);
  const signFn = useServerFn(signZoneImageUpload);
  const registerFn = useServerFn(registerZoneMedia);
  const removeFn = useServerFn(removeZoneMedia);
  const reorderFn = useServerFn(reorderZoneGallery);

  const media = useQuery({
    queryKey: ["cms", "destination_zone_media", zoneId],
    queryFn: () => listFn({ data: { zoneId } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: ["cms", "destination_zone_media", zoneId],
    });
    onChanged?.();
  };

  const uploadOne = async (file: File, role: "hero" | "gallery") => {
    const prepared = await prepareImageForRole(file, role);
    await withRetry(async () => {
      const signed = await signFn({
        data: { zoneId, filename: prepared.name, contentType: prepared.type },
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
          zoneId,
          storagePath: signed.path,
          role,
          alt: file.name,
          mime: prepared.type,
          sizeBytes: prepared.size,
        },
      });
    });
  };

  const heroUpload = useMutation({
    mutationFn: async (file: File) => uploadOne(file, "hero"),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen destacada actualizada.");
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
        toast.success(
          `${res.ok} imagen${res.ok === 1 ? "" : "es"} subida${res.ok === 1 ? "" : "s"}.`,
        );
      for (const msg of res.errors) toast.error(msg);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo subir."),
  });
  const removeMut = useMutation({
    mutationFn: (zoneMediaId: string) => removeFn({ data: { zoneMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderFn({ data: { zoneId, orderedIds } }),
    onSuccess: invalidate,
  });

  const rows = media.data ?? [];
  const hero = rows.find((r) => r.role === "hero") ?? null;
  const gallery = rows.filter((r) => r.role === "gallery");

  return (
    <div className="space-y-6">
      <HeroPanel
        hero={hero}
        onUpload={(f) => heroUpload.mutate(f)}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={heroUpload.isPending}
        error={heroUpload.error}
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

function HeroPanel(props: {
  hero: MediaRow | null;
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
          <h2 className="text-sm font-semibold tracking-tight">
            Imagen destacada
          </h2>
          <p className="text-xs text-muted-foreground">
            Se usa como portada de la zona en la ficha del destino.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={props.uploading}
          className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {props.uploading
            ? "Subiendo…"
            : props.hero
              ? "Reemplazar"
              : "Subir"}
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
      {props.hero?.previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={props.hero.previewUrl}
            alt={props.hero.alt ?? "hero"}
            className="h-52 w-full object-cover"
          />
          <button
            type="button"
            onClick={() => props.hero && props.onRemove(props.hero.id)}
            className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
          Sin imagen destacada
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
            Imágenes adicionales de la zona. Arrastra o selecciona varias.
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