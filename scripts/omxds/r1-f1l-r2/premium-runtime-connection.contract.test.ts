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
    const surface = read(
      "src/components/destination-premium/RegionDestinationsPremiumSurface.tsx",
    );
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

  test("los medios de Home usan el proxy estable y no dependen de service role", () => {
    const resolver = read("src/lib/experience-builder/smart-blocks.server.ts");
    expect(resolver).toContain("toStablePublicMediaUrl");
    expect(resolver).toContain("isAccreditedDestinationMedia");
    expect(resolver).not.toContain("async function signMedia");
    expect(resolver).not.toContain("createSignedUrls(");
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
