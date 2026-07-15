import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listMediaCms } from "@/lib/cms/reads.functions";
import {
  suggestMediaAlt,
  suggestMediaAltBatch,
} from "@/lib/cms/media-intelligence.functions";
import { MediaTranslationsSheet } from "@/components/cms/media/MediaTranslationsSheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

type Row = {
  id: string;
  kind: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
  alt_text_ai: string | null;
  alt_text_source: "none" | "ai_pending" | "ai" | "human" | null;
  review_state:
    | "unreviewed"
    | "ai_suggested"
    | "approved"
    | "needs_revision"
    | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  status: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/media")({
  head: () => ({
    meta: [
      { title: "Media · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
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
          toast.error(
            err instanceof Error ? err.message : "Error al sugerir ALT",
          );
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
      {open && (
        <MediaTranslationsSheet mediaId={mediaId} onClose={() => setOpen(false)} />
      )}
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

function MediaPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="media"
      fn={listMediaCms}
      title="Biblioteca multimedia"

      description="Media Intelligence Pipeline · IA propone, el editor decide."
      rowKey={(r) => r.id}
      emptyMessage="Sin activos multimedia todavía."
      headerActions={<BatchToolbar />}
      columns={[
        {
          key: "alt",
          header: "ALT",
          render: (r) => (
            <div className="max-w-[320px] space-y-1">
              <div className="font-medium leading-tight">
                {r.alt_text ?? (
                  <span className="text-muted-foreground italic">
                    (sin ALT)
                  </span>
                )}
              </div>
              {r.alt_text_ai && r.alt_text_source !== "human" && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  🤖 {r.alt_text_ai}
                </div>
              )}
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                origen: {r.alt_text_source ?? "none"} · revisión:{" "}
                {r.review_state ?? "unreviewed"}
              </div>
            </div>
          ),
        },
        { key: "kind", header: "Tipo", render: (r) => <span className="text-xs text-muted-foreground">{r.kind ?? "—"}</span> },
        { key: "bucket", header: "Bucket", render: (r) => <code className="text-xs text-muted-foreground">{r.storage_bucket ?? "—"}</code> },
        { key: "dim", header: "Dim.", render: (r) => <span className="text-xs text-muted-foreground">{r.width && r.height ? `${r.width}×${r.height}` : "—"}</span> },
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