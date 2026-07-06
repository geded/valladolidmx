import { createFileRoute } from "@tanstack/react-router";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/contract";

export const Route = createFileRoute("/lovable/experience-map-preview")({
  head: () => ({
    meta: [
      { title: "Preview · Experience Map" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExperienceMapPreview,
});

const CENTER = { lat: 20.6896, lng: -88.2011, zoom: 14 };

const single: ExperienceMapDTO = {
  variant: "single",
  heading: "Ficha Empresa · variant single",
  center: { ...CENTER, zoom: 16 },
  points: [
    {
      id: "b1",
      kind: "business",
      lat: 20.6896,
      lng: -88.2011,
      title: "Hotel Zentik",
      subtitle: "Calle 41 · Centro",
      href: "/negocio/hotel-zentik",
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
  ],
  capabilities: {
    showDistance: true,
    showDirections: true,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

const multi: ExperienceMapDTO = {
  variant: "multi",
  heading: "Micrositio Destino · variant multi",
  center: CENTER,
  points: [
    { id: "p1", kind: "business", lat: 20.6896, lng: -88.2011, title: "Cenote Zaci", subtitle: "Cenote urbano", href: "#", thumbUrl: null, badge: null, priceLabel: "MXN 150" },
    { id: "p2", kind: "business", lat: 20.6875, lng: -88.2028, title: "Convento de Sisal", subtitle: "Patrimonio · s.XVI", href: "#", thumbUrl: null, badge: null, priceLabel: null },
    { id: "p3", kind: "business", lat: 20.691,  lng: -88.199,  title: "Mercado Municipal", subtitle: "Gastronomía local", href: "#", thumbUrl: null, badge: null, priceLabel: null },
    { id: "p4", kind: "business", lat: 20.686,  lng: -88.204,  title: "Casa de los Venados", subtitle: "Arte popular", href: "#", thumbUrl: null, badge: null, priceLabel: "MXN 100" },
  ],
  capabilities: {
    showDistance: true,
    showDirections: true,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

const listSync: ExperienceMapDTO = {
  ...multi,
  variant: "list-sync",
  heading: "Listado + Mapa · variant list-sync (V4.3)",
  capabilities: { ...multi.capabilities, syncList: true },
};

const cluster: ExperienceMapDTO = {
  ...multi,
  variant: "cluster",
  heading: "Territorial · variant cluster (V4.3)",
  capabilities: { ...multi.capabilities, clustering: true },
};

function ExperienceMapPreview() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          U-VISUAL · V4.1
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Experience Map · preview de variantes
        </h1>
        <p className="text-sm text-muted-foreground">
          Bloque oficial <code>vmx.experience.map</code>. Founder Discovery
          Map Principle: dónde está · qué hay cerca · cómo llegar · qué
          descubrir alrededor.
        </p>
      </header>

      <ExperienceMapBlock dto={single} />
      <ExperienceMapBlock dto={multi} />
      <ExperienceMapBlock dto={listSync} />
      <ExperienceMapBlock dto={cluster} />
    </main>
  );
}
