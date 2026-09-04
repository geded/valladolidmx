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
 *   `places-preview-2026-09-03`, marcados IA/conceptual/temporal y
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
  "Contenido de demostración · 8 experiencias ficticias con imágenes conceptuales generadas con IA " +
  "(temporales, no aptas para producción). Ningún registro real fue creado ni modificado; esta " +
  "superficie es interna y no indexable.";

export const EXPERIENCE_DEMO_MEDIA_NOTICE =
  "Imágenes conceptuales generadas con IA, temporales y no aptas para producción.";

/** Base pública estable del gestor de Medios (bucket privado con firma). */
const MEDIA_BASE = "/api/public/studio-media/places-preview-2026-09-03";

/**
 * Activos DEMO existentes en el gestor de Medios. Se reutilizan tal cual:
 * este módulo no sube, no genera y no borra medios.
 */
const MEDIA = {
  calzadaCover: `${MEDIA_BASE}/calzada-de-los-frailes-cover.png`,
  calzadaGallery: `${MEDIA_BASE}/calzada-de-los-frailes-gallery.png`,
  ikKilCover: `${MEDIA_BASE}/cenote-ik-kil-cover.png`,
  ikKilGallery: `${MEDIA_BASE}/cenote-ik-kil-gallery.png`,
  suytunCover: `${MEDIA_BASE}/cenote-suytun-cover.png`,
  suytunGallery: `${MEDIA_BASE}/cenote-suytun-gallery.png`,
  zaciCover: `${MEDIA_BASE}/cenote-zaci-cover.png`,
  zaciGallery: `${MEDIA_BASE}/cenote-zaci-gallery.png`,
  chichenCover: `${MEDIA_BASE}/chichen-itza-cover.png`,
  chichenGallery: `${MEDIA_BASE}/chichen-itza-gallery.png`,
  conventoCover: `${MEDIA_BASE}/convento-san-bernardino-cover.png`,
  conventoGallery: `${MEDIA_BASE}/convento-san-bernardino-gallery.png`,
  ekBalamGallery: `${MEDIA_BASE}/ek-balam-gallery.png`,
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
    cover: { url: MEDIA.calzadaCover, alt: conceptualAlt("una cocina tradicional yucateca de fogón") },
    cardMedia: { url: MEDIA.zaciGallery, alt: conceptualAlt("mesa yucateca servida en un solar colonial") },
    gallery: [
      { url: MEDIA.calzadaGallery, alt: conceptualAlt("patio colonial con mesa larga preparada") },
      { url: MEDIA.conventoGallery, alt: conceptualAlt("muro de piedra caliza de una casona vallisoletana") },
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
    cover: { url: MEDIA.conventoCover, alt: conceptualAlt("fachada colonial iluminada al anochecer") },
    cardMedia: { url: MEDIA.calzadaGallery, alt: conceptualAlt("calle empedrada colonial con casas de colores") },
    gallery: [{ url: MEDIA.calzadaCover, alt: conceptualAlt("Calzada de los Frailes al atardecer") }],
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
    cover: { url: MEDIA.suytunCover, alt: conceptualAlt("cenote de gruta con haz de luz sobre el agua") },
    cardMedia: { url: MEDIA.ikKilGallery, alt: conceptualAlt("caverna inundada con estalactitas") },
    gallery: [
      { url: MEDIA.suytunGallery, alt: conceptualAlt("plataforma de piedra dentro de un cenote cerrado") },
      { url: MEDIA.ikKilCover, alt: conceptualAlt("cenote abierto de aguas turquesa") },
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
      contact: { email: "demo@valladolid.mx" },
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
    cover: { url: MEDIA.zaciCover, alt: conceptualAlt("taller artesanal con bastidor de hamaca") },
    cardMedia: { url: MEDIA.conventoGallery, alt: conceptualAlt("interior de casa yucateca con hamacas colgadas") },
    gallery: [{ url: MEDIA.zaciGallery, alt: conceptualAlt("hilos de colores tensados en un bastidor") }],
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
    commerce: {
      conversionMode: "whatsapp",
      acceptsOnlinePayment: false,
      priceAmount: 380,
      priceCurrency: "MXN",
      contact: { whatsapp: "+52 985 000 0000" },
    },
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
    cover: { url: MEDIA.chichenCover, alt: conceptualAlt("plaza colonial amarilla con arcadas") },
    cardMedia: { url: MEDIA.conventoCover, alt: conceptualAlt("convento franciscano de muros amarillos") },
    gallery: [{ url: MEDIA.chichenGallery, alt: conceptualAlt("basamento prehispánico entre casas bajas") }],
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
    cover: { url: MEDIA.ekBalamGallery, alt: conceptualAlt("acrópolis maya entre selva baja al amanecer") },
    cardMedia: { url: MEDIA.chichenGallery, alt: conceptualAlt("estructura piramidal maya de piedra caliza") },
    gallery: [{ url: MEDIA.chichenCover, alt: conceptualAlt("explanada de una zona arqueológica maya") }],
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
      contact: { email: "demo@valladolid.mx" },
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
    cover: { url: MEDIA.chichenGallery, alt: conceptualAlt("cielo nocturno estrellado sobre una zona arqueológica") },
    cardMedia: { url: MEDIA.ekBalamGallery, alt: conceptualAlt("selva baja yucateca al anochecer") },
    gallery: [{ url: MEDIA.chichenCover, alt: conceptualAlt("basamento maya iluminado al atardecer") }],
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
    cover: { url: MEDIA.zaciGallery, alt: conceptualAlt("mercado municipal yucateco con puestos de frutas") },
    cardMedia: { url: MEDIA.suytunGallery, alt: conceptualAlt("mesa de cocina con ingredientes yucatecos") },
    gallery: [{ url: MEDIA.calzadaGallery, alt: conceptualAlt("calle del centro de Valladolid por la mañana") }],
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
    commerce: {
      conversionMode: "telefono",
      acceptsOnlinePayment: false,
      contact: { phone: "+52 985 000 0001" },
    },
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

/** VM DEMO con el MISMO contrato de la ficha canónica. */
export function buildExperienceDemoVM(slug: string): ExperiencePremiumVM | null {
  const seed = SEEDS.find((item) => item.slug === slug);
  if (!seed) return null;
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
    commerce: resolveExperienceCommerce(seed.commerce),
    demoNotice: EXPERIENCE_DEMO_NOTICE,
  };
}

export function listExperienceDemoSlugs(): readonly string[] {
  return SEEDS.map((seed) => seed.slug);
}
