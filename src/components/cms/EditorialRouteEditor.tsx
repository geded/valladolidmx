/**
 * EditorialRouteEditor — Editor CMS de Rutas / Itinerarios (Lote 3C).
 * Reutiliza `EntityEditor` (workflow, auditoría y transiciones oficiales)
 * y añade el panel de paradas. No crea motores ni editores paralelos.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor, type EditorField } from "@/components/cms/EntityEditor";
import { listDestinationsForSelect } from "@/lib/cms/businesses-media.functions";
import { EditorialRouteStopsPanel } from "@/components/cms/EditorialRouteStopsPanel";

const BASE_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre de la ruta", type: "text", required: true },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL público: /rutas/mi-ruta",
  },
  { name: "summary", label: "Resumen", type: "textarea" },
  { name: "body", label: "Texto editorial", type: "textarea" },
  {
    name: "origin_destination_id",
    label: "Destino de salida",
    type: "select",
    options: [],
    helpText: "Punto de partida sugerido del itinerario.",
  },
  { name: "duration_days", label: "Duración (días)", type: "number" },
  { name: "duration_hours", label: "Duración (horas)", type: "number" },
  {
    name: "pace",
    label: "Ritmo",
    type: "select",
    options: [
      { value: "", label: "Sin definir" },
      { value: "relajado", label: "Relajado" },
      { value: "moderado", label: "Moderado" },
      { value: "intenso", label: "Intenso" },
    ],
  },
  {
    name: "difficulty",
    label: "Dificultad",
    type: "select",
    options: [
      { value: "", label: "Sin definir" },
      { value: "baja", label: "Baja" },
      { value: "media", label: "Media" },
      { value: "alta", label: "Alta" },
    ],
  },
  { name: "interests", label: "Intereses", type: "tags" },
  { name: "audiences", label: "Público", type: "tags" },
  { name: "seasons", label: "Temporadas", type: "tags" },
];

export function EditorialRouteEditor({ id }: { id?: string }) {
  const destinationsFn = useServerFn(listDestinationsForSelect);
  const destinations = useQuery({
    queryKey: ["cms", "destinations", "select"],
    queryFn: () => destinationsFn(),
  });

  const fields = useMemo(
    () =>
      BASE_FIELDS.map((f) =>
        f.name === "origin_destination_id"
          ? {
              ...f,
              options: [
                { value: "", label: "Sin destino de salida" },
                ...(destinations.data ?? []).map((d) => ({ value: d.id, label: d.name })),
              ],
            }
          : f,
      ),
    [destinations.data],
  );

  return (
    <EntityEditor
      table="editorial_routes"
      id={id}
      title="Ruta"
      description="Itinerario editorial publicado en /rutas. Las paradas enlazan a fichas ya publicadas."
      backTo="/cms/rutas"
      listQueryKey="editorial-routes"
      fields={fields}
      renderExtras={({ id: entityId }) =>
        entityId ? <EditorialRouteStopsPanel routeId={entityId} /> : null
      }
    />
  );
}
