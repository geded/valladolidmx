import { createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listBusinessesCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  display_name: string;
  status: string | null;
  verified: boolean | null;
  destination_id: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EmpresasPage,
});

function EmpresasPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="businesses"
      fn={listBusinessesCms}
      title="Empresas"
      stage="Ola 1 · Etapa 2 · Lecturas"
      description="Fichas editoriales de empresas locales."
      rowKey={(r) => r.id}
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.display_name}</span> },
        { key: "slug", header: "Slug", render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code> },
        { key: "verified", header: "Verificada", render: (r) => <span className="text-xs text-muted-foreground">{r.verified ? "Sí" : "No"}</span> },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        { key: "updated", header: "Actualizado", render: (r) => <span className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("es-MX")}</span> },
      ]}
    />
  );
}