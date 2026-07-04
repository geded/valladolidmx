/**
 * H-03 · Ola I1.a — Demo funcional del bloque `vmx.experience.hero`.
 *
 * Ruta interna de validación para el Founder. Muestra las 3 variantes
 * oficiales del bloque con datos realistas, la matriz de badges/meta
 * y las CTAs primaria/secundaria. NO forma parte del sitio público y
 * no afecta rutas, SEO ni navegación.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import { buildExperienceHeroPreviewDTO } from "@/lib/experience-builder/blocks/experience-hero/contract";

export const Route = createFileRoute("/lovable/experience-hero-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · Experience Hero — Preview interno" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const base = buildExperienceHeroPreviewDTO();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · Ola I1.a · Fundacionales
        </p>
        <h1 className="text-3xl font-semibold">Experience Hero — demo funcional</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Tres variantes oficiales del bloque <code>vmx.experience.hero</code>{" "}
          renderizadas desde el mismo componente presentacional. Sin
          duplicación (regla de compatibilidad evolutiva).
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 1 · <span className="font-mono">immersive</span>
        </h2>
        <ExperienceHero dto={{ ...base, variant: "immersive" }} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 2 · <span className="font-mono">compact</span>
        </h2>
        <ExperienceHero dto={{ ...base, variant: "compact" }} headingLevel="h2" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 3 · <span className="font-mono">editorial</span> (sin media)
        </h2>
        <ExperienceHero
          dto={{ ...base, variant: "editorial", media: null }}
          headingLevel="h2"
        />
      </section>

      <footer className="rounded-2xl border border-border bg-muted/30 p-5 text-xs text-muted-foreground">
        <p>
          Cero cambios a Context Engine, EB core, navegación, SEO, rutas
          públicas, KitShell ni Discovery Navigator. Bloque disponible en el
          Studio (<code>/cms/experience-builder</code>) para composición
          inmediata.
        </p>
      </footer>
    </main>
  );
}