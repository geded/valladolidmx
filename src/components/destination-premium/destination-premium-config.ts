/**
 * G8-E · `vmx.destination.premium-g4` — puente entre la configuración
 * editable del bloque compuesto y el contenido que consume
 * `DestinationPremiumSurface`.
 *
 * Fail-closed: cualquier campo ausente, vacío o de tipo inválido cae al
 * fixture aprobado `DESTINATION_PREMIUM_G4_CONTENT`. Orden y layout
 * permanecen bloqueados por el preset.
 */
import {
  DESTINATION_PREMIUM_G4_CONTENT,
  type DestinationPremiumContent,
  type DestinationPremiumMedia,
  type DestinationPremiumSectionKey,
} from "./destination-premium-content";
import type { DestinationGalleryLayout, DestinationHeroVariant } from "./DestinationPremiumSurface";

export const DESTINATION_PREMIUM_G4_BLOCK_TYPE = "vmx.destination.premium-g4" as const;
export const DESTINATION_PREMIUM_G4_CONTRACT_VERSION = "1.0.0" as const;
export const DESTINATION_PREMIUM_G4_VARIANT = "destino-premium-g4-approved" as const;

type Cfg = Record<string, unknown>;

const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const rows = (value: unknown): Cfg[] =>
  Array.isArray(value)
    ? value.filter((item): item is Cfg => Boolean(item) && typeof item === "object")
    : [];

const media = (row: Cfg, fallback: DestinationPremiumMedia): DestinationPremiumMedia => ({
  url: str(row.media_url, fallback.url),
  alt: str(row.media_alt, fallback.alt),
});

function mapRows<T>(value: unknown, defaults: readonly T[], map: (row: Cfg, base: T) => T): T[] {
  const list = rows(value);
  if (list.length === 0) return [...defaults];
  return list.map((row, index) => map(row, defaults[index % defaults.length] as T));
}

const heroVariantOf = (value: unknown): DestinationHeroVariant =>
  value === "cinematic" ? "cinematic" : "editorial";

const galleryLayoutOf = (value: unknown): DestinationGalleryLayout =>
  value === "carrusel" || value === "cuadricula" || value === "tira"
    ? (value as DestinationGalleryLayout)
    : "mosaico";

export interface DestinationPremiumG4Resolved {
  content: DestinationPremiumContent;
  heroVariant: DestinationHeroVariant;
  galleryLayout: DestinationGalleryLayout;
  sections: Partial<Record<DestinationPremiumSectionKey, boolean>>;
}

export function resolveDestinationPremiumG4(config: Cfg = {}): DestinationPremiumG4Resolved {
  const base = DESTINATION_PREMIUM_G4_CONTENT;

  const content: DestinationPremiumContent = {
    slug: str(config.destination_slug, base.slug),
    breadcrumbs: base.breadcrumbs,
    hero: {
      statusBadge: str(config.hero_status_badge, base.hero.statusBadge ?? ""),
      regionBadge: str(config.hero_region_badge, base.hero.regionBadge),
      title: str(config.hero_title, base.hero.title),
      subtitle: str(config.hero_subtitle, base.hero.subtitle),
      description: str(config.hero_description, base.hero.description),
      primaryCta: {
        label: str(config.hero_cta_label, base.hero.primaryCta.label),
        href: str(config.hero_cta_href, base.hero.primaryCta.href),
      },
      secondaryCta: {
        label: str(config.hero_cta_secondary_label, base.hero.secondaryCta.label),
        href: str(config.hero_cta_secondary_href, base.hero.secondaryCta.href),
      },
      cover: {
        url: str(config.hero_media_url, base.hero.cover.url),
        alt: str(config.hero_media_alt, base.hero.cover.alt),
      },
      supporting: mapRows(config.hero_supporting, base.hero.supporting, media),
    },
    services: mapRows(config.servicios_items, base.services, (row, b) => ({
      key: str(row.slug, b.key),
      label: str(row.label, b.label),
      hint: str(row.hint, b.hint),
      media: media(row, b.media),
    })),
    servicesNote: str(config.servicios_note, base.servicesNote),
    descubre: {
      kicker: str(config.descubre_kicker, base.descubre.kicker),
      title: str(config.descubre_title, base.descubre.title),
      paragraphs: mapRows(config.descubre_paragraphs, base.descubre.paragraphs, (row, b) =>
        str(row.text, b),
      ),
      media: mapRows(config.descubre_media, base.descubre.media, media),
    },
    gallery: {
      kicker: str(config.galeria_kicker, base.gallery.kicker),
      title: str(config.galeria_title, base.gallery.title),
      note: str(config.galeria_note, base.gallery.note),
      items: mapRows(config.galeria_items, base.gallery.items, media),
    },
    servicePreview: {
      actionLabel: str(config.servicio_action_label, base.servicePreview.actionLabel),
      cardTitlePrefix: str(config.servicio_card_prefix, base.servicePreview.cardTitlePrefix),
      cardBody: str(config.servicio_card_body, base.servicePreview.cardBody),
    },
    map: {
      heading: str(config.mapa_heading, base.map.heading),
      center: base.map.center,
      points: base.map.points,
    },
    nearby: {
      kicker: str(config.cercanos_kicker, base.nearby.kicker),
      title: str(config.cercanos_title, base.nearby.title),
      description: str(config.cercanos_description, base.nearby.description),
      items: mapRows(config.cercanos_items, base.nearby.items, (row, b) => ({
        slug: str(row.slug, b.slug),
        name: str(row.name, b.name),
        distance: str(row.distance, b.distance),
        tagline: str(row.tagline, b.tagline),
        media: media(row, b.media),
      })),
    },
  };

  return {
    content,
    heroVariant: heroVariantOf(config.hero_variant),
    galleryLayout: galleryLayoutOf(config.galeria_layout),
    sections: {
      hero: true,
      services: true,
      descubre: bool(config.show_descubre, true),
      gallery: bool(config.show_galeria, true),
      servicePreview: bool(config.show_servicio_preview, true),
      map: bool(config.show_mapa, true),
      nearby: bool(config.show_cercanos, true),
    },
  };
}

/** Configuración por defecto del preset aprobado (usada por el contrato). */
export function destinationPremiumG4DefaultConfig(): Cfg {
  const b = DESTINATION_PREMIUM_G4_CONTENT;
  return {
    variant: DESTINATION_PREMIUM_G4_VARIANT,
    destination_slug: b.slug,
    hero_variant: "editorial",
    hero_status_badge: b.hero.statusBadge ?? "",
    hero_region_badge: b.hero.regionBadge,
    hero_title: b.hero.title,
    hero_subtitle: b.hero.subtitle,
    hero_description: b.hero.description,
    hero_cta_label: b.hero.primaryCta.label,
    hero_cta_href: b.hero.primaryCta.href,
    hero_cta_secondary_label: b.hero.secondaryCta.label,
    hero_cta_secondary_href: b.hero.secondaryCta.href,
    hero_media_url: b.hero.cover.url,
    hero_media_alt: b.hero.cover.alt,
    hero_supporting: b.hero.supporting.map((m) => ({ media_url: m.url, media_alt: m.alt })),
    servicios_items: b.services.map((s) => ({
      slug: s.key,
      label: s.label,
      hint: s.hint,
      media_url: s.media.url,
      media_alt: s.media.alt,
    })),
    servicios_note: b.servicesNote,
    descubre_kicker: b.descubre.kicker,
    descubre_title: b.descubre.title,
    descubre_paragraphs: b.descubre.paragraphs.map((text) => ({ text })),
    descubre_media: b.descubre.media.map((m) => ({ media_url: m.url, media_alt: m.alt })),
    galeria_layout: "mosaico",
    galeria_kicker: b.gallery.kicker,
    galeria_title: b.gallery.title,
    galeria_note: b.gallery.note,
    galeria_items: b.gallery.items.map((m) => ({ media_url: m.url, media_alt: m.alt })),
    servicio_action_label: b.servicePreview.actionLabel,
    servicio_card_prefix: b.servicePreview.cardTitlePrefix,
    servicio_card_body: b.servicePreview.cardBody,
    mapa_heading: b.map.heading,
    cercanos_kicker: b.nearby.kicker,
    cercanos_title: b.nearby.title,
    cercanos_description: b.nearby.description,
    cercanos_items: b.nearby.items.map((d) => ({
      slug: d.slug,
      name: d.name,
      distance: d.distance,
      tagline: d.tagline,
      media_url: d.media.url,
      media_alt: d.media.alt,
    })),
    show_descubre: true,
    show_galeria: true,
    show_servicio_preview: true,
    show_mapa: true,
    show_cercanos: true,
  };
}
