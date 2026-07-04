/**
 * H-03 · Ola I1.b — Demo funcional de `vmx.experience.subnav` +
 * `vmx.experience.cta-bar`. Ruta interna (noindex,nofollow) para
 * validación del Founder. No afecta rutas públicas, SEO ni navegación.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceCtaBar } from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar";
import {
  buildExperienceSubnavPreviewDTO,
  EXPERIENCE_SUBNAV_PRESETS,
} from "@/lib/experience-builder/blocks/experience-subnav/contract";
import { buildExperienceCtaBarPreviewDTO } from "@/lib/experience-builder/blocks/experience-cta-bar/contract";

export const Route = createFileRoute("/lovable/experience-subnav-ctabar-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · Subnav + CTA Bar — Preview interno" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const subnav = buildExperienceSubnavPreviewDTO();
  const ctaBar = buildExperienceCtaBarPreviewDTO();

  return (
    <>
      <ExperienceSubnav dto={subnav} />
      <main className="mx-auto flex max-w-5xl flex-col gap-14 px-4 py-10 pb-40">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            H-03 · Ola I1.b · Fundacionales
          </p>
          <h1 className="text-3xl font-semibold">
            Subnav + CTA Bar — demo funcional
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Dos bloques emparejados de la Biblioteca Oficial del Experience
            Builder. Reutilizables en business, product, event, destination,
            region, landing, micrositios y toda futura Experience Page.
          </p>
        </header>

        <section id="resumen" data-eb-anchor="Resumen" className="min-h-[60vh] rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Resumen</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sección resumen. El scroll-spy del sub-nav se activa a medida que
            entras en cada bloque.
          </p>
        </section>
        <section id="galeria" data-eb-anchor="Galería" className="min-h-[60vh] rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Galería</h2>
        </section>
        <section id="servicios" data-eb-anchor="Servicios" className="min-h-[60vh] rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Servicios</h2>
        </section>
        <section id="resenas" data-eb-anchor="Reseñas" className="min-h-[60vh] rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Reseñas</h2>
        </section>
        <section id="ubicacion" data-eb-anchor="Ubicación" className="min-h-[60vh] rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Ubicación</h2>
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-6 text-sm">
          <h2 className="mb-3 text-base font-semibold">Presets curados</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {Object.entries(EXPERIENCE_SUBNAV_PRESETS).map(([k, list]) => (
              <li key={k} className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{k}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {list.map((a) => a.label).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <ExperienceCtaBar dto={{ ...ctaBar, revealAfterScroll: 0 }} />
    </>
  );
}