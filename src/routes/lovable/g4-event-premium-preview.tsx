import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Route as RouteIcon,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { PublicShell } from "@/components/discovery";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lovable/g4-event-premium-preview")({
  head: () => ({
    meta: [
      { title: "Noche de Valladolid · Evento Premium" },
      { name: "description", content: "Maqueta visual responsive de la plantilla Premium de evento." },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: EventProfilePremiumPreview,
});

const MEDIA = "/api/public/studio-media/governed/v1p1c";

const facts = [
  { icon: CalendarDays, label: "Fecha", value: "14 de septiembre" },
  { icon: Clock3, label: "Horario", value: "19:00–22:00 h" },
  { icon: MapPin, label: "Sede", value: "Plaza principal" },
  { icon: Ticket, label: "Acceso", value: "Entrada libre" },
] as const;

const program = [
  ["19:00", "Bienvenida en el kiosco", "El centro histórico abre la noche con música y memoria local."],
  ["19:45", "Trova yucateca", "Un recorrido sonoro por canciones que forman parte de la identidad regional."],
  ["20:40", "Sabores del Oriente", "Una pausa para conocer cocinas, productores y relatos del territorio."],
  ["21:30", "Cierre bajo las arcadas", "La ruta continúa con recomendaciones para el resto de tu estancia."],
] as const;

function EventProfilePremiumPreview() {
  return (
    <PublicShell
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label: "Valladolid", to: "/oriente-maya/valladolid" },
        { label: "Eventos", to: "/eventos?destino=valladolid" },
        { label: "Noche de Valladolid" },
      ]}
    >
      <main className="bg-[#f7f2e8] pb-16 text-[#17251f]">
        <Container className="pt-4 sm:pt-6">
          <section className="relative min-h-[30rem] overflow-hidden rounded-[2rem] shadow-elevated sm:min-h-[34rem] lg:min-h-[38rem]">
            <img
              src={`${MEDIA}/destination-gallery-1.jpg`}
              alt="Plaza principal de Valladolid al atardecer"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/48 to-black/8" />
            <div className="relative flex min-h-[30rem] max-w-3xl flex-col justify-end p-6 text-white sm:min-h-[34rem] sm:p-10 lg:min-h-[38rem] lg:p-14">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#f3a61e]">Cultura y tradición · Valladolid</p>
              <h1 className="mt-3 font-display text-5xl leading-[.94] sm:text-6xl lg:text-7xl">Noche de Valladolid</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/82 sm:text-xl">
                Una velada de trova, patrimonio y sabores locales para vivir el corazón del Oriente Maya después del atardecer.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/25 pt-5 sm:grid-cols-4">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="min-w-0">
                    <dt className="flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-white/60"><Icon className="size-4 text-[#f3a61e]" />{label}</dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="rounded-full bg-[#f3a61e] px-7 font-bold text-[#193126] hover:bg-[#f3a61e]/90">Agregar a Mi Viaje <ArrowRight className="ml-2 size-4" /></Button>
                <Button size="lg" variant="outline" className="rounded-full border-white/50 bg-white/10 px-7 text-white hover:bg-white/20 hover:text-white">Ver cómo llegar</Button>
              </div>
            </div>
          </section>
        </Container>

        <Container className="mt-6 sm:mt-8">
          <TourismAluxPanel
            title="¿Qué fechas estarás en la región?"
            description="Alux combinará este evento con lugares, mesas y experiencias cercanas sin hacerte cruzar el territorio a lo loco."
            task="Ayúdame a integrar Noche de Valladolid en mi viaje por el Oriente Maya."
            prompts={["Este fin de semana", "Ya estoy aquí", "En pareja", "En familia", "Con amigos"]}
            compact
          />
        </Container>

        <Container className="mt-10 lg:mt-14">
          <section className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ba641e]">La experiencia</p>
              <h2 className="mt-3 font-display text-4xl leading-tight">Una noche que cuenta la ciudad</h2>
              <p className="mt-4 text-base leading-8 text-[#5d685f]">La plaza se convierte en punto de encuentro: música yucateca, relatos de sus barrios y una selección de sabores locales. El evento funciona como puerta de entrada para seguir descubriendo Valladolid y su región.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Al aire libre", "Apto para familias", "Acceso a nivel de calle", "Duración aproximada: 3 h"].map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-2 text-xs shadow-sm">{tag}</span>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <img src={`${MEDIA}/destination-gallery-2.jpg`} alt="Calles coloniales de Valladolid" className="h-72 w-full rounded-3xl object-cover sm:h-96" />
              <img src={`${MEDIA}/restaurant-gallery-1.jpg`} alt="Sabores yucatecos del Oriente Maya" className="h-72 w-full rounded-3xl object-cover sm:h-96" />
            </div>
          </section>
        </Container>

        <Container className="mt-10 lg:mt-14">
          <section className="rounded-3xl border border-[#ded7c9] bg-white p-6 shadow-sm sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ba641e]">Programa</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">Así transcurre la noche</h2>
            <div className="mt-7 divide-y divide-[#ded7c9]">
              {program.map(([time, title, copy]) => (
                <article key={time} className="grid gap-2 py-5 sm:grid-cols-[6rem_1fr] sm:gap-5">
                  <p className="font-display text-2xl text-[#0d4b38]">{time}</p>
                  <div><h3 className="font-display text-xl">{title}</h3><p className="mt-1 text-sm leading-6 text-[#667067]">{copy}</p></div>
                </article>
              ))}
            </div>
          </section>
        </Container>

        <Container className="mt-10 lg:mt-14">
          <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="relative min-h-[25rem] overflow-hidden rounded-3xl bg-[#dfe9df]">
              <div className="absolute inset-0 opacity-60 [background:radial-gradient(#9daf9f_1px,transparent_1px)] [background-size:18px_18px]" />
              <div className="absolute inset-0 [background:linear-gradient(135deg,transparent_42%,#fff_43%,#fff_47%,transparent_48%),linear-gradient(35deg,transparent_54%,#c9d8c8_55%,#c9d8c8_59%,transparent_60%)] opacity-60" />
              <span className="absolute left-[48%] top-[46%] grid size-12 place-items-center rounded-full border-4 border-white bg-[#f3a61e] shadow-lg"><MapPin className="size-5" /></span>
              <span className="absolute bottom-5 left-5 rounded-full bg-white px-4 py-2 text-xs font-semibold shadow">Plaza principal · Valladolid</span>
            </div>
            <div className="rounded-3xl border border-[#ded7c9] bg-white p-7 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ba641e]">Sede y llegada</p>
              <h2 className="mt-3 font-display text-3xl">En el corazón de Valladolid</h2>
              <p className="mt-4 text-sm leading-7 text-[#667067]">La ubicación permite llegar caminando desde el centro y continuar hacia restaurantes, barrios y hospedajes cercanos.</p>
              <div className="mt-7 space-y-4 text-sm">
                <p className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-[#0d4b38]" />Plaza principal, Centro Histórico</p>
                <p className="flex gap-3"><Users className="mt-0.5 size-5 shrink-0 text-[#0d4b38]" />Ideal para parejas, familias y amigos</p>
                <p className="flex gap-3"><RouteIcon className="mt-0.5 size-5 shrink-0 text-[#0d4b38]" />Conecta con Calzada de los Frailes y Cenote Zací</p>
              </div>
            </div>
          </section>
        </Container>

        <Container className="mt-10 lg:mt-14">
          <section className="grid gap-6 rounded-3xl bg-[#073f31] px-6 py-8 text-white shadow-soft sm:px-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f3a61e]"><Sparkles className="size-4" />Continúa explorando</p><h2 className="mt-3 font-display text-3xl">Guarda la fecha; Alux conecta el resto</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">Tus respuestas continúan en todas las páginas para construir una ruta coherente.</p></div>
            <div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-full bg-[#f3a61e] px-6 text-sm font-bold text-[#193126]">Agregar a Mi Viaje</button><button className="min-h-11 rounded-full border border-white/30 px-6 text-sm font-semibold">Preguntar a Alux</button></div>
          </section>
        </Container>
      </main>
    </PublicShell>
  );
}
