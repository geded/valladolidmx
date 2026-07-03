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
import { useParams, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import type { PublicDestinationDTO, DestinationRelatedDTO } from "@/lib/destinations/public-reads.functions";
import { BusinessTile } from "@/components/surfaces/MarketplaceSurface";
import type { MarketplaceBusinessCard } from "@/lib/marketplace/marketplace-reads.functions";

export interface DestinationSurfaceProps {
  /** Slug del destino a renderizar. Cuando falta, se lee del router. */
  destinationSlug?: string;
  /** Datos enriquecidos desde la BD (Fase 4.1b). */
  dbData?: PublicDestinationDTO;
  /** Contenido relacionado (empresas y productos publicados del destino). */
  related?: DestinationRelatedDTO;
}

export function DestinationSurface({ destinationSlug, dbData, related }: DestinationSurfaceProps = {}) {
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
  const rel = related;
  const totalRelated = rel
    ? rel.hoteles.length + rel.restaurantes.length + rel.experiencias.length + rel.otras.length + rel.productos.length
    : 0;

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
          {rel ? (
            <div className="mt-10 space-y-10">
              <RelatedSection title="Hoteles y hospedajes" items={rel.hoteles} />
              <RelatedSection title="Restaurantes" items={rel.restaurantes} />
              <RelatedSection title="Experiencias y rutas" items={rel.experiencias} />
              <RelatedSection title="Otras empresas del destino" items={rel.otras} />
              {rel.productos.length > 0 ? (
                <section>
                  <h2 className="text-2xl">Productos destacados</h2>
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                    {rel.productos.slice(0, 8).map((p) => (
                      <li key={p.id} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
                        <Link to="/producto/$slug" params={{ slug: p.slug }} className="block">
                          <h3 className="text-base font-semibold">{p.name}</h3>
                          {p.tagline ? (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.tagline}</p>
                          ) : null}
                          <p className="mt-3 text-xs text-muted-foreground">
                            {p.business_name}
                            {p.price_amount != null ? ` · ${p.price_currency} ${p.price_amount}` : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {totalRelated === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay negocios ni experiencias publicadas para este destino.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Explora más del destino</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/hoteles" className="text-primary hover:underline">
                  Hoteles y hospedajes
                </Link>
              </li>
              <li>
                <Link to="/restaurantes" className="text-primary hover:underline">
                  Restaurantes recomendados
                </Link>
              </li>
              <li>
                <Link to="/experiencias" className="text-primary hover:underline">
                  Experiencias y rutas
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="text-primary hover:underline">
                  Todo el Marketplace
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </PublicShell>
  );
}

function RelatedSection({ title, items }: { title: string; items: MarketplaceBusinessCard[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-2xl">{title}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.slice(0, 6).map((b) => (
          <BusinessTile key={b.id} item={b} />
        ))}
      </ul>
    </section>
  );
}