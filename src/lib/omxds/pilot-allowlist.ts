/**
 * G8-R1-F1H · Allowlist inmutable del piloto público navegable.
 *
 * Únicamente las 22 entidades reales acreditadas del lote
 * `G8-R1-F1G-EVALUATION-CONTENT` participan en el piloto.
 *
 * Invariantes:
 * - Ninguna entidad demo entra al piloto.
 * - Las entidades del piloto conservan `noindex, nofollow` y permanecen
 *   fuera del sitemap hasta la revisión Founder.
 * - El flag `omxds_visual_v1_contracts_enabled` permanece en OFF.
 */

export const PILOT_ID = "G8-R1-F1H-PUBLIC-PILOT" as const;

/**
 * Filtro PostgREST canónico para excluir corpus demo de cualquier lectura
 * pública del piloto (listados, catálogo de Alux, recomendaciones).
 */
export const PILOT_NON_DEMO_FILTER = "is_demo_seed.is.null,is_demo_seed.eq.false" as const;

export type PilotFamily = "destination" | "place" | "business" | "product";

export type PilotEntity = {
  readonly id: string;
  readonly family: PilotFamily;
  readonly name: string;
  readonly slug: string;
  /** Slug del destino territorial al que pertenece la entidad. */
  readonly destination: string;
  /** Ruta pública canónica definitiva. */
  readonly canonicalPath: string;
  readonly status: "published";
  /** Presentación acreditada: sin portada aprobada => Editorial. */
  readonly presentation: "editorial" | "cinematografica";
  readonly hasCover: boolean;
  readonly provenance: string;
  /** Elegibilidad premium individual (requiere portada G8-M1 acreditada). */
  readonly premiumEligible: boolean;
};

