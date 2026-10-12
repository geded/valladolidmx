/**
 * DestinationMediaPanels — Panel de imagen destacada (hero) y galería
 * múltiple para un destino. Usa signed upload URLs devueltas por
 * `signDestinationImageUpload` y sube directo al bucket con el token.
 *
 * Alux IA (sólo editores/admins): al elegir una foto pequeña para la
 * imagen destacada, ofrece ampliarla. En galería, casilla para ampliar
 * fotos pequeñas automáticamente en lote.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listDestinationMedia,
  registerDestinationMedia,
  removeDestinationMedia,
  reorderDestinationGallery,
  signDestinationImageUpload,
} from "@/lib/cms/destinations-media.functions";
import { prepareImageForRole, withRetry } from "@/lib/cms/image-upload";
import { SinglePanel, GalleryPanel } from "@/components/cms/MediaUploadPanels";

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

  const uploadOne = async (file: File, role: "hero" | "gallery") => {
    const prepared = await prepareImageForRole(file, role);
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
      await registerFn({
        data: {
          destinationId,
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo subir."),
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
        onUpload={(f) => heroUpload.mutate(f)}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={heroUpload.isPending}
        error={heroUpload.error}
      />
      <GalleryPanel
        subtitle="Imágenes adicionales del destino. Arrastra o selecciona varias."
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
