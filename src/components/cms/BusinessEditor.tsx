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
import { RelatedOverridesPanel } from "@/components/cms/RelatedOverridesPanel";
import { BusinessLocationPanel } from "@/components/cms/BusinessLocationPanel";
import { BUSINESS_FIELDS } from "@/lib/cms/editor-fields";
import {
  listBusinessCategoriesForSelect,
  listDestinationsForSelect,
} from "@/lib/cms/businesses-media.functions";
import { getBusinessPrimaryLocation } from "@/lib/cms/business-locations.functions";

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
        entityId ? (
          <>
            <LocationGate businessId={entityId} />
            <BusinessLocationPanel businessId={entityId} />
            <BusinessMediaPanels businessId={entityId} />
            <RelatedOverridesPanel entityType="business" entityId={entityId} />
          </>
        ) : (
          <NewBusinessLocationNotice />
        )
      }
    />
  );
}

function NewBusinessLocationNotice() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-900 dark:text-amber-200">
      <p className="font-semibold">Paso siguiente obligatorio: ubicación en el mapa</p>
      <p className="mt-1 text-xs">
        Al crear el borrador aparecerá el panel de <strong>Ubicación</strong>.
        Debes marcar el pin en el mapa antes de enviar a revisión o publicar.
        Alux usa esas coordenadas para calcular distancia, tiempo y cercanía
        al viajero.
      </p>
    </div>
  );
}

function LocationGate({ businessId }: { businessId: string }) {
  const readFn = useServerFn(getBusinessPrimaryLocation);
  const q = useQuery({
    queryKey: ["cms", "business", businessId, "primary-location"],
    queryFn: () => readFn({ data: { businessId } }),
  });
  const hasLocation =
    !!q.data && q.data.latitude != null && q.data.longitude != null;
  if (q.isLoading || hasLocation) return null;
  return (
    <div className="mb-4 rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
      <p className="font-semibold">Ubicación obligatoria</p>
      <p className="mt-1 text-xs">
        Este negocio aún no tiene coordenadas. No podrás enviarlo a revisión ni
        publicarlo hasta marcar el pin en el mapa abajo. Regla vinculante:
        Geolocation Mandatory.
      </p>
    </div>
  );
}