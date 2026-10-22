/**
 * BusinessMediaPanels — Paneles de logo, portada y galería para una
 * empresa. Sube al bucket `companies` con signed upload URLs. Autorización
 * server-side admite admins/editores O dueños (≥editor).
 *
 * Alux IA (sólo editores/admins): al elegir una foto pequeña para logo o
 * portada, ofrece ampliarla. En galería, casilla para ampliar fotos pequeñas
 * automáticamente en lote.
 */
import { deriveVariantsInBackground } from "@/lib/media/derive-on-upload-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listBusinessMedia,
  registerBusinessMedia,
  removeBusinessMedia,
  reorderBusinessGallery,
  signBusinessImageUpload,
} from "@/lib/cms/businesses-media.functions";
import { prepareImageForRole, readImageDimensions, withRetry } from "@/lib/cms/image-upload";
import { SinglePanel, GalleryPanel } from "@/components/cms/MediaUploadPanels";

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

  const uploadOne = async (file: File, role: "logo" | "cover" | "gallery") => {
    const prepared = await prepareImageForRole(file, role);
    const dims = await readImageDimensions(prepared);
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
      const registered = await registerFn({
        data: {
          businessId,
          storagePath: signed.path,
          role,
          alt: file.name,
          mime: prepared.type,
          sizeBytes: prepared.size,
          width: dims.width,
          height: dims.height,
        },
      });
      deriveVariantsInBackground(prepared, registered);
    });
  };

  const singleUpload = useMutation({
    mutationFn: async (v: { file: File; role: "logo" | "cover" }) => uploadOne(v.file, v.role),
    onSuccess: (_res, v) => {
      invalidate();
      toast.success(`${v.role === "logo" ? "Logo" : "Portada"} actualizada.`);
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
    mutationFn: (businessMediaId: string) => removeFn({ data: { businessMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderFn({ data: { businessId, orderedIds } }),
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
        role="logo"
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
        role="cover"
        media={cover}
        onUpload={(f) => singleUpload.mutate({ file: f, role: "cover" })}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={singleUpload.isPending && singleUpload.variables?.role === "cover"}
        error={singleUpload.error}
        aspect="h-52 w-full object-cover"
      />
      <GalleryPanel
        subtitle="Imágenes adicionales de la empresa. Arrastra o selecciona varias."
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
