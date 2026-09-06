import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listMediaCms } from "@/lib/cms/reads.functions";
import { suggestMediaAlt, suggestMediaAltBatch } from "@/lib/cms/media-intelligence.functions";
import { MediaTranslationsSheet } from "@/components/cms/media/MediaTranslationsSheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { uploadStudioMediaViaServer } from "@/lib/experience-builder/studio-media.functions";
import type { MediaRightsInput } from "@/lib/experience-builder/media-rights";
import { Loader2, Upload } from "lucide-react";

type Row = {
  id: string;
  kind: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
  alt_text_ai: string | null;
  alt_text_source: "none" | "ai_pending" | "ai" | "human" | null;
  review_state: "unreviewed" | "ai_suggested" | "approved" | "needs_revision" | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  status: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/media")({
  head: () => ({
    meta: [{ title: "Media · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MediaPage,
});

function SuggestAltButton({ mediaId, disabled }: { mediaId: string; disabled?: boolean }) {
  const fn = useServerFn(suggestMediaAlt);
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled || loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fn({ data: { mediaId, locale: "es" } });
          if ("skipped" in res && res.skipped) {
            toast.info("ALT humano preservado. La IA no lo sobrescribe.");
          } else {
            toast.success("Propuesta IA guardada. Revisa y aprueba en el editor.");
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Error al sugerir ALT");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Analizando…" : "Sugerir ALT"}
    </Button>
  );
}

function TranslateButton({ mediaId }: { mediaId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Traducir
      </Button>
      {open && <MediaTranslationsSheet mediaId={mediaId} onClose={() => setOpen(false)} />}
    </>
  );
}

function BatchToolbar() {
  const batch = useServerFn(suggestMediaAltBatch);
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={async () => {
        const raw = prompt(
          "IDs de media separados por coma (máx 25). Idiomas: es,en,fr,de,it,pt (o subconjunto).",
          "",
        );
        if (!raw) return;
        const mediaIds = raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 25);
        if (!mediaIds.length) return;
        try {
          setLoading(true);
          const r = await batch({
            data: { mediaIds, locales: ["es", "en"] },
          });
          toast.success(
            `Lote: ${r.ok}/${r.total} ok · ${r.skipped} preservados · ${r.failed} fallos`,
          );
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Error en lote");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Procesando…" : "Lote IA"}
    </Button>
  );
}

const MAX_BATCH_FILES = 10;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const value = String(reader.result ?? "");
      const comma = value.indexOf(",");
      if (comma < 0) reject(new Error("Formato de archivo inválido."));
      else resolve(value.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

function altFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(v\d+|conceptual|preview)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function AiConceptBatchUpload() {
  const upload = useServerFn(uploadStudioMediaViaServer);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, MAX_BATCH_FILES);
    if (!files.length || uploading) return;

    const invalid = files.find(
      (file) => !file.type.startsWith("image/") || file.size <= 0 || file.size > MAX_FILE_BYTES,
    );
    if (invalid) {
      toast.error(`${invalid.name}: usa una imagen válida de máximo 8 MB.`);
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let uploaded = 0;
    try {
      for (const file of files) {
        const rights: MediaRightsInput = {
          alt: altFromFilename(file.name) || "Imagen conceptual del Oriente Maya de Yucatán",
          author: "Valladolid.mx · generación asistida por IA",
          credit: "Imagen conceptual generada con IA para Valladolid.mx",
          source: "image-generation",
          license: "Uso interno temporal — no apta para producción",
          place: "Oriente Maya de Yucatán",
          capturedOn: null,
          nature: "ai_generated",
          rightsConfirmed: true,
          focalX: 0.5,
          focalY: 0.5,
        };
        await upload({
          data: {
            filename: file.name,
            mime: file.type,
            sizeBytes: file.size,
            bytesBase64: await fileToBase64(file),
            rights,
          },
        });
        uploaded += 1;
        setProgress({ done: uploaded, total: files.length });
      }
      toast.success(
        `${uploaded} imagen${uploaded === 1 ? "" : "es"} guardada${uploaded === 1 ? "" : "s"} como IA, conceptual${uploaded === 1 ? "" : "es"} y reemplazable${uploaded === 1 ? "" : "s"}.`,
      );
      window.location.reload();
    } catch (error) {
      toast.error(
        `Se cargaron ${uploaded} de ${files.length}. ${
          error instanceof Error ? error.message : "No se pudo completar el lote."
        }`,
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <Button
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        title="Máximo 10 imágenes por lote. Se guardan como borrador, IA y no aptas para producción."
      >
        {uploading ? (
          <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="mr-1 size-4" aria-hidden />
        )}
        {uploading ? `Subiendo ${progress.done}/${progress.total}` : "Subir imágenes IA"}
      </Button>
    </>
  );
}

function MediaHeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AiConceptBatchUpload />
      <BatchToolbar />
    </div>
  );
}

function MediaPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="media"
      fn={listMediaCms}
      title="Biblioteca multimedia"
      description="Media Intelligence Pipeline · IA propone, el editor decide."
      rowKey={(r) => r.id}
      emptyMessage="Sin activos multimedia todavía."
      headerActions={<MediaHeaderActions />}
      columns={[
        {
          key: "alt",
          header: "ALT",
          render: (r) => (
            <div className="max-w-[320px] space-y-1">
              <div className="font-medium leading-tight">
                {r.alt_text ?? <span className="text-muted-foreground italic">(sin ALT)</span>}
              </div>
              {r.alt_text_ai && r.alt_text_source !== "human" && (
                <div className="text-xs text-muted-foreground line-clamp-2">🤖 {r.alt_text_ai}</div>
              )}
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                origen: {r.alt_text_source ?? "none"} · revisión: {r.review_state ?? "unreviewed"}
              </div>
            </div>
          ),
        },
        {
          key: "kind",
          header: "Tipo",
          render: (r) => <span className="text-xs text-muted-foreground">{r.kind ?? "—"}</span>,
        },
        {
          key: "bucket",
          header: "Bucket",
          render: (r) => (
            <code className="text-xs text-muted-foreground">{r.storage_bucket ?? "—"}</code>
          ),
        },
        {
          key: "dim",
          header: "Dim.",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {r.width && r.height ? `${r.width}×${r.height}` : "—"}
            </span>
          ),
        },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        {
          key: "actions",
          header: "IA",
          render: (r) => (
            <div className="flex gap-1">
              <SuggestAltButton mediaId={r.id} />
              <TranslateButton mediaId={r.id} />
            </div>
          ),
        },
      ]}
    />
  );
}
