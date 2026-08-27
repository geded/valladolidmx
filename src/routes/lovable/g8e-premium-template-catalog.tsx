/**
 * G8-E · Catálogo interno de Plantillas Premium Aprobadas (Fast Track).
 *
 * Vista INTERNA, no indexable y sin persistencia. Renderiza cada preset
 * productivo EXACTAMENTE como lo hará Studio y producción: a través del
 * `CompositionRenderer` sobre el bloque compuesto declarado en el
 * registro `PREMIUM_TEMPLATE_PRESETS`. Sirve como evidencia de paridad
 * del Fast Track y como índice para el Founder.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import type { CompositionTree } from "@/lib/experience-builder/composition-tree";
import {
  PREMIUM_TEMPLATE_PRESETS,
  PREMIUM_TEMPLATE_REGISTRY_VERSION,
  getPremiumTemplatePreset,
} from "@/lib/experience-builder/premium-template-registry";

export const Route = createFileRoute("/lovable/g8e-premium-template-catalog")({
  head: () => ({
    meta: [
      { title: "G8-E · Catálogo interno de plantillas premium aprobadas" },
      {
        name: "description",
        content:
          "Catálogo interno de los presets premium productivos del Experience Builder. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: PremiumTemplateCatalog,
});

function PremiumTemplateCatalog() {
  const [activeId, setActiveId] = useState<string>(
    PREMIUM_TEMPLATE_PRESETS[0]?.id ?? "premium-g4-approved",
  );
  const preset = getPremiumTemplatePreset(activeId) ?? PREMIUM_TEMPLATE_PRESETS[0];

  const tree: CompositionTree | null = useMemo(() => {
    if (!preset) return null;
    return {
      root: {
        id: "root",
        type: "root",
        version: "1.0.0",
        config: {},
        children: [
          {
            id: `${preset.id}-node`,
            type: preset.blockType,
            version: preset.contractVersion,
            config: preset.defaultConfig(),
          },
        ],
      },
    } as unknown as CompositionTree;
  }, [preset]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Vista interna G8-E · Catálogo de plantillas premium (registro v
        {PREMIUM_TEMPLATE_REGISTRY_VERSION}) — no indexable, sin persistencia. No modifica páginas
        publicadas ni el CMS.
      </div>

      <Container className="pt-6">
        <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
          Plantillas premium aprobadas
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {PREMIUM_TEMPLATE_PRESETS.length} presets productivos. Cada uno se renderiza con la misma
          autoridad visual que Studio y producción.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PREMIUM_TEMPLATE_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={p.id === activeId ? "default" : "outline"}
              className="min-h-11 rounded-pill px-4"
              onClick={() => setActiveId(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
        {preset ? (
          <dl className="mt-4 grid gap-2 rounded-3xl border border-border bg-card p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="uppercase tracking-[0.16em] text-muted-foreground">Bloque</dt>
              <dd className="mt-0.5 font-mono">{preset.blockType}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.16em] text-muted-foreground">Variante</dt>
              <dd className="mt-0.5 font-mono">{preset.variant}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.16em] text-muted-foreground">Ruta objetivo</dt>
              <dd className="mt-0.5 font-mono">{preset.targetRoute}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.16em] text-muted-foreground">
                Autoridad visual
              </dt>
              <dd className="mt-0.5 font-mono">{preset.visualAuthorityRoute}</dd>
            </div>
          </dl>
        ) : null}
      </Container>

      <div className="mt-8" data-testid="premium-preset-render">
        {tree ? <CompositionRenderer tree={tree} /> : null}
      </div>
    </div>
  );
}
