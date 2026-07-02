/**
 * ZoneEditor — Envuelve `EntityEditor` cargando dinámicamente el combo
 * de destinos para el campo `destination_id`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { ZONE_FIELDS } from "@/lib/cms/editor-fields";
import { listDestinationsForSelect } from "@/lib/cms/businesses-media.functions";
import { ZoneMediaPanels } from "@/components/cms/ZoneMediaPanels";

interface Props {
  id?: string;
}

export function ZoneEditor({ id }: Props) {
  const destinationsFn = useServerFn(listDestinationsForSelect);
  const destinations = useQuery({
    queryKey: ["cms", "destinations", "select"],
    queryFn: () => destinationsFn(),
  });

  const fields = useMemo(() => {
    return ZONE_FIELDS.map((f) =>
      f.name === "destination_id"
        ? {
            ...f,
            options: (destinations.data ?? []).map((d) => ({
              value: d.id,
              label: d.name,
            })),
          }
        : f,
    );
  }, [destinations.data]);

  return (
    <EntityEditor
      table="destination_zones"
      id={id}
      title="Zona"
      backTo="/cms/zonas"
      listQueryKey="zones"
      fields={fields}
      renderExtras={({ id: entityId }) =>
        entityId ? <ZoneMediaPanels zoneId={entityId} /> : null
      }
    />
  );
}