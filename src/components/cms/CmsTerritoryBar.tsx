/**
 * CmsTerritoryBar — Barra territorial compartida de los listados del CMS.
 *
 * Muestra el destino (y zona) con el que está trabajando el editor y lo
 * mantiene entre pantallas y recargas. No altera plantillas públicas ni
 * permisos: sólo filtra lo que se lista en el CMS.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCmsTerritoryOptions } from "@/lib/cms/reads.functions";
import { useCmsTerritory } from "@/lib/cms/territory-context";
import {
  zonesForDestination,
  type TerritorialZone,
} from "@/lib/places/place-territory";

export const cmsSelectClass =
  "h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export interface CmsTerritoryOptions {
  destinations: Array<{ id: string; name: string }>;
  zones: TerritorialZone[];
  categories: Array<{ id: string; name: string; slug: string }>;
  businesses: Array<{ id: string; display_name: string; destination_id: string | null }>;
}

export function useCmsTerritoryOptions() {
  const fn = useServerFn(listCmsTerritoryOptions);
  const query = useQuery({
    queryKey: ["cms", "territory-options"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  const data = (query.data ?? {}) as Partial<CmsTerritoryOptions>;
  return {
    destinations: data.destinations ?? [],
    zones: (data.zones ?? []) as TerritorialZone[],
    categories: data.categories ?? [],
    businesses: data.businesses ?? [],
    isLoading: query.isLoading,
  };
}

interface Props {
  options: ReturnType<typeof useCmsTerritoryOptions>;
  /** Algunas secciones (empresas, productos, eventos) no segmentan por zona. */
  showZone?: boolean;
}

export function CmsTerritoryBar({ options, showZone = false }: Props) {
  const { territory, setDestination, setZone, clear } = useCmsTerritory();

  const zones = useMemo(
    () => zonesForDestination(options.zones, territory.destinationId),
    [options.zones, territory.destinationId],
  );

  const destinationName =
    options.destinations.find((d) => d.id === territory.destinationId)?.name ?? null;
  const zoneName = zones.find((z) => z.id === territory.zoneId)?.name ?? null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Destino de trabajo
          </span>
          <select
            className={cmsSelectClass}
            value={territory.destinationId}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Todo el territorio</option>
            {options.destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        {showZone && (
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Zona
            </span>
            <select
              className={cmsSelectClass}
              value={territory.zoneId}
              disabled={!territory.destinationId || zones.length === 0}
              onChange={(e) => setZone(e.target.value)}
            >
              <option value="">
                {!territory.destinationId
                  ? "Elige un destino primero"
                  : zones.length === 0
                    ? "Este destino no tiene zonas"
                    : "Todas las zonas"}
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {territory.destinationId && (
          <button
            type="button"
            onClick={clear}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            Ver todo el territorio
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {destinationName
          ? `Trabajando en: ${destinationName}${zoneName ? ` · ${zoneName}` : ""}. Se recuerda al cambiar de sección o refrescar.`
          : "Elige un destino para que el CMS recuerde con qué territorio estás trabajando."}
      </p>
    </div>
  );
}
