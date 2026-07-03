/**
 * US-R3 · Ola 2 · Sub-ola 2.1 — DestinationSurface
 *
 * Superficie oficial reproductiva de la ficha pública de un Destino
 * (`/oriente-maya/{slug}`). Adopción 1:1 del componente que vivía en
 * `src/routes/oriente-maya/$destino.tsx`. Sin nueva lógica ni rediseño.
 *
 * El slug se toma del prop `destinationSlug` (cuando la ruta lo pasa)
 * o de los path params del router (cuando la superficie se renderiza
 * desde una composición cargada por kind). Falla cerrada: si no hay
 * destino, muestra el vacío editorial acordado — nunca revienta el
 * árbol de la página.
 */
import { useParams } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";

export interface DestinationSurfaceProps {
  /** Slug del destino a renderizar. Cuando falta, se lee del router. */
  destinationSlug?: string;
}

export function DestinationSurface({ destinationSlug }: DestinationSurfaceProps = {}) {
  const params = useParams({ strict: false }) as { destino?: string };
  const slug = destinationSlug ?? params.destino;
  const dest = slug
    ? DESTINOS_MOCK.find(
        (d) => d.slug === slug && d.region_slug === ORIENTE_MAYA.slug,
      )
    : undefined;

  if (!dest) {
    return (
      <PublicShell
        title="Destino no disponible"
        crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: "—" }]}
      >
        <p className="text-muted-foreground">
          Aún no publicamos esta página de destino.
        </p>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      eyebrow={ORIENTE_MAYA.name}
      title={dest.name}
      description={dest.tagline}
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: dest.name },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlaceholderImage
            palette={dest.hero_palette}
            label={dest.name}
            aspect="video"
          />
          <div className="mt-8">
            <h2 className="text-2xl">Lo esencial</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {dest.highlights.map((h: string) => (
                <li
                  key={h}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Próximamente en este destino</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· Hoteles del destino</li>
              <li>· Restaurantes recomendados</li>
              <li>· Experiencias y rutas</li>
              <li>· Reseñas resumidas por Alux</li>
            </ul>
            <div className="mt-4">
              <ComingSoonBadge label="Fase 1" />
            </div>
          </div>
        </aside>
      </div>
    </PublicShell>
  );
}