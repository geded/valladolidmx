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
import type { PublicDestinationDTO } from "@/lib/destinations/public-reads.functions";

export interface DestinationSurfaceProps {
  /** Slug del destino a renderizar. Cuando falta, se lee del router. */
  destinationSlug?: string;
  /** Datos enriquecidos desde la BD (Fase 4.1b). */
  dbData?: PublicDestinationDTO;
}

export function DestinationSurface({ destinationSlug, dbData }: DestinationSurfaceProps = {}) {
  const params = useParams({ strict: false }) as { destino?: string };
  const slug = destinationSlug ?? params.destino;
  const mock = slug
    ? DESTINOS_MOCK.find(
        (d) => d.slug === slug && d.region_slug === ORIENTE_MAYA.slug,
      )
    : undefined;

  if (!dbData && !mock) {
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

  const name = dbData?.name ?? mock!.name;
  const tagline = dbData?.tagline ?? mock?.tagline ?? "";
  const description = dbData?.description ?? null;
  const highlights = (dbData?.highlights?.length ? dbData.highlights : mock?.highlights ?? []) as string[];
  const heroPalette = (dbData?.hero_palette ?? mock?.hero_palette ?? "territorio") as
    "territorio" | "selva" | "cenote" | "atardecer";
  const heroUrl = dbData?.hero_url ?? null;

  return (
    <PublicShell
      eyebrow={ORIENTE_MAYA.name}
      title={name}
      description={tagline}
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: name },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {heroUrl ? (
            <img
              src={heroUrl}
              alt={name}
              className="aspect-video w-full rounded-2xl border border-border/60 object-cover"
              loading="eager"
            />
          ) : (
            <PlaceholderImage palette={heroPalette} label={name} aspect="video" />
          )}
          {description ? (
            <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/90">
              {description}
            </p>
          ) : null}
          <div className="mt-8">
            <h2 className="text-2xl">Lo esencial</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {highlights.map((h: string) => (
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