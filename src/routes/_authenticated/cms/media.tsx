import { createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listMediaCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  kind: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
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

function MediaPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="media"
      fn={listMediaCms}
      title="Biblioteca multimedia"

      description="Activos almacenados en los buckets oficiales de Storage."
      rowKey={(r) => r.id}
      emptyMessage="Sin activos. La carga se habilitará en Etapa 3."
      columns={[
        { key: "alt", header: "Descripción", render: (r) => <span className="font-medium">{r.alt_text ?? "(sin alt)"}</span> },
        { key: "kind", header: "Tipo", render: (r) => <span className="text-xs text-muted-foreground">{r.kind ?? "—"}</span> },
        { key: "bucket", header: "Bucket", render: (r) => <code className="text-xs text-muted-foreground">{r.storage_bucket ?? "—"}</code> },
        { key: "dim", header: "Dim.", render: (r) => <span className="text-xs text-muted-foreground">{r.width && r.height ? `${r.width}×${r.height}` : "—"}</span> },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
      ]}
    />
  );
}