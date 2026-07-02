/**
 * ProductEditor — Envuelve `EntityEditor` cargando el combo de empresas
 * y añadiendo paneles de portada y galería al pie del formulario.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { ProductMediaPanels } from "@/components/cms/ProductMediaPanels";
import { PRODUCT_FIELDS } from "@/lib/cms/editor-fields";
import { listBusinessesForProductSelect } from "@/lib/cms/products-media.functions";

interface Props {
  id?: string;
}

export function ProductEditor({ id }: Props) {
  const bizFn = useServerFn(listBusinessesForProductSelect);
  const businesses = useQuery({
    queryKey: ["cms", "businesses", "select"],
    queryFn: () => bizFn(),
  });

  const fields = useMemo(() => {
    return PRODUCT_FIELDS.map((f) =>
      f.name === "business_id"
        ? {
            ...f,
            options: (businesses.data ?? []).map((b) => ({
              value: b.id,
              label: b.display_name,
            })),
          }
        : f,
    );
  }, [businesses.data]);

  return (
    <EntityEditor
      table="products"
      id={id}
      title="Producto"
      backTo="/cms/productos"
      listQueryKey="products"
      fields={fields}
      renderExtras={({ id: entityId }) =>
        entityId ? <ProductMediaPanels productId={entityId} /> : null
      }
    />
  );
}