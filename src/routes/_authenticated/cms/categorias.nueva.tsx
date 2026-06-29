import { createFileRoute } from "@tanstack/react-router";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { CATEGORY_FIELDS } from "@/lib/cms/editor-fields";

export const Route = createFileRoute("/_authenticated/cms/categorias/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva categoría · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <EntityEditor
      table="business_categories"
      title="Categoría"
      backTo="/cms/categorias"
      listQueryKey="categories"
      fields={CATEGORY_FIELDS}
    />
  ),
});
