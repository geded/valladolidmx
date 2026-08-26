/**
 * G6-S1 · Catálogo interno de la Iconografía Turística Universal
 * con Acento Textil Yucateco v1.0.
 *
 * Ruta interna de verificación (no pública, no indexable). Renderiza las 22
 * categorías canónicas del `CATEGORY_ICON_REGISTRY` en sus dos variantes,
 * ambos esquemas cromáticos y en monocromo, además de la prueba fail-closed.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { TourismCategoryIcon } from "@/components/omxds/TourismCategoryIcon";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
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
