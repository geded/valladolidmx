/**
 * RegionEditor — Envuelve `EntityEditor` cargando dinámicamente el
 * catálogo de estados para el campo `state_id`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityEditor } from "@/components/cms/EntityEditor";
import { REGION_FIELDS } from "@/lib/cms/editor-fields";
import { listStatesForSelect } from "@/lib/cms/destinations-media.functions";

interface Props {
  id?: string;
}

export function RegionEditor({ id }: Props) {
  const statesFn = useServerFn(listStatesForSelect);
  const states = useQuery({
    queryKey: ["cms", "states", "select"],
    queryFn: () => statesFn(),
  });

  const fields = useMemo(() => {
    return REGION_FIELDS.map((f) =>
      f.name === "state_id"
        ? {
            ...f,
            options: (states.data ?? []).map((s) => ({
              value: s.id,
              label: `${s.name} (${s.iso_code})`,
            })),
          }
        : f,
    );
  }, [states.data]);

  return (
    <EntityEditor
      table="tourism_regions"
      id={id}
      title="Región turística"
      backTo="/cms/regiones"
      listQueryKey="regions"
      fields={fields}
    />
  );
}