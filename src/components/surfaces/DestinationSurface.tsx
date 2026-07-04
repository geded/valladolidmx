/**
 * H-03 · Ola I3.a — DestinationSurface (Plantilla Madre)
 *
 * Segunda Plantilla Madre de referencia, tras BusinessSurface (I2.d).
 * Sigue el mismo patrón arquitectónico aprobado por el Founder:
 *
 *   1. Provider de contexto (`DestinationSurfaceProvider`).
 *   2. Adaptadores de datos (`destination-to-blocks.ts`).
 *   3. Composición de bloques oficiales del Experience Builder.
 *   4. Cero lógica visual propia.
 *   5. Orquestación pura.
 *
 * Regla de Herencia de Plantillas (Founder, tras I2.d): las Plantillas
 * Madre orquestan; los bloques presentan; los motores deciden. Ningún
 * componente presentacional se dibuja aquí — se compone desde la
 * Biblioteca Oficial del Experience Builder.
 *
 * EXCEPCIÓN ARQUITECTÓNICA DOCUMENTADA (transitoria, I3.b):
 * las secciones "Empresas del destino / Eventos próximos / Productos
 * destacados" aún se renderizan con `<section>` + tiles porque la
 * Biblioteca no expone todavía `vmx.experience.related-collection`
 * (bloque candidato — evolucionar antes de duplicar Products/Events).
 * Este JSX transitorio queda aislado en `LegacyRelatedComposition`,
 * marcado con TODO y se elimina al cerrar I3.b.
 */
import { createContext, useContext } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import type {
  PublicDestinationDTO,
  DestinationRelatedDTO,
} from "@/lib/destinations/public-reads.functions";
import { BusinessTile } from "@/components/surfaces/MarketplaceSurface";
import { DiscoveryNavigatorBlock } from "@/components/experience-builder/blocks/DiscoveryNavigatorBlock";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceSection } from "@/components/experience-builder/blocks/experience-section/ExperienceSection";
import { ExperienceInfoGrid } from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGrid";
import { ExperienceCtaBar } from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar";
import {
  toDestinationBlockInput,
  destinationToHeroDTO,
  destinationToSubnavDTO,
  destinationToDescriptionSectionDTO,
  destinationToHighlightsInfoGridDTO,
  destinationToCtaBarDTO,
} from "@/lib/experience-builder/adapters/destination-to-blocks";

/* ------------------------------------------------------------------ *
 * Contexto — poblado por la ruta pública (SSR-safe).
 * ------------------------------------------------------------------ */

export interface DestinationSurfaceContextValue {
  db: PublicDestinationDTO | null;
  related: DestinationRelatedDTO | null;
  slug: string | null;
}

export const DestinationSurfaceContext =
  createContext<DestinationSurfaceContextValue | null>(null);

export function DestinationSurfaceProvider({
  db,
  related,
  slug,
  children,
}: DestinationSurfaceContextValue & { children: React.ReactNode }) {
  return (
    <DestinationSurfaceContext.Provider value={{ db, related, slug }}>
      {children}
    </DestinationSurfaceContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 * Surface
 * ------------------------------------------------------------------ */

export interface DestinationSurfaceProps {
  /** Slug del destino a renderizar. Cuando falta, se lee del router. */
  destinationSlug?: string;
  /** Datos enriquecidos desde la BD (Fase 4.1b). */
  dbData?: PublicDestinationDTO;
  /** Contenido relacionado (empresas y productos publicados del destino). */
  related?: DestinationRelatedDTO;
}

export function DestinationSurface({
  destinationSlug,
  dbData,
  related,
}: DestinationSurfaceProps = {}) {
  const params = useParams({ strict: false }) as { destino?: string };
  const ctx = useContext(DestinationSurfaceContext);
  const slug = destinationSlug ?? params.destino ?? ctx?.slug ?? undefined;
  const db = dbData ?? ctx?.db ?? null;
  const rel = related ?? ctx?.related ?? null;
  const mock = slug
    ? DESTINOS_MOCK.find(
        (d) => d.slug === slug && d.region_slug === ORIENTE_MAYA.slug,
      )
    : undefined;

  if (!db && !mock) {
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

  const input = toDestinationBlockInput(db, mock ?? null, {
    slug: slug ?? "",
    regionSlug: ORIENTE_MAYA.slug,
    regionName: ORIENTE_MAYA.name,
    counts: {
      hoteles: rel?.hoteles.length ?? 0,
      restaurantes: rel?.restaurantes.length ?? 0,
      experiencias: rel?.experiencias.length ?? 0,
      otras: rel?.otras.length ?? 0,
      productos: rel?.productos.length ?? 0,
      eventos: rel?.eventos?.length ?? 0,
    },
  });

  const heroDto = destinationToHeroDTO(input);
  const subnavDto = destinationToSubnavDTO(input);
  const descriptionSection = destinationToDescriptionSectionDTO(input);
  const highlightsInfoGrid = destinationToHighlightsInfoGridDTO(input);
  const ctaBarDto = destinationToCtaBarDTO(input);

  return (
    <PublicShell
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: input.name },
      ]}
      useContextCrumbs
    >
      <ExperienceHero dto={heroDto} headingLevel="h1" />

      <ExperienceSubnav dto={subnavDto} className="mt-6 mb-6" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          {descriptionSection || highlightsInfoGrid ? (
            <section id="resumen" data-eb-anchor className="scroll-mt-24">
              {descriptionSection ? <ExperienceSection dto={descriptionSection} /> : null}
              {highlightsInfoGrid ? (
                <ExperienceInfoGrid dto={highlightsInfoGrid} className="mt-6" />
              ) : null}
            </section>
          ) : null}

          {rel ? <LegacyRelatedComposition related={rel} /> : null}
        </div>
        <aside className="space-y-4">
          <DiscoveryNavigatorBlock
            config={{
              title: `Explora ${input.name}`,
              scope: "destination",
              manualDestinationSlug: slug ?? undefined,
              ctaLabel: "Ver todo el Marketplace",
              ctaHref: slug
                ? `/marketplace?destino=${encodeURIComponent(slug)}`
                : "/marketplace",
            }}
          />
        </aside>
      </div>

      <ExperienceCtaBar dto={ctaBarDto} />
    </PublicShell>
  );
}

