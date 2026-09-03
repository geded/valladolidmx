import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bath, BedDouble, CalendarClock, ChefHat, MapPin, ShieldCheck, Sparkles, Users, Waves } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { PublicShell } from "@/components/discovery";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { PremiumPresentationControl } from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lovable/g8p2-vacation-rental-premium-preview")({
  head: () => ({ meta: [{ title: "Casa de vacaciones · plantilla Premium" }, { name: "robots", content: "noindex,nofollow,noarchive" }] }),
  component: VacationRentalPremiumPreview,
});

const MEDIA = {
  hero: "/api/public/studio-media/governed/v1p1c/hotel-cover.jpg",
  patio: "/api/public/studio-media/conceptual-preview/2026-09-01/hoteles-hero-colonial-v1.webp",
  campo: "/api/public/studio-media/conceptual-preview/2026-09-01/hoteles-hero-campo-v1.webp",
  costa: "/api/public/studio-media/conceptual-preview/2026-09-01/hoteles-hero-costa-v1.webp",
} as const;

const facts = [
  { icon: Users, label: "Huéspedes", value: "Hasta 8" },
  { icon: BedDouble, label: "Descanso", value: "3 recámaras · 5 camas" },
  { icon: Bath, label: "Baños", value: "2 completos" },
  { icon: CalendarClock, label: "Estancia mínima", value: "2 noches" },
] as const;

function VacationRentalPremiumPreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");
  const cinematic = presentation === "cinematic";
  return (
    <PublicShell crumbs={[{ label: "Oriente Maya", to: "/oriente-maya" }, { label: "Valladolid", to: "/oriente-maya/valladolid" }, { label: "Casas de vacaciones", to: "/casas-de-vacaciones?destino=valladolid" }, { label: "Casa de patio colonial" }]}>
      <main className="pb-14">
        <Container className="pt-4 sm:pt-6">
          <section className={cn("relative overflow-hidden rounded-[2rem] border border-border bg-selva shadow-soft", cinematic ? "min-h-[38rem]" : "grid min-h-[31rem] lg:grid-cols-[1.08fr_.92fr]")}>
            <div className={cn("relative min-h-[22rem] overflow-hidden", cinematic && "absolute inset-0")}>
              <img src={MEDIA.hero} alt="Casa colonial con patio y alberca en Valladolid" className="absolute inset-0 size-full object-cover" />
              <div className={cn("absolute inset-0", cinematic ? "bg-gradient-to-r from-black/82 via-black/46 to-black/10" : "bg-gradient-to-t from-black/35 to-transparent")} />
            </div>
            <div className={cn("relative flex flex-col justify-center px-7 py-9 text-white sm:px-10 lg:px-12", cinematic && "min-h-[38rem] max-w-3xl")}>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Casa completa · Valladolid</p>
              <h1 className="mt-5 max-w-xl font-display text-4xl leading-[.98] sm:text-5xl lg:text-6xl">Casa de patio colonial</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/82">Una estancia privada para vivir Valladolid con calma y usar la ciudad como punto de partida para descubrir el Oriente Maya.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#reserva" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Consultar disponibilidad <ArrowRight className="size-4" /></a>
                <a href="#espacios" className="inline-flex min-h-11 items-center rounded-full border border-white/35 bg-white/10 px-6 text-sm font-semibold backdrop-blur">Conocer la casa</a>
              </div>
            </div>
          </section>
        </Container>

        <Container className="mt-5 flex justify-end"><PremiumPresentationControl value={presentation} onChange={setPresentation} /></Container>
        <Container className="mt-6 sm:mt-8">
          <TourismAluxPanel title="¿Cómo será tu estancia?" description="Dime con quién viajas, cuántas noches tienes y qué quieres descubrir. Alux conectará esta casa con rutas, experiencias y tiempos reales." task="Ayúdame a evaluar esta casa y conectarla con mi viaje por Valladolid y el Oriente Maya." prompts={["En familia", "En pareja", "Con amigos", "Quiero alberca"]} compact />
        </Container>

        <Container className="mt-8 lg:mt-12">
          <section id="espacios" className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">La propiedad</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Tu propio espacio, cerca de todo</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">Patio de piedra, cocina equipada y alberca privada. La dirección exacta se comparte al confirmar para proteger la privacidad.</p>
              <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6">{facts.map(({ icon: Icon, label, value }) => <div key={label}><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 text-selva" />{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl>
            </div>
            <div className="grid min-h-[25rem] grid-cols-2 grid-rows-2 gap-3 overflow-hidden rounded-3xl">
              <img src={MEDIA.patio} alt="Patio colonial" className="row-span-2 size-full object-cover" />
              <img src={MEDIA.campo} alt="Estancia conectada con el campo yucateco" className="size-full object-cover" />
              <img src={MEDIA.costa} alt="Ruta desde Valladolid hacia la costa" className="size-full object-cover" />
            </div>
          </section>
        </Container>

        <Container className="mt-8 lg:mt-12">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Lo esencial</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">Comodidad para quedarte; ubicación para explorar</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { icon: ChefHat, title: "Cocina equipada", copy: "Prepara desayunos tranquilos o descubre mercados y cocinas cercanas." },
                { icon: Waves, title: "Alberca privada", copy: "Un respiro propio después de recorrer el territorio." },
                { icon: ShieldCheck, title: "Información verificada", copy: "Reglas, horarios y servicios llegan desde el perfil administrable." },
              ].map(({ icon: Icon, title, copy }) => <article key={title} className="min-h-48 rounded-3xl border border-border bg-card p-6 shadow-sm"><Icon className="size-6 text-selva" /><h3 className="mt-5 font-display text-2xl">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></article>)}
            </div>
          </section>
        </Container>

        <Container className="mt-8 lg:mt-12">
          <section className="grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
            <div className="relative min-h-[24rem] overflow-hidden rounded-3xl"><img src={MEDIA.campo} alt="Territorio cercano a Valladolid" className="absolute inset-0 size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white"><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Desde tu casa</p><h2 className="mt-2 font-display text-3xl">El territorio empieza al salir</h2><p className="mt-2 max-w-xl text-sm text-white/78">Cenotes, comunidades y pueblos cercanos se integran a tu ruta.</p></div></div>
            <div className="grid gap-4">{["Centro histórico de Valladolid", "Cenotes y comunidades", "Pueblos Mágicos del Oriente Maya"].map((title, index) => <article key={title} className="flex min-h-28 items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-primary">{index === 0 ? "A unos pasos" : "Para tu ruta"}</p><h3 className="mt-1 font-display text-xl">{title}</h3></div><ArrowRight className="size-5 shrink-0 text-selva" /></article>)}</div>
          </section>
        </Container>

        <Container className="mt-8 lg:mt-12"><section id="reserva" className="grid gap-6 rounded-3xl bg-selva px-6 py-8 text-white shadow-soft sm:px-9 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Sparkles className="size-4" />Tu estancia toma forma</p><h2 className="mt-3 font-display text-3xl">Guarda la casa y conecta el resto del viaje</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">Alux conserva tus respuestas para continuar desde cualquier página.</p></div><div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Agregar a Mi Viaje</button><button className="min-h-11 rounded-full border border-white/30 px-6 text-sm font-semibold">Preguntar a Alux</button></div></section></Container>
        <Container className="mt-8"><p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-4" />Ubicación aproximada · Valladolid, Yucatán</p></Container>
      </main>
    </PublicShell>
  );
}
