/**
 * G8-Q2D-B · Contrato de la conexión productiva controlada de Lugares.
 *
 * 20 casos obligatorios: gobernanza, ruta fail-closed, preview de staff,
 * presentación persistible, medios propios, breadcrumb/SEO y ausencia de
 * publicación, redirects y sitemap.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  adaptPlaceToPremiumSurface,
  buildPlaceBreadcrumbs,
  findApprovedCover,
  neutralPlaceholder,
  placeCanonicalPath,
  placeJsonLdType,
  type PublicPlaceDTO,
} from "@/lib/places/place-public-contract";
import { PLACE_PREMIUM_FALLBACK_NOTICE } from "@/components/place-premium/place-premium-config";

const root = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
const exists = (f: string) => fs.existsSync(path.join(root, f));

const BLUEPRINT = "docs/blueprint/19.44-G8-Q2D-B-PLACE-PRODUCTIVE-CONNECTION-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-048.json";
const EVIDENCE = "docs/evidence/omxds-q2d-b/EVIDENCE-MANIFEST.md";
const ROUTE = "src/routes/oriente-maya/$destino.lugares.$slug.tsx";
const PANEL = "src/components/cms/places/PlacePresentationPanel.tsx";
const PRESENTATION_FN = "src/lib/places/place-presentation.functions.ts";
const READS_FN = "src/lib/places/place-public-reads.functions.ts";
const SITEMAP = "src/routes/sitemap[.]xml.ts";

function dto(overrides: Partial<PublicPlaceDTO> = {}): PublicPlaceDTO {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "chichen-itza",
    name: "Chichén Itzá",
    officialName: null,
    status: "draft",
    typeSlug: "zona-arqueologica",
    typeLabel: "Zona arqueológica",
    description: null,
    shortDescription: null,
    highlights: [],
    amenities: [],
    accessibility: [],
    directions: null,
    addressLine: null,
    admissionKind: null,
    entryFeeNotes: null,
    priceFrom: null,
    priceTo: null,
    priceCurrency: null,
    visitDurationMinutes: null,
    bestTimeToVisit: null,
    latitude: 20.6843,
    longitude: -88.5678,
    contact: { phone: null, whatsapp: null, email: null, website: null },
    socialLinks: {},
    categories: [],
    authorities: [],
    presentationMode: null,
    regionLabel: "Oriente Maya",
    destination: { slug: "tinum", name: "Tinum" },
    zone: null,
    media: [],
    hours: [],
    products: [],
    events: [],
    seo: null,
    ...overrides,
  } as PublicPlaceDTO;
}

const approvedCover = {
  mediaAssetId: "m1",
  url: "https://example.test/cover.jpg",
  alt: "Portada acreditada",
  credit: "Autor acreditado",
  caption: null,
  role: "cover",
  sortOrder: 0,
  approved: true,
  aiGenerated: false,
  focal: null,
};

describe("G8-Q2D-B · gobernanza (casos 1-4)", () => {
  test("1 · el instrumento existe, está aprobado y declara la ruta técnica", () => {
    const pca = JSON.parse(read(PCA));
    expect(pca.id).toBe("PCA-2026-048");
    expect(pca.status).toBe("Approved");
    expect(pca.blueprint).toBe(BLUEPRINT);
    expect(pca.required_tests).toContain("bun run validate:q2d:b");
  });

  test("2 · el blueprint y la evidencia documentan la regla fail-closed", () => {
    for (const f of [BLUEPRINT, EVIDENCE]) {
      expect(exists(f)).toBe(true);
      expect(read(f)).toContain("fail-closed");
    }
  });

  test("3 · el flag global permanece declarado en false", () => {
    expect(JSON.parse(read(PCA)).required_feature_flags).toContain(
      "omxds_visual_v1_contracts_enabled=false",
    );
  });

  test("4 · el manifiesto de permisos cubre la ruta y el panel", () => {
    const paths = JSON.parse(read(PCA)).permissions.map((p: { path: string }) => p.path);
    expect(paths).toContain(ROUTE);
    expect(paths).toContain(PANEL);
  });
});

describe("G8-Q2D-B · ruta fail-closed (casos 5-9)", () => {
  test("5 · la ruta pública existe con el id canónico", () => {
    expect(exists(ROUTE)).toBe(true);
    expect(read(ROUTE)).toContain('createFileRoute("/oriente-maya/$destino/lugares/$slug")');
  });

  test("6 · la lectura pública nunca permite borradores", () => {
    const src = read(READS_FN);
    expect(src).toContain("allowUnpublished: false");
  });

  test("7 · la preview exige sesión y staff editorial", () => {
    const src = read(READS_FN);
    expect(src).toContain("requireSupabaseAuth");
    expect(src).toContain("assertPlacePreviewStaff");
  });

  test("8 · sin ficha se renderiza 404 público, nunca contenido de otro lugar", () => {
    const src = read(ROUTE);
    expect(src).toContain("PlaceNotFound");
    expect(src).toContain("no está publicada");
  });

  test("9 · la ficha sin publicar declara noindex", () => {
    expect(read(ROUTE)).toContain('{ name: "robots", content: "noindex, nofollow" }');
  });
});

describe("G8-Q2D-B · presentación persistible (casos 10-13)", () => {
  test("10 · la server fn valida el modo y exige sesión", () => {
    const src = read(PRESENTATION_FN);
    expect(src).toContain("requireSupabaseAuth");
    expect(src).toContain("invalid_presentation_mode");
  });

  test("11 · guardar presentación nunca publica", () => {
    expect(read(PRESENTATION_FN)).toContain("published: false");
  });

  test("12 · el panel bloquea Cinematográfica sin portada aprobada", () => {
    const src = read(PANEL);
    expect(src).toContain("hasApprovedCover");
    expect(src).toContain("disabled={disabled || save.isPending}");
  });

  test("13 · el panel muestra el aviso oficial de fallback", () => {
    expect(read(PANEL)).toContain("PLACE_PREMIUM_FALLBACK_NOTICE");
    expect(PLACE_PREMIUM_FALLBACK_NOTICE).toContain("portada aprobada");
  });
});

describe("G8-Q2D-B · medios y adaptador (casos 14-17)", () => {
  test("14 · sin portada aprobada el modo cinematográfico cae a Editorial", () => {
    const p = adaptPlaceToPremiumSurface(dto({ presentationMode: "cinematic" }));
    expect(p.presentation).toBe("editorial");
    expect(p.resolution.fallbackApplied).toBe(true);
  });

  test("15 · con portada aprobada se conserva Cinematográfica", () => {
    const p = adaptPlaceToPremiumSurface(
      dto({ presentationMode: "cinematic", media: [approvedCover] as never }),
    );
    expect(p.presentation).toBe("cinematic");
    expect(p.hasApprovedCover).toBe(true);
  });

  test("16 · sólo se consideran portadas aprobadas del propio lugar", () => {
    expect(findApprovedCover([{ ...approvedCover, approved: false }] as never)).toBeNull();
  });

  test("17 · sin fotografía se usa marcador neutral, nunca otra imagen", () => {
    const placeholder = neutralPlaceholder("Fotografía pendiente · Chichén Itzá");
    expect(placeholder.url).toBeNull();
    const p = adaptPlaceToPremiumSurface(dto());
    expect(p.content.hero.cover.url).toBeNull();
    expect(p.content.gallery.items).toHaveLength(0);
  });
});

describe("G8-Q2D-B · territorio, SEO y no publicación (casos 18-20)", () => {
  test("18 · breadcrumb territorial completo y canónico coherente", () => {
    const crumbs = buildPlaceBreadcrumbs(dto());
    expect(crumbs.map((c) => c.label)[0]).toBe("Inicio");
    expect(crumbs.at(-1)?.label).toBe("Chichén Itzá");
    expect(placeCanonicalPath(dto())).toBe("/oriente-maya/tinum/lugares/chichen-itza");
  });

  test("19 · JSON-LD correcto por tipo, preparado sólo para publicación futura", () => {
    expect(placeJsonLdType("zona-arqueologica")).toBe("LandmarksOrHistoricalBuildings");
    expect(placeJsonLdType("museo")).toBe("Museum");
    expect(read(ROUTE)).not.toContain("application/ld+json");
  });

  test("20 · cero redirects y cero sitemap para las fichas de lugar", () => {
    expect(read(SITEMAP)).not.toContain("/lugares/");
    expect(read(ROUTE)).not.toContain("redirect(");
  });
});
