/**
 * SmartTerritoryMap — G8-R1-F1J-HOME-PREMIUM-R2.
 *
 * El bloque `vmx.experience.map` de la Home no declara puntos estáticos:
 * su contenido es el corpus real publicado. Este puente resuelve los
 * puntos server-side (misma autoridad de elegibilidad y URL canónica que
 * los Smart Blocks) y los entrega al ÚNICO componente oficial de mapa,
 * `ExperienceMapBlock`. No es un mapa paralelo: es su fuente de datos.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resolveTerritoryMapPoints } from "@/lib/experience-builder/smart-blocks.functions";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";

export function SmartTerritoryMap({ config }: { config: Record<string, unknown> }) {
  const heading = typeof config.heading === "string" ? config.heading : null;
  const emptyMessage =
    typeof config.emptyMessage === "string"
      ? config.emptyMessage
      : "Aún no hay puntos disponibles para este mapa.";

  const resolve = useServerFn(resolveTerritoryMapPoints);
  const { data, isLoading } = useQuery({
    queryKey: ["territory-map-points"],
    queryFn: () => resolve(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <section className="space-y-4">
        {heading ? <h2 className="text-xl font-semibold text-foreground">{heading}</h2> : null}
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </section>
    );
  }

  const dto: ExperienceMapDTO = {
    variant: "multi",
    heading,
    emptyMessage,
    points: (data ?? []) as ExperienceMapDTO["points"],
  } as ExperienceMapDTO;

  return <ExperienceMapBlock dto={dto} />;
}
