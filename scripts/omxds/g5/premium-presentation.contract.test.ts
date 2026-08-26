/**
 * G4-SYSTEM-02 · Gate contractual del eje de presentación premium.
 *
 * Verifica fail-closed:
 *  - Un solo eje de presentación (editorial | cinematic).
 *  - Mappers ViewModel-only sin dependencias de dominio.
 *  - Medios: ALT obligatorio y URLs estables (sin firmas).
 *  - Breadcrumb territorial canónico "Oriente Maya de Yucatán".
 *  - Cero duplicación de primitivas (`-v2`, `-pro`, `-next`, `-lite`).
 *  - Los previews G4 consumen el runtime compartido.
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

import {
  DEFAULT_PREMIUM_PRESENTATION,
  PREMIUM_PRESENTATIONS,
  TERRITORY_LABEL,
  buildTerritorialCrumbs,
  resolvePremiumPresentation,
} from "../../../src/lib/omxds/presentation/premium-presentation";
import {
  toDestinationPremiumVM,
  toEventPremiumVM,
  toHotelPremiumVM,
  toPremiumMediaVM,
  toPremiumSurfaceVM,
} from "../../../src/lib/omxds/presentation/vm";
import { PREMIUM_SURFACE_FAMILIES } from "../../../src/lib/omxds/presentation/premium-view-models";

const PREVIEWS = [
  "src/routes/lovable/g4-home-premium-preview.tsx",
  "src/routes/lovable/g4-destination-microsite-preview.tsx",
  "src/routes/lovable/g4-hotel-premium-preview.tsx",
  "src/routes/lovable/g4-restaurant-premium-preview.tsx",
  "src/routes/lovable/g4-experience-premium-preview.tsx",
  "src/routes/lovable/g4-event-premium-preview.tsx",
];

describe("G5 · eje único de presentación", () => {
  test("sólo existen dos presentaciones y el default es editorial", () => {
    expect([...PREMIUM_PRESENTATIONS]).toEqual(["editorial", "cinematic"]);
    expect(DEFAULT_PREMIUM_PRESENTATION).toBe("editorial");
  });

  test("el visitante nunca recibe override ni selector", () => {
    const resolution = resolvePremiumPresentation({
      published: "editorial",
      requested: "cinematic",
      actor: "visitor",
    });
    expect(resolution.presentation).toBe("editorial");
    expect(resolution.selectorAvailable).toBe(false);
  });

  test("un actor autorizado sí puede solicitar override", () => {
    const resolution = resolvePremiumPresentation({
      published: "editorial",
      requested: "cinematic",
      actor: "admin",
    });
    expect(resolution.presentation).toBe("cinematic");
    expect(resolution.source).toBe("override");
  });
});

describe("G5 · mappers ViewModel", () => {
  const source = {
    title: "Hacienda San Servacio",
    subtitle: "Hospedaje colonial en el corazón del destino.",
    cover: { url: "/api/public/studio-media/governed/v1p1c/cover.jpg", alt: "Patio colonial" },
    gallery: [
      { url: "/api/public/studio-media/governed/v1p1c/a.jpg", alt: "Habitación" },
      { url: "/api/public/studio-media/governed/v1p1c/b.jpg", alt: "" },
      { url: "https://cdn.example.com/x.jpg?token=abc", alt: "Firmada" },
    ],
    facts: [
      { label: "Desde", value: "$2,400 MXN" },
      { label: "Vacío", value: "" },
    ],
    destination: { slug: "valladolid", label: "Valladolid" },
  };

  test("descarta medios sin ALT y URLs firmadas", () => {
    const vm = toHotelPremiumVM(source);
    expect(vm.gallery.items).toHaveLength(1);
    expect(toPremiumMediaVM({ url: "/x.jpg", alt: "  " })).toBeNull();
    expect(toPremiumMediaVM({ url: "/x.jpg?X-Amz-Signature=1", alt: "ok" })).toBeNull();
  });

  test("descarta datos incompletos y conserva los acreditados", () => {
    const vm = toHotelPremiumVM(source);
    expect(vm.hero.facts).toHaveLength(1);
    expect(vm.hero.cover?.alt).toBe("Patio colonial");
  });

  test("breadcrumb territorial canónico", () => {
    const vm = toEventPremiumVM(source);
    expect(vm.crumbs.map((crumb) => crumb.label)).toEqual([
      "Inicio",
      TERRITORY_LABEL,
      "Valladolid",
    ]);
    expect(buildTerritorialCrumbs(null)[1]?.label).toBe(TERRITORY_LABEL);
  });

  test("Pueblo Mágico se agrega en modo textual sin asset acreditado", () => {
    const vm = toDestinationPremiumVM(source);
    const pueblo = vm.hero.badges?.find((badge) => badge.label === "Pueblo Mágico");
    expect(pueblo).toBeDefined();
    expect(pueblo?.assetUrl).toBeNull();
  });

  test("todas las familias producen el mismo contrato", () => {
    for (const family of PREMIUM_SURFACE_FAMILIES) {
      const vm = toPremiumSurfaceVM(family, source);
      expect(vm.family).toBe(family);
      expect(vm.hero.title).toBe(source.title);
      expect(Array.isArray(vm.gallery.items)).toBe(true);
      expect(vm.crumbs.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("G5 · no duplicación ni fugas", () => {
  test("no existen primitivas duplicadas en src/components/premium", () => {
    const files = readdirSync("src/components/premium");
    expect(files.filter((file) => /-(v2|pro|next|lite)\.tsx$/i.test(file))).toEqual([]);
  });

  test("los mappers son ViewModel-only", () => {
    for (const file of readdirSync("src/lib/omxds/presentation/vm")) {
      const source = readFileSync(`src/lib/omxds/presentation/vm/${file}`, "utf8");
      expect(source).not.toMatch(/@\/integrations\/supabase|createServerFn|useQuery/);
    }
  });

  test("los previews G4 consumen el runtime compartido y ningún mapa alterno", () => {
    for (const preview of PREVIEWS) {
      const source = readFileSync(preview, "utf8");
      expect(source).toContain("@/components/premium");
      expect(source).toContain("@/lib/omxds/presentation/vm");
      expect(source).not.toMatch(/mapbox|leaflet|google\.maps/i);
    }
  });
});
