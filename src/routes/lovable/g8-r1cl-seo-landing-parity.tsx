/**
 * G8-R1-C+L · Paso L2 — Preview interna de paridad `premium-seo-landing`.
 *
 * Vista noindex, render-only y de solo lectura:
 *  - Caso A: autoridad visual acreditada (Zazil Tunich, revisión SEO.A3.M2),
 *    leída tal cual sin modificarla.
 *  - Caso B: plantilla reusable neutral construida por
 *    `buildSeoLandingComposition` (17 slots, sin contenido inventado).
 *  - Sondas de resolución: Chichén Itzá y Suytun resueltos por el resolutor
 *    canónico (C1), sólo configuración — no se renderiza ficha ni se publica.
 *
 * Cero publicación, cero redirects, cero escritura, cero cambio de flags.
 */
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Container } from "@/components/layout/Container";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import {
  SEO_LANDING_AUTHORITY,
  SEO_LANDING_SLOTS,
  SEO_LANDING_TEMPLATE_ID,
  SEO_LANDING_VARIANT,
  buildSeoLandingComposition,
} from "@/lib/experience-builder/seo-landing/seo-landing-template";
import { resolveCanonicalEntityTemplate } from "@/lib/experience-builder/canonical-entity-resolver";

const authorityQuery = queryOptions({
  queryKey: ["eb", "published-composition", SEO_LANDING_AUTHORITY.compositionSlug],
  queryFn: () =>
    getPublishedCompositionBySlug({ data: { slug: SEO_LANDING_AUTHORITY.compositionSlug } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/lovable/g8-r1cl-seo-landing-parity")({
  head: () => ({
    meta: [
      { title: "G8-R1-C+L · Paridad · premium-seo-landing (interna)" },
      {
        name: "description",
        content:
          "Vista interna de paridad entre la autoridad visual acreditada y la plantilla reusable premium-seo-landing. No publicable, no indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: SeoLandingParityPreview,
});

/** Slots neutrales: sólo encabezados de plantilla, jamás contenido de entidad. */
const NEUTRAL_TREE = buildSeoLandingComposition({
  entityRef: "template:neutral",
  presentation: "editorial",
  idPrefix: "neutral",
  slots: {
    hero: { title: "Título de la entidad", eyebrow: "Categoría", overlay: 0.5 },
    features: { heading: "Lo que distingue", columns: 3, items: [] },
    gallery: { heading: "Galería", aspect: "landscape", maxVisible: 9, items: [] },
    infoGrid: { heading: "Información práctica", columns: 3 },
    map: { heading: "Ubicación" },
    related: { heading: "Sigue descubriendo", columns: 3 },
    reviews: { heading: "Reseñas" },
    faq: { heading: "Preguntas frecuentes" },
  },
});

const PROBES = [
  {
    label: "Chichén Itzá (Tinum)",
    input: {
      entityId: "probe-chichen-itza",
      entityType: "place",
      placeType: "zona-arqueologica",
    },
  },
  {
    label: "Cenote Suytun (Valladolid)",
    input: { entityId: "probe-suytun", entityType: "place", placeType: "cenote" },
  },
  {
    label: "Producto sin familia especializada",
    input: { entityId: "probe-producto", entityType: "product", productType: "artesania" },
  },
] as const;

function SeoLandingParityPreview() {
  const authority = useQuery(authorityQuery);
  const tree = authority.data?.snapshot ?? null;

  return (
    <main className="min-h-screen bg-background pb-24">
      <Container className="pt-6">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            G8-R1-C+L · Paso L2 · Vista interna de paridad
          </p>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl">
            Plantilla reusable {SEO_LANDING_TEMPLATE_ID} · variante {SEO_LANDING_VARIANT}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Autoridad acreditada: composición{" "}
            <span className="font-medium">{SEO_LANDING_AUTHORITY.compositionSlug}</span>, revisión{" "}
            <span className="font-medium">{SEO_LANDING_AUTHORITY.revisionLabel}</span> (SHA-256{" "}
            <code className="break-all text-xs">{SEO_LANDING_AUTHORITY.sha256}</code>). La plantilla
            reusa exclusivamente la estructura de {SEO_LANDING_SLOTS.length} bloques; no copia
            contenido de la entidad de origen.
          </p>
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-serif text-xl">Mapa de slots ({SEO_LANDING_SLOTS.length})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Slot</th>
                  <th className="py-2 pr-3">Bloque</th>
                  <th className="py-2 pr-3">Variante</th>
                  <th className="py-2">Vacío</th>
                </tr>
              </thead>
              <tbody>
                {SEO_LANDING_SLOTS.map((slot) => (
                  <tr key={slot.id} className="border-t border-border/60">
                    <td className="py-2 pr-3 text-muted-foreground">{slot.order}</td>
                    <td className="py-2 pr-3 font-medium">{slot.label}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{slot.blockType}</td>
                    <td className="py-2 pr-3 text-xs">{slot.variant ?? "—"}</td>
                    <td className="py-2 text-xs">{slot.omitWhenEmpty ? "se omite" : "obligatorio"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-serif text-xl">Sondas del resolutor canónico (C1)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {PROBES.map((probe) => {
              const r = resolveCanonicalEntityTemplate(probe.input);
              return (
                <li key={probe.input.entityId} className="rounded-2xl border border-border/60 p-3">
                  <span className="font-medium">{probe.label}</span>
                  <span className="ml-2 text-muted-foreground">
                    familia {r.canonicalFamily ?? "—"} · preset {r.presetId ?? "superficie estándar"}{" "}
                    · variante {r.variant ?? "—"} · origen {r.source}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Sólo resolución de configuración. Ninguna entidad real se modifica ni se publica.
          </p>
        </section>
      </Container>

      <Container className="pt-8">
        <h2 className="font-serif text-xl">Caso A · Autoridad acreditada (solo lectura)</h2>
      </Container>
      {tree ? (
        <div data-parity-case="authority">
          <CompositionRenderer tree={tree} pageType={authority.data?.page_type} />
        </div>
      ) : (
        <Container className="pt-3">
          <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            La composición de autoridad no está disponible en esta sesión (no publicada o sin
            acceso). La paridad se evalúa contra el mapa de slots y el SHA-256 acreditado.
          </p>
        </Container>
      )}

      <Container className="pt-10">
        <h2 className="font-serif text-xl">Caso B · Plantilla reusable neutral</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sin datos de entidad: los slots vacíos se omiten por contrato (cero contenido inventado).
        </p>
      </Container>
      <div data-parity-case="neutral">
        <CompositionRenderer tree={NEUTRAL_TREE} pageType="landing" />
      </div>
    </main>
  );
}