export const PILOT_ALLOWLIST: readonly PilotEntity[] = [
  // Destinos territoriales (procedencia INEGI · marco geoestadístico)
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000005",
    family: "destination",
    name: "Izamal",
    slug: "izamal",
    destination: "izamal",
    canonicalPath: "/oriente-maya/izamal",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "cf58a91a-96ec-4ba5-948b-e91fefc5ee47",
    family: "destination",
    name: "Espita",
    slug: "espita",
    destination: "espita",
    canonicalPath: "/oriente-maya/espita",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000002",
    family: "destination",
    name: "Ek Balam",
    slug: "ek-balam",
    destination: "ek-balam",
    canonicalPath: "/oriente-maya/ek-balam",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000003",
    family: "destination",
    name: "Río Lagartos",
    slug: "rio-lagartos",
    destination: "rio-lagartos",
    canonicalPath: "/oriente-maya/rio-lagartos",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000004",
    family: "destination",
    name: "Las Coloradas",
    slug: "las-coloradas",
    destination: "las-coloradas",
    canonicalPath: "/oriente-maya/las-coloradas",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000006",
    family: "destination",
    name: "Uayma",
    slug: "uayma",
    destination: "uayma",
    canonicalPath: "/oriente-maya/uayma",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },

  // Lugares / puntos de interés (procedencia INEGI · autoridad territorial)
  {
    id: "f7728d46-6e4b-4c24-927c-c44568e1fe6b",
    family: "place",
    name: "Ex Convento de San Bernardino de Siena",
    slug: "convento-san-bernardino",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/lugares/convento-san-bernardino",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "1a089755-d6e6-4bfc-b0dc-f7f8b47a34c0",
    family: "place",
    name: "Calzada de los Frailes",
    slug: "calzada-de-los-frailes",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/lugares/calzada-de-los-frailes",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "7dedc0f8-0bdc-485c-9bef-608bae559a9f",
    family: "place",
    name: "Cenote Zací",
    slug: "cenote-zaci",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/lugares/cenote-zaci",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "b5c4be83-d674-477b-bb33-2a9c0c69de17",
    family: "place",
    name: "Cenote Suytun",
    slug: "cenote-suytun",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/lugares/cenote-suytun",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },
  {
    id: "776f58ee-ba02-4b9c-8006-3352ad3a4dfa",
    family: "place",
    name: "Cenote Ik Kil",
    slug: "cenote-ik-kil",
    destination: "tinum",
    canonicalPath: "/oriente-maya/tinum/lugares/cenote-ik-kil",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "inegi",
    premiumEligible: false,
  },

  // Empresas acreditadas por sitio oficial (Grupo A verificado)
  {
    id: "5b2c502a-e943-46c8-8c70-4d335dac9e45",
    family: "business",
    name: "Conato 1910",
    slug: "conato-1910",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/restaurantes/conato-1910",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "eaf37375-29bd-4736-abe9-c79ca54df8e7",
    family: "business",
    name: "Yerbabuena del Sisal",
    slug: "yerbabuena-del-sisal",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/restaurantes/yerbabuena-del-sisal",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "f362ae38-c021-4223-9306-20ec511730b4",
    family: "business",
    name: "Hotel Casa Tía Micha",
    slug: "hotel-casa-tia-micha",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "14d7732a-2a28-4353-b47a-5742278588b6",
    family: "business",
    name: "Coqui Coqui Perfumería & Casa",
    slug: "coqui-coqui-valladolid",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/experiencias/coqui-coqui-valladolid",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "e4588636-bb44-4b13-8c08-f29b2026c76f",
    family: "business",
    name: "Zazil Tunich",
    slug: "zazil-tunich",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/cenotes/zazil-tunich",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "58be51b7-ef57-4b39-89c3-dfb690ee7f91",
    family: "business",
    name: "Restaurante Kinich",
    slug: "kinich-restaurante",
    destination: "izamal",
    canonicalPath: "/oriente-maya/izamal/restaurantes/kinich-restaurante",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "b4226c06-d49b-44f8-bad6-b30fb68cbb3f",
    family: "business",
    name: "Macan Ché Bed & Breakfast",
    slug: "macan-che-bed-breakfast",
    destination: "izamal",
    canonicalPath: "/oriente-maya/izamal/hoteles/macan-che-bed-breakfast",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },

  // Productos de Zazil Tunich · sin precio ni disponibilidad acreditados
  {
    id: "6e1b9d1d-f1f7-468f-ab80-88bc6ae2139f",
    family: "product",
    name: "Nado en el Cenote Sagrado",
    slug: "nado-en-cenote",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/cenotes/zazil-tunich/nado-en-cenote",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "02d154d0-157d-403d-8f05-40f2a5080d5c",
    family: "product",
    name: "Recorrido Cenote Museo",
    slug: "recorrido-cenote-museo",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/cenotes/zazil-tunich/recorrido-cenote-museo",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "1d0a7df3-7bfb-4764-8fad-bc303189d521",
    family: "product",
    name: "Ceremonia Maya",
    slug: "ceremonia-maya",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/cenotes/zazil-tunich/ceremonia-maya",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
  {
    id: "d7fa2eb7-7605-4b4b-ad11-0610951ce11d",
    family: "product",
    name: "Cena Romántica en Cenote",
    slug: "cena-romantica-en-cenote",
    destination: "valladolid",
    canonicalPath: "/oriente-maya/valladolid/cenotes/zazil-tunich/cena-romantica-en-cenote",
    status: "published",
    presentation: "editorial",
    hasCover: false,
    provenance: "official_site",
    premiumEligible: false,
  },
];

export const PILOT_ALLOWLIST_IDS: ReadonlySet<string> = new Set(
  PILOT_ALLOWLIST.map((entity) => entity.id),
);

export function isPilotEntity(id: string | null | undefined): boolean {
  return typeof id === "string" && PILOT_ALLOWLIST_IDS.has(id);
}

export function pilotEntitiesByFamily(family: PilotFamily): readonly PilotEntity[] {
  return PILOT_ALLOWLIST.filter((entity) => entity.family === family);
}
