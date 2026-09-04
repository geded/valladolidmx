/**
 * Experiencias · Dataset DEMO de revisión interna (regla "ninguna plantilla vacía").
 *
 * REGLA VINCULANTE
 * ----------------
 * · Este módulo NO escribe en la base de datos. La instancia de Lovable Cloud
 *   es COMPARTIDA entre preview y producción (no hay aislamiento comprobable),
 *   por lo que ningún registro DEMO se inserta en tablas reales.
 * · Se consume EXCLUSIVAMENTE desde las rutas internas `/lovable/*` (noindex).
 *   La superficie pública `/experiencias` sigue leyendo sólo CMS publicado.
 * · Entra por el MISMO contrato público (`PublicListingDTO` + `TourismCardVM`)
 *   y el mismo view-model de ficha (`ExperiencePremiumVM`) que usará el CMS,
 *   de modo que sustituir estos registros por datos reales no toca plantilla.
 * · Los medios son activos DEMO YA REGISTRADOS en el gestor de Medios
 *   (`media_assets`, bucket privado `studio-media`, lote
 *   `experiences-preview-2026-09-04`, marcados IA/conceptual/temporal y
 *   `production_eligible = false`). No hay imports de imagen ni base64.
 *
 * Capa PURA: sin red, sin base de datos, sin React.
 */
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import type { ExperiencePremiumVM } from "@/components/experience-premium/experience-premium-vm";
import { resolveExperienceCommerce } from "@/lib/experiences/experience-commerce";

export const EXPERIENCE_DEMO_BATCH_ID = "experiences-preview-2026-09-04" as const;

export const EXPERIENCE_DEMO_NOTICE =
  "Contenido administrable de demostración · imágenes conceptuales temporales para revisión.";

export const EXPERIENCE_DEMO_MEDIA_NOTICE =
  "Imágenes conceptuales generadas con IA, temporales y no aptas para producción.";

/** Base pública estable del gestor de Medios (bucket privado con firma). */
const MEDIA_BASE = "/api/public/studio-media/experiences-preview-2026-09-04";

/**
 * Activos DEMO del lote de Experiencias, registrados en el gestor de Medios
 * (`media_assets`, bucket `studio-media`, marcados IA/conceptual/temporal y
 * `production_eligible = false`). Cada experiencia usa EXCLUSIVAMENTE sus
 * propios medios: prohibido reutilizar la portada de otra ficha.
 */
const MEDIA = {
  cocinaCover: `${MEDIA_BASE}/cocina-de-humo-cover.jpg`,
  cocinaGallery: `${MEDIA_BASE}/cocina-de-humo-gallery.jpg`,
  rutaNocturnaCover: `${MEDIA_BASE}/ruta-nocturna-cover.jpg`,
  rutaNocturnaGallery: `${MEDIA_BASE}/ruta-nocturna-gallery.jpg`,
  descensoCover: `${MEDIA_BASE}/descenso-cenote-cover.jpg`,
  descensoGallery: `${MEDIA_BASE}/descenso-cenote-gallery.jpg`,
  hamacaCover: `${MEDIA_BASE}/taller-hamaca-cover.jpg`,
  hamacaGallery: `${MEDIA_BASE}/taller-hamaca-gallery.jpg`,
  biciCover: `${MEDIA_BASE}/bici-izamal-cover.jpg`,
  biciGallery: `${MEDIA_BASE}/bici-izamal-gallery.jpg`,
  amanecerCover: `${MEDIA_BASE}/amanecer-arqueologico-cover.jpg`,
  amanecerGallery: `${MEDIA_BASE}/amanecer-arqueologico-gallery.jpg`,
  astronomiaCover: `${MEDIA_BASE}/astronomia-maya-cover.jpg`,
  astronomiaGallery: `${MEDIA_BASE}/astronomia-maya-gallery.jpg`,
  mercadoCover: `${MEDIA_BASE}/mercado-sobremesa-cover.jpg`,
  mercadoGallery: `${MEDIA_BASE}/mercado-sobremesa-gallery.jpg`,
} as const;


/**
 * Ejes de filtro DEMO. El CMS todavía NO define atributos turísticos para la
 * familia `experiencias` (`tourism_attribute_definitions` no tiene filas para
 * esa familia), por lo que estos ejes se rotulan explícitamente como
 * capacidades de demostración y quedan reportados como brecha de contrato.
 */
