/**
 * Ficha de la imagen en la Biblioteca multimedia.
 *
 * Permite ver la fotografía en grande, conocer dónde está usada realmente
 * (portadas y galerías del CMS) y corregir su información editorial.
 * Centraliza información, clasificación, derechos y aprobación gobernada.
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { getMediaDetail, listMediaUsage } from "@/lib/cms/media-usage.functions";
import { saveMediaMetadata } from "@/lib/cms/media-intelligence.functions";
import { transitionMediaStatus } from "@/lib/cms/media-review.functions";
import { approveStudioMedia } from "@/lib/experience-builder/studio-media.functions";
import { useAuth } from "@/hooks/useAuth";

type Nature = "documentary" | "conceptual" | "ai_generated";

const USAGE_OPTIONS = [
  ["cover", "Portada"],
  ["gallery", "Galería"],
  ["logo", "Logotipo"],
  ["hero", "Imagen principal"],
  ["social", "Redes sociales"],
  ["territory", "Territorio"],
  ["other", "Otro"],
] as const;

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

interface Props {
  mediaId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function MediaDetailsSheet({ mediaId, onOpenChange }: Props) {
  const detailFn = useServerFn(getMediaDetail);
  const usageFn = useServerFn(listMediaUsage);
  const saveFn = useServerFn(saveMediaMetadata);
  const transitionFn = useServerFn(transitionMediaStatus);
  const approveFn = useServerFn(approveStudioMedia);
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
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
  const [usageContext, setUsageContext] = useState("other");
  const [nature, setNature] = useState<Nature>("documentary");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [license, setLicense] = useState("");
  const [place, setPlace] = useState("");
  const [capturedOn, setCapturedOn] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const m = detail.data?.media;
    if (!m) return;
    setAlt(m.alt_text ?? "");
    setTitle(m.title ?? "");
    setCredit(m.credit ?? "");
    setDescription(m.description ?? "");
    setUsageContext(m.usage_context ?? "other");
    const rights = object(m.metadata.rights);
    const storedNature = rights.nature;
    setNature(
      storedNature === "conceptual" || storedNature === "ai_generated"
        ? storedNature
        : "documentary",
    );
    setAuthor(stringValue(rights.author));
    setSource(stringValue(rights.source));
    setLicense(stringValue(rights.license));
    setPlace(stringValue(rights.place));
    setCapturedOn(stringValue(rights.captured_on));
    setRightsConfirmed(rights.rights_confirmed === true);
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
          usage_context: usageContext === "other" ? null : usageContext,
          rights: {
            author: author.trim() || null,
            source: source.trim() || null,
            license: license.trim() || null,
            place: place.trim() || null,
            capturedOn: capturedOn.trim() || null,
            nature,
            rightsConfirmed,
          },
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
  const approvalChecks = media
    ? [
        [Boolean(alt.trim()), "Texto ALT"],
        [Boolean(credit.trim()), "Crédito"],
        [Boolean(media.original_checksum), "Archivo original verificado"],
        [rightsConfirmed, "Derechos confirmados"],
        [nature !== "documentary" || Boolean(author.trim()), "Autor"],
        [nature !== "documentary" || Boolean(source.trim()), "Procedencia"],
        [nature !== "documentary" || Boolean(license.trim()), "Licencia"],
      ] as const
    : [];
  const readyForApproval = approvalChecks.every(([ok]) => ok);

  const changeStatus = async (to: "in_review" | "published" | "draft") => {
    if (!mediaId || !media) return;
    try {
      setBusy(true);
      if (to === "published" && media.storage_bucket === "studio-media") {
        await approveFn({ data: { mediaId } });
      } else {
        await transitionFn({ data: { mediaId, to } });
      }
      await queryClient.invalidateQueries({ queryKey: ["cms", "media"] });
      await detail.refetch();
      toast.success(
        to === "published"
          ? "Imagen aprobada y publicada."
          : to === "in_review"
            ? "Imagen enviada a aprobación."
            : "Se solicitaron cambios.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={Boolean(mediaId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
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

            <section className="space-y-4 border-t border-border pt-5">
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
              <div className="space-y-2">
                <Label>Uso editorial</Label>
                <Select value={usageContext} onValueChange={setUsageContext}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USAGE_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-5">
              <div>
                <h3 className="text-sm font-semibold">Tipo, procedencia y derechos</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Una foto documental sólo puede publicarse con autor, procedencia y licencia reales.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tipo de foto</Label>
                <Select value={nature} onValueChange={(value) => setNature(value as Nature)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documentary">Documental / fotografía real</SelectItem>
                    <SelectItem value="conceptual">Conceptual / referencia</SelectItem>
                    <SelectItem value="ai_generated">Generada con IA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="media-author">Autor</Label>
                  <Input id="media-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media-license">Licencia o permiso</Label>
                  <Input id="media-license" value={license} onChange={(e) => setLicense(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media-source">Procedencia</Label>
                  <Input id="media-source" value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media-place">Lugar</Label>
                  <Input id="media-place" value={place} onChange={(e) => setPlace(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="media-date">Fecha de captura</Label>
                  <Input id="media-date" type="date" value={capturedOn} onChange={(e) => setCapturedOn(e.target.value)} />
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                <Checkbox
                  checked={rightsConfirmed}
                  onCheckedChange={(checked) => setRightsConfirmed(checked === true)}
                />
                <span>Confirmo que Valladolid.mx tiene autorización para usar esta imagen.</span>
              </label>
              <Button onClick={() => void save()} disabled={busy}>
                {busy ? "Guardando…" : "Guardar información"}
              </Button>
            </section>

            <section className="space-y-3 border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Revisión y aprobación</h3>
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {approvalChecks.map(([ok, label]) => (
                  <li key={label} className={ok ? "text-primary" : "text-destructive"}>
                    {ok ? "✓" : "•"} {label}
                  </li>
                ))}
              </ul>
              {nature !== "documentary" ? (
                <p className="text-xs text-destructive">
                  Las imágenes conceptuales o generadas con IA no son aptas para mostrarse como fotografía pública.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {media.status === "draft" ? (
                  <Button variant="outline" disabled={busy} onClick={() => void changeStatus("in_review")}>
                    Enviar a aprobación
                  </Button>
                ) : null}
                {isAdmin && media.status !== "published" ? (
                  <Button
                    disabled={busy || !readyForApproval || nature !== "documentary"}
                    onClick={() => void changeStatus("published")}
                  >
                    Aprobar y publicar
                  </Button>
                ) : null}
                {isAdmin && media.status === "in_review" ? (
                  <Button variant="outline" disabled={busy} onClick={() => void changeStatus("draft")}>
                    Pedir cambios
                  </Button>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
