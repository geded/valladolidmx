import { describe, expect, test } from "bun:test";
import {
  buildTerritorialCrumbs,
  canSelectPremiumPresentation,
  DEFAULT_PREMIUM_GALLERY_LAYOUT,
  DEFAULT_PREMIUM_PRESENTATION,
  isPremiumGalleryLayout,
  isPremiumPresentation,
  isPuebloMagico,
  normalizePresentationActor,
  PREMIUM_GALLERY_LAYOUTS,
  PREMIUM_PRESENTATIONS,
  resolvePremiumPresentation,
  resolvePuebloMagicoBadge,
  TERRITORY_LABEL,
} from "../../../src/lib/omxds/presentation/premium-presentation";
import {
  isStableMediaUrl,
  sanitizePremiumMedia,
} from "../../../src/lib/omxds/presentation/premium-view-models";

describe("G4-SYSTEM-01 premium presentation contract", () => {
  test("expone exactamente dos presentaciones y cuatro galerías", () => {
    expect(PREMIUM_PRESENTATIONS).toEqual(["editorial", "cinematic"]);
    expect(PREMIUM_GALLERY_LAYOUTS).toEqual(["mosaico", "carrusel", "cuadricula", "tira"]);
    expect(DEFAULT_PREMIUM_PRESENTATION).toBe("editorial");
    expect(DEFAULT_PREMIUM_GALLERY_LAYOUT).toBe("mosaico");
    expect(isPremiumPresentation("editorial")).toBe(true);
    expect(isPremiumPresentation("premium")).toBe(false);
    expect(isPremiumGalleryLayout("tira")).toBe(true);
    expect(isPremiumGalleryLayout("masonry")).toBe(false);
  });

  test("el selector nunca está disponible para el visitante (fail-closed)", () => {
    expect(normalizePresentationActor("cualquier-cosa")).toBe("visitor");
    expect(normalizePresentationActor(undefined)).toBe("visitor");
    expect(canSelectPremiumPresentation("visitor")).toBe(false);
    expect(canSelectPremiumPresentation(null)).toBe(false);
    for (const actor of ["admin", "owner", "editor"])
      expect(canSelectPremiumPresentation(actor)).toBe(true);
  });

  test("el visitante recibe la variante publicada e ignora el override", () => {
    const visitor = resolvePremiumPresentation({
      published: "cinematic",
      requested: "editorial",
      actor: "visitor",
    });
    expect(visitor).toEqual({
      presentation: "cinematic",
      source: "published",
      selectorAvailable: false,
    });
  });

  test("el actor autorizado puede sobreescribir la presentación", () => {
    expect(
      resolvePremiumPresentation({
        published: "editorial",
        requested: "cinematic",
        actor: "admin",
      }),
    ).toEqual({ presentation: "cinematic", source: "override", selectorAvailable: true });
  });

  test("valores inválidos degradan al default sin lanzar", () => {
    expect(
      resolvePremiumPresentation({ published: "hollywood", requested: 7, actor: "owner" }),
    ).toEqual({ presentation: "editorial", source: "default", selectorAvailable: true });
  });

  test("breadcrumb territorial canónico con nombre visible completo", () => {
    const crumbs = buildTerritorialCrumbs({ slug: "valladolid", label: "Valladolid" }, [
      { label: "Hoteles" },
    ]);
    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Inicio",
      TERRITORY_LABEL,
      "Valladolid",
      "Hoteles",
    ]);
    expect(TERRITORY_LABEL).toBe("Oriente Maya de Yucatán");
    expect(crumbs[1]!.href).toBe("/oriente-maya");
    expect(buildTerritorialCrumbs().map((crumb) => crumb.label)).toEqual([
      "Inicio",
      TERRITORY_LABEL,
    ]);
  });

  test("Pueblos Mágicos: sólo los autorizados y sin imitar el logotipo oficial", () => {
    for (const slug of ["valladolid", "Izamal", " espita "])
      expect(isPuebloMagico(slug)).toBe(true);
    expect(isPuebloMagico("tizimin")).toBe(false);
    expect(resolvePuebloMagicoBadge("tizimin")).toBeNull();

    const textual = resolvePuebloMagicoBadge("izamal");
    expect(textual).toEqual({ label: "Pueblo Mágico", assetUrl: null, mode: "text" });
    expect(resolvePuebloMagicoBadge("izamal", "   ")?.mode).toBe("text");

    const accredited = resolvePuebloMagicoBadge("valladolid", "/media/pueblo-magico.svg");
    expect(accredited).toEqual({
      label: "Pueblo Mágico",
      assetUrl: "/media/pueblo-magico.svg",
      mode: "asset",
    });
  });
});

describe("G4-SYSTEM-01 premium view-models", () => {
  test("descarta medios sin ALT humano", () => {
    expect(
      sanitizePremiumMedia([
        { url: "/a.jpg", alt: "Patio colonial" },
        { url: "/b.jpg", alt: "" },
        { url: "", alt: "sin url" },
        null,
      ]),
    ).toEqual([{ url: "/a.jpg", alt: "Patio colonial" }]);
  });

  test("rechaza URLs firmadas", () => {
    expect(isStableMediaUrl("/api/public/studio-media/governed/v1p1c/hotel-cover.jpg")).toBe(true);
    expect(isStableMediaUrl("/media/a.jpg?token=abc")).toBe(false);
    expect(isStableMediaUrl("/media/a.jpg?X-Amz-Signature=abc")).toBe(false);
    expect(isStableMediaUrl(undefined)).toBe(false);
  });
});