export const EXPERIENCE_DEMO_ATTRIBUTE_AXES: readonly {
  readonly key: string;
  readonly label: string;
  readonly demo: boolean;
}[] = [
  { key: "duracion", label: "Duración", demo: true },
  { key: "horario", label: "Horario", demo: true },
  { key: "idioma", label: "Idioma", demo: true },
  { key: "accesibilidad", label: "Accesibilidad", demo: true },
  { key: "apta_para", label: "Apta para", demo: true },
  { key: "intensidad", label: "Intensidad", demo: true },
  { key: "nivel_precio", label: "Precio", demo: true },
];

interface DemoExperienceSeed {
  readonly slug: string;
  readonly name: string;
  readonly categoryLabel: string;
  readonly tagline: string;
  readonly description: string;
  readonly operatorName: string;
  readonly destinationSlug: string;
  readonly destinationLabel: string;
  readonly cover: { url: string; alt: string };
  readonly cardMedia: { url: string; alt: string };
  readonly gallery: readonly { url: string; alt: string }[];
  readonly attributes: Record<string, string[]>;
  readonly priceAmount: number | null;
  readonly commerce: Parameters<typeof resolveExperienceCommerce>[0];
  readonly facts: readonly { label: string; value: string }[];
}

const conceptualAlt = (subject: string) =>
  `Representación conceptual generada con IA de ${subject}`;

