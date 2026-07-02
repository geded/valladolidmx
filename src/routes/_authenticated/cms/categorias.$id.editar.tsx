import { createFileRoute } from "@tanstack/react-router";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { CATEGORY_FIELDS } from "@/lib/cms/editor-fields";

export const Route = createFileRoute("/_authenticated/cms/categorias/editar")({
  head: () => ({
    meta: [
      { title: "Editar categoría · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <EntityEditor
      table="business_categories"
      id={id}
      title="Categoría"
      backTo="/cms/categorias"
      listQueryKey="categories"
      fields={CATEGORY_FIELDS}
    />
  );
}
