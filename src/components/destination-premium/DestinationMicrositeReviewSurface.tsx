import {
  ArrowRight,
  CalendarDays,
  Facebook,
  Home,
  Instagram,
  MapPin,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import { AluxMark } from "@/components/alux/AluxMark";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  DESTINATION_PREMIUM_G4_CONTENT,
  DESTINATION_PREMIUM_MEDIA,
  type DestinationPremiumMedia,
} from "./destination-premium-content";

const content = DESTINATION_PREMIUM_G4_CONTENT;
const media = DESTINATION_PREMIUM_MEDIA;

const experiences = [
  { title: "Cenotes y mundo subterráneo", eyebrow: "Naturaleza sagrada", image: media.cenote },
  { title: "Calzada de los Frailes", eyebrow: "Caminar la historia", image: media.calle },
  { title: "Sabores con identidad", eyebrow: "Cocina vallisoletana", image: media.cochinita },
  { title: "Talleres y oficios de Valladolid", eyebrow: "Cultura viva", image: media.plaza },
];

const routes = [
  { title: "Valladolid esencial", meta: "1 día · Centro, sabores y cenote", image: media.cover },
  {
    title: "Cenotes y comunidades",
    meta: "Día completo · Naturaleza y cultura viva",
    image: media.cenote,
  },
  {
    title: "Valladolid al caer la tarde",
    meta: "Medio día · Barrios, plaza y sabores",
    image: media.calle,
  },
];

const places = [
  { title: "San Servacio y la plaza", meta: "Centro histórico", image: media.plaza },
  { title: "Convento de Sisal", meta: "Patrimonio del siglo XVI", image: media.cover },
  { title: "Cenote Zací", meta: "Naturaleza dentro de la ciudad", image: media.cenote },
];

const stories = [
  { title: "La ciudad que despierta temprano", eyebrow: "Crónica", image: media.calle },
  { title: "El agua bajo nuestros pasos", eyebrow: "Raíces", image: media.cenote },
  { title: "Cocinar el Oriente Maya", eyebrow: "Sabores", image: media.comedor },
];