const SEEDS: readonly DemoExperienceSeed[] = [
  {
    slug: "demo-cocina-de-humo-fogon-maya",
    name: "Cocina de humo en fogón maya",
    categoryLabel: "Gastronomía",
    tagline: "Una cocina familiar enciende el fogón y explica el maíz como se explica una herencia.",
    description:
      "Contenido de demostración. Sobremesa larga en un solar de Valladolid: nixtamal, recado negro y el humo como técnica. La cocinera cuenta el origen de cada platillo antes de servirlo.",
    operatorName: "Cocina demostrativa Xtabay",
    destinationSlug: "valladolid",
    destinationLabel: "Valladolid",
    cover: { url: MEDIA.cocinaCover, alt: conceptualAlt("una cocina de humo en fogón maya") },
    cardMedia: { url: MEDIA.cocinaGallery, alt: conceptualAlt("una sobremesa yucateca en un solar colonial") },
    gallery: [
      { url: MEDIA.cocinaGallery, alt: conceptualAlt("una sobremesa yucateca en un solar colonial") },
    ],
    attributes: {
      duracion: ["3-4-horas"],
      horario: ["mediodia"],
      idioma: ["espanol", "ingles"],
      accesibilidad: ["planta-baja"],
      apta_para: ["familias", "parejas"],
      intensidad: ["baja"],
      nivel_precio: ["medio"],
    },
    priceAmount: 950,
    commerce: { conversionMode: "arma_tu_viaje", acceptsOnlinePayment: false, priceAmount: 950, priceCurrency: "MXN" },
    facts: [
      { label: "Punto de encuentro", value: "Centro de Valladolid (dato de demostración)" },
      { label: "Grupo", value: "Hasta 8 personas" },
    ],
  },
  {
    slug: "demo-ruta-nocturna-calzada-de-los-frailes",
    name: "Ruta nocturna por la Calzada de los Frailes",
    categoryLabel: "Cultura y patrimonio",
    tagline: "La calle más fotografiada de Valladolid contada por quien creció en ella.",
    description:
      "Contenido de demostración. Caminata al anochecer entre fachadas coloniales, oficios y leyendas, cerrando frente al ex convento.",
    operatorName: "Guías demostrativos del Centro",
    destinationSlug: "valladolid",
    destinationLabel: "Valladolid",
    cover: { url: MEDIA.rutaNocturnaCover, alt: conceptualAlt("una calle colonial empedrada iluminada de noche") },
    cardMedia: { url: MEDIA.rutaNocturnaGallery, alt: conceptualAlt("la fachada de piedra de un ex convento iluminada de noche") },
    gallery: [
      { url: MEDIA.rutaNocturnaGallery, alt: conceptualAlt("la fachada de piedra de un ex convento iluminada de noche") },
    ],
    attributes: {
      duracion: ["2-3-horas"],
      horario: ["noche"],
      idioma: ["espanol"],
      accesibilidad: ["ruta-a-pie", "apta-para-carriola"],
      apta_para: ["familias", "solo"],
      intensidad: ["baja"],
      nivel_precio: ["economico"],
    },
    priceAmount: 420,
    commerce: { conversionMode: "informacion", acceptsOnlinePayment: false, priceAmount: 420, priceCurrency: "MXN" },
    facts: [{ label: "Punto de encuentro", value: "Parque principal (dato de demostración)" }],
  },
  {
    slug: "demo-descenso-cenote-de-gruta",
    name: "Descenso guiado a cenote de gruta",
    categoryLabel: "Cenotes y naturaleza",
    tagline: "Un cenote cerrado, cuerdas, casco y un guía que conoce cada saliente.",
    description:
      "Contenido de demostración. Descenso técnico asistido a una gruta inundada de los alrededores de Temozón, con briefing de seguridad y equipo incluido.",
    operatorName: "Operadora demostrativa Xibalbá",
    destinationSlug: "temozon",
    destinationLabel: "Temozón",
    cover: { url: MEDIA.descensoCover, alt: conceptualAlt("un descenso guiado con cuerda a un cenote de gruta") },
    cardMedia: { url: MEDIA.descensoGallery, alt: conceptualAlt("equipo de descenso a cenote preparado en la boca de la gruta") },
    gallery: [
      { url: MEDIA.descensoGallery, alt: conceptualAlt("equipo de descenso a cenote preparado en la boca de la gruta") },
    ],
    attributes: {
      duracion: ["medio-dia"],
      horario: ["manana"],
      idioma: ["espanol", "ingles"],
      accesibilidad: ["escaleras-empinadas"],
      apta_para: ["aventura", "amigos"],
      intensidad: ["alta"],
      nivel_precio: ["alto"],
    },
    priceAmount: 2100,
    commerce: {
      conversionMode: "solicitar_cotizacion",
      acceptsOnlinePayment: false,
      priceAmount: 2100,
      priceCurrency: "MXN",
    },
    facts: [
      { label: "Equipo", value: "Casco, arnés y chaleco incluidos (demostración)" },
      { label: "Grupo", value: "Hasta 6 personas" },
    ],
  },
  {
    slug: "demo-taller-urdido-de-hamaca",
    name: "Taller de urdido de hamaca",
    categoryLabel: "Artesanía viva",
    tagline: "Dos horas frente al bastidor bastan para entender por qué una hamaca tarda semanas.",
    description:
      "Contenido de demostración. Taller doméstico en Espita con una familia urdidora: hilo, tensión, nudo y el ritmo que sostiene el oficio.",
    operatorName: "Taller demostrativo K'aan",
    destinationSlug: "espita",
    destinationLabel: "Espita",
    cover: { url: MEDIA.hamacaCover, alt: conceptualAlt("un taller de urdido de hamaca con bastidor e hilos") },
    cardMedia: { url: MEDIA.hamacaGallery, alt: conceptualAlt("hilos de colores y una hamaca yucateca terminada") },
    gallery: [
      { url: MEDIA.hamacaGallery, alt: conceptualAlt("hilos de colores y una hamaca yucateca terminada") },
    ],
    attributes: {
      duracion: ["2-3-horas"],
      horario: ["tarde"],
      idioma: ["espanol", "maya"],
      accesibilidad: ["planta-baja", "silla-de-ruedas"],
      apta_para: ["familias", "solo"],
      intensidad: ["baja"],
      nivel_precio: ["economico"],
    },
    priceAmount: 380,
    commerce: { conversionMode: "informacion", acceptsOnlinePayment: false, priceAmount: 380, priceCurrency: "MXN" },
    facts: [{ label: "Incluye", value: "Materiales del taller (demostración)" }],
  },
  {
    slug: "demo-bici-amarilla-izamal",
    name: "Bici amarilla por la ciudad de los tres pueblos",
    categoryLabel: "Cultura y patrimonio",
    tagline: "Izamal entera es amarilla; en bicicleta se entiende por qué.",
    description:
      "Contenido de demostración. Recorrido en bicicleta por el convento, los basamentos prehispánicos y los talleres del barrio.",
    operatorName: "Colectivo demostrativo Kinich",
    destinationSlug: "izamal",
    destinationLabel: "Izamal",
    cover: { url: MEDIA.biciCover, alt: conceptualAlt("un recorrido en bicicleta por una plaza colonial amarilla") },
    cardMedia: { url: MEDIA.biciGallery, alt: conceptualAlt("una bicicleta recargada en un muro amarillo colonial") },
    gallery: [
      { url: MEDIA.biciGallery, alt: conceptualAlt("una bicicleta recargada en un muro amarillo colonial") },
    ],
    attributes: {
      duracion: ["3-4-horas"],
      horario: ["manana"],
      idioma: ["espanol", "ingles"],
      accesibilidad: ["ruta-a-pie"],
      apta_para: ["amigos", "parejas"],
      intensidad: ["media"],
      nivel_precio: ["medio"],
    },
    priceAmount: 690,
    commerce: { conversionMode: "arma_tu_viaje", acceptsOnlinePayment: false, priceAmount: 690, priceCurrency: "MXN" },
    facts: [{ label: "Incluye", value: "Bicicleta y casco (demostración)" }],
  },
  {
    slug: "demo-amanecer-arqueologico-ek-balam",
    name: "Amanecer arqueológico en Ek' Balam",
    categoryLabel: "Arqueología",
    tagline: "Llegar antes que los autobuses cambia por completo la escala de la Acrópolis.",
    description:
      "Contenido de demostración. Visita temprana a la zona arqueológica con lectura iconográfica del friso y regreso a Valladolid a media mañana.",
    operatorName: "Guianza demostrativa Balam",
    destinationSlug: "valladolid",
    destinationLabel: "Cercanías de Valladolid",
    cover: { url: MEDIA.amanecerCover, alt: conceptualAlt("una acrópolis maya entre selva baja al amanecer") },
    cardMedia: { url: MEDIA.amanecerGallery, alt: conceptualAlt("un friso maya labrado explicado por un guía") },
    gallery: [
      { url: MEDIA.amanecerGallery, alt: conceptualAlt("un friso maya labrado explicado por un guía") },
    ],
    attributes: {
      duracion: ["medio-dia"],
      horario: ["amanecer"],
      idioma: ["espanol", "ingles", "frances"],
      accesibilidad: ["senderos-amplios"],
      apta_para: ["parejas", "solo"],
      intensidad: ["media"],
      nivel_precio: ["alto"],
    },
    priceAmount: 1750,
    commerce: {
      conversionMode: "solicitar_cotizacion",
      acceptsOnlinePayment: false,
      priceAmount: 1750,
      priceCurrency: "MXN",
    },
    facts: [{ label: "Salida", value: "05:30 h desde Valladolid (demostración)" }],
  },
  {
    slug: "demo-astronomia-maya-atardecer",
    name: "Astronomía maya al atardecer",
    categoryLabel: "Cultura maya",
    tagline: "El calendario no se inventó mirando piedras, sino mirando el cielo sobre ellas.",
    description:
      "Contenido de demostración. Sesión de observación guiada con telescopio y lectura del cielo desde la perspectiva del calendario maya.",
    operatorName: "Observatorio demostrativo Nohoch Ek",
    destinationSlug: "valladolid",
    destinationLabel: "Cercanías de Chichén Itzá",
    cover: { url: MEDIA.astronomiaCover, alt: conceptualAlt("una sesión de observación astronómica con telescopio bajo la vía láctea") },
    cardMedia: { url: MEDIA.astronomiaGallery, alt: conceptualAlt("un grupo observando el cielo al anochecer sobre selva baja") },
    gallery: [
      { url: MEDIA.astronomiaGallery, alt: conceptualAlt("un grupo observando el cielo al anochecer sobre selva baja") },
    ],
    attributes: {
      duracion: ["2-3-horas"],
      horario: ["noche"],
      idioma: ["espanol", "ingles"],
      accesibilidad: ["planta-baja", "silla-de-ruedas"],
      apta_para: ["familias", "parejas"],
      intensidad: ["baja"],
      nivel_precio: ["medio"],
    },
    priceAmount: 880,
    commerce: { conversionMode: "informacion", acceptsOnlinePayment: false, priceAmount: 880, priceCurrency: "MXN" },
    facts: [{ label: "Condición", value: "Sujeta a cielo despejado (demostración)" }],
  },
  {
    slug: "demo-mercado-y-sobremesa-yucateca",
    name: "Mercado y sobremesa yucateca",
    categoryLabel: "Gastronomía",
    tagline: "Primero se camina el mercado; después se cocina lo que se eligió.",
    description:
      "Contenido de demostración. Compra guiada en el mercado municipal y cocina compartida con explicación de recados, chiles y cítricos.",
    operatorName: "Mesa demostrativa Sac Nicté",
    destinationSlug: "valladolid",
    destinationLabel: "Valladolid",
    cover: { url: MEDIA.mercadoCover, alt: conceptualAlt("un mercado municipal yucateco con puestos de frutas y chiles") },
    cardMedia: { url: MEDIA.mercadoGallery, alt: conceptualAlt("la preparación de recados y cítricos en una cocina yucateca") },
    gallery: [
      { url: MEDIA.mercadoGallery, alt: conceptualAlt("la preparación de recados y cítricos en una cocina yucateca") },
    ],
    attributes: {
      duracion: ["3-4-horas"],
      horario: ["manana"],
      idioma: ["espanol"],
      accesibilidad: ["planta-baja"],
      apta_para: ["solo", "amigos"],
      intensidad: ["media"],
      nivel_precio: ["medio"],
    },
    priceAmount: null,
    commerce: { conversionMode: "informacion", acceptsOnlinePayment: false },
    facts: [{ label: "Incluye", value: "Compra en mercado (demostración)" }],
  },
];

function seedToCard(seed: DemoExperienceSeed): TourismCardVM {
  return {
    id: seed.slug,
    entityKind: "product",
    eyebrow: seed.categoryLabel,
    name: seed.name,
    href: `/lovable/g4-experience-premium-preview?demo=${seed.slug}`,
    tagline: seed.tagline,
    businessName: seed.operatorName,
    mediaUrl: seed.cardMedia.url,
    mediaAlt: seed.cardMedia.alt,
    rating: null,
    location: { label: seed.destinationLabel, distanceKm: null },
    territorialContext: seed.destinationLabel,
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: seed.priceAmount,
    priceCurrency: seed.priceAmount == null ? null : "MXN",
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
    rationale: "Contenido de demostración para revisión interna de plantilla.",
    filterAttributes: seed.attributes,
  };
}

/** DTO DEMO con el MISMO contrato público del listado real. */
export function buildExperienceDemoListingDTO(destino?: string | null): PublicListingDTO {
  const items = SEEDS.filter((seed) => !destino || seed.destinationSlug === destino).map(seedToCard);
  return {
    contractVersion: "1.1.0",
    family: "experiencias",
    label: "Experiencias",
    route: "/experiencias",
    source: "businesses",
    provenance: "demo_preview",
    hero: {
      eyebrow: "Oriente Maya",
      title: "Experiencias del Oriente Maya",
      subtitle:
        "Vivencias guiadas por cocineras, urdidoras, arqueólogos y comunidades del oriente de Yucatán.",
      metaLabel: `${items.length} experiencias de demostración`,
    },
    items,
    destinationSlug: destino ?? null,
    destinationLabel: destino
      ? (SEEDS.find((seed) => seed.destinationSlug === destino)?.destinationLabel ?? null)
      : null,
    emptyMessage: "No hay experiencias de demostración para ese destino.",
  };
}

/**
 * Detalle extendido DEMO. Se define sólo para algunas experiencias a
 * propósito: demuestra que la ficha OMITE cada sección sin dato real.
 */
const DEMO_DETAILS: Record<
  string,
  {
    includes?: string[];
    excludes?: string[];
    itinerary?: { title: string; detail: string | null }[];
    requirements?: string[];
    policies?: { title: string; items: string[] }[];
    location?: { label: string; address: string | null; latitude: number | null; longitude: number | null };
  }
> = {
  "demo-cocina-de-humo-fogon-maya": {
    includes: ["Comida completa", "Bebida tradicional", "Recetario impreso"],
    excludes: ["Traslados", "Propinas"],
    itinerary: [
      { title: "Bienvenida en el solar", detail: "Recorrido por el huerto y presentación del fogón." },
      { title: "Nixtamal y tortilla", detail: "Molienda a mano y comal." },
      { title: "Sobremesa", detail: "Comida servida y conversación con la cocinera." },
    ],
    requirements: ["Avisar alergias alimentarias al reservar"],
    policies: [
      { title: "Política de cancelación", items: ["Cancelación sin costo hasta 24 h antes (dato de demostración)."] },
    ],
    location: { label: "Solar familiar del Centro (demostración)", address: "Centro, Valladolid, Yucatán", latitude: 20.6896, longitude: -88.2011 },
  },
  "demo-descenso-cenote-de-gruta": {
    includes: ["Casco, arnés y chaleco", "Guía certificado", "Seguro de actividad"],
    excludes: ["Fotografía profesional", "Alimentos"],
    itinerary: [
      { title: "Briefing de seguridad", detail: "Revisión de equipo y técnica de descenso." },
      { title: "Descenso a la gruta", detail: null },
      { title: "Nado y ascenso", detail: null },
    ],
    requirements: ["Saber nadar", "No apta para personas con vértigo"],
    policies: [
      { title: "Condiciones", items: ["Sujeta a nivel del agua y condiciones de la gruta (demostración)."] },
    ],
    location: { label: "Acceso a gruta demostrativa", address: "Temozón, Yucatán", latitude: 20.8069, longitude: -88.2036 },
  },
  "demo-taller-urdido-de-hamaca": {
    includes: ["Materiales del taller", "Pieza elaborada"],
    excludes: ["Traslados"],
    requirements: ["Sin experiencia previa"],
  },
};

/** VM DEMO con el MISMO contrato de la ficha canónica. */
export function buildExperienceDemoVM(slug: string): ExperiencePremiumVM | null {
  const seed = SEEDS.find((item) => item.slug === slug);
  if (!seed) return null;
  const detail = DEMO_DETAILS[seed.slug] ?? {};
  const labelOf = (value: string) => EXPERIENCE_DEMO_VALUE_LABELS[value] ?? value;
  return {
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    eyebrow: seed.categoryLabel,
    tagline: seed.tagline,
    description: seed.description,
    operatorName: seed.operatorName,
    operatorHref: null,
    destinationSlug: seed.destinationSlug,
    destinationLabel: seed.destinationLabel,
    cover: seed.cover,
    gallery: seed.gallery,
    facts: [
      { label: "Tipo", value: seed.categoryLabel },
      { label: "Destino", value: seed.destinationLabel },
      ...(["duracion", "horario", "intensidad", "apta_para", "nivel_precio"] as const)
        .map((key) => {
          const values = seed.attributes[key] ?? [];
          if (values.length === 0) return null;
          const label = EXPERIENCE_DEMO_ATTRIBUTE_AXES.find((axis) => axis.key === key)?.label ?? key;
          return { label, value: values.map(labelOf).join(" · ") };
        })
        .filter((fact): fact is { label: string; value: string } => fact !== null),
      ...seed.facts,
    ],
    faqs: [
      {
        question: "¿Estos datos son reales?",
        answer:
          "No. Es contenido de demostración creado para revisar la plantilla; los precios, horarios y disponibilidades no son información comercial real.",
      },
    ],
    related: SEEDS.filter((item) => item.slug !== seed.slug)
      .slice(0, 4)
      .map((item) => ({
        id: item.slug,
        name: item.name,
        href: `/lovable/g4-experience-premium-preview?demo=${item.slug}`,
        note: item.destinationLabel,
        media: item.cardMedia,
      })),
    includes: detail.includes ?? [],
    excludes: detail.excludes ?? [],
    itinerary: detail.itinerary ?? [],
    requirements: detail.requirements ?? [],
    languages: (seed.attributes.idioma ?? []).map(labelOf),
    accessibility: (seed.attributes.accesibilidad ?? []).map(labelOf),
    policies: detail.policies ?? [],
    location: detail.location ?? null,
    rating: null,
    commerce: resolveExperienceCommerce(seed.commerce),
    demoNotice: EXPERIENCE_DEMO_NOTICE,
  };
}

export function listExperienceDemoSlugs(): readonly string[] {
  return SEEDS.map((seed) => seed.slug);
}

/** Etiquetas legibles de los valores DEMO (el CMS traerá las suyas). */
export const EXPERIENCE_DEMO_VALUE_LABELS: Record<string, string> = {
  "2-3-horas": "2–3 horas",
  "3-4-horas": "3–4 horas",
  "medio-dia": "Medio día",
  amanecer: "Amanecer",
  manana: "Mañana",
  mediodia: "Mediodía",
  tarde: "Tarde",
  noche: "Noche",
  espanol: "Español",
  ingles: "Inglés",
  frances: "Francés",
  maya: "Maya",
  "planta-baja": "Acceso en planta baja",
  "silla-de-ruedas": "Silla de ruedas",
  "ruta-a-pie": "Ruta a pie",
  "escaleras-empinadas": "Escaleras empinadas",
  "senderos-amplios": "Senderos amplios",
  "apta-para-carriola": "Apta para carriola",
  familias: "Familias",
  parejas: "Parejas",
  amigos: "Amigos",
  solo: "Viaje en solitario",
  aventura: "Aventura",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  economico: "Económico",
  medio: "Medio",
  alto: "Alto",
};
