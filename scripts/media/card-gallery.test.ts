import { describe, expect, it } from "vitest";
import { cardGalleryPhotos } from "../../src/components/experience-builder/tourism-card/card-gallery";

describe("approved same-business card gallery", () => {
  const cover = { url: "cover", alt: "Cover", assetId: "a" };
  it("keeps the cover first and caps the gallery at five photos", () => {
    const photos = cardGalleryPhotos(cover, Array.from({ length: 8 }, (_, i) => ({ url: `photo-${i}`, alt: null })));
    expect(photos.length).toBe(5);
    expect(photos[0]).toEqual(cover);
    expect(photos[4]?.url).toBe("photo-3");
  });
  it("removes duplicate covers by asset identity even with renewed signed URLs", () => {
    expect(cardGalleryPhotos(cover, [{ url: "renewed", alt: null, assetId: "a" },
      { url: "gallery", alt: null }, { url: "gallery", alt: null }]).map(p => p.url)).toEqual(["cover", "gallery"]);
  });
  it("leaves a business with no extra photos as a single cover", () => {
    expect(cardGalleryPhotos(cover, [])).toEqual([cover]);
  });
});