/**
 * H-03 · U1.1 — Tourism Card Preview.
 *
 * Prueba visual OBLIGATORIA solicitada por el Founder para aprobar
 * `vmx.experience.products` v1.1.0: el MISMO componente
 * `ExperienceProducts` renderiza Empresa, Producto, Hotel, Restaurante,
 * Experiencia y Evento variando exclusivamente `entityKind` +
 * `variant` + `capabilities`. Cero duplicación de cards.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceProducts } from "@/components/experience-builder/blocks/experience-products/ExperienceProducts";
import { buildTourismCardsPreviewDTO } from "@/lib/experience-builder/blocks/experience-products/contract";

export const Route = createFileRoute("/lovable/tourism-card-preview")({
  component: TourismCardPreviewRoute,
  head: () => ({
    meta: [
      { title: "Tourism Card Preview · U1.1 · Valladolid.mx" },
      {
        name: "description",
        content:
          "Prueba visual del componente único vmx.experience.products v1.1.0 renderizando seis tipos de entidad turística.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function TourismCardPreviewRoute() {
  const dto = buildTourismCardsPreviewDTO();
  const listDto = { ...dto, variant: "list" as const };
  const carouselDto = { ...dto, variant: "carousel" as const };
  const featuredDto = { ...dto, variant: "featured" as const };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          H-03 · U1.1 · Experience Products v1.1.0
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Tourism Card — familia oficial
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Un único componente <code>ExperienceProducts</code> renderiza seis
          tipos de entidad turística (Empresa, Producto, Hotel, Restaurante,
          Experiencia, Evento) variando <code>entityKind</code>,{" "}
          <code>variant</code> y <code>capabilities</code>. Cada card responde
          visualmente a las cinco preguntas fundacionales.
        </p>
      </header>

      <section className="mb-14">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Variante · Grid (3 columnas)
        </h2>
        <ExperienceProducts dto={dto} />
      </section>

      <section className="mb-14">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Variante · Carousel
        </h2>
        <ExperienceProducts dto={carouselDto} />
      </section>

      <section className="mb-14">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Variante · List
        </h2>
        <ExperienceProducts dto={listDto} />
      </section>

      <section className="mb-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Variante · Featured
        </h2>
        <ExperienceProducts dto={featuredDto} />
      </section>
    </main>
  );
}