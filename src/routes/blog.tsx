/**
 * /blog — Índice editorial (Sprint 5).
 *
 * @context-engine legacy — editorial sin territorio (I7 · fila 7).
 * No monta `ContextEngineProvider`; conserva breadcrumb legacy plano.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listPublishedEvents, type PublicEventCard } from "@/lib/events/public-reads.functions";

export const Route = createFileRoute("/blog")({
  loader: async () => ({ eventos: await listPublishedEvents().catch(() => [] as PublicEventCard[]) }),
  head: () =>
    buildPublicHead({
      title: `Blog · ${SITE.name}`,
      description: "Historias, agenda y notas editoriales del Oriente Maya.",
      path: "/blog",
      // SEO.A1.2 · D3 — Mientras no exista contenido editorial real
      // (modelo `/blog/$slug`, artículos publicados, autor/fecha,
      // imagen editorial), `/blog` permanece accesible pero `noindex,
      // follow` — retirado también del sitemap.
      robots: "noindex, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Blog · ${SITE.name}`,
          description: "Historias, agenda cultural y notas editoriales del Oriente Maya.",
          url: "https://quehacerenvalladolid.com/blog",
          inLanguage: "es-MX",
          isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
        },
      ],
    }),
  component: BlogRoute,
});

function BlogRoute() {
  const { eventos } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Editorial"
      title="Blog del Oriente Maya"
      description="Historias, agenda cultural y notas editoriales sobre destinos, empresas y comunidades."
      crumbs={[{ label: "Blog" }]}
    >
      <section>
        <h2 className="mb-4 text-xl font-semibold">Agenda cultural</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay notas publicadas. Mientras tanto, descubre los{" "}
            <Link to="/oriente-maya" className="text-primary hover:underline">23 destinos</Link>{" "}
            del Oriente Maya.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {eventos.map((e: PublicEventCard) => (
              <li key={e.id}>
                <Link
                  to="/eventos/$slug"
                  params={{ slug: e.slug }}
                  className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent"
                >
                  <p className="text-sm font-semibold text-foreground">{e.title}</p>
                  {e.summary ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{e.summary}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PublicShell>
  );
}