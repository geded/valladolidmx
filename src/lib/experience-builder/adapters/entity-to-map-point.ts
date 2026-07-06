/**
 * U-VISUAL · V4 — Adaptadores oficiales `entity → ExperienceMapPoint`.
 *
 * Un único punto de conversión por tipo de entidad. Prohibido derivar
 * puntos ad-hoc en superficies o rutas: siempre pasar por aquí para que
 * el bloque `vmx.experience.map` reciba datos consistentes.
 */
import type { ExperienceMapPoint } from "@/lib/experience-builder/blocks/experience-map/contract";

interface AnyBusiness {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address_line1?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  href?: string | null;
  category_label?: string | null;
}

function coerceLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = typeof lat === "number" ? lat : Number(lat);
  const ln = typeof lng === "number" ? lng : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: la, lng: ln };
}

export function businessToMapPoint(b: AnyBusiness): ExperienceMapPoint | null {
  const c = coerceLatLng(b.latitude, b.longitude);
  if (!c) return null;
  return {
    id: b.id,
    kind: "business",
    lat: c.lat,
    lng: c.lng,
    title: b.name ?? b.title ?? "Sin nombre",
    subtitle: b.address_line1 ?? b.category_label ?? null,
    href: b.href ?? (b.slug ? `/negocio/${b.slug}` : null),
    thumbUrl: b.cover_url ?? b.thumbnail_url ?? null,
    badge: null,
    priceLabel: null,
  };
}

interface AnyProduct {
  id: string;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  price_label?: string | null;
  cover_url?: string | null;
  business?: AnyBusiness | null;
  latitude?: number | null;
  longitude?: number | null;
  address_line1?: string | null;
}

export function productToMapPoint(p: AnyProduct): ExperienceMapPoint | null {
  const c =
    coerceLatLng(p.latitude, p.longitude) ??
    coerceLatLng(p.business?.latitude, p.business?.longitude);
  if (!c) return null;
  return {
    id: p.id,
    kind: "product",
    lat: c.lat,
    lng: c.lng,
    title: p.title ?? p.name ?? "Producto",
    subtitle: p.address_line1 ?? p.business?.address_line1 ?? p.business?.name ?? null,
    href: p.slug ? `/producto/${p.slug}` : null,
    thumbUrl: p.cover_url ?? null,
    badge: null,
    priceLabel: p.price_label ?? null,
  };
}

interface AnyDestination {
  id: string;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cover_url?: string | null;
}

export function destinationToMapPoint(
  d: AnyDestination,
): ExperienceMapPoint | null {
  const c = coerceLatLng(d.latitude, d.longitude);
  if (!c) return null;
  return {
    id: d.id,
    kind: "destination",
    lat: c.lat,
    lng: c.lng,
    title: d.name ?? d.title ?? "Destino",
    subtitle: null,
    href: d.slug ? `/oriente-maya/${d.slug}` : null,
    thumbUrl: d.cover_url ?? null,
    badge: null,
    priceLabel: null,
  };
}
