/**
 * /que-hacer — Actividades editoriales del Oriente Maya (Sprint 5).
 *
 * Superficie editorial que combina destinos publicados y eventos próximos
 * reutilizando lecturas ya existentes. Sin backend nuevo.
 *
 * @context-engine legacy — editorial sin territorio. Declarada como
 * excepción documentada en I5 y ratificada en I7 (Reconciliation Report
 * §2, fila 6). No monta `ContextEngineProvider`. Sin `previous`
 * relevante, sin herencia y sin necesidad de crumbs consolidados.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { buildEntityKindFacet } from "@/components/surfaces/TourismListingSurface";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";

const TEMAS = [
  {
    slug: "cultura",
    label: "Cultura",
    description: "Museos, cenotes sagrados, comunidades mayas y rituales vivos.",
  },
  {
    slug: "naturaleza",
    label: "Naturaleza",
    description: "Reservas, flamingos, selva baja y cielos estrellados.",
  },
  {
    slug: "aventura",
    label: "Aventura",
    description: "Cenotes profundos, ciclismo entre pueblos y rutas menos transitadas.",
  },
  {
    slug: "gastronomia",
    label: "Gastronomía",
    description: "Cocineras tradicionales, panuchos, recados y mercados.",
  },
  {
    slug: "mercados",
    label: "Mercados",
    description: "Plazas, tianguis y ferias del calendario yucateco.",
  },
];

export const Route = createFileRoute("/que-hacer")({
  validateSearch: (search: Record<string, unknown>) => ({
    tema: typeof search.tema === "string" ? search.tema : undefined,
  }),
  loader: async () => ({
    dto: await getPublicListing({ data: { family: "que-hacer", destino: null } }),
  }),
  head: () =>
    buildPublicHead({
      title: `¿Qué hacer? · ${SITE.name}`,
      description:
        "Ideas editoriales para vivir el Oriente Maya: cultura, naturaleza, aventura, gastronomía y eventos.",
      path: "/que-hacer",
    }),
  component: QueHacerRoute,
});

function QueHacerRoute() {
  const { dto } = Route.useLoaderData();
  const { tema } = Route.useSearch();
  const activo = TEMAS.find((t) => t.slug === tema) ?? null;
  const tipoFacet = buildEntityKindFacet([...dto.items]);
  return (
    <PublicShell
      crumbs={[
        { label: "¿Qué hacer?", to: "/que-hacer" },
        ...(activo ? [{ label: activo.label }] : []),
      ]}
    >
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        titleOverride={activo ? `¿Qué hacer? · ${activo.label}` : null}
        subtitleOverride={activo?.description ?? null}
        facets={tipoFacet ? [tipoFacet] : []}
      />

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Temas</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMAS.map((t) => (
            <li key={t.slug}>
              <Link
                to="/que-hacer"
                search={{ tema: t.slug }}
                className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}
