/**
 * ZoneMediaPanels — Panel de imagen destacada (hero) y galería para una
 * zona. Réplica exacta del patrón de `DestinationMediaPanels`.
 *
 * Alux IA (sólo editores/admins): al elegir una foto pequeña para la
 * imagen destacada, ofrece ampliarla. En galería, casilla para ampliar
 * fotos pequeñas automáticamente en lote.
 */
import { deriveVariantsInBackground } from "@/lib/media/derive-on-upload.client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listZoneMedia,
  registerZoneMedia,
  removeZoneMedia,
  reorderZoneGallery,
  signZoneImageUpload,
} from "@/lib/cms/zones-media.functions";
import { prepareImageForRole, withRetry } from "@/lib/cms/image-upload";
import { SinglePanel, GalleryPanel } from "@/components/cms/MediaUploadPanels";

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
      const registered = await registerFn({
        data: {
          zoneId,
          storagePath: signed.path,
          role,
          alt: file.name,
          mime: prepared.type,
          sizeBytes: prepared.size,
        },
      });
      deriveVariantsInBackground(prepared, registered);
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
    mutationFn: (zoneMediaId: string) => removeFn({ data: { zoneMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderFn({ data: { zoneId, orderedIds } }),
    onSuccess: invalidate,
  });

  const rows = media.data ?? [];
  const hero = rows.find((r) => r.role === "hero") ?? null;
  const gallery = rows.filter((r) => r.role === "gallery");

  return (
    <div className="space-y-6">
      <SinglePanel
        title="Imagen destacada"
        subtitle="Se usa como portada de la zona en la ficha del destino."
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
        subtitle="Imágenes adicionales de la zona. Arrastra o selecciona varias."
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
