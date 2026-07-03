/**
 * Experience Builder · Kit Seeds (US-R3 · Sub-ola 2.6).
 *
 * Semillas oficiales para superficies futuras — Event, Experience, Hotel,
 * Restaurant, Destination, Region — compuestas EXCLUSIVAMENTE con bloques
 * `vmx.kit.*` vía `SurfaceComposer`. No crean código nuevo por tipo: cada
 * semilla es una receta declarativa que produce un `CompositionTree`
 * listo para el Studio, el `CompositionRenderer` y para persistirse como
 * template (`is_template=true`, `template_of_kind=<kind>`).
 *
 * Reglas:
 *  - Business y Product NO figuran aquí (siguen usando sus semillas y
 *    bloques `vmx.business.*` / `vmx.product.*` existentes).
 *  - Ningún seed toca `preview-registry` ni `CompositionRenderer`; sólo
 *    produce árboles idénticos en forma a los que emite el Studio.
 *  - Los ids son deterministas por seed (`ev-1`, `ex-1`, ...) para que
 *    guardar/reimportar sea idempotente.
 */
import type { PageKind } from "./page-kind-registry";
import { SurfaceComposer } from "./surface-composer";
import type { CompositionTree } from "./composition-tree";

export interface KitSeedDefinition {
  readonly kind: PageKind;
  readonly label: string;
  readonly description: string;
  readonly build: () => CompositionTree;
}

/* ------------------------------------------------------------------ *
 * Recetas
 * ------------------------------------------------------------------ */

function seedEvent(): CompositionTree {
  return SurfaceComposer.create()
    .add({
      id: "ev-hero",
      type: "vmx.kit.hero",
      config: {
        eyebrow: "Evento",
        title: "Nombre del evento",
        subtitle: "Fecha · Sede · Ciudad",
      },
    })
    .add({ id: "ev-badges", type: "vmx.kit.badges", config: { items: [] } })
    .add({
      id: "ev-gallery",
      type: "vmx.kit.gallery",
      config: { items: [], empty_label: "Sube fotos del evento." },
    })
    .add({
      id: "ev-about",
      type: "vmx.kit.rich-text",
      config: { heading: "Sobre el evento", body: "" },
    })
    .add({
      id: "ev-info",
      type: "vmx.kit.info-table",
      config: {
        rows: [
          { label: "Fecha", value: "" },
          { label: "Horario", value: "" },
          { label: "Duración", value: "" },
          { label: "Aforo", value: "" },
        ],
      },
    })
    .add({ id: "ev-location", type: "vmx.kit.location", config: { address_line1: "" } })
    .add({ id: "ev-contact", type: "vmx.kit.contact", config: { contact_type: "whatsapp", value: "" } })
    .add({ id: "ev-faq", type: "vmx.kit.faq", config: { items: [] } })
    .build();
}

function seedExperience(): CompositionTree {
  return SurfaceComposer.create()
    .add({
      id: "ex-hero",
      type: "vmx.kit.hero",
      config: {
        eyebrow: "Experiencia",
        title: "Nombre de la experiencia",
        subtitle: "Qué vive el viajero",
      },
    })
    .add({ id: "ex-gallery", type: "vmx.kit.gallery", config: { items: [] } })
    .add({ id: "ex-about", type: "vmx.kit.rich-text", config: { heading: "La experiencia", body: "" } })
    .add({
      id: "ex-info",
      type: "vmx.kit.info-table",
      config: {
        rows: [
          { label: "Duración", value: "" },
          { label: "Idiomas", value: "" },
          { label: "Nivel", value: "" },
          { label: "Incluye", value: "" },
        ],
      },
    })
    .add({ id: "ex-location", type: "vmx.kit.location", config: { address_line1: "" } })
    .add({ id: "ex-reviews", type: "vmx.kit.reviews", config: { items: [] } })
    .add({ id: "ex-faq", type: "vmx.kit.faq", config: { items: [] } })
    .add({ id: "ex-contact", type: "vmx.kit.contact", config: { contact_type: "whatsapp", value: "" } })
    .build();
}

function seedHotel(): CompositionTree {
  return SurfaceComposer.create()
    .add({
      id: "ho-hero",
      type: "vmx.kit.hero",
      config: { eyebrow: "Hotel", title: "Nombre del hotel", subtitle: "Categoría · Destino" },
    })
    .add({ id: "ho-badges", type: "vmx.kit.badges", config: { items: [] } })
    .add({ id: "ho-gallery", type: "vmx.kit.gallery", config: { items: [] } })
    .add({ id: "ho-about", type: "vmx.kit.rich-text", config: { heading: "El hotel", body: "" } })
    .add({
      id: "ho-amenities",
      type: "vmx.kit.info-table",
      config: {
        rows: [
          { label: "Habitaciones", value: "" },
          { label: "Check-in", value: "" },
          { label: "Check-out", value: "" },
          { label: "Amenidades", value: "" },
        ],
      },
    })
    .add({ id: "ho-promos", type: "vmx.kit.promos", config: { items: [] } })
    .add({ id: "ho-location", type: "vmx.kit.location", config: { address_line1: "" } })
    .add({ id: "ho-reviews", type: "vmx.kit.reviews", config: { items: [] } })
    .add({ id: "ho-faq", type: "vmx.kit.faq", config: { items: [] } })
    .add({ id: "ho-contact", type: "vmx.kit.contact", config: { contact_type: "whatsapp", value: "" } })
    .build();
}

function seedRestaurant(): CompositionTree {
  return SurfaceComposer.create()
    .add({
      id: "re-hero",
      type: "vmx.kit.hero",
      config: { eyebrow: "Restaurante", title: "Nombre del restaurante", subtitle: "Cocina · Ambiente" },
    })
    .add({ id: "re-gallery", type: "vmx.kit.gallery", config: { items: [] } })
    .add({ id: "re-about", type: "vmx.kit.rich-text", config: { heading: "La propuesta", body: "" } })
    .add({
      id: "re-hours",
      type: "vmx.kit.info-table",
      config: {
        rows: [
          { label: "Horario", value: "" },
          { label: "Rango de precio", value: "" },
          { label: "Reservas", value: "" },
          { label: "Terraza", value: "" },
        ],
      },
    })
    .add({ id: "re-promos", type: "vmx.kit.promos", config: { items: [] } })
    .add({ id: "re-location", type: "vmx.kit.location", config: { address_line1: "" } })
    .add({ id: "re-reviews", type: "vmx.kit.reviews", config: { items: [] } })
    .add({ id: "re-contact", type: "vmx.kit.contact", config: { contact_type: "phone", value: "" } })
    .build();
}

function seedDestination(): CompositionTree {
  return SurfaceComposer.create()
    .add({
      id: "de-hero",
      type: "vmx.kit.hero",
      config: { eyebrow: "Destino", title: "Nombre del destino", subtitle: "Región · Qué lo hace único" },
    })
    .add({ id: "de-gallery", type: "vmx.kit.gallery", config: { items: [] } })
    .add({ id: "de-about", type: "vmx.kit.rich-text", config: { heading: "El destino", body: "" } })
    .add({
      id: "de-highlights",
      type: "vmx.kit.card-grid",
      config: { columns: "3", items: [], empty_label: "Agrega puntos de interés." },
    })
    .add({
      id: "de-info",
      type: "vmx.kit.info-table",
      config: {
        rows: [
          { label: "Cómo llegar", value: "" },
          { label: "Mejor temporada", value: "" },
          { label: "Duración sugerida", value: "" },
        ],
      },
    })
    .add({ id: "de-location", type: "vmx.kit.location", config: { address_line1: "" } })
    .add({ id: "de-faq", type: "vmx.kit.faq", config: { items: [] } })
    .build();
}

function seedRegion(): CompositionTree {
  return SurfaceComposer.create()
    .add({
      id: "rg-hero",
      type: "vmx.kit.hero",
      config: { eyebrow: "Región", title: "Nombre de la región", subtitle: "Descubre sus destinos" },
    })
    .add({ id: "rg-about", type: "vmx.kit.rich-text", config: { heading: "La región", body: "" } })
    .add({
      id: "rg-destinations",
      type: "vmx.kit.card-grid",
      config: { columns: "3", items: [], empty_label: "Agrega destinos de la región." },
    })
    .add({ id: "rg-gallery", type: "vmx.kit.gallery", config: { items: [] } })
    .add({
      id: "rg-info",
      type: "vmx.kit.info-table",
      config: {
        rows: [
          { label: "Extensión", value: "" },
          { label: "Clima", value: "" },
          { label: "Idioma", value: "" },
        ],
      },
    })
    .add({ id: "rg-faq", type: "vmx.kit.faq", config: { items: [] } })
    .build();
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const KIT_SEEDS: readonly KitSeedDefinition[] = [
  { kind: "event",       label: "Evento (Kit)",       description: "Semilla neutra para eventos.",     build: seedEvent },
  { kind: "experience",  label: "Experiencia (Kit)",  description: "Semilla neutra para experiencias.", build: seedExperience },
  { kind: "hotel",       label: "Hotel (Kit)",        description: "Semilla neutra para hoteles.",     build: seedHotel },
  { kind: "restaurant",  label: "Restaurante (Kit)",  description: "Semilla neutra para restaurantes.", build: seedRestaurant },
  { kind: "destination", label: "Destino (Kit)",      description: "Semilla neutra para destinos.",    build: seedDestination },
  { kind: "region",      label: "Región (Kit)",       description: "Semilla neutra para regiones.",    build: seedRegion },
] as const;

const SEEDS_BY_KIND = new Map<PageKind, KitSeedDefinition>(
  KIT_SEEDS.map((s) => [s.kind, s] as const),
);

export function getKitSeed(kind: PageKind): KitSeedDefinition | undefined {
  return SEEDS_BY_KIND.get(kind);
}

export function listKitSeeds(): readonly KitSeedDefinition[] {
  return KIT_SEEDS;
}