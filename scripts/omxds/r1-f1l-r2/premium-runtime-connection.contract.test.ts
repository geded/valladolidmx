import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildRegionPremiumRuntime } from "../../../src/components/destination-premium/region-premium-runtime";
import { buildDestinationPremiumRuntime } from "../../../src/components/destination-premium/destination-premium-runtime";
import { HOME_PREMIUM_G4_CONTENT } from "../../../src/components/home-premium/home-premium-content";
import { mergeHomeRealContent } from "../../../src/components/home-premium/home-premium-real";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("G8-R1-F1L-R2 · conexiones premium runtime", () => {
  test("cada destino regional conserva una única ruta canónica en tarjeta y mapa", () => {
    const content = buildRegionPremiumRuntime({
      destinations: [
        { slug: "rio-lagartos", name: "Río Lagartos", latitude: 21.59, longitude: -88.16 },
        { slug: "ek-balam", name: "Ek Balam", latitude: 20.89, longitude: -88.13 },
      ],
    });

    expect(content.nearby.items.map((item) => item.href)).toEqual([
      "/oriente-maya/rio-lagartos",
      "/oriente-maya/ek-balam",
    ]);
    expect(content.map.points.map((item) => item.href)).toEqual([
      "/oriente-maya/rio-lagartos",
      "/oriente-maya/ek-balam",
    ]);
  });

  test("la portada regional usa el catálogo premium de hasta veinte destinos", () => {
    // Lote 1 · contrato actualizado: la portada regional adoptó la autoridad
    // visual aprobada del Atlas de Destinos (`RegionDestinationsPremiumSurface`,
    // misma familia visual que Home Premium). Las capacidades exigidas siguen
    // siendo las mismas: paginación de 8, Alux oficial, mapa oficial y Mi Viaje.
    const route = read("src/routes/oriente-maya/index.tsx");
    const surface = read("src/components/destination-premium/RegionDestinationsPremiumSurface.tsx");
    const publicReads = read("src/lib/cms/public-reads.functions.ts");

    expect(route).toContain("RegionDestinationsPremiumSurface");
    expect(route).toContain("listPublishedDestinations");
    expect(route).toContain('data-region-template="premium-approved"');
    expect(surface).toContain("const PAGE_SIZE = 8");
    expect(surface).toContain("setVisible(PAGE_SIZE)");
    expect(surface).toContain("Mostrar más destinos");
    expect(surface).toContain("TourismAluxPanel");
    expect(surface).toContain("AddToTravelPlanButton");
    expect(surface).toContain("InteractiveMap");
    expect(publicReads).toContain("highlights, latitude, longitude");
  });

  test("los listados conservan una sola autoridad con DTO real, mapa, Alux y Mi Viaje", () => {
    const route = read("src/routes/hoteles.tsx");
    const restaurantRoute = read("src/routes/restaurantes.tsx");
    const wrapper = read("src/components/listing-premium/ListingPremiumSurface.tsx");
    const surface = read("src/components/surfaces/TourismListingSurface.tsx");
    const adapter = read("src/lib/experience-builder/adapters/tourism-listing-adapters.ts");

    expect(route).toContain("ListingPremiumSurfaceFromDTO");
    expect(restaurantRoute).toContain("ListingPremiumSurfaceFromDTO");
    expect(route).toContain("getPublicListing");
    expect(wrapper).toContain("buildDestinationFacet");
    expect(wrapper).toContain("InteractiveMap");
    expect(surface).toContain("TourismCardRow");
    expect(surface).toContain("AddToTravelPlanButton");
    expect(surface).toContain("openAluxFloating");
    expect(surface).toContain('to="/arma-tu-viaje"');
    expect(surface).not.toContain("RequestConciergeButton");
    expect(adapter).toContain("mediaUrl: b.cover_url ?? null");
  });

  test("la autoridad visual conserva los enlaces del mapa y de las tarjetas", () => {
    const surface = read("src/components/destination-premium/DestinationPremiumSurface.tsx");
    expect(surface).toContain("href: p.href ?? null");
    expect(surface).toContain("d.href ? (");
    expect(surface).toContain("to={d.href}");
  });

  test("el destino Premium consume continuidad territorial real y excluye su propia ruta", () => {
    const content = buildDestinationPremiumRuntime({
      id: "destination:valladolid",
      destination: {
        slug: "valladolid",
        name: "Valladolid",
        tagline: "Capital turística",
        description: "Punto de partida del Oriente Maya.",
        highlights: [],
        hero_palette: "territorio",
        hero_url: null,
        latitude: 20.6896,
        longitude: -88.2011,
      },
      media: [],
      mapPoints: [],
      nearbyDestinations: [
        {
          title: "Valladolid",
          subtitle: "Capital turística",
          href: "/oriente-maya/valladolid",
          mediaUrl: "",
        },
        {
          title: "Izamal",
          subtitle: "Ciudad amarilla",
          href: "/oriente-maya/izamal",
          mediaUrl: "/media/izamal.webp",
        },
      ],
    });

    expect(content.nearby.items.map((item) => item.href)).toEqual(["/oriente-maya/izamal"]);
    expect(content.nearby.items[0]?.media.url).toBe("/media/izamal.webp");
  });

  test("Pueblo Mágico usa la marca institucional acreditada", () => {
    const registry = read(
      "src/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry.ts",
    );
    expect(registry).toContain('markSrc: "/brand/institutional/pueblos-magicos-oficial.webp"');
    expect(read("public/brand/institutional/manifest.json")).toContain(
      "Secretaría de Cultura y Turismo del Estado de México",
    );
  });

  test("la siembra de medios es acreditada, reversible y nunca se ejecuta implícitamente", () => {
    const manifest = JSON.parse(
      read("scripts/omxds/r1-f1l-r2/destination-open-media.manifest.json"),
    ) as {
      items: Array<{
        destinationSlug: string;
        sourceUrl: string;
        author: string;
        license: string;
        credit: string;
        alt: string;
      }>;
    };
    const script = read("scripts/omxds/r1-f1l-r2/seed-destination-open-media.mjs");

    expect(manifest.items).toHaveLength(7);
    expect(new Set(manifest.items.map((item) => item.destinationSlug)).size).toBe(7);
    for (const item of manifest.items) {
      expect(item.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(item.author.trim().length).toBeGreaterThan(0);
      expect(item.license).toMatch(/^CC BY(?:-SA)? /);
      expect(item.credit).toContain(item.author);
      expect(item.alt.trim().length).toBeGreaterThan(12);
    }

    expect(script).toContain('const APPLY = process.argv.includes("--apply")');
    expect(script).toContain('arg.startsWith("--rollback=")');
    expect(script).toContain('reason: "accredited_cover_exists"');
    expect(script).toContain("is_demo_seed: false");
    expect(script).toContain('action: "media.link"');
    expect(script).not.toContain('storage_bucket: "demo-media"');
  });

  test("la Home pública conecta el hero y las rutas con medios reales ya acreditados", () => {
    const mediaUrl = "/api/public/studio-media/open-destination-media/valladolid.jpg";
    const merged = mergeHomeRealContent(HOME_PREMIUM_G4_CONTENT, {
      destinos: [
        {
          title: "Valladolid",
          subtitle: "Capital turística",
          category: "Destino",
          href: "/oriente-maya/valladolid",
          mediaUrl,
          puebloMagico: true,
        },
        {
          title: "Izamal",
          subtitle: "Ciudad amarilla",
          category: "Destino",
          href: "/oriente-maya/izamal",
          mediaUrl: "/api/public/studio-media/open-destination-media/izamal.jpg",
          puebloMagico: true,
        },
      ],
      experiencias: [],
      stays: [],
      food: [],
      eventos: [],
      rutas: [
        {
          id: "pueblos-magicos",
          title: "Pueblos Mágicos",
          duration: "2 destinos",
          stops: 2,
          vibe: "Patrimonio",
          description: "Recorrido territorial",
          sequence: ["Valladolid", "Izamal"],
        },
      ],
      mapPoints: [],
    });

    expect(merged.hero.slides[0]?.media.url).toBe(mediaUrl);
    expect(merged.rutas.items[0]?.media.url).toBe(mediaUrl);
    expect(merged.destinos.items[0]?.media.url).toBe(mediaUrl);
  });

  test("la Home pública nunca usa medios conceptuales como fallback", () => {
    const withoutRealCorpus = mergeHomeRealContent(HOME_PREMIUM_G4_CONTENT, undefined);
    expect(withoutRealCorpus.hero.slides.every((slide) => slide.media.url === "")).toBe(true);
    expect(withoutRealCorpus.eventos.media.url).toBe("");

    const emptyRealCorpus = mergeHomeRealContent(HOME_PREMIUM_G4_CONTENT, {
      destinos: [],
      experiencias: [],
      stays: [],
      food: [],
      eventos: [],
      rutas: [],
      mapPoints: [],
    });
    expect(emptyRealCorpus.hero.slides).toEqual([]);
    expect(JSON.stringify(emptyRealCorpus)).not.toContain("conceptual-preview");
  });

  test("la Home respeta la imagen gobernada de Eventos elegida en el constructor", () => {
    const configured = {
      ...HOME_PREMIUM_G4_CONTENT,
      eventos: {
        ...HOME_PREMIUM_G4_CONTENT.eventos,
        media: {
          url: "/api/public/studio-media/governed/eventos/agenda-cover.webp",
          alt: "Agenda cultural del Oriente Maya",
        },
      },
    };
    const merged = mergeHomeRealContent(configured, {
      destinos: [],
      experiencias: [],
      stays: [],
      food: [],
      eventos: [],
      rutas: [],
      mapPoints: [],
    });

    expect(merged.eventos.media).toEqual(configured.eventos.media);
  });

  test("la Home evita huecos con los medios gobernados production-eligible de cada vertical", () => {
    const merged = mergeHomeRealContent(HOME_PREMIUM_G4_CONTENT, {
      destinos: [],
      experiencias: [
        {
          title: "Cena en cenote",
          subtitle: "Experiencia acreditada",
          category: "Experiencia",
          href: "/producto/cena-en-cenote",
          mediaUrl: "",
          puebloMagico: false,
        },
      ],
      stays: [
        {
          title: "Hotel acreditado",
          subtitle: "Hospedaje",
          category: "Hotel",
          href: "/hoteles/hotel-acreditado",
          mediaUrl: "",
          puebloMagico: false,
        },
      ],
      food: [
        {
          title: "Restaurante acreditado",
          subtitle: "Gastronomía",
          category: "Restaurante",
          href: "/restaurantes/restaurante-acreditado",
          mediaUrl: "",
          puebloMagico: false,
        },
      ],
      eventos: [],
      rutas: [],
      mapPoints: [],
    });

    expect(merged.experiencias.items[0]?.media.url).toContain(
      "governed/v1p1c/experience-cover.jpg",
    );
    expect(merged.servicios.stays[0]?.media.url).toContain("governed/v1p1c/hotel-cover.jpg");
    expect(merged.servicios.food[0]?.media.url).toContain("governed/v1p1c/restaurant-cover.jpg");
    expect(JSON.stringify(merged)).not.toContain("conceptual-preview");
  });

  test("los medios de Home usan el proxy estable y no dependen de service role", () => {
    const resolver = read("src/lib/experience-builder/smart-blocks.server.ts");
    expect(resolver).toContain("toStablePublicMediaUrl");
    expect(resolver).toContain("isAccreditedDestinationMedia");
    expect(resolver).toContain("Promise.allSettled");
    expect(resolver).toContain("Una fuente temporalmente indisponible no debe borrar las demás");
    expect(resolver).not.toContain("async function signMedia");
    expect(resolver).not.toContain("createSignedUrls(");
  });

  test("la paridad pública conserva la autoridad Home sin hero verde ni medios cruzados", () => {
    const atlas = read("src/components/destination-premium/RegionDestinationsPremiumSurface.tsx");
    const listing = read("src/components/listing-premium/TerritorialListingReviewSurface.tsx");
    expect(atlas).toContain("bg-card shadow-soft");
    expect(atlas).toContain(
      '"md:min-h-[40rem] lg:grid lg:min-h-[25rem] lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]"',
    );
    expect(atlas).not.toContain("bg-selva shadow-soft");
    expect(atlas).toContain('cinematic ? "text-white" : "text-foreground"');
    expect(atlas).toContain('"min-h-[34rem] md:min-h-[40rem] lg:min-h-[40rem]"');
    expect(listing).toContain('profile.family === "restaurantes"');
    expect(listing).toContain("restaurant-cover.jpg");
    expect(listing).toContain('profile.family === "eventos"');
  });

  test("Qué hacer conserva los overrides editoriales y sus facetas en la superficie Premium", () => {
    const wrapper = read("src/components/listing-premium/ListingPremiumSurface.tsx");
    const territorial = read("src/components/listing-premium/TerritorialListingReviewSurface.tsx");
    const route = read("src/routes/que-hacer.tsx");

    expect(wrapper).toContain("titleOverride={titleOverride}");
    expect(wrapper).toContain("subtitleOverride={subtitleOverride}");
    expect(wrapper).toContain("facets={facets}");
    expect(territorial).toContain("titleOverride?.trim() || baseProfile.title");
    expect(territorial).toContain("subtitleOverride?.trim() || baseProfile.description");
    expect(territorial).toContain("facet.extract(item.source) !== selected");
    expect(route).toContain("facets={tipoFacet ? [tipoFacet] : []}");
  });

  test("la Home expone enlaces en el constructor y convierte las acciones visibles en navegación", () => {
    const contract = read("src/lib/experience-builder/blocks/home-premium-g4/contract.ts");
    const surface = read("src/components/home-premium/HomePremiumSurface.tsx");
    const shared = read("src/components/home-premium/shared/PremiumShowcase.tsx");
    const policy = read("src/lib/experience-builder/editorial-builder-policy.ts");
    const listingContract = read(
      "src/lib/experience-builder/blocks/listing-premium-g5/contract.ts",
    );
    const listingConfig = read("src/components/listing-premium/listing-premium-config.ts");
    const listingSurface = read(
      "src/components/listing-premium/TerritorialListingReviewSurface.tsx",
    );

    for (const field of [
      "destinos_action_href",
      "pueblos_action_href",
      "rutas_action_href",
      "experiencias_action_href",
      "que_hacer_action_href",
      "rutas_select_label",
    ]) {
      expect(contract).toContain(field);
      expect(policy).toContain(`field: "${field}"`);
    }
    expect(contract.match(/label: "Enlace canónico"/g)).toHaveLength(6);
    expect(surface).toContain('to={pueblo.href ?? "/oriente-maya"}');
    expect(surface).toContain("{content.pueblosMagicos.ctaLabel}");
    expect(shared).toContain("actionHref?: string");
    expect(shared).toContain("to={actionHref}");
    expect(shared).toContain("to={featured.to}");
    expect(listingContract).toContain('href: { type: "text", label: "Enlace canónico"');
    expect(listingConfig).toContain("href: hrefOrNull(row.href, base.href)");
    expect(listingSurface).not.toContain('href="#"');
  });

  test("los listados globales no heredan un destino obsoleto del historial de navegación", () => {
    for (const route of [
      "hoteles.tsx",
      "restaurantes.tsx",
      "casas-de-vacaciones.tsx",
      "eventos.index.tsx",
      "experiencias.tsx",
      "lugares.index.tsx",
      "rutas.index.tsx",
    ]) {
      expect(read(`src/routes/${route}`)).not.toContain(
        'inherit: destino ? [] : ["region", "destination"]',
      );
    }
  });

  test("experiencias y tours resuelven Premium en ambas rutas canónicas con el flag global OFF", () => {
    const marketplace = read("src/routes/producto.$slug.tsx");
    const territorial = read("src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx");
    expect(marketplace).toContain(
      'enabled={surfaceContractsEnabled || canonicalBinding.surface === "premium"}',
    );
    expect(territorial).toContain("bindProductRoute");
    expect(territorial).toContain(
      'enabled={surfaceContractsEnabled || canonicalBinding.surface === "premium"}',
    );
  });
});
