/**
 * ProductMediaPanels — Portada y galería de un producto. Sube al bucket
 * `products` con signed upload URLs. Autorización server-side admite
 * admins/editores O dueños (≥editor) de la empresa asociada.
 *
 * Alux IA (sólo editores/admins): al elegir una foto pequeña para la
 * portada, ofrece ampliarla. En galería, casilla para ampliar fotos
 * pequeñas automáticamente en lote.
 */
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
import { prepareImageForRole, withRetry } from "@/lib/cms/image-upload";
import { SinglePanel, GalleryPanel } from "@/components/cms/MediaUploadPanels";

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
    mutationFn: (productMediaId: string) => removeFn({ data: { productMediaId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Imagen eliminada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderFn({ data: { productId, orderedIds } }),
    onSuccess: invalidate,
  });

  const rows = media.data ?? [];
  const cover = rows.find((r) => r.role === "cover") ?? null;
  const gallery = rows.filter((r) => r.role === "gallery");

  return (
    <div className="space-y-6">
      <SinglePanel
        title="Portada"
        subtitle="Imagen principal del producto."
        role="cover"
        aspect="h-52 w-full object-cover"
        emptyLabel="Sin portada"
        media={cover}
        onUpload={(f) => coverUpload.mutate(f)}
        onRemove={(id) => removeMut.mutate(id)}
        uploading={coverUpload.isPending}
        error={coverUpload.error}
      />
      <GalleryPanel
        subtitle="Imágenes adicionales del producto. Arrastra o selecciona varias."
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
