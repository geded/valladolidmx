/**
 * G8-R1-C+L · Paso L2 — Preview interna de paridad `premium-seo-landing`.
 *
 * Vista noindex, render-only y de solo lectura:
 *  - Caso A: autoridad visual acreditada (Zazil Tunich, revisión SEO.A3.M2),
 *    leída tal cual sin modificarla.
 *  - Caso B: plantilla reusable neutral construida por
 *    `buildSeoLandingComposition` (17 slots, sin contenido inventado).
 *  - Sondas de resolución: Chichén Itzá, Cenote Suytun y producto genérico
 *    resueltos por el resolutor canónico (C1), sólo configuración.
 *
 * Cero publicación, cero redirects, cero escritura, cero cambio de flags.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Container } from "@/components/layout/Container";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import type { CompositionNode } from "@/lib/experience-builder/composition-tree";
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
  queryKey: [
    "eb",
    "published-composition",
    SEO_LANDING_AUTHORITY.compositionSlug,
    SEO_LANDING_AUTHORITY.variantKey,
  ],
  queryFn: () =>
    getPublishedCompositionBySlug({
      data: {
        slug: SEO_LANDING_AUTHORITY.compositionSlug,
        variant_key: SEO_LANDING_AUTHORITY.variantKey,
      },
    }),
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

const PROBES = {
  "probe-chichen": {
    label: "Sonda · Chichén Itzá (Tinum)",
    input: { entityId: "probe-chichen-itza", entityType: "place", placeType: "zona-arqueologica" },
  },
  "probe-suytun": {
    label: "Sonda · Cenote Suytun (Valladolid)",
    input: { entityId: "probe-suytun", entityType: "place", placeType: "cenote" },
  },
  "probe-product": {
    label: "Sonda · Producto genérico",
    input: { entityId: "probe-producto", entityType: "product", productType: "artesania" },
  },
} as const;

type ProbeKey = keyof typeof PROBES;
type ViewKey = "a" | "b" | "ab" | ProbeKey;

const WIDTHS = [390, 430, 768, 1024, 1280, 1440] as const;
type WidthKey = (typeof WIDTHS)[number] | "full";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "a", label: "Caso A · Autoridad Zazil Tunich" },
  { key: "b", label: "Caso B · Plantilla neutral" },
  { key: "ab", label: "A vs B (mismo ancho)" },
  { key: "probe-chichen", label: "Sonda Chichén Itzá" },
  { key: "probe-suytun", label: "Sonda Cenote Suytun" },
  { key: "probe-product", label: "Sonda Producto genérico" },
];

function slotIndexer(children: CompositionNode[]) {
  const map = new Map<string, number>();
  children.forEach((child, index) => map.set(child.id, index + 1));
  return map;
}

function SlotBadge({ n, node }: { n: number; node: CompositionNode }) {
  const def = SEO_LANDING_SLOTS[n - 1];
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-40 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-full bg-foreground/85 px-3 py-1 text-[11px] font-medium text-background shadow-soft">
      <span className="tabular-nums">
        {n}/{SEO_LANDING_SLOTS.length}
      </span>
      <span className="truncate">{def?.label ?? node.type}</span>
      <span className="hidden truncate opacity-70 sm:inline">{node.type}</span>
    </div>
  );
}

function NumberedCase({
  caseId,
  tree,
  pageType,
  showNumbers,
}: {
  caseId: string;
  tree: Parameters<typeof CompositionRenderer>[0]["tree"];
  pageType?: string;
  showNumbers: boolean;
}) {
  const index = useMemo(() => slotIndexer(tree.root.children), [tree]);
  return (
    <div data-parity-case={caseId}>
      <CompositionRenderer
        tree={tree}
        pageType={pageType}
        wrap={(node, content) => {
          const n = index.get(node.id);
          if (!showNumbers || !n) return content;
          return (
            <div
              className="relative scroll-mt-24 outline-dashed outline-1 outline-border/70"
              data-slot-index={n}
              data-slot-type={node.type}
            >
              <SlotBadge n={n} node={node} />
              {content}
            </div>
          );
        }}
      />
    </div>
  );
}

function WidthFrame({ width, children }: { width: WidthKey; children: React.ReactNode }) {
  if (width === "full") return <div className="w-full overflow-x-auto">{children}</div>;
  return (
    <div className="w-full overflow-x-auto">
      <div
        className="mx-auto w-full border-x border-dashed border-border/70"
        style={{ maxWidth: `${width}px` }}
      >
        {children}
      </div>
    </div>
  );
}

function ProbePanel({ probeKey }: { probeKey: ProbeKey }) {
  const probe = PROBES[probeKey];
  const r = resolveCanonicalEntityTemplate(probe.input);
  return (
    <Container className="pt-6">
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-serif text-xl">{probe.label}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Familia canónica</dt>
            <dd className="font-medium">{r.canonicalFamily ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Preset</dt>
            <dd className="font-medium">{r.presetId ?? "superficie estándar"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Variante</dt>
            <dd className="font-medium">{r.variant ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Origen</dt>
            <dd className="font-medium">{r.source}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Sólo resolución de configuración. Ninguna entidad real se lee, modifica ni publica.
        </p>
      </div>
    </Container>
  );
}

function SeoLandingParityPreview() {
  const authority = useQuery(authorityQuery);
  const tree = authority.data?.snapshot ?? null;
  const [view, setView] = useState<ViewKey>("ab");
  const [width, setWidth] = useState<WidthKey>("full");
  const [showNumbers, setShowNumbers] = useState(true);

  const isProbe = view.startsWith("probe-");

  return (
    <main className="min-h-screen bg-background pb-32">
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

        {/* Controles */}
        <div className="sticky top-2 z-50 mt-4 rounded-3xl border border-border bg-card/95 p-4 shadow-soft backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-pressed={view === v.key}
                className={`min-h-11 rounded-pill border px-4 text-sm transition ${
                  view === v.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Ancho</span>
            {(["full", ...WIDTHS] as WidthKey[]).map((w) => (
              <button
                key={String(w)}
                type="button"
                onClick={() => setWidth(w)}
                aria-pressed={width === w}
                className={`min-h-9 rounded-pill border px-3 text-xs transition ${
                  width === w
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {w === "full" ? "Completo" : `${w}px`}
              </button>
            ))}
            <label className="ml-auto flex min-h-9 cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showNumbers}
                onChange={(e) => setShowNumbers(e.target.checked)}
              />
              Numerar slots
            </label>
          </div>
        </div>

        {/* Mapa de slots */}
        <section className="mt-4 rounded-3xl border border-border bg-card p-5 sm:p-6">
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
                    <td className="py-2 text-xs">
                      {slot.omitWhenEmpty ? "se omite" : "obligatorio"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>

      {isProbe ? <ProbePanel probeKey={view as ProbeKey} /> : null}

      {view === "a" || view === "ab" ? (
        <>
          <Container className="pt-10">
            <h2 className="font-serif text-xl">Caso A · Autoridad acreditada (solo lectura)</h2>
          </Container>
          {tree ? (
            <WidthFrame width={width}>
              <NumberedCase
                caseId="authority"
                tree={tree}
                pageType={authority.data?.page_type}
                showNumbers={showNumbers}
              />
            </WidthFrame>
          ) : (
            <Container className="pt-3">
              <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                La composición de autoridad no está disponible en esta sesión (no publicada o sin
                acceso). La paridad se evalúa contra el mapa de slots y el SHA-256 acreditado.
              </p>
            </Container>
          )}
        </>
      ) : null}

      {view === "b" || view === "ab" ? (
        <>
          <Container className="pt-12">
            <h2 className="font-serif text-xl">Caso B · Plantilla reusable neutral</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sin datos de entidad: los slots vacíos se omiten por contrato (cero contenido
              inventado).
            </p>
          </Container>
          <WidthFrame width={width}>
            <NumberedCase
              caseId="neutral"
              tree={NEUTRAL_TREE}
              pageType="landing"
              showNumbers={showNumbers}
            />
          </WidthFrame>
        </>
      ) : null}

      <div data-alux-safe-zone-spacer className="h-28" aria-hidden />
    </main>
  );
}
