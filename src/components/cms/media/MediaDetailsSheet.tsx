/**
 * Ficha de la imagen en la Biblioteca multimedia.
 *
 * Permite ver la fotografía en grande, conocer dónde está usada realmente
 * (portadas y galerías del CMS) y corregir su información editorial.
 * No cambia estados de aprobación: eso sigue en las acciones de la lista.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { getMediaDetail, listMediaUsage } from "@/lib/cms/media-usage.functions";
import { saveMediaMetadata } from "@/lib/cms/media-intelligence.functions";

interface Props {
  mediaId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function MediaDetailsSheet({ mediaId, onOpenChange }: Props) {
  const detailFn = useServerFn(getMediaDetail);
  const usageFn = useServerFn(listMediaUsage);
  const saveFn = useServerFn(saveMediaMetadata);
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["cms", "media", "detail", mediaId],
    queryFn: () => detailFn({ data: { mediaId: mediaId! } }),
    enabled: Boolean(mediaId),
  });
  const usage = useQuery({
    queryKey: ["cms", "media", "usage", mediaId],
    queryFn: () => usageFn({ data: { mediaIds: [mediaId!] } }),
    enabled: Boolean(mediaId),
  });

  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [credit, setCredit] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const m = detail.data?.media;
    if (!m) return;
    setAlt(m.alt_text ?? "");
    setTitle(m.title ?? "");
    setCredit(m.credit ?? "");
    setDescription(m.description ?? "");
  }, [detail.data?.media]);

  const save = async () => {
    if (!mediaId) return;
    try {
      setBusy(true);
      await saveFn({
        data: {
          mediaId,
          alt_text: alt.trim() || null,
          title: title.trim() || null,
          credit: credit.trim() || null,
          description: description.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["cms", "media"] });
      toast.success("Información de la imagen guardada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la información.");
    } finally {
      setBusy(false);
    }
  };

  const media = detail.data?.media;
  const references = usage.data?.references ?? [];

  return (
    <Sheet open={Boolean(mediaId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Ficha de la imagen</SheetTitle>
        </SheetHeader>

        {detail.isLoading ? (
          <p className="py-8 text-sm text-muted-foreground">Cargando…</p>
        ) : !media ? (
          <p className="py-8 text-sm text-muted-foreground">No se pudo abrir esta imagen.</p>
        ) : (
          <div className="space-y-6 py-4">
            {detail.data?.previewUrl ? (
              <img
                src={detail.data.previewUrl}
                alt={media.alt_text ?? ""}
                className="w-full rounded-xl border border-border object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
                Sin vista previa
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {media.width && media.height ? `${media.width}×${media.height} · ` : ""}
              {media.mime_type ?? "imagen"} · estado {media.status ?? "—"} · revisión{" "}
              {media.review_state ?? "—"}
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Dónde se usa</h3>
              {usage.isLoading ? (
                <p className="text-sm text-muted-foreground">Buscando…</p>
              ) : references.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no está usada en ninguna ficha.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {references.map((r, i) => (
                    <li key={`${r.role}-${r.family}-${r.entityLabel}-${i}`}>
                      <span className="text-muted-foreground">
                        {r.role} · {r.family}:{" "}
                      </span>
                      {r.href ? (
                        <Link to={r.href} className="font-medium underline underline-offset-2">
                          {r.entityLabel}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.entityLabel}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Información de la foto</h3>
              <div className="space-y-2">
                <Label htmlFor="media-alt">Texto alternativo (ALT)</Label>
                <Textarea
                  id="media-alt"
                  value={alt}
                  rows={3}
                  onChange={(e) => setAlt(e.target.value)}
                />
                {media.alt_text_ai && media.alt_text_source !== "human" ? (
                  <p className="text-xs text-muted-foreground">Sugerencia IA: {media.alt_text_ai}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="media-title">Título</Label>
                <Input
                  id="media-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="media-credit">Crédito</Label>
                <Input
                  id="media-credit"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="media-description">Descripción</Label>
                <Textarea
                  id="media-description"
                  value={description}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button onClick={() => void save()} disabled={busy}>
                {busy ? "Guardando…" : "Guardar información"}
              </Button>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
