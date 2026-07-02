/**
 * BusinessEditor — Envuelve `EntityEditor` cargando dinámicamente los
 * combos de destino y categoría, y añadiendo paneles de logo, portada
 * y galería debajo del formulario cuando estamos en modo edición.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { BusinessMediaPanels } from "@/components/cms/BusinessMediaPanels";
import { BUSINESS_FIELDS } from "@/lib/cms/editor-fields";
import {
  listBusinessCategoriesForSelect,
  listDestinationsForSelect,
} from "@/lib/cms/businesses-media.functions";

interface Props {
  id?: string;
}

export function BusinessEditor({ id }: Props) {
  const destsFn = useServerFn(listDestinationsForSelect);
  const catsFn = useServerFn(listBusinessCategoriesForSelect);

  const destinations = useQuery({
    queryKey: ["cms", "destinations", "select"],
    queryFn: () => destsFn(),
  });
  const categories = useQuery({
    queryKey: ["cms", "business_categories", "select"],
    queryFn: () => catsFn(),
  });

  const fields = useMemo(() => {
    return BUSINESS_FIELDS.map((f) => {
      if (f.name === "destination_id") {
        return {
          ...f,
          options: (destinations.data ?? []).map((d) => ({
            value: d.id,
            label: d.name,
          })),
        };
      }
      if (f.name === "primary_category_id") {
        return {
          ...f,
          options: (categories.data ?? []).map((c) => ({
            value: c.id,
            label: c.name,
          })),
        };
      }
      return f;
    });
  }, [destinations.data, categories.data]);

  return (
    <EntityEditor
      table="businesses"
      id={id}
      title="Empresa"
      backTo="/cms/empresas"
      listQueryKey="businesses"
      fields={fields}
      renderExtras={({ id: entityId }) =>
        entityId ? <BusinessMediaPanels businessId={entityId} /> : null
      }
    />
  );
}