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
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { getMarketplaceBusinessBySlug } from "@/lib/catalog/marketplace-reads.functions";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";

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
      { name: "description", content: "Comparación aprobada de las tarjetas de Valladolid.mx con galería de fotos de cada empresa." },
      { property: "og:title", content: "Galería de empresas · Valladolid.mx" },
      { property: "og:description", content: "Revisión interna de la galería integrada en la tarjeta oficial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
            <TourismCard key={`new-${b.vm.id}`} vm={b.vm} galleryPhotos={b.photos}
              capabilities={{ showGallery: true }} />
          ))}
        </div>
      </section>
    </main>
  );
}
