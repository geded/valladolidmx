/**
 * DestinationEditor — Envuelve `EntityEditor` cargando dinámicamente el
 * combo de regiones turísticas y añadiendo los paneles de imagen destacada
 * y galería debajo del formulario cuando estamos en modo edición.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { DestinationMediaPanels } from "@/components/cms/DestinationMediaPanels";
import { RelatedOverridesPanel } from "@/components/cms/RelatedOverridesPanel";
import { DESTINATION_FIELDS } from "@/lib/cms/editor-fields";
import { listTourismRegionsForSelect } from "@/lib/cms/destinations-media.functions";

interface Props {
  id?: string;
}

export function DestinationEditor({ id }: Props) {
  const regionsFn = useServerFn(listTourismRegionsForSelect);
  const regions = useQuery({
    queryKey: ["cms", "tourism_regions", "select"],
    queryFn: () => regionsFn(),
  });

  const fields = useMemo(() => {
    return DESTINATION_FIELDS.map((f) =>
      f.name === "tourism_region_id"
        ? {
            ...f,
            options: (regions.data ?? []).map((r) => ({
              value: r.id,
              label: r.name,
            })),
          }
        : f,
    );
  }, [regions.data]);

  return (
    <EntityEditor
      table="destinations"
      id={id}
      title="Destino"
      backTo="/cms/destinos"
      listQueryKey="destinations"
      fields={fields}
      renderExtras={({ id: entityId }) =>
        entityId ? (
          <>
            <DestinationMediaPanels destinationId={entityId} />
            <RelatedOverridesPanel entityType="destination" entityId={entityId} />
          </>
        ) : null
      }
    />
  );
}