/**
 * G6-S1 · Catálogo interno de la Iconografía Turística Universal
 * con Acento Textil Yucateco v1.0.
 *
 * Ruta interna de verificación (no pública, no indexable). Renderiza las 22
 * categorías canónicas del `CATEGORY_ICON_REGISTRY` en sus dos variantes,
 * ambos esquemas cromáticos y en monocromo, además de la prueba fail-closed.
 *
 * G6-S1-A · D-G6-03 — Añade fixtures locales deterministas (`#fixture-s1`,
 * `#fixture-s2`, `#fixture-s3`) que montan los componentes REALES con datos
 * literales locales: sin backend, sin sesión, sin datos reales y sin
 * duplicar la implementación visual.
 */
import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Container } from "@/components/layout/Container";
import { TourismCategoryIcon } from "@/components/omxds/TourismCategoryIcon";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { DiscoveryNavigator } from "@/components/discovery/DiscoveryNavigator";
import { DiscoveryNavigatorBlock } from "@/components/experience-builder/blocks/DiscoveryNavigatorBlock";
import { CategoriaCard } from "@/components/cards/CategoriaCard";
import { CATEGORIAS_MOCK } from "@/mocks/categorias";
import type { DiscoveryCategoryItem } from "@/lib/discovery/discovery-navigator.functions";
import { CATEGORY_ICON_REGISTRY, CATEGORY_ICON_SLUGS } from "@/lib/omxds/category-icon-registry";

