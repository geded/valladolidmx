/**
 * DestinationMediaPanels — Panel de imagen destacada (hero) y galería
 * múltiple para un destino. Usa signed upload URLs devueltas por
 * `signDestinationImageUpload` y sube directo al bucket con el token.
 *
 * Alux IA (sólo editores/admins): al elegir una foto pequeña para la
 * imagen destacada, ofrece ampliarla. En galería, casilla para ampliar
 * fotos pequeñas automáticamente en lote.
 */
import { deriveVariantsInBackground } from "@/lib/media/derive-on-upload-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listDestinationMedia,
  registerDestinationMedia,
  removeDestinationMedia,
  reorderDestinationGallery,
  setDestinationMediaFocal,
  signDestinationImageUpload,
} from "@/lib/cms/destinations-media.functions";
import { prepareImageForRole, readImageDimensions, withRetry } from "@/lib/cms/image-upload";
import type { MediaRightsInput } from "@/lib/experience-builder/media-rights";
import { SinglePanel, GalleryPanel } from "@/components/cms/MediaUploadPanels";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FocalPointPicker, type FocalPoint } from "@/components/cms/FocalPointPicker";

interface Props {
  destinationId: string;
  onChanged?: () => void;
}

export function DestinationMediaPanels({ destinationId, onChanged }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listDestinationMedia);
  const signFn = useServerFn(signDestinationImageUpload);
  const registerFn = useServerFn(registerDestinationMedia);
  const removeFn = useServerFn(removeDestinationMedia);
  const reorderFn = useServerFn(reorderDestinationGallery);

  const media = useQuery({
    queryKey: ["cms", "destination_media", destinationId],
    queryFn: () => listFn({ data: { destinationId } }),
  });


  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: ["cms", "destination_media", destinationId],
    });
    onChanged?.();
  };

  const uploadOne = async (file: File, role: "hero" | "gallery", rights?: MediaRightsInput) => {
    if (!rights) throw new Error("Confirma la autoría y el permiso de uso antes de subir.");
    const prepared = await prepareImageForRole(file, role);
    const dimensions = await readImageDimensions(prepared);
    await withRetry(async () => {
      const signed = await signFn({
        data: {
          destinationId,
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
      const registered = await registerFn({
        data: {
          destinationId,
          storagePath: signed.path,
          role,
          alt: file.name,
          mime: prepared.type,
          sizeBytes: prepared.size,
          ...dimensions,
          rights,
        },
      });
      deriveVariantsInBackground(prepared, registered);
    });
  };

  const heroUpload = useMutation({
    mutationFn: async ({ file, rights }: { file: File; rights?: MediaRightsInput }) => uploadOne(file, "hero", rights),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen destacada actualizada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo subir."),
  });
  const galleryUpload = useMutation({
    mutationFn: async ({ files, rights }: { files: File[]; rights?: MediaRightsInput }) => {
      let ok = 0;
      const errors: string[] = [];
      for (const f of files) {
        try {
          await uploadOne(f, "gallery", rights ? { ...rights, alt: files.length > 1 ? f.name.replace(/\.[^.]+$/, "") : rights.alt } : undefined);
          ok += 1;
        } catch (err) {
          errors.push(`${f.name}: ${err instanceof Error ? err.message : "error"}`);
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo subir."),
  });
  const removeMut = useMutation({
    mutationFn: (destinationMediaId: string) => removeFn({ data: { destinationMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderFn({ data: { destinationId, orderedIds } }),
    onSuccess: invalidate,
  });

  const rows = media.data ?? [];
  const hero = rows.find((r) => r.role === "hero") ?? null;
  const gallery = rows.filter((r) => r.role === "gallery");

  return (
    <div className="space-y-6">
      <SinglePanel
        title="Imagen destacada"
        subtitle="Se usa como portada del destino en la home y en su ficha."
        role="hero"
        aspect="h-52 w-full object-cover"
        emptyLabel="Sin imagen destacada"
        media={hero}
        requireRights
        onUpload={(file, rights) => heroUpload.mutate({ file, rights })}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={heroUpload.isPending}
        error={heroUpload.error}
      />
      <GalleryPanel
        subtitle="Imágenes adicionales del destino. Arrastra o selecciona varias."
        items={gallery}
        requireRights
        onUpload={(files, rights) => galleryUpload.mutate({ files, rights })}
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
      <FocalAdjustPanel
        items={rows.filter((r) => Boolean(r.previewUrl))}
        onSaved={invalidate}
      />
    </div>
  );
}

/** Reacomodar fotos ya subidas: sólo cambia qué parte se ve, nunca el archivo. */
function FocalAdjustPanel({
  items,
  onSaved,
}: {
  items: { id: string; previewUrl: string | null; alt: string | null; focal: FocalPoint | null }[];
  onSaved: () => void;
}) {
  const focalFn = useServerFn(setDestinationMediaFocal);
  const [editing, setEditing] = useState<(typeof items)[number] | null>(null);
  const [point, setPoint] = useState<FocalPoint>({ x: 0.5, y: 0.5 });
  const save = useMutation({
    mutationFn: () => focalFn({ data: { destinationMediaId: editing!.id, ...point } }),
    onSuccess: () => {
      toast.success("Foto acomodada.");
      setEditing(null);
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar."),
  });
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-medium">Acomodar fotos</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Toca una foto para elegir qué parte debe verse siempre en la portada.
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => {
                setEditing(it);
                setPoint(it.focal ?? { x: 0.5, y: 0.5 });
              }}
              aria-label={`Acomodar ${it.alt ?? "foto"}`}
              className="block w-full overflow-hidden rounded-lg ring-focus"
            >
              <img src={it.previewUrl!} alt="" className="aspect-square w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Acomodar la foto</DialogTitle>
          </DialogHeader>
          {editing?.previewUrl ? (
            <FocalPointPicker src={editing.previewUrl} value={point} onChange={setPoint} />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
