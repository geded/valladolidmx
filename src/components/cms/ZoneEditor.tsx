/**
 * ZoneEditor — Envuelve `EntityEditor` cargando dinámicamente el combo
 * de destinos para el campo `destination_id`.
 *
 * Al dar de alta una zona nueva hereda el destino de trabajo elegido en el
 * listado del CMS, para que Alux investigue con ese territorio como contexto
 * (por ejemplo, los barrios y colonias de Valladolid).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { ZONE_FIELDS } from "@/lib/cms/editor-fields";
import { listDestinationsForSelect } from "@/lib/cms/businesses-media.functions";
import { ZoneMediaPanels } from "@/components/cms/ZoneMediaPanels";
import { useCmsTerritory } from "@/lib/cms/territory-context";

interface Props {
  id?: string;
}

export function ZoneEditor({ id }: Props) {
  const destinationsFn = useServerFn(listDestinationsForSelect);
  const destinations = useQuery({
    queryKey: ["cms", "destinations", "select"],
    queryFn: () => destinationsFn(),
  });
  const { territory } = useCmsTerritory();

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

  const workingDestination = useMemo(
    () => (destinations.data ?? []).find((d) => d.id === territory.destinationId) ?? null,
    [destinations.data, territory.destinationId],
  );

  return (
    <EntityEditor
      table="destination_zones"
      id={id}
      title="Zona"
      description={
        workingDestination
          ? `Barrio o sub-área de ${workingDestination.name}.`
          : "Barrio o sub-área dentro de un destino."
      }
      backTo="/cms/zonas"
      listQueryKey="zones"
      fields={fields}
      {...(territory.destinationId
        ? { defaults: { destination_id: territory.destinationId } }
        : {})}
      {...(workingDestination ? { autofillDestination: workingDestination.name } : {})}
      renderExtras={({ id: entityId }) => (entityId ? <ZoneMediaPanels zoneId={entityId} /> : null)}
    />
  );
}
