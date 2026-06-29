import { createFileRoute } from "@tanstack/react-router";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { REGION_FIELDS } from "@/lib/cms/editor-fields";

export const Route = createFileRoute("/_authenticated/cms/regiones/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva región · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <EntityEditor
      table="tourism_regions"
      title="Región turística"
      backTo="/cms/regiones"
      listQueryKey="regions"
      fields={REGION_FIELDS}
    />
  ),
});
