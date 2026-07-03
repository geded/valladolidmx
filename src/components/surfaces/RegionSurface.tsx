/**
 * US-R3 · Ola 2 · Sub-ola 2.1 — RegionSurface
 *
 * Superficie oficial reproductiva de la página índice de una Región
 * turística (`/oriente-maya`, futuras). Adopción 1:1 del componente que
 * vivía en `src/routes/oriente-maya/index.tsx`. Sin nueva lógica ni
 * rediseño: mismo shell, mismo grid, mismos datos (mock actual).
 *
 * El slug se toma del prop `regionSlug` (cuando la ruta lo pasa) o del
 * catálogo `TOURISM_REGIONS`. Hoy sólo existe Oriente Maya; la
 * estructura permite futuras regiones sin tocar el bloque.
 */
import { PublicShell } from "@/components/discovery";
import { DestinoCard } from "@/components/cards/DestinoCard";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA, TOURISM_REGIONS } from "@/config/regions";
import type { Destination } from "@/types/territory";

export interface RegionSurfaceProps {
  /** Slug de la región a renderizar. Default: Oriente Maya. */
  regionSlug?: string;
  /** Destinos publicados provenientes de BD (fuente primaria). */
  destinations?: Destination[];
}

export function RegionSurface({ regionSlug, destinations }: RegionSurfaceProps = {}) {
  const region =
    TOURISM_REGIONS.find((r) => r.slug === regionSlug) ?? ORIENTE_MAYA;
  const fromDb = (destinations ?? []).filter((d) => d.region_slug === region.slug);
  const destinos = fromDb.length > 0
    ? fromDb
    : DESTINOS_MOCK.filter((d) => d.region_slug === region.slug);
  return (
    <PublicShell
      eyebrow="Región turística"
      title={region.name}
      description={region.short_description}
      crumbs={[{ label: region.name }]}
    >
      {destinos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay destinos publicados para esta región.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinos.map((d) => (
            <DestinoCard key={d.id} destination={d} />
          ))}
        </div>
      )}
    </PublicShell>
  );
}