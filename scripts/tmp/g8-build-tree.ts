import { validateEditorialCompositionTree, collectEditorialMediaPaths } from "../../src/lib/experience-builder/editorial-builder-policy";

const M = (f: string) => `/api/public/studio-media/governed/v1p1c/${f}`;
let i = 0;
const n = (type: string, version: string, config: Record<string, unknown>) => ({
  id: `g8_${String(++i).padStart(2, "0")}`, type, version, config,
});

export const tree = {
  root: {
    children: [
      n("vmx.hero", "1.3.0", {
        variant: "editorial-split", media_side: "right", mobile_order: "media-first",
        text_safe_zone: "lg",
        eyebrow: "Despierta en Valladolid",
        title: "El Oriente Maya, contado como una historia editorial.",
        subtitle: "Cenotes, haciendas y cocina de humo a media hora del centro histórico de Valladolid.",
        background_images: [{ src: M("destination-cover.jpg") }, { src: M("destination-gallery-1.jpg") }],
        background_position: "center", slide_interval_seconds: 7,
        ctas: [
          { label: "Arma tu viaje", href: "/arma-tu-viaje", variant: "primary", size: "lg" },
          { label: "Explorar Valladolid", href: "/oriente-maya/valladolid", variant: "secondary", size: "lg" },
        ],
        show_ctas: true, cta_alignment: "left", show_search: false,
      }),
      n("vmx.discovery.navigator", "1.1.0", {
        title: "Explora Valladolid", variant: "grid", scope: "destination",
        manualDestinationSlug: "valladolid",
        categorySlugs: [
          { slug: "cenotes" }, { slug: "hoteles" }, { slug: "gastronomia" },
          { slug: "experiencias" }, { slug: "restaurantes" }, { slug: "cultura" },
          { slug: "artesanias" }, { slug: "naturaleza" },
        ],
        hiddenSlugs: [{ slug: "eventos-home" }],
        maxItems: 8, showCounts: true,
        ctaLabel: "Ver todo lo que ofrece Valladolid", ctaHref: "/oriente-maya/valladolid",
      }),
      n("vmx.alux.planner", "1.0.0", {
        variant: "editorial", eyebrow: "Alux · copiloto de viaje",
        heading: "Cuéntame tu viaje y lo armamos juntos.",
        subheading: "Dime cuántos días tienes y con quién viajas; Alux propone la ruta.",
        cta_label: "Arma tu viaje", cta_href: "/arma-tu-viaje", show_prompts: true,
        prompts: [{ label: "Tengo medio día" }, { label: "Viajo con niños" }, { label: "Quiero cenotes tranquilos" }, { label: "Cocina yucateca auténtica" }],
      }),
      n("vmx.section.rutas", "1.1.0", {
        heading: "Rutas recomendadas por Alux",
        subheading: "Itinerarios curados por el equipo editorial del Oriente Maya.",
        source: "manual",
        route_slugs: [{ slug: "valladolid-ek-balam" }, { slug: "pueblos-coloniales" }, { slug: "costa-rosada" }],
        max_items: 3, columns: "3", show_stops: true,
      }),
      n("vmx.smart.destinations-grid", "1.0.0", { title: "Explora los destinos del Oriente Maya de Yucatán", limit: 8 }),
      n("vmx.smart.destinations-grid", "1.0.0", { title: "Pueblos Mágicos del Oriente Maya", limit: 3, only_featured: true }),
      n("vmx.smart.products-grid", "1.0.0", { title: "Vive lo que da forma al territorio", limit: 6 }),
      n("vmx.smart.businesses-grid", "1.0.0", { title: "Descansa bien, come con contexto", limit: 6 }),
      n("vmx.experience.map", "1.0.0", {
        variant: "multi", heading: "El territorio, en un mapa",
        emptyMessage: "Aún no hay puntos disponibles para este mapa.",
        showDistance: true, showDirections: true, clustering: false,
        syncList: true, staticFallback: true, allowInteractiveToggle: true,
      }),
      n("vmx.smart.events-list", "1.0.0", { title: "Qué está pasando ahora", limit: 6 }),
      n("vmx.smart.businesses-grid", "1.0.0", { title: "Empresas destacadas del territorio", limit: 6, only_featured: true }),
      n("vmx.section.arma-tu-viaje", "1.0.0", {
        heading: "Arma tu viaje con Alux",
        body: "Cuéntanos cuántos días tienes, con quién viajas y qué te mueve. Alux propone una ruta con destinos, experiencias y lugares donde comer y dormir.",
        cta_label: "Empezar ahora",
      }),
    ],
  },
};

const registered = new Set<string>([
  "governed/v1p1c/destination-cover.jpg",
  "governed/v1p1c/destination-gallery-1.jpg",
]);
const res = validateEditorialCompositionTree({
  tree: tree as never, surface: "home", actor: "founder_admin",
  operation: "edit", registered_media_paths: registered,
});
console.log("mediaPaths", collectEditorialMediaPaths(tree as never));
console.log(JSON.stringify(res, null, 2));
if (process.env.EMIT) require("fs").writeFileSync("/tmp/g8c/tree.json", JSON.stringify(tree));
