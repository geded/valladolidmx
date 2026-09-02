import {
  BedDouble,
  ChevronRight,
  Heart,
  Home,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

const MEDIA = "/api/public/studio-media/governed/v1p1c";

const LOCAL_HOTELS = [
  {
    name: "Hacienda San Servacio Boutique",
    zone: "Centro Histórico · Valladolid",
    copy: "Una casona serena para caminar la ciudad y comenzar desde aquí cada ruta.",
    image: `${MEDIA}/hotel-cover.jpg`,
    tags: ["Hotel boutique", "Alberca", "Desayuno yucateco"],
  },
  {
    name: "Posada Calzada de los Frailes",
    zone: "Barrio de Sisal · Valladolid",
    copy: "Habitaciones alrededor de un patio de piedra, cerca del convento y la Calzada.",
    image: `${MEDIA}/hotel-gallery-1.jpg`,
    tags: ["Patio colonial", "Céntrico", "Viaje en pareja"],
  },
  {
    name: "Casa de los Arcos",
    zone: "Centro · Valladolid",
    copy: "Una estancia íntima para explorar mercados, barrios y sabores caminando.",
    image: `${MEDIA}/hotel-gallery-2.jpg`,
    tags: ["Casa histórica", "Terraza", "Cerca del centro"],
  },
];

const NEARBY = [
  {
    name: "Hacienda de campo",
    zone: "A 28 km de Valladolid",
    image: `${MEDIA}/destination-gallery-1.jpg`,
  },
  {
    name: "Estancia junto al cenote",
    zone: "A 36 km de Valladolid",
    image: `${MEDIA}/experience-gallery-1.jpg`,
  },
];

export function TerritorialListingReviewSurface() {
  return (
    <main className="bg-[#f7f2e8] pb-12 text-[#17251f] sm:pb-16">
      <div className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
        <TerritorialBreadcrumb />
        <ListingIntro />
        <AluxBar />
        <Filters />

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(22rem,.76fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(25rem,.72fr)]">
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  Primero en el destino
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">Hospedajes en Valladolid</h2>
              </div>
              <p className="shrink-0 text-sm text-[#667067]">3 opciones</p>
            </div>

            <div className="mt-4 space-y-4">
              {LOCAL_HOTELS.map((hotel, index) => (
                <HotelCard key={hotel.name} hotel={hotel} featured={index === 0} />
              ))}
            </div>

            <NearbySection />
          </div>

          <MapPanel />
        </div>
      </div>
    </main>
  );
}

function TerritorialBreadcrumb() {
  return (
    <nav
      aria-label="Ubicación territorial"
      className="flex min-h-12 items-center gap-2 overflow-x-auto whitespace-nowrap py-3 text-xs text-[#6a726c]"
    >
      <a
        href="/"
        aria-label="Inicio"
        className="grid size-8 shrink-0 place-items-center rounded-full border border-[#ded7c9] bg-white"
      >
        <Home className="size-3.5" aria-hidden />
      </a>
      <ChevronRight className="size-3 shrink-0" aria-hidden />
      <a href="/oriente-maya" className="hover:text-[#0d4b38]">
        Oriente Maya
      </a>
      <ChevronRight className="size-3 shrink-0" aria-hidden />
      <a href="/oriente-maya/valladolid" className="hover:text-[#0d4b38]">
        Valladolid
      </a>
      <ChevronRight className="size-3 shrink-0" aria-hidden />
      <span className="font-semibold text-[#17251f]">Hoteles</span>
    </nav>
  );
}

function ListingIntro() {
  return (
    <header className="grid gap-5 border-y border-[#ded7c9] py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:py-8">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#ba641e]">
          <BedDouble className="size-4" aria-hidden /> Dónde dormir
        </p>
        <h1 className="mt-3 font-display text-[2.4rem] leading-[.98] sm:text-5xl lg:text-6xl">
          Hoteles en Valladolid
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#5d685f] sm:text-lg">
          Encuentra una estancia que acompañe tu forma de viajar y te conecte con todo el
          territorio.
        </p>
      </div>
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#0d4b38] px-5 text-sm font-semibold text-[#0d4b38]">
        <Heart className="size-4" aria-hidden /> Ver mi viaje
      </button>
    </header>
  );
}

function AluxBar() {
  const options = ["Boutique", "En pareja", "En familia", "Con piscina", "Cerca del centro"];
  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-[#073f31] text-white shadow-[0_12px_30px_rgba(7,63,49,.12)]">
      <div className="grid gap-3 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-3">
          <img
            src="/brand/alux/webp/alux-ia-avatar-64.webp"
            alt="Alux"
            className="size-12 object-contain"
          />
          <div>
            <p className="font-display text-lg leading-none">Alux</p>
            <p className="mt-1 text-[11px] text-white/65">Tu concierge IA</p>
          </div>
        </div>
        <div className="min-w-0 sm:pl-3">
          <p className="text-sm font-semibold sm:text-base">¿Cómo te gustaría hospedarte?</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {options.map((option) => (
              <button
                key={option}
                className="min-h-9 shrink-0 rounded-full border border-white/25 px-3 text-xs text-white/90"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <button className="hidden min-h-11 items-center gap-2 rounded-full bg-[#f3a61e] px-5 text-sm font-bold text-[#193126] lg:inline-flex">
          Recomiéndame <Sparkles className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

function Filters() {
  return (
    <section className="mt-4 rounded-2xl border border-[#ded7c9] bg-white p-3 shadow-sm sm:p-4">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
        <label className="relative min-w-[12.5rem] lg:min-w-0">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#788078]"
            aria-hidden
          />
          <span className="sr-only">Buscar hotel</span>
          <input
            placeholder="Buscar hotel, zona o servicio"
            className="min-h-11 w-full rounded-xl border border-[#ded7c9] bg-[#fbfaf6] pl-10 pr-3 text-sm outline-none"
          />
        </label>
        <button className="inline-flex min-h-11 min-w-max items-center justify-center gap-2 rounded-xl bg-[#0d4b38] px-4 text-sm font-semibold text-white sm:hidden">
          <Map className="size-4" aria-hidden /> Ver mapa
        </button>
        {["Zona", "Tipo de hospedaje", "Servicios"].map((label) => (
          <button
            key={label}
            className="inline-flex min-h-11 min-w-max items-center justify-between gap-3 rounded-xl border border-[#ded7c9] bg-[#fbfaf6] px-4 text-sm lg:min-w-0"
          >
            {label} <span className="text-xs">⌄</span>
          </button>
        ))}
        <button className="inline-flex min-h-11 min-w-max items-center justify-center gap-2 rounded-xl bg-[#efe8da] px-4 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden /> Más filtros
        </button>
      </div>
    </section>
  );
}

function HotelCard({
  hotel,
  featured,
}: {
  hotel: (typeof LOCAL_HOTELS)[number];
  featured: boolean;
}) {
  return (
    <article className="group grid min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#ded7c9] bg-white shadow-sm sm:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="relative min-h-[10rem] overflow-hidden bg-[#ded7c9] sm:min-h-[13rem]">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.025]"
        />
        {featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#f3a61e] px-2 py-1 text-[10px] font-bold text-[#193126]">
            Recomendado
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ba641e]">
              Hotel boutique
            </p>
            <h3 className="mt-1 font-display text-xl leading-tight sm:text-2xl">{hotel.name}</h3>
          </div>
          <button
            aria-label={`Guardar ${hotel.name}`}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#ded7c9]"
          >
            <Heart className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#697269]">
          <MapPin className="size-3" aria-hidden /> {hotel.zone}
        </p>
        <p className="mt-3 hidden text-sm leading-6 text-[#5d685f] sm:block">{hotel.copy}</p>
        <div className="mt-3 hidden flex-wrap gap-2 md:flex">
          {hotel.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f1ece2] px-2.5 py-1 text-[11px]">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <button className="min-h-10 rounded-full bg-[#0d4b38] px-4 text-xs font-bold text-white sm:min-h-11 sm:text-sm">
            Ver hotel
          </button>
          <button className="hidden min-h-11 rounded-full border border-[#0d4b38] px-4 text-sm font-semibold text-[#0d4b38] sm:inline-flex sm:items-center">
            Agregar a mi viaje
          </button>
        </div>
      </div>
    </article>
  );
}

function NearbySection() {
  return (
    <section className="mt-10 border-t border-[#ded7c9] pt-7">
      <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ba641e]">
        Amplía la ruta
      </p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">Opciones cerca de Valladolid</h2>
          <p className="mt-1 text-sm text-[#667067]">
            Se muestran aparte para conservar claro qué pertenece al destino.
          </p>
        </div>
        <a href="#" className="hidden shrink-0 text-sm font-semibold text-[#0d4b38] sm:block">
          Explorar alrededor →
        </a>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {NEARBY.map((item) => (
          <article
            key={item.name}
            className="overflow-hidden rounded-2xl border border-[#ded7c9] bg-white"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="absolute inset-0 size-full object-cover"
              />
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="font-display text-base sm:text-lg">{item.name}</h3>
              <p className="mt-1 text-xs text-[#697269]">{item.zone}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MapPanel() {
  return (
    <aside className="order-first hidden sm:block lg:order-none lg:sticky lg:top-24">
      <section className="overflow-hidden rounded-2xl border border-[#ded7c9] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#ded7c9] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ba641e]">
              Mapa territorial
            </p>
            <h2 className="font-display text-xl">Hoteles en Valladolid</h2>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full bg-[#efe8da] lg:hidden"
            aria-label="Cerrar mapa"
          >
            <Map className="size-4" aria-hidden />
          </button>
        </div>
        <div
          className="relative h-64 overflow-hidden bg-[#dfe9df] sm:h-80 lg:h-[31rem]"
          style={{
            backgroundImage: "radial-gradient(#b8c7b8 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="absolute inset-0 opacity-50 [background:linear-gradient(135deg,transparent_42%,#fff_43%,#fff_47%,transparent_48%),linear-gradient(35deg,transparent_54%,#c9d8c8_55%,#c9d8c8_59%,transparent_60%)]" />
          {[
            [34, 42],
            [58, 28],
            [64, 62],
          ].map(([left, top], index) => (
            <span
              key={index}
              className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#f3a61e] text-xs font-bold shadow-md"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {index + 1}
            </span>
          ))}
          <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold shadow">
            Valladolid · Yucatán
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#ded7c9] p-4 text-sm">
          <span className="text-[#5d685f]">Mapa sincronizado con tus resultados</span>
          <button className="font-semibold text-[#0d4b38]">Ver ruta</button>
        </div>
      </section>
      <section className="mt-4 hidden rounded-2xl bg-[#073f31] p-5 text-white lg:block">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#f3a61e]">
          Alux conecta tu viaje
        </p>
        <h2 className="mt-2 font-display text-2xl">Dormir bien también organiza la ruta.</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Guarda opciones y Alux calculará noches, trayectos y experiencias cercanas.
        </p>
        <button className="mt-4 min-h-11 rounded-full bg-[#f3a61e] px-5 text-sm font-bold text-[#193126]">
          Personalizar con Alux
        </button>
      </section>
    </aside>
  );
}
