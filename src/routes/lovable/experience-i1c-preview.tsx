/**
 * H-03 · Ola I1.c — Demo funcional de Gallery + Info-Grid + Section +
 * Features. Ruta interna noindex,nofollow para validación del Founder.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import { ExperienceInfoGrid } from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGrid";
import { ExperienceSection } from "@/components/experience-builder/blocks/experience-section/ExperienceSection";
import { ExperienceFeatures } from "@/components/experience-builder/blocks/experience-features/ExperienceFeatures";
import { buildExperienceGalleryPreviewDTO } from "@/lib/experience-builder/blocks/experience-gallery/contract";
import { buildExperienceInfoGridPreviewDTO } from "@/lib/experience-builder/blocks/experience-info-grid/contract";
import { buildExperienceSectionPreviewDTO } from "@/lib/experience-builder/blocks/experience-section/contract";
import { buildExperienceFeaturesPreviewDTO } from "@/lib/experience-builder/blocks/experience-features/contract";

export const Route = createFileRoute("/lovable/experience-i1c-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · I1.c — Gallery / Info-Grid / Section / Features" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · Ola I1.c · Fundacionales
        </p>
        <h1 className="text-3xl font-semibold">
          Gallery · Info-Grid · Section · Features
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Cuatro bloques de la Biblioteca Oficial del Experience Builder,
          construidos bajo la arquitectura de 3 capas y la Regla de
          Compatibilidad Evolutiva. Reutilizables en business, product,
          destination, event, region, landing, micrositios y toda futura
          Experience Page.
        </p>
      </header>

      <ExperienceSection dto={buildExperienceSectionPreviewDTO()} />
      <ExperienceGallery dto={buildExperienceGalleryPreviewDTO()} />
      <ExperienceInfoGrid dto={buildExperienceInfoGridPreviewDTO()} />
      <ExperienceFeatures dto={buildExperienceFeaturesPreviewDTO()} />

      <section className="rounded-2xl border border-border bg-muted/30 p-6 text-sm">
        <h2 className="mb-3 text-base font-semibold">Variantes disponibles</h2>
        <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li>Gallery: mosaic · grid · carousel · strip</li>
          <li>Info-Grid: cards · list · inline</li>
          <li>Section: editorial · split · centered · quote</li>
          <li>Features: grid · checklist · chips · columns</li>
        </ul>
      </section>
    </main>
  );
}