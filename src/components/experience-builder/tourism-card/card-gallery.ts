import type { CardGalleryPhoto } from "@/lib/catalog/business-card-gallery.functions";

/** Cover stays first; duplicates never consume one of the five positions. */
export function cardGalleryPhotos(cover: CardGalleryPhoto, extras: readonly CardGalleryPhoto[]) {
  const photos = [cover];
  const ids = new Set(cover.assetId ? [cover.assetId] : []);
  const urls = new Set([cover.url]);
  for (const photo of extras) {
    if (!photo.url || urls.has(photo.url) || (photo.assetId && ids.has(photo.assetId))) continue;
    photos.push(photo);
    urls.add(photo.url);
    if (photo.assetId) ids.add(photo.assetId);
    if (photos.length === 5) break;
  }
  return photos;
}