export const Route = createFileRoute("/lovable/g6-category-icon-catalog")({
  head: () => ({
    meta: [
      { title: "G6-S1 · Catálogo de iconografía turística | Valladolid.mx" },
      {
        name: "description",
        content:
          "Catálogo interno de verificación del sistema canónico de iconografía turística con acento textil yucateco.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "G6-S1 · Catálogo de iconografía turística" },
      {
        property: "og:description",
        content: "Verificación interna de los 22 símbolos canónicos OMXDS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: G6CategoryIconCatalog,
});

/** Datos literales locales — ficticios, deterministas, sin backend. */
const FIXTURE_CATEGORIES: readonly DiscoveryCategoryItem[] = [
  { slug: "hoteles", label: "Hoteles", count: 4, href: "/hoteles" },
  { slug: "restaurantes", label: "Restaurantes", count: 6, href: "/restaurantes" },
  { slug: "experiencias", label: "Experiencias", count: 3, href: "/experiencias" },
  { slug: "cenotes", label: "Cenotes", count: 5, href: "#fixture-s1" },
  { slug: "naturaleza", label: "Naturaleza", count: 2, href: "#fixture-s1" },
  { slug: "zonas-arqueologicas", label: "Zonas arqueológicas", count: 2, href: "#fixture-s1" },
] as unknown as readonly DiscoveryCategoryItem[];

/** QueryClient aislado: `staleTime: Infinity` evita cualquier fetch real. */
const fixtureQueryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Number.POSITIVE_INFINITY, retry: false, refetchOnMount: false },
  },
});

function G6CategoryIconCatalog() {
  const entries = CATEGORY_ICON_SLUGS.map((slug) => CATEGORY_ICON_REGISTRY[slug]!);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Container className="pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Ruta interna · G6-S1
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold sm:text-4xl">
          Iconografía Turística Universal con Acento Textil Yucateco v1.0
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Autoridad única e inmutable. {entries.length} categorías registradas. Cualquier slug fuera
          del registry no renderiza símbolo (fail-closed) y conserva su etiqueta de texto.
        </p>
      </Container>

      <Container className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Rejilla canónica (CategoryNavGrid)</h2>
        <CategoryNavGrid
          items={entries.map((e) => ({ slug: e.slug, label: e.label }))}
          mode="select"
          showCounts={false}
          variant="standard"
          desktopColumnsClassName="lg:grid-cols-6"
        />
      </Container>

      <Container className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">Matriz de símbolos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <article
              key={entry.slug}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <TourismCategoryIcon slug={entry.slug} variant="standard" />
                <TourismCategoryIcon slug={entry.slug} variant="compact" />
                <span className="flex size-12 items-center justify-center rounded-xl bg-foreground">
                  <TourismCategoryIcon slug={entry.slug} variant="compact" scheme="dark" />
                </span>
                <span className="flex size-12 items-center justify-center rounded-xl text-muted-foreground">
                  <TourismCategoryIcon slug={entry.slug} variant="compact" monochrome />
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{entry.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{entry.symbol}</p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {entry.slug} · {entry.primaryToken}
                {entry.secondaryToken ? ` + ${entry.secondaryToken}` : ""}
              </p>
            </article>
          ))}
        </div>
      </Container>

      <Container className="mt-12">
        <h2 className="mb-2 text-lg font-semibold">Ceiba / ya’axché · primeros planos</h2>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          D-G6-01 · Alternativa B: copa escalonada en tres niveles (16 / 12 / 7 u), tronco central
          dominante y tres raíces tabulares.
        </p>
        <div
          className="flex flex-wrap items-end gap-6 rounded-2xl border border-border bg-card p-4"
          data-testid="g6-ceiba-closeups"
        >
          <span className="flex flex-col items-center gap-2">
            <TourismCategoryIcon slug="naturaleza" variant="compact" size={32} />
            <span className="text-[11px] text-muted-foreground">compact 32 · light</span>
          </span>
          <span className="flex flex-col items-center gap-2">
            <TourismCategoryIcon slug="naturaleza" variant="compact" size={36} />
            <span className="text-[11px] text-muted-foreground">compact 36 · light</span>
          </span>
          <span className="flex flex-col items-center gap-2">
            <TourismCategoryIcon slug="naturaleza" variant="standard" size={44} />
            <span className="text-[11px] text-muted-foreground">standard 44 · light</span>
          </span>
          <span className="flex flex-col items-center gap-2 rounded-xl bg-foreground p-3">
            <TourismCategoryIcon slug="naturaleza" variant="compact" size={36} scheme="dark" />
            <TourismCategoryIcon slug="naturaleza" variant="standard" size={44} scheme="dark" />
          </span>
          <span className="flex items-center">
            <TourismCategoryIcon slug="naturaleza" variant="standard" size={44} />
          </span>
        </div>
      </Container>

      <QueryClientProvider client={fixtureQueryClient}>
        <Container className="mt-12">
          <h2 className="mb-2 text-lg font-semibold">Fixture S1 · DiscoveryNavigator real</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Componente real de descubrimiento con categorías literales locales.
          </p>
          <div id="fixture-s1" data-omxds-fixture="s1">
            <DiscoveryNavigator
              title="Explora el destino (fixture)"
              categories={[...FIXTURE_CATEGORIES]}
              variant="grid"
            />
          </div>
        </Container>

        <Container className="mt-12">
          <h2 className="mb-2 text-lg font-semibold">
            Fixture S2 · preview real de <code>vmx.discovery.navigator</code>
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Bloque real del Experience Builder alimentado con <code>previewData</code> literal.
          </p>
          <div id="fixture-s2" data-omxds-fixture="s2">
            <DiscoveryNavigatorBlock
              config={{ scope: "destination", manualDestinationSlug: "fixture", mode: "navigate" }}
              previewData={{
                scope: { kind: "destination", slug: "fixture", label: "Destino fixture" },
                categories: [...FIXTURE_CATEGORIES],
                extensions: [],
              }}
            />
          </div>
        </Container>

        <Container className="mt-12">
          <h2 className="mb-2 text-lg font-semibold">
            Fixture S3 · CategoriaCard con <code>CATEGORIAS_MOCK</code>
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Mismo flujo de composición que <code>CategoriasSection</code>, con datos mock locales.
          </p>
          <div
            id="fixture-s3"
            data-omxds-fixture="s3"
            data-home-grid="categorias"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {CATEGORIAS_MOCK.map((c) => (
              <CategoriaCard key={c.id} category={c} />
            ))}
          </div>
        </Container>
      </QueryClientProvider>

      <Container className="mt-12">
        <h2 className="mb-2 text-lg font-semibold">Prueba fail-closed</h2>
        <div
          className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4"
          data-testid="g6-fail-closed"
        >
          <TourismCategoryIcon slug="categoria-inexistente" />
          <span className="text-sm text-muted-foreground">
            Slug no registrado: sin símbolo, etiqueta intacta.
          </span>
        </div>
      </Container>
    </div>
  );
}
