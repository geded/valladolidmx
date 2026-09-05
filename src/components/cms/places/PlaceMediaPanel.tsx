/**
 * G8-Q2B · Panel de medios del lugar.
 *
 * Reutiliza el flujo gobernado G8-M1 (`MediaPickerDialog`): selección desde la
 * biblioteca o subida firmada. Prohibidos FileReader, `data:` URI y base64.
 * Un activo nuevo nace `draft`/`unreviewed` y no habilita publicación.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import {
  MediaPickerDialog,
  type PickedMedia,
} from "@/components/experience-builder/MediaPickerDialog";
import {
  attachPlaceMedia,
  deletePlaceMediaAsset,
  detachPlaceMedia,
  reorderPlaceMedia,
} from "@/lib/places/places-cms.functions";
import { PlaceSection, buttonClass } from "./PlaceSection";

export interface PlaceMediaRow {
  id: string;
  media_asset_id: string;
  role: string;
  sort_order: number;
}

export interface PlaceMediaAsset {
  id: string;
  storage_path: string;
  alt_text: string | null;
  review_state: string | null;
  status: string | null;
  metadata?: {
    temporary_placeholder?: boolean;
    generated_ai?: boolean;
    ai_generated?: boolean;
  } | null;
  is_demo_seed?: boolean | null;
  demo_seed_batch?: string | null;
}

/** Activo conceptual temporal generado con IA, pendiente de sustitución. */
function isTemporaryAiAsset(asset: PlaceMediaAsset | undefined): boolean {
  const meta = asset?.metadata ?? {};
  return (
    meta.temporary_placeholder === true || meta.generated_ai === true || meta.ai_generated === true
  );
}

interface Props {
  placeId: string;
  media: PlaceMediaRow[];
  assets: PlaceMediaAsset[];
  onChanged: () => void;
}

export function PlaceMediaPanel({ placeId, media, assets, onChanged }: Props) {
  const [picker, setPicker] = useState<null | "cover" | "gallery">(null);
  const attachFn = useServerFn(attachPlaceMedia);
  const detachFn = useServerFn(detachPlaceMedia);
  const reorderFn = useServerFn(reorderPlaceMedia);
  const deleteFn = useServerFn(deletePlaceMediaAsset);

  const byId = new Map(assets.map((a) => [a.id, a]));
  const cover = media.find((m) => m.role === "cover") ?? null;
  const gallery = media.filter((m) => m.role !== "cover");

  const attach = useMutation({
    mutationFn: (args: { mediaAssetId: string; role: "cover" | "gallery" }) =>
      attachFn({
        data: { place_id: placeId, media_asset_id: args.mediaAssetId, role: args.role },
      }),
    onSuccess: (res) => {
      onChanged();
      toast.success(
        res.approved
          ? "Imagen vinculada al lugar."
          : "Imagen vinculada como borrador: requiere aprobación editorial antes de publicar.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo vincular la imagen."),
  });

  const detach = useMutation({
    mutationFn: (mediaId: string) => detachFn({ data: { place_id: placeId, media_id: mediaId } }),
    onSuccess: () => {
      onChanged();
      toast.success("Imagen desvinculada. El activo original se conserva intacto.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo desvincular."),
  });

  const remove = useMutation({
    mutationFn: (args: { mediaId: string; mediaAssetId: string }) =>
      deleteFn({
        data: {
          place_id: placeId,
          media_id: args.mediaId,
          media_asset_id: args.mediaAssetId,
        },
      }),
    onSuccess: () => {
      onChanged();
      toast.success("Activo temporal borrado. Los activos oficiales aprobados no se tocan.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error && e.message === "official_asset_delete_blocked"
          ? "Es un activo oficial aprobado: sólo puede desasociarse, no borrarse."
          : e instanceof Error
            ? e.message
            : "No se pudo borrar el activo.",
      ),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      reorderFn({ data: { place_id: placeId, ordered_media_ids: ids } }),
    onSuccess: () => onChanged(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo reordenar."),
  });

  const move = (index: number, delta: number) => {
    const next = [...gallery];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    reorder.mutate(next.map((m) => m.id));
  };

  const onPick = (role: "cover" | "gallery") => (picked: PickedMedia) => {
    attach.mutate({ mediaAssetId: picked.id, role });
  };

  const renderAsset = (row: PlaceMediaRow) => {
    const asset = byId.get(row.media_asset_id);
    const approved = asset?.review_state === "approved";
    const temporary = isTemporaryAiAsset(asset);
    return (
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-medium">
            {asset?.alt_text || "Sin texto alternativo"}
          </p>
          {temporary ? (
            <span className="rounded-pill border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">
              Temporal · IA
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {approved ? "Aprobada" : "Pendiente de aprobación"} · {asset?.status ?? "draft"}
          {temporary ? " · pendiente de sustitución por fotografía real" : ""}
        </p>
      </div>
    );
  };

  const renderRowActions = (row: PlaceMediaRow, role: "cover" | "gallery") => (
    <>
      <button type="button" className={buttonClass} onClick={() => setPicker(role)}>
        Reemplazar
      </button>
      <button type="button" className={buttonClass} onClick={() => detach.mutate(row.id)}>
        Desasociar
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => remove.mutate({ mediaId: row.id, mediaAssetId: row.media_asset_id })}
      >
        Borrar
      </button>
    </>
  );

  return (
    <PlaceSection
      id="place-media"
      title="Medios"
      description="Portada y galería mediante el flujo gobernado. Cambiar la referencia nunca sobrescribe el activo anterior."
    >
      <div className="md:col-span-2 space-y-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Portada
            </h3>
            <button type="button" className={buttonClass} onClick={() => setPicker("cover")}>
              Seleccionar o subir imagen
            </button>
          </div>
          <div className="mt-3">
            {cover ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {renderAsset(cover)}
                <div className="flex items-center gap-2">{renderRowActions(cover, "cover")}</div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin portada seleccionada.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Galería
            </h3>
            <button type="button" className={buttonClass} onClick={() => setPicker("gallery")}>
              Seleccionar o subir imagen
            </button>
          </div>
          {gallery.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Sin imágenes en la galería.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {gallery.map((row, index) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center"
                >
                  {renderAsset(row)}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Subir posición"
                      className={buttonClass}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Bajar posición"
                      className={buttonClass}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                    {renderRowActions(row, "gallery")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={picker !== null}
        role={picker === "cover" ? "hero" : "gallery"}
        onClose={() => setPicker(null)}
        onPick={onPick(picker === "cover" ? "cover" : "gallery")}
      />
    </PlaceSection>
  );
}
