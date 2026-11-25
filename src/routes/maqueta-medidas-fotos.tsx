/**
 * MAQUETA INTERNA (noindex) — Unificación de medidas de fotos en Inicio.
 * Compara las medidas actuales (medidas en el sitio publicado) con tres
 * medidas oficiales: portada 16:9, tarjeta 4:3 y franja 21:9. No modifica
 * Inicio; sólo se aplicará si el Founder aprueba.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";

async function loadPhotos() {
  const [r, h] = await Promise.all([
    getPublicListing({ data: { family: "restaurantes", destino: "valladolid" } }),
    getPublicListing({ data: { family: "hoteles", destino: "valladolid" } }),
  ]);
  const pick = (items: typeof r.items) =>
    items.filter((i) => i.mediaUrl).slice(0, 3).map((i) => ({ url: i.mediaUrl as string, name: i.name }));
  return { hoteles: pick(h.items), restaurantes: pick(r.items) };
}

export const Route = createFileRoute("/maqueta-medidas-fotos")({
  loader: () => loadPhotos(),
  head: () => ({
    meta: [
      { title: "Maqueta interna: medidas de fotos en Inicio" },
      { name: "description", content: "Comparación antes y después de las medidas de fotos de Inicio de Valladolid.mx." },
      { property: "og:title", content: "Medidas de fotos · Valladolid.mx" },
      { property: "og:description", content: "Revisión interna de tres medidas oficiales de fotos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type P = { url: string; name: string };

function Card({ p, cls }: { p: P; cls: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <img src={p.url} alt={p.name} loading="lazy" className={`w-full object-cover ${cls}`} />
      <figcaption className="p-3 text-sm font-medium">{p.name}</figcaption>
    </figure>
  );
}

function Row({ title, items }: { title: string; items: { p: P; cls: string }[] }) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      <div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-3">
        {items.map((it, i) => <Card key={i} {...it} />)}
      </div>
    </div>
  );
}

function Page() {
  const { hoteles, restaurantes } = Route.useLoaderData();
  const all = [...hoteles, ...restaurantes];
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Maqueta interna · sólo para revisión del Founder
      </p>
      <h1 className="mt-1 text-2xl font-bold">Medidas de fotos en Inicio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Fotos reales. Arriba, como se ven hoy; abajo, con tres medidas oficiales: portada (ancha),
        tarjeta (igual para hoteles, restaurantes, destinos, experiencias y rutas) y franja.
      </p>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Así se ve hoy</h2>
        <Row title="Hoteles y restaurantes (alturas distintas)" items={[
          ...hoteles.slice(0, 2).map((p) => ({ p, cls: "aspect-[4/5]" })),
          ...restaurantes.slice(0, 2).map((p) => ({ p, cls: "aspect-[1/1]" })),
        ]} />
        <Row title="¿Qué hacer hoy? (dos alturas en la misma fila)" items={all.slice(0, 3).map((p, i) => ({ p, cls: i % 2 ? "aspect-[4/3]" : "aspect-[1/1]" }))} />
      </section>

      <hr className="my-10 border-border" />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Propuesta: tres medidas oficiales</h2>
        {all[0] && (
          <div className="mb-8">
            <h3 className="mb-3 text-base font-semibold">Portada · ancha</h3>
            <Card p={all[0]} cls="aspect-[16/9]" />
          </div>
        )}
        <Row title="Tarjeta · misma medida en todas las secciones" items={[
          ...hoteles.slice(0, 2), ...restaurantes.slice(0, 2),
        ].map((p) => ({ p, cls: "aspect-[4/3]" }))} />
        {all[1] && (
          <div>
            <h3 className="mb-3 text-base font-semibold">Franja · Pueblos Mágicos</h3>
            <Card p={all[1]} cls="aspect-[21/9]" />
          </div>
        )}
      </section>
    </main>
  );
}
