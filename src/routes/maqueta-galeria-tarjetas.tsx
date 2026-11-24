/**
 * MAQUETA INTERNA (noindex) — Punto 4 de la mejora de velocidad estilo
 * Airbnb: galería deslizable en las tarjetas de los listados.
 *
 * Compara la tarjeta oficial actual (`TourismCard`, una sola foto) con la
 * propuesta (misma tarjeta, pero la foto se desliza entre varias fotos de
 * la empresa, con puntos y flechas). Usa datos reales de empresas
 * publicadas. NO es una superficie pública ni un componente nuevo de la
 * Biblioteca: si el Founder aprueba la maqueta, la galería se integra como
 * evolución de `TourismCard` (variant/capability), nunca como card paralela.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { getMarketplaceBusinessBySlug } from "@/lib/catalog/marketplace-reads.functions";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";
import { cn } from "@/lib/utils";

interface MockBusiness {
  vm: TourismCardVM;
  photos: { url: string; alt: string }[];
}

async function loadMockBusinesses(): Promise<MockBusiness[]> {
  const [restaurantes, hoteles] = await Promise.all([
    getPublicListing({ data: { family: "restaurantes", destino: "valladolid" } }),
    getPublicListing({ data: { family: "hoteles", destino: "valladolid" } }),
  ]);
  const candidates = [...restaurantes.items, ...hoteles.items].filter((i) => i.href && i.mediaUrl);
  const out: MockBusiness[] = [];
  for (const item of candidates) {
    if (out.length >= 6) break;
    const slug = item.href?.split("/").filter(Boolean).pop();
    if (!slug) continue;
    const detail = await getMarketplaceBusinessBySlug({ data: { slug } }).catch(() => null);
    const photos = (detail?.media ?? [])
      .filter((m) => m.url)
      .slice(0, 5)
      .map((m) => ({ url: m.url, alt: m.alt ?? item.name }));
    if (photos.length < 2) continue;
    out.push({ vm: item, photos });
  }
  return out;
}

export const Route = createFileRoute("/maqueta-galeria-tarjetas")({
  loader: () => loadMockBusinesses(),
  head: () => ({
    meta: [
      { title: "Maqueta interna: galería deslizable en tarjetas" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MockupPage,
});

function MockupPage() {
  const businesses = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Maqueta interna · sólo para revisión del Founder
        </p>
        <h1 className="mt-1 text-2xl font-bold">Galería deslizable en las tarjetas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Comparación con datos reales. Arriba: la tarjeta oficial de hoy (una foto). Abajo: la
          propuesta estilo Airbnb — la foto se desliza entre varias fotos de la misma empresa, con
          puntos abajo y flechas al pasar el mouse (en celular se desliza con el dedo). El texto,
          precio, insignias y orden de la tarjeta no cambian.
        </p>
      </header>

      <section aria-label="Tarjeta actual">
        <h2 className="mb-4 text-lg font-semibold">Así se ve hoy</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <TourismCard key={`now-${b.vm.id}`} vm={b.vm} />
          ))}
        </div>
      </section>

      <hr className="my-12 border-border" />

      <section aria-label="Propuesta con galería deslizable">
        <h2 className="mb-4 text-lg font-semibold">Propuesta: galería deslizable</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <SwipeGalleryCard key={`new-${b.vm.id}`} vm={b.vm} photos={b.photos} />
          ))}
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Tarjeta propuesta — misma estructura y tokens que TourismCard; sólo
 * cambia el área de la foto por una galería deslizable.
 * ------------------------------------------------------------------ */
function SwipeGalleryCard({
  vm,
  photos,
}: {
  vm: TourismCardVM;
  photos: { url: string; alt: string }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((p, i) => (
            <img
              key={i}
              src={p.url}
              alt={p.alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>

        {vm.eyebrow || vm.entityKind ? (
          <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-pill bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-soft backdrop-blur">
            {vm.eyebrow ?? "Empresa"}
          </span>
        ) : null}

        {index > 0 ? (
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() => scrollTo(index - 1)}
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100"
          >
            ‹
          </button>
        ) : null}
        {index < photos.length - 1 ? (
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={() => scrollTo(index + 1)}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100"
          >
            ›
          </button>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-background/60 shadow-soft transition-all",
                i === index && "w-3 bg-background",
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {vm.location ? (
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <span className="truncate">{vm.location.label}</span>
          </p>
        ) : null}
        <h3 className="mt-1 text-base font-semibold leading-tight">
          {vm.href ? (
            <a href={vm.href} className="hover:underline">
              {vm.name}
            </a>
          ) : (
            vm.name
          )}
        </h3>
        {vm.tagline ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{vm.tagline}</p>
        ) : null}
        {vm.rating ? (
          <p className="mt-2 flex items-center gap-1 text-xs">
            <span className="font-semibold text-foreground">★ {vm.rating.value.toFixed(1)}</span>
            {vm.rating.count > 0 ? (
              <span className="text-muted-foreground">({vm.rating.count} reseñas)</span>
            ) : null}
          </p>
        ) : null}
        {vm.priceAmount != null ? (
          <p className="mt-2 text-sm font-semibold text-foreground">
            ${vm.priceAmount.toFixed(0)} <span className="font-normal text-muted-foreground">MXN</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