/* ------------------------------------------------------------------ *
 * EXCEPCIÓN ARQUITECTÓNICA DOCUMENTADA (transitoria, retirar en I3.b)
 *
 * Razón: la Biblioteca Oficial no expone todavía un bloque
 * `vmx.experience.related-collection` capaz de renderizar colecciones
 * heterogéneas (empresas + eventos + productos) con tiles del
 * marketplace. Crear ese bloque debe ser una evolución cuidadosa (no
 * duplicar Products/Events), por lo que se pospone a I3.b tras
 * aprobación explícita del Founder. Mientras tanto, este JSX se
 * mantiene aislado — nunca en el árbol de orquestación principal — y
 * respeta el contrato visual actual (cero regresión).
 * ------------------------------------------------------------------ */
function LegacyRelatedComposition({ related }: { related: DestinationRelatedDTO }) {
  const totalRelated =
    related.hoteles.length +
    related.restaurantes.length +
    related.experiencias.length +
    related.otras.length +
    related.productos.length +
    (related.eventos?.length ?? 0);

  return (
    <div className="space-y-10">
      <section id="empresas" data-eb-anchor className="scroll-mt-24 space-y-10">
        <LegacyBusinessGroup title="Hoteles y hospedajes" items={related.hoteles} />
        <LegacyBusinessGroup title="Restaurantes" items={related.restaurantes} />
        <LegacyBusinessGroup title="Experiencias y rutas" items={related.experiencias} />
        <LegacyBusinessGroup title="Otras empresas del destino" items={related.otras} />
      </section>
      {related.eventos && related.eventos.length > 0 ? (
        <section id="eventos" data-eb-anchor className="scroll-mt-24">
          <h2 className="text-2xl">Próximos eventos</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.eventos.slice(0, 6).map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
              >
                <Link to="/eventos/$slug" params={{ slug: e.slug }} className="block">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {new Date(e.starts_at).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <h3 className="mt-1 text-base font-semibold">{e.title}</h3>
                  {e.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {e.summary}
                    </p>
                  ) : null}
                  {e.venue_name ? (
                    <p className="mt-2 text-xs text-muted-foreground">{e.venue_name}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {related.productos.length > 0 ? (
        <section id="productos" data-eb-anchor className="scroll-mt-24">
          <h2 className="text-2xl">Productos destacados</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.productos.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
              >
                <Link to="/producto/$slug" params={{ slug: p.slug }} className="block">
                  <h3 className="text-base font-semibold">{p.name}</h3>
                  {p.tagline ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {p.tagline}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {p.business_name}
                    {p.price_amount != null
                      ? ` · ${p.price_currency} ${p.price_amount}`
                      : ""}
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
  );
}

function LegacyBusinessGroup({
  title,
  items,
}: {
  title: string;
  items: DestinationRelatedDTO["hoteles"];
}) {
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