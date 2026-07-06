/**
 * H-03 · Ola I1.a — Demo funcional del bloque `vmx.experience.hero`.
 *
 * Ruta interna de validación para el Founder. Muestra las 3 variantes
 * oficiales del bloque con datos realistas, la matriz de badges/meta
 * y las CTAs primaria/secundaria. NO forma parte del sitio público y
 * no afecta rutas, SEO ni navegación.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import {
  buildExperienceHeroPreviewDTO,
  type ExperienceHeroDTO,
} from "@/lib/experience-builder/blocks/experience-hero/contract";

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

  // 3 contextos turísticos × 4 variantes = matriz de referencia U1.4.
  const destinationDto: ExperienceHeroDTO = {
    ...base,
    eyebrow: "Oriente Maya · Yucatán",
    title: "Valladolid",
    description: "La puerta colonial del Oriente Maya. Cenotes, cocina y patrimonio vivo.",
    media: {
      url: "https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1600&q=80",
      alt: "Calle colonial de Valladolid",
      overlay: 0.5,
    },
    badges: [
      { label: "Pueblo Mágico", tone: "primary", iconKey: "badge-check" },
      { label: "Desde 2012", tone: "neutral", iconKey: "star" },
    ],
    meta: [{ iconKey: "map-pin", label: "Yucatán, México" }],
    ctaPrimary: { label: "Explorar experiencias", action: "navigate", href: "#" },
    ctaSecondary: null,
  };

  const productDto: ExperienceHeroDTO = {
    ...base,
    eyebrow: "Experiencia guiada",
    title: "Cenote Zací al amanecer",
    description: "Tour privado de 90 min con guía local, snorkel y frutas de la temporada.",
    media: {
      url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=80",
      alt: "Cenote Zací",
      overlay: 0.45,
    },
    badges: [
      { label: "Recomendado por Alux", tone: "success", iconKey: "badge-check" },
      { label: "4.9 · 128 reseñas", tone: "neutral", iconKey: "star" },
    ],
    meta: [
      { iconKey: "map-pin", label: "Valladolid, centro" },
      { iconKey: "clock", label: "90 min" },
    ],
    ctaPrimary: { label: "Reservar", action: "book", href: "#", emphasis: "primary" },
    ctaSecondary: { label: "Contactar", action: "contact", href: "#", emphasis: "secondary" },
  };

  const cinematicHome: ExperienceHeroDTO = {
    ...base,
    variant: "cinematic",
    eyebrow: "Bienvenido al Oriente Maya",
    eyebrowStyle: "script",
    title: "Vive Valladolid como un local",
    description:
      "Descubre cenotes escondidos, cocina yucateca de autor y experiencias curadas por Alux.",
    alignment: "left",
    mediaSlides: [
      { url: "https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1920&q=80", alt: "Valladolid colonial" },
      { url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1920&q=80", alt: "Cenote Zací" },
      { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=80", alt: "Hacienda al atardecer" },
    ],
    slideIntervalMs: 6000,
    overlapHeader: false,
    ctas: [
      { label: "Explorar Oriente Maya", action: "navigate", href: "#", emphasis: "primary", iconKey: "arrow-right" },
      { label: "Arma tu viaje", action: "navigate", href: "#", emphasis: "secondary", iconKey: "compass" },
    ],
    ctaPrimary: null,
    ctaSecondary: null,
  };

  const searchSlot = (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className="mt-6 flex w-full max-w-md items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] text-white backdrop-blur-xl"
    >
      <Search className="size-4 shrink-0 text-white/80" aria-hidden />
      <input
        type="search"
        placeholder="¿Qué quieres vivir hoy?"
        className="w-full bg-transparent placeholder:text-white/50 focus:outline-none"
        aria-label="Buscar"
      />
      <button
        type="submit"
        className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-900"
      >
        Buscar
      </button>
    </form>
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          U1.4 · Tourist Hero v1.1.0
        </p>
        <h1 className="text-3xl font-semibold font-serif">Tourist Hero — matriz oficial</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cuatro variantes oficiales del bloque <code>vmx.experience.hero</code>{" "}
          renderizadas desde el mismo componente presentacional. Sin bloques
          paralelos: la Home cinematic vive en el mismo contrato v1.1.0.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 4 · <span className="font-mono">cinematic</span> (Home + destinos institucionales)
        </h2>
        <ExperienceHero dto={cinematicHome} extensionsSlot={searchSlot} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 1 · <span className="font-mono">immersive</span> · contexto destino
        </h2>
        <ExperienceHero dto={destinationDto} headingLevel="h2" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 1 · <span className="font-mono">immersive</span> · contexto empresa
        </h2>
        <ExperienceHero dto={{ ...base, variant: "immersive" }} headingLevel="h2" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 1 · <span className="font-mono">immersive</span> · contexto producto
        </h2>
        <ExperienceHero dto={productDto} headingLevel="h2" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 2 · <span className="font-mono">compact</span> (ficha interior)
        </h2>
        <ExperienceHero dto={{ ...base, variant: "compact" }} headingLevel="h2" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante 3 · <span className="font-mono">editorial</span> (sin media, tipografía protagonista)
        </h2>
        <ExperienceHero
          dto={{ ...base, variant: "editorial", media: null }}
          headingLevel="h2"
        />
      </section>

      <footer className="rounded-2xl border border-border bg-muted/30 p-5 text-xs text-muted-foreground">
        <p>
          Contrato v1.1.0 retrocompatible. Cero regresiones en Business /
          Destination surfaces (Experience Hero) ni Home Hero cinematic
          (adapter documentado en la auditoría U1.4).
        </p>
      </footer>
    </main>
  );
}