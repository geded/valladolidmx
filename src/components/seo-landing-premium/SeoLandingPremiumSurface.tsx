import type { ReactNode } from "react";
import { Award, Clock3, Leaf, MapPin, Shirt, Sparkles, UtensilsCrossed } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { AluxMark } from "@/components/alux/AluxMark";
import { Button } from "@/components/ui/button";

export interface SeoLandingPremiumSurfaceProps {
  theme?: "sol" | "luna";
  eyebrow: string;
  title: string;
  category: string;
  destination: string;
  claim: string;
  description: string;
  heroUrl: string;
  heroAlt: string;
}

function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-current/15 py-3 last:border-0">
      <span className="mt-0.5 text-amber-500">{icon}</span>
      <span>
        <strong className="block text-sm font-medium">{title}</strong>
        <span className="block text-sm opacity-70">{children}</span>
      </span>
    </div>
  );
}

export function SeoLandingPremiumSurface({
  theme = "sol",
  eyebrow,
  title,
  category,
  destination,
  claim,
  description,
  heroUrl,
  heroAlt,
}: SeoLandingPremiumSurfaceProps) {
  const luna = theme === "luna";

  return (
    <article
      data-seo-landing-premium="founder-approved-direction"
      data-theme-preview={theme}
      className={
        luna
          ? "bg-[#061014] text-stone-100"
          : "bg-[#f7f2e8] text-[#10251b]"
      }
    >
      <section className="relative isolate min-h-[42rem] overflow-hidden lg:min-h-[48rem]">
        <img src={heroUrl} alt={heroAlt} className="absolute inset-0 -z-20 size-full object-cover" />
        <div
          className={
            luna
              ? "absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/75 to-black/10"
              : "absolute inset-0 -z-10 bg-gradient-to-r from-[#f7f2e8] via-[#f7f2e8]/90 to-transparent"
          }
        />
        <Container className="flex min-h-[42rem] items-center py-16 lg:min-h-[48rem]">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-500">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-6xl leading-none sm:text-7xl lg:text-8xl">{title}</h1>
            <p className="mt-3 font-serif text-2xl text-amber-500 sm:text-3xl">
              {category} · {destination}
            </p>
            <div className="mt-5 h-px w-14 bg-amber-500" />
            <h2 className="mt-5 font-serif text-3xl sm:text-4xl">{claim}</h2>
            <p className="mt-3 max-w-xl text-lg opacity-80">{description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-none bg-[#004b32] px-8 text-white hover:bg-[#003d29]">
                Ver experiencias
              </Button>
              <Button size="lg" variant="outline" className="rounded-none border-current bg-transparent px-8">
                Agregar a Mi Viaje
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <div className="border-y border-current/15 bg-background/5">
        <Container>
          <ul className="grid divide-y divide-current/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <li className="flex items-center gap-3 px-5 py-5"><Award className="text-amber-500" /> Premio Nacional a la Innovación Turística 2023</li>
            <li className="flex items-center gap-3 px-5 py-5"><Sparkles className="text-amber-500" /> Reconocimiento institucional</li>
            <li className="flex items-center gap-3 px-5 py-5"><MapPin className="text-amber-500" /> Oriente Maya de Yucatán</li>
            <li className="flex items-center gap-3 px-5 py-5"><Clock3 className="text-amber-500" /> A 6 km de Valladolid</li>
          </ul>
        </Container>
      </div>

      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_1.25fr_1fr_0.9fr]">
        <section>
          <h2 className="font-serif text-3xl">Por qué es extraordinario</h2>
          <div className="mt-3 h-px w-10 bg-amber-500" />
          <p className="mt-5 text-sm leading-6 opacity-80">
            Zazil Tunich revela la profundidad del vínculo maya con el agua y el inframundo.
            Formaciones milenarias, luz que esculpe la piedra y relatos ancestrales construyen una
            experiencia de respeto y asombro.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Fact icon={<Sparkles className="size-5" />} title="Recorrido guiado">Intérpretes locales</Fact>
            <Fact icon={<UtensilsCrossed className="size-5" />} title="Cocina regional">Identidad maya</Fact>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-3xl">Experiencias destacadas</h2>
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-amber-500/35">
            <img src={heroUrl} alt="" className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-6 text-white">
              <h3 className="font-serif text-2xl">Cena romántica subterránea</h3>
              <p className="mt-1 text-sm text-white/75">Una experiencia íntima en un entorno natural único.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-3xl">Información para tu visita</h2>
          <div className="mt-3">
            <Fact icon={<Clock3 className="size-5" />} title="Duración">Consultar duración</Fact>
            <Fact icon={<Shirt className="size-5" />} title="Qué llevar">Traje de baño, toalla y calzado antiderrapante</Fact>
            <Fact icon={<Leaf className="size-5" />} title="Sustentabilidad">Respeta las indicaciones del guía</Fact>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-3xl">Contexto territorial</h2>
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-[#153b2d] p-6 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Valladolid</p>
            <div className="my-5 border-l border-dashed border-amber-300 pl-5">
              <p className="font-serif text-xl">6 km</p>
              <p className="mt-8 text-sm">Zazil Tunich · Cenote-Museo</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 opacity-75">Naturaleza, historia y tradiciones vivas del Oriente Maya.</p>
        </section>
      </Container>

      <Container className="pb-14">
        <section className="flex flex-col items-center gap-5 rounded-3xl border border-amber-500/45 px-6 py-6 md:flex-row">
          <AluxMark family="full" size={112} decorative />
          <div className="flex-1">
            <h2 className="font-serif text-3xl text-amber-500">Alux te ayuda a planear tu viaje</h2>
            <p className="mt-1 text-sm opacity-75">Conecta esta experiencia con cenotes, zonas arqueológicas, haciendas y pueblos con encanto.</p>
          </div>
          <Button variant="outline" className="rounded-none border-current bg-transparent">Planear mi ruta con Alux</Button>
        </section>
      </Container>
    </article>
  );
}