export function DestinationMicrositeReviewSurface() {
  return (
    <main
      data-content-policy="destination-first-nearby-fallback"
      className="bg-[#f7f3ea] pb-20 text-[#18221d]"
    >
      <Hero />

      <Container className="mt-5">
        <TerritoryContext />
      </Container>

      <Container className="mt-8">
        <DestinationIntro />
      </Container>

      <Container className="mt-8">
        <AluxGuide />
      </Container>

      <Container className="mt-8">
        <section className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm">
          <SectionHeading
            eyebrow="Explora Valladolid"
            title="Todo lo que puedes vivir aquí"
            compact
          />
          <CategoryNavGrid
            items={content.services.map((service) => ({
              slug: service.key,
              label: service.label,
              countLabel: service.hint,
              href: `/${service.key}?destino=valladolid`,
            }))}
            variant="standard"
            mode="navigate"
            showCounts={false}
            desktopColumnsClassName="lg:grid-cols-7"
          />
        </section>
      </Container>

      <Container className="mt-12">
        <FeatureRail
          eyebrow="Selección del destino"
          title="Experiencias que no te puedes perder"
          lead={experiences[0]}
          rail={experiences.slice(1)}
        />
      </Container>

      <Container className="mt-12">
        <ThreeCards eyebrow="Descubre" title="Lugares y sitios de interés" items={places} />
      </Container>

      <Container className="mt-12">
        <ThreeCards
          eyebrow="Diseñadas por Alux"
          title="Rutas para vivir Valladolid"
          items={routes}
          route
        />
      </Container>

      <Container className="mt-12">
        <StayAndEat />
      </Container>

      <Container className="mt-12">
        <Agenda />
      </Container>

      <Container className="mt-12">
        <ThreeCards
          eyebrow="Historias que respiran"
          title="Mira Valladolid con otros ojos"
          items={stories}
        />
      </Container>

      <Container className="mt-12">
        <TerritoryMap />
      </Container>

      <Container className="mt-12">
        <TripClose />
      </Container>

      <ReviewFooter />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[680px] overflow-hidden bg-[#142d25] text-white">
      <img
        src={media.cover.url}
        alt={media.cover.alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      <Container className="relative flex min-h-[680px] items-end pb-14 pt-32">
        <div className="max-w-[43rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f2b84b]">
            Pueblo Mágico · Oriente Maya
          </p>
          <h1 className="mt-4 font-serif text-6xl leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-[6.25rem]">
            Valladolid
          </h1>
          <p className="mt-5 max-w-xl font-serif text-2xl leading-tight text-white/90 sm:text-3xl">
            La capital para descubrir el Oriente Maya de Yucatán
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
            Historia, naturaleza y cultura viva se encuentran aquí. Haz de Valladolid tu punto de
            partida y deja que el territorio se revele a su propio ritmo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full bg-[#f4a928] px-6 text-[#17352b] hover:bg-[#ffc55c]"
            >
              Descubrir Valladolid <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/40 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              Armar mi viaje
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

function TerritoryContext() {
  return (
    <nav
      aria-label="Ubicación territorial"
      className="flex min-h-12 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm shadow-sm"
    >
      <a
        href="/"
        aria-label="Volver al inicio"
        title="Inicio"
        className="grid size-8 shrink-0 place-items-center rounded-full text-[#1e5a48] transition-colors hover:bg-[#edf4ef]"
      >
        <Home className="size-4" aria-hidden />
      </a>
      <span className="text-black/30">/</span>
      <a href="/oriente-maya" className="font-medium text-[#1e5a48]">
        Oriente Maya
      </a>
      <span className="text-black/30">/</span>
      <span className="font-semibold">Valladolid</span>
      <span className="ml-auto hidden items-center gap-2 text-xs text-black/55 sm:flex">
        <MapPin className="size-3.5" /> Tu punto de partida en el territorio
      </span>
    </nav>
  );
}

function DestinationIntro() {
  return (
    <section className="grid gap-7 rounded-[2rem] border border-black/10 bg-white p-7 shadow-sm lg:grid-cols-[.95fr_1.05fr] lg:p-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b65d2f]">
          El corazón del Oriente Maya
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Una ciudad para quedarse. Un territorio para descubrir.
        </h2>
      </div>
      <div className="grid content-center gap-4 text-[15px] leading-7 text-black/65">
        <p>
          Valladolid combina la calma de una ciudad histórica con la energía de un territorio vivo:
          cenotes, comunidades mayas, haciendas, cocina local y patrimonio a menos de una jornada.
        </p>
        <p>
          No es sólo una escala entre Mérida y el Caribe. Es la base desde la que el viaje comienza
          a tomar forma.
        </p>
      </div>
    </section>
  );
}

function AluxGuide() {
  return (
    <section className="grid items-center gap-5 overflow-hidden rounded-[1.5rem] bg-[#123f32] px-6 py-5 text-white shadow-lg md:grid-cols-[auto_1fr_auto]">
      <div className="flex items-center gap-3">
        <AluxMark family="avatar" size={64} decorative />
        <div>
          <p className="font-serif text-xl">Alux</p>
          <p className="text-xs text-white/60">Tu concierge IA</p>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#efb74b]">
          Para recomendarte mejor
        </p>
        <h2 className="mt-1 font-serif text-2xl">
          ¿Ya estás en la región o estás planeando tu viaje?
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Estoy planeando", "Ya estoy aquí", "Viajo en pareja", "Viajo en familia"].map(
            (item) => (
              <button
                key={item}
                className="rounded-full border border-white/25 px-4 py-2 text-xs text-white/85 hover:bg-white/10"
              >
                {item}
              </button>
            ),
          )}
        </div>
      </div>
      <Button className="rounded-full bg-[#f4a928] text-[#17352b] hover:bg-[#ffc55c]">
        Preguntar a Alux <ArrowRight className="ml-2 size-4" />
      </Button>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <header className={compact ? "mb-4" : "mb-5"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b65d2f]">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{title}</h2>
    </header>
  );
}

function Image({ item, className }: { item: DestinationPremiumMedia; className: string }) {
  return (
    <img src={item.url} alt={item.alt} loading="lazy" className={`${className} object-cover`} />
  );
}

function FeatureRail({
  eyebrow,
  title,
  lead,
  rail,
}: {
  eyebrow: string;
  title: string;
  lead: { title: string; eyebrow: string; image: DestinationPremiumMedia };
  rail: Array<{ title: string; eyebrow: string; image: DestinationPremiumMedia }>;
}) {
  return (
    <section>
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="grid h-[30rem] gap-4 lg:grid-cols-[1.65fr_1fr]">
        <article className="group relative overflow-hidden rounded-[1.75rem] bg-black">
          <Image
            item={lead.image}
            className="h-full w-full transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#f4b640]">
              {lead.eyebrow}
            </p>
            <h3 className="mt-2 font-serif text-4xl">{lead.title}</h3>
            <p className="mt-3 text-sm text-white/75">
              Ver experiencia <ArrowRight className="ml-1 inline size-4" />
            </p>
          </div>
        </article>
        <div className="grid min-h-0 grid-rows-3 gap-4">
          {rail.map((item) => (
            <article
              key={item.title}
              className="grid min-h-0 overflow-hidden rounded-[1.25rem] border border-black/10 bg-white grid-cols-[42%_1fr]"
            >
              <Image item={item.image} className="h-full min-h-0 w-full" />
              <div className="flex flex-col justify-center p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#b65d2f]">
                  {item.eyebrow}
                </p>
                <h3 className="mt-1 font-serif text-xl">{item.title}</h3>
                <p className="mt-2 text-xs text-black/55">
                  Descubrir <ArrowRight className="ml-1 inline size-3" />
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreeCards({
  eyebrow,
  title,
  items,
  route = false,
}: {
  eyebrow: string;
  title: string;
  items: Array<{ title: string; meta?: string; eyebrow?: string; image: DestinationPremiumMedia }>;
  route?: boolean;
}) {
  return (
    <section>
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm"
          >
            <div className="relative h-56 overflow-hidden">
              <Image
                item={item.image}
                className="h-full w-full transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              {route ? <RouteIcon className="absolute left-5 top-5 size-5 text-white" /> : null}
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[10px] uppercase tracking-[.16em] text-[#f4b640]">
                  {item.eyebrow ?? item.meta}
                </p>
                <h3 className="mt-1 font-serif text-2xl">{item.title}</h3>
                {route ? <p className="mt-2 text-xs text-white/70">{item.meta}</p> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StayAndEat() {
  const cards = [
    { title: "Hacienda San Miguel", type: "Hotel boutique", image: media.hotel },
    { title: "Casa de los Frailes", type: "Casa de vacaciones", image: media.habitacion },
    { title: "Cocina de Zací", type: "Gastronomía local", image: media.restaurante },
    { title: "Mercado de Valladolid", type: "Sabores cotidianos", image: media.cochinita },
  ];
  return (
    <section>
      <SectionHeading
        eyebrow="Hospitalidad y gastronomía"
        title="Descansa bien, come con contexto"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => (
          <article
            key={item.title}
            className="overflow-hidden rounded-[1.25rem] border border-black/10 bg-white"
          >
            <Image item={item.image} className="h-44 w-full" />
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-[.15em] text-[#b65d2f]">{item.type}</p>
              <h3 className="mt-1 font-serif text-lg">{item.title}</h3>
              <p className="mt-3 text-xs text-black/55">
                Ver más <ArrowRight className="ml-1 inline size-3" />
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Agenda() {
  return (
    <section>
      <SectionHeading eyebrow="Agenda local" title="Lo que está pasando en Valladolid" />
      <div className="grid overflow-hidden rounded-[1.5rem] bg-[#123f32] text-white md:grid-cols-3">
        {[
          ["16", "MAY", "Noche de Valladolid"],
          ["24", "MAY", "Festival de la Calzada"],
          ["31", "MAY", "Sabores del Oriente"],
        ].map(([day, month, title], index) => (
          <article
            key={title}
            className={`flex items-center gap-5 p-6 ${index ? "border-t border-white/15 md:border-l md:border-t-0" : ""}`}
          >
            <div>
              <p className="font-serif text-4xl text-[#f4b640]">{day}</p>
              <p className="text-[10px] tracking-[.18em] text-white/55">{month}</p>
            </div>
            <div>
              <CalendarDays className="size-4 text-white/55" />
              <h3 className="mt-2 font-serif text-xl">{title}</h3>
              <p className="mt-1 text-xs text-white/55">Ver evento</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TerritoryMap() {
  return (
    <section>
      <SectionHeading
        eyebrow="Muévete con sentido"
        title="Valladolid y el territorio que la rodea"
      />
      <div className="grid min-h-[27rem] overflow-hidden rounded-[1.75rem] border border-black/10 bg-white lg:grid-cols-[1.65fr_1fr]">
        <div className="relative bg-[#d9e0d2]">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(#446658 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="absolute left-[44%] top-[47%] rounded-full bg-[#f3a629] p-3 shadow-xl">
            <MapPin className="size-5 text-[#183e32]" />
          </div>
          <span className="absolute left-[39%] top-[62%] rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">
            Valladolid
          </span>
        </div>
        <div className="divide-y divide-black/10 p-6">
          {[
            ["28 km", "Ek’ Balam"],
            ["45 km", "Chichén Itzá"],
            ["105 km", "Río Lagartos"],
          ].map(([distance, place]) => (
            <div key={place} className="flex items-center gap-4 py-5">
              <span className="grid size-12 place-items-center rounded-full bg-[#f7eee0] text-xs font-semibold text-[#a9532b]">
                {distance}
              </span>
              <div>
                <h3 className="font-serif text-xl">{place}</h3>
                <p className="text-xs text-black/50">Descubrir desde Valladolid</p>
              </div>
              <ArrowRight className="ml-auto size-4 text-black/35" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TripClose() {
  return (
    <section className="grid items-center gap-5 rounded-[1.75rem] bg-[#123f32] px-7 py-7 text-white sm:grid-cols-[auto_1fr_auto]">
      <div className="flex justify-center">
        <img
          src="/brand/alux/master/alux-ia-avatar-master-transparent.png"
          alt=""
          aria-hidden
          className="h-[72px] w-[72px] object-contain"
        />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[.18em] text-[#efb74b]">Tu viaje empieza aquí</p>
        <h2 className="mt-1 font-serif text-3xl">Deja que Valladolid te abra el territorio</h2>
        <p className="mt-2 text-sm text-white/60">
          Guarda lugares, arma una ruta y continúa con Alux cuando lo necesites.
        </p>
      </div>
      <Button className="rounded-full bg-[#f4a928] text-[#17352b] hover:bg-[#ffc55c]">
        Armar mi viaje <Sparkles className="ml-2 size-4" />
      </Button>
    </section>
  );
}

function ReviewFooter() {
  return (
    <footer className="mt-20 bg-[#171b18] text-white">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <div>
          <BrandLogo tone="light" size="md" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/55">
            Despierta en Valladolid y descubre todo el Oriente Maya de Yucatán.
          </p>
        </div>
        <FooterColumn
          title="Descubre"
          links={["Destinos", "Experiencias", "Rutas", "Pueblos Mágicos"]}
        />
        <FooterColumn
          title="Planea"
          links={["Hoteles", "Restaurantes", "Casas de vacaciones", "Eventos"]}
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#f4b640]">
            Síguenos
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="#"
              aria-label="Instagram"
              className="grid size-10 place-items-center rounded-full border border-white/20"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="grid size-10 place-items-center rounded-full border border-white/20"
            >
              <Facebook className="size-4" />
            </a>
          </div>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col justify-between gap-3 py-6 text-xs text-white/40 sm:flex-row">
          <p>© 2026 Valladolid.mx · Oriente Maya de Yucatán</p>
          <div className="flex gap-5">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Contacto</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#f4b640]">{title}</p>
      <ul className="mt-5 space-y-3 text-sm text-white/55">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="hover:text-white">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
