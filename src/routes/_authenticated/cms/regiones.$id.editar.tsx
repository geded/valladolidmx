import { createFileRoute } from "@tanstack/react-router";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { REGION_FIELDS } from "@/lib/cms/editor-fields";

export const Route = createFileRoute("/_authenticated/cms/regiones/editar")({
  head: () => ({
    meta: [
      { title: "Editar región · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <EntityEditor
      table="tourism_regions"
      id={id}
      title="Región turística"
      backTo="/cms/regiones"
      listQueryKey="regions"
      fields={REGION_FIELDS}
    />
  );
}
