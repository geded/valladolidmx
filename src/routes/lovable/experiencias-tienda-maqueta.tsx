/**
 * MAQUETA de revisión — Sección pública de Experiencias como tienda en línea.
 *
 * Ruta interna noindex/nofollow, sin conexión a datos reales. Todo el
 * contenido es de muestra y está marcado como tal. No sustituye ni modifica
 * la plantilla Premium aprobada de `/experiencias`; existe únicamente para
 * aceptación visual del Founder antes de construir el paso 5 del plan de
 * Comercio, Experiencias y Liquidación (Blueprint 13 · Plan 18.02).
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lovable/experiencias-tienda-maqueta")({
  head: () => ({
    meta: [
      { title: "Maqueta · Experiencias (visitante)" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

const IMG = "/api/public/studio-media/conceptual-preview/2026-09-01";

const CATEGORIES = [
  { slug: "cenotes", label: "Cenotes y naturaleza" },
  { slug: "cultura", label: "Cultura maya" },
  { slug: "gastronomia", label: "Gastronomía" },
  { slug: "tours", label: "Recorridos" },
  { slug: "bienestar", label: "Bienestar" },
  { slug: "comunidades", label: "Comunidades" },
  { slug: "zonas-arqueologicas", label: "Zonas arqueológicas" },
  { slug: "artesanias", label: "Artesanías" },
];

type Card = {
  id: string;
  title: string;
  place: string;
  image: string;
  category: string;
  duration: string;
  languages: string;
  rating: string;
  reviews: number;
  price: number;
  badge?: string;
};

const CARDS: Card[] = [
  {
    id: "c1",
    title: "Nado al amanecer en cenote de bóveda",
    place: "Valladolid",
    image: `${IMG}/zazil-tunich-hero-preview.webp`,
    category: "Cenotes y naturaleza",
    duration: "3 h",
    languages: "Español · Inglés",
    rating: "4.9",
    reviews: 128,
    price: 890,
    badge: "Reserva en línea",
  },
  {
    id: "c2",
    title: "Cocina de humo con familia yucateca",
    place: "Temozón",
    image: `${IMG}/home-temozon-editorial-preview.webp`,
    category: "Gastronomía",
    duration: "4 h",
    languages: "Español",
    rating: "4.8",
    reviews: 74,
    price: 1250,
    badge: "Reserva en línea",
  },
  {
    id: "c3",
    title: "Caminata nocturna por la ciudad amarilla",
    place: "Izamal",
    image: `${IMG}/home-izamal-editorial-preview.webp`,
    category: "Cultura maya",
    duration: "2 h",
    languages: "Español · Inglés · Francés",
    rating: "4.7",
    reviews: 41,
    price: 450,
    badge: "Reserva en línea",
  },
  {
    id: "c4",
    title: "Taller de urdido en hamaca de algodón",
    place: "Espita",
    image: `${IMG}/home-espita-editorial-preview.webp`,
    category: "Artesanías",
    duration: "2.5 h",
    languages: "Español · Maya",
    rating: "5.0",
    reviews: 19,
    price: 620,
  },
  {
    id: "c5",
    title: "Ruta de conventos y cantera colonial",
    place: "Valladolid",
    image: `${IMG}/valladolid-san-servacio-hero-preview.webp`,
    category: "Recorridos",
    duration: "5 h",
    languages: "Español · Inglés",
    rating: "4.6",
    reviews: 96,
    price: 1490,
    badge: "Reserva en línea",
  },
  {
    id: "c6",
    title: "Temazcal de cierre de viaje",
    place: "Valladolid",
    image: `${IMG}/home-valladolid-editorial-preview.webp`,
    category: "Bienestar",
    duration: "2 h",
    languages: "Español",
    rating: "4.9",
    reviews: 57,
    price: 980,
  },
];

function Page() {
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [category, setCategory] = useState<string>("cenotes");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MaquetaBanner />

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-6">
        <Hero />
        <Categories active={category} onSelect={setCategory} />
        <FilterBar view={view} onView={setView} />
        {view === "lista" ? <Results /> : <MapView />}
        <TripStrip />
      </main>
    </div>
  );
}

function MaquetaBanner() {
  return (
    <div className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Maqueta de revisión · contenido y fotografías de muestra · no publicada
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border shadow-soft">
      <div className="grid md:grid-cols-[42%_58%]">
        <div className="flex flex-col justify-center gap-5 bg-card p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Vive el Oriente Maya
          </p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            Reserva hoy tu experiencia en el Oriente Maya
          </h1>
          <p className="text-sm text-muted-foreground">
            Elige el día, las personas y paga en línea. Tu confirmación llega al instante y queda
            guardada en Mi Viaje.
          </p>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 shadow-soft">
            <input
              className="h-11 rounded-pill border border-border bg-card px-4 text-sm outline-none"
              placeholder="¿Qué experiencia quieres vivir?"
              readOnly
            />
            <div className="grid grid-cols-2 gap-3">
              <FakeField label="Fecha" value="Vie 25 sep" />
              <FakeField label="Personas" value="2 adultos" />
            </div>
            <button className="h-11 rounded-pill bg-primary text-sm font-semibold text-primary-foreground">
              Ver disponibilidad
            </button>
          </div>
        </div>
        <div
          className="min-h-[280px] bg-cover bg-center md:min-h-[420px]"
          style={{ backgroundImage: `url(${IMG}/zazil-tunich-hero-preview.webp)` }}
          role="img"
          aria-label="Fotografía de muestra de un cenote del Oriente Maya"
        />
      </div>
    </section>
  );
}

function FakeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function Categories({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-2xl">Explora por lo que te mueve</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {CATEGORIES.map((c) => {
          const on = c.slug === active;
          return (
            <button
              key={c.slug}
              onClick={() => onSelect(c.slug)}
              className={`flex min-w-[118px] flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition ${
                on
                  ? "border-primary bg-card shadow-soft"
                  : "border-border bg-card/60 hover:shadow-soft"
              }`}
            >
              <img
                src={`/brand/category-icons/${c.slug}.png`}
                alt=""
                className="h-10 w-10 object-contain"
              />
              <span className="text-center text-xs font-medium leading-tight">{c.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FilterBar({
  view,
  onView,
}: {
  view: "lista" | "mapa";
  onView: (v: "lista" | "mapa") => void;
}) {
  return (
    <section className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/95 p-3 shadow-soft backdrop-blur">
      {["Fecha", "Personas", "Precio", "Duración", "Idioma", "Accesibilidad", "Destino"].map(
        (f) => (
          <span
            key={f}
            className="rounded-pill border border-border bg-card px-4 py-2 text-xs font-medium"
          >
            {f}
          </span>
        ),
      )}
      <div className="ml-auto flex rounded-pill border border-border bg-card p-1">
        {(["lista", "mapa"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`rounded-pill px-4 py-1.5 text-xs font-semibold capitalize ${
              view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </section>
  );
}

function Results() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">86 experiencias disponibles</h2>
        <span className="text-xs text-muted-foreground">Ordenar por: recomendadas</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <ExperienceCard key={c.id} card={c} />
        ))}
      </div>
    </section>
  );
}

function ExperienceCard({ card }: { card: Card }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-elevated">
      <div className="relative">
        <img
          src={card.image}
          alt={`Fotografía de muestra: ${card.title}`}
          className="h-48 w-full object-cover"
          loading="lazy"
        />
        {card.badge ? (
          <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {card.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          {card.category} · {card.place}
        </p>
        <h3 className="font-serif text-lg leading-snug">{card.title}</h3>
        <p className="text-xs text-muted-foreground">
          {card.duration} · {card.languages}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">★ {card.rating}</span> ({card.reviews}{" "}
          reseñas)
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <p className="text-sm">
            <span className="text-xs text-muted-foreground">Desde </span>
            <span className="font-semibold">${card.price.toLocaleString("es-MX")}</span>
            <span className="text-xs text-muted-foreground"> MXN / persona</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button className="h-9 rounded-pill bg-primary text-xs font-semibold text-primary-foreground">
            Reservar
          </button>
          <button className="h-9 rounded-pill border border-border text-xs font-semibold">
            Agregar a Mi Viaje
          </button>
        </div>
      </div>
    </article>
  );
}

function MapView() {
  return (
    <section className="grid gap-4 lg:grid-cols-[38%_62%]">
      <div className="flex flex-col gap-3">
        {CARDS.slice(0, 4).map((c) => (
          <article
            key={c.id}
            className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          >
            <img
              src={c.image}
              alt={`Fotografía de muestra: ${c.title}`}
              className="h-28 w-28 shrink-0 object-cover"
              loading="lazy"
            />
            <div className="flex flex-col justify-center gap-1 py-2 pr-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {c.place}
              </p>
              <h3 className="font-serif text-base leading-snug">{c.title}</h3>
              <p className="text-xs text-muted-foreground">
                {c.duration} · ★ {c.rating} · Desde ${c.price.toLocaleString("es-MX")}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border bg-muted">
        <div className="absolute inset-0 grid place-items-center">
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Aquí va el mapa del Oriente Maya con un pin por experiencia y el precio visible en cada
            pin. En la maqueta se muestra el espacio reservado.
          </p>
        </div>
        {[
          { top: "22%", left: "28%", price: "$890" },
          { top: "44%", left: "58%", price: "$1,250" },
          { top: "66%", left: "36%", price: "$450" },
          { top: "34%", left: "76%", price: "$1,490" },
        ].map((p) => (
          <span
            key={p.price}
            style={{ top: p.top, left: p.left }}
            className="absolute rounded-pill border border-border bg-background px-3 py-1 text-xs font-semibold shadow-soft"
          >
            {p.price}
          </span>
        ))}
      </div>
    </section>
  );
}

function TripStrip() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-serif text-2xl">¿Prefieres que te lo armen?</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Guarda las experiencias que te gusten en Mi Viaje y un concierge del Oriente Maya te arma la
        propuesta completa con hospedaje, traslados y horarios. Pagues como pagues, tu reservación
        queda registrada con folio.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="h-10 rounded-pill bg-primary px-5 text-xs font-semibold text-primary-foreground">
          Arma tu viaje
        </button>
        <button className="h-10 rounded-pill border border-border px-5 text-xs font-semibold">
          Hablar con Alux
        </button>
      </div>
    </section>
  );
}
