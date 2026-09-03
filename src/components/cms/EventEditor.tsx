/**
 * EventEditor — Envuelve `EntityEditor` cargando los combos de destino y
 * empresa organizadora, y añade el panel de atributos estructurados que
 * alimenta los filtros públicos de `/eventos`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { EventAttributesPanel } from "@/components/cms/EventAttributesPanel";
import { EVENT_FIELDS } from "@/lib/cms/editor-fields";
import { listDestinationsForSelect } from "@/lib/cms/businesses-media.functions";
import { listBusinessesForProductSelect } from "@/lib/cms/products-media.functions";

interface Props {
  id?: string;
}

export function EventEditor({ id }: Props) {
  const destinationsFn = useServerFn(listDestinationsForSelect);
  const businessesFn = useServerFn(listBusinessesForProductSelect);
  const destinations = useQuery({
    queryKey: ["cms", "destinations", "select"],
    queryFn: () => destinationsFn(),
  });
  const businesses = useQuery({
    queryKey: ["cms", "businesses", "select"],
    queryFn: () => businessesFn(),
  });

  const fields = useMemo(
    () =>
      EVENT_FIELDS.map((field) => {
        if (field.name === "destination_id") {
          return {
            ...field,
            options: (destinations.data ?? []).map((d) => ({ value: d.id, label: d.name })),
          };
        }
        if (field.name === "business_id") {
          return {
            ...field,
            options: (businesses.data ?? []).map((b) => ({ value: b.id, label: b.display_name })),
          };
        }
        return field;
      }),
    [destinations.data, businesses.data],
  );

  return (
    <EntityEditor
      table="events"
      id={id}
      title="Evento"
      description="Fiestas, festivales y celebraciones del Oriente Maya."
      backTo="/cms/eventos"
      listQueryKey="events"
      fields={fields}
      renderExtras={({ id: entityId }) =>
        entityId ? <EventAttributesPanel eventId={entityId} /> : null
      }
    />
  );
}
