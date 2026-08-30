/**
 * G8-R1-F1C-0 · Preview interno · ARTÍCULO / GUÍA EDITORIAL.
 *
 * Guía, reportaje, historia, inspiración, consejos y contenido cultural.
 * Lectura editorial con autor, fecha, fuentes, entidades relacionadas,
 * Mi Viaje, Alux y JSON-LD `Article`/`BlogPosting`.
 *
 * Vista INTERNA, noindex, sin datos publicados.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, PenLine, Link2, Landmark } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

export const Route = createFileRoute("/lovable/g8-r1f1c-article-preview")({
  head: () => ({
    meta: [
      { title: "G8-R1-F1C · Preview interno · Artículo / guía editorial" },
      {
        name: "description",
        content: "Vista previa interna de la familia artículo/guía editorial. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: ArticlePreview,
});

const ARTICLE = {
  title: "Por qué la piedra de Valladolid cuenta una historia (demo interna)",
  eyebrow: "Guía editorial · cultura (demo interna)",
  standfirst:
    "Una lectura breve sobre la traza colonial, los conventos y el oficio que sostiene la ciudad. Contenido original de la redacción.",
  author: "Redacción Valladolid.mx",
  date: "2026-08-29",
  body: [
    "La piedra caliza que forma los muros de la ciudad proviene de canteras cercanas y explica el color cálido de la traza colonial.",
    "Los conventos, las calzadas y los patios interiores organizan la vida cotidiana alrededor de la sombra y el agua.",
    "Recorrer el centro a pie permite leer esa historia sin prisa, con paradas breves en talleres y cocinas de barrio.",
  ],
  sources: [
    "Registro público municipal de Valladolid",
    "Sitios oficiales de los establecimientos citados",
  ],
  related: ["Centro histórico (zona)", "Un día colonial en Valladolid (ruta)"],
};

function ArticlePreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ARTICLE.title,
    description: ARTICLE.standfirst,
    author: { "@type": "Organization", name: ARTICLE.author },
    datePublished: ARTICLE.date,
    inLanguage: "es-MX",
  };

  return (
    <main className="min-h-svh bg-background">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PremiumHero
        vm={{
          presentation,
          crumbs: [{ label: "Inicio" }, { label: "Editorial" }, { label: ARTICLE.title }],
          eyebrow: ARTICLE.eyebrow,
          title: ARTICLE.title,
          description: ARTICLE.standfirst,
          media: null,
          primaryAction: { label: "Guardar en Mi Viaje", href: "#mi-viaje" },
          secondaryAction: { label: "Leer la guía", href: "#lectura" },
        }}
      />

      <Container className="py-6">
        <PremiumTerritorialBreadcrumb
          crumbs={[{ label: "Inicio" }, { label: "Editorial" }, { label: "Cultura" }]}
        />
        <div className="mt-4">
          <PremiumPresentationControl value={presentation} onChange={setPresentation} />
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <PenLine className="size-4" aria-hidden /> {ARTICLE.author}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" aria-hidden /> {ARTICLE.date}
          </span>
        </p>
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Preview interna G8-R1-F1C-0 · sin fotografía aprobada: marcador neutral, cero imagen
          heredada. Pendiente de aprobación visual del Founder.
        </p>
      </Container>

      <PremiumSection vm={{ id: "lectura", eyebrow: "Lectura", title: "La guía" }}>
        <div className="mx-auto max-w-2xl space-y-4 text-base leading-7">
          {ARTICLE.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </PremiumSection>

      <PremiumSection vm={{ id: "fuentes", eyebrow: "Transparencia", title: "Fuentes" }} compact>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {ARTICLE.sources.map((s) => (
            <li key={s} className="flex gap-2">
              <Link2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </PremiumSection>

      <PremiumSection
        vm={{
          id: "relacionados",
          eyebrow: "Continuar",
          title: "Lugares y planes relacionados",
          description: "CTA turísticos secundarios, nunca por encima de la lectura.",
        }}
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {ARTICLE.related.map((r) => (
            <li
              key={r}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
            >
              <Landmark className="size-4" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </PremiumSection>
    </main>
  );
}
