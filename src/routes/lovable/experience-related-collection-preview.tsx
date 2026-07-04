/**
 * H-03 · Ola I3.b — Demo funcional de `vmx.experience.related-collection`.
 *
 * Ruta interna noindex/nofollow. Ejercita variantes, colecciones
 * heterogéneas (empresas + eventos + productos) y estados vacíos.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceRelatedCollection } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollection";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import {
  buildExperienceRelatedCollectionPreviewDTO,
  type ExperienceRelatedCollectionDTO,
  type ExperienceRelatedVariant,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";

export const Route = createFileRoute("/lovable/experience-related-collection-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · I3.b — Experience Related Collection" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

function withVariant(v: ExperienceRelatedVariant): ExperienceRelatedCollectionDTO {
  const base = buildExperienceRelatedCollectionPreviewDTO();
  return { ...base, variant: v };
}

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · Ola I3.b · Motor de Descubrimiento
        </p>
        <h1 className="text-3xl font-semibold">vmx.experience.related-collection</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Bloque oficial de descubrimiento contextual. Un único bloque
          para cualquier colección heterogénea (empresas, productos,
          experiencias, hoteles, restaurantes, eventos, promociones,
          rutas, destinos, regiones). Preparado para evolucionar hacia
          recomendaciones de Alux y Context Engine sin duplicarse.
        </p>
      </header>

      <Case title="Variante grid · grupos heterogéneos (default)">
        <ExperienceRelatedCollection dto={withVariant("grid")} />
      </Case>
      <Case title="Variante list">
        <ExperienceRelatedCollection dto={withVariant("list")} />
      </Case>
      <Case title="Variante carousel">
        <ExperienceRelatedCollection dto={withVariant("carousel")} />
      </Case>
      <Case title="Variante featured (destacado + secundarios)">
        <ExperienceRelatedCollection dto={withVariant("featured")} />
      </Case>
      <Case title="Variante compact (widget lateral)">
        <ExperienceRelatedCollection dto={withVariant("compact")} />
      </Case>

      <Case title="source: 'destination' · sin contexto (estado vacío educado)">
        <ExperienceRelatedCollectionBlock
          config={{
            source: "destination",
            entityKind: "mixed",
            variant: "grid",
            heading: "Sigue descubriendo",
            emptyMessage:
              "Aún no hay contenido para descubrir aquí. Vuelve pronto.",
          }}
        />
      </Case>
    </main>
  );
}

function Case({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}