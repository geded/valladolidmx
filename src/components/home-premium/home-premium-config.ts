/**
 * G8-D · `vmx.home.premium-g4` — puente entre la configuración editable del
 * bloque compuesto y el contenido que consume `HomePremiumSurface`.
 *
 * Reglas:
 *  - Fail-closed: cualquier campo ausente, vacío o de tipo inválido cae al
 *    fixture aprobado `HOME_PREMIUM_G4_CONTENT`. Nunca se renderiza un error
 *    "smart" ni un hueco visual.
 *  - Orden y layout permanecen bloqueados por el preset `premium-g4-approved`.
 *  - Los medios se acreditan con la autoridad existente (URLs gobernadas del
 *    fixture o del registro de medios); aquí no se construyen derivados.
 */
import {
  HOME_PREMIUM_DEFAULT_ORDER,
  HOME_PREMIUM_G4_CONTENT,
  type HomePremiumContent,
  type HomePremiumMedia,
  type HomePremiumSectionKey,
} from "./home-premium-content";
import type { HomePremiumHeroVariant, HomePremiumLayout } from "./HomePremiumSurface";

export const HOME_PREMIUM_G4_BLOCK_TYPE = "vmx.home.premium-g4" as const;
export const HOME_PREMIUM_G4_CONTRACT_VERSION = "1.0.0" as const;
export const HOME_PREMIUM_G4_VARIANT = "premium-g4-approved" as const;

type Cfg = Record<string, unknown>;

const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const num = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;

const rows = (value: unknown): Cfg[] =>
  Array.isArray(value)
    ? value.filter((item): item is Cfg => Boolean(item) && typeof item === "object")
    : [];

const media = (row: Cfg, fallback: HomePremiumMedia): HomePremiumMedia => ({
  url: str(row.media_url, fallback.url),
  alt: str(row.media_alt, fallback.alt),
});

/** Mapea filas editables sobre los defaults aprobados, preservando paridad. */
function mapRows<T>(
  value: unknown,
  defaults: readonly T[],
  limit: number,
  map: (row: Cfg, base: T) => T,
): T[] {
  const list = rows(value);
  if (list.length === 0) return defaults.slice(0, limit);
  return list.slice(0, limit).map((row, index) => map(row, defaults[index % defaults.length] as T));
}

export interface HomePremiumG4Resolved {
  content: HomePremiumContent;
  heroVariant: HomePremiumHeroVariant;
  layout: HomePremiumLayout;
  sections: Partial<Record<HomePremiumSectionKey, boolean>>;
  order: HomePremiumSectionKey[];
}

/**
 * Resuelve la configuración del bloque compuesto. El preset bloquea orden y
 * layout: sólo contenido, curaduría, límites y visibilidad son editables.
 */
export function resolveHomePremiumG4(config: Cfg = {}): HomePremiumG4Resolved {
  const base = HOME_PREMIUM_G4_CONTENT;

  const content: HomePremiumContent = {
    hero: {
      eyebrow: str(config.hero_eyebrow, base.hero.eyebrow),
      title: str(config.hero_title, base.hero.title),
      subtitle: str(config.hero_subtitle, base.hero.subtitle),
      primaryCta: {
        label: str(config.hero_cta_label, base.hero.primaryCta.label),
        to: str(config.hero_cta_href, base.hero.primaryCta.to),
      },
      secondaryCta: {
        label: str(config.hero_cta_secondary_label, base.hero.secondaryCta.label),
        to: str(config.hero_cta_secondary_href, base.hero.secondaryCta.to),
      },
      slides: mapRows(config.hero_slides, base.hero.slides, 6, (row, item) => ({
        caption: str(row.caption, item.caption),
        media: media(row, item.media),
      })),
    },
    categorias: {
      heading: str(config.categorias_heading, base.categorias.heading),
      items: mapRows(
        config.categorias_items,
        base.categorias.items,
        num(config.categorias_max_items, 12),
        (row, item) => ({
          slug: str(row.slug, item.slug),
          label: str(row.label, item.label),
          href: str(row.href, item.href),
        }),
      ),
    },
    alux: {
      eyebrow: str(config.alux_eyebrow, base.alux.eyebrow),
      heading: str(config.alux_heading, base.alux.heading),
      description: str(config.alux_description, base.alux.description),
      prompts: (() => {
        const list = rows(config.alux_prompts)
          .map((row) => str(row.label, ""))
          .filter((label) => label.length > 0);
        return list.length > 0 ? list.slice(0, 6) : base.alux.prompts;
      })(),
    },
    destinos: {
      kicker: str(config.destinos_kicker, base.destinos.kicker),
      title: str(config.destinos_title, base.destinos.title),
      description: str(config.destinos_description, base.destinos.description),
      action: str(config.destinos_action, base.destinos.action),
      disclaimer: str(config.destinos_disclaimer, base.destinos.disclaimer),
      items: mapRows(
        config.destinos_items,
        base.destinos.items,
        num(config.destinos_max_items, 8),
        (row, item) => ({
          name: str(row.name, item.name),
          note: str(row.note, item.note),
          media: media(row, item.media),
          puebloMagico: bool(row.pueblo_magico, item.puebloMagico),
          demo: bool(row.demo, item.demo),
        }),
      ),
    },
    pueblosMagicos: {
      kicker: str(config.pueblos_kicker, base.pueblosMagicos.kicker),
      title: str(config.pueblos_title, base.pueblosMagicos.title),
      description: str(config.pueblos_description, base.pueblosMagicos.description),
      action: str(config.pueblos_action, base.pueblosMagicos.action),
      badgeNote: str(config.pueblos_badge_note, base.pueblosMagicos.badgeNote),
      ctaLabel: str(config.pueblos_cta_label, base.pueblosMagicos.ctaLabel),
    },
    rutas: {
      kicker: str(config.rutas_kicker, base.rutas.kicker),
      title: str(config.rutas_title, base.rutas.title),
      description: str(config.rutas_description, base.rutas.description),
      action: str(config.rutas_action, base.rutas.action),
      items: mapRows(
        config.rutas_items,
        base.rutas.items,
        num(config.rutas_max_items, 3),
        (row, item) => {
          const sequence = rows(row.sequence)
            .map((stop) => str(stop.label, ""))
            .filter((label) => label.length > 0);
          const resolved = sequence.length > 0 ? sequence : item.sequence;
          return {
            id: str(row.id, item.id),
            title: str(row.title, item.title),
            duration: str(row.duration, item.duration),
            stops: num(row.stops, resolved.length || item.stops),
            vibe: str(row.vibe, item.vibe),
            description: str(row.description, item.description),
            sequence: resolved,
            media: media(row, item.media),
          };
        },
      ),
    },
    experiencias: {
      kicker: str(config.experiencias_kicker, base.experiencias.kicker),
      title: str(config.experiencias_title, base.experiencias.title),
      description: str(config.experiencias_description, base.experiencias.description),
      action: str(config.experiencias_action, base.experiencias.action),
      items: mapRows(
        config.experiencias_items,
        base.experiencias.items,
        num(config.experiencias_max_items, 6),
        (row, item) => ({
          title: str(row.title, item.title),
          category: str(row.category, item.category),
          summary: str(row.summary, item.summary),
          media: media(row, item.media),
        }),
      ),
    },
    servicios: {
      kicker: str(config.servicios_kicker, base.servicios.kicker),
      title: str(config.servicios_title, base.servicios.title),
      description: str(config.servicios_description, base.servicios.description),
      staysTitle: str(config.servicios_stays_title, base.servicios.staysTitle),
      foodTitle: str(config.servicios_food_title, base.servicios.foodTitle),
      stays: mapRows(
        config.servicios_stays,
        base.servicios.stays,
        num(config.servicios_max_items, 4),
        (row, item) => ({
          title: str(row.title, item.title),
          destination: str(row.destination, item.destination),
          category: str(row.category, item.category),
          summary: str(row.summary, item.summary),
          media: media(row, item.media),
        }),
      ),
      food: mapRows(
        config.servicios_food,
        base.servicios.food,
        num(config.servicios_max_items, 4),
        (row, item) => ({
          title: str(row.title, item.title),
          destination: str(row.destination, item.destination),
          category: str(row.category, item.category),
          summary: str(row.summary, item.summary),
          media: media(row, item.media),
        }),
      ),
    },
    eventos: {
      kicker: str(config.eventos_kicker, base.eventos.kicker),
      title: str(config.eventos_title, base.eventos.title),
      description: str(config.eventos_description, base.eventos.description),
      media: {
        url: str(config.eventos_media_url, base.eventos.media.url),
        alt: str(config.eventos_media_alt, base.eventos.media.alt),
      },
      items: mapRows(
        config.eventos_items,
        base.eventos.items,
        num(config.eventos_max_items, 6),
        (row, item) => ({
          day: str(row.day, item.day),
          title: str(row.title, item.title),
          type: str(row.type, item.type),
          detail: str(row.detail, item.detail),
        }),
      ),
    },
    queHacer: {
      kicker: str(config.que_hacer_kicker, base.queHacer.kicker),
      title: str(config.que_hacer_title, base.queHacer.title),
      description: str(config.que_hacer_description, base.queHacer.description),
      action: str(config.que_hacer_action, base.queHacer.action),
      items: mapRows(
        config.que_hacer_items,
        base.queHacer.items,
        num(config.que_hacer_max_items, 6),
        (row, item) => ({
          kicker: str(row.kicker, item.kicker),
          title: str(row.title, item.title),
          body: str(row.body, item.body),
          media: media(row, item.media),
        }),
      ),
    },
    mapa: {
      kicker: str(config.mapa_kicker, base.mapa.kicker),
      title: str(config.mapa_title, base.mapa.title),
      description: str(config.mapa_description, base.mapa.description),
      dto: base.mapa.dto,
    },
    travelPlan: {
      eyebrow: str(config.travel_plan_eyebrow, base.travelPlan.eyebrow),
      title: str(config.travel_plan_title, base.travelPlan.title),
      ctaAddLabel: str(config.travel_plan_cta_add_label, base.travelPlan.ctaAddLabel),
      ctaAddedLabel: str(config.travel_plan_cta_added_label, base.travelPlan.ctaAddedLabel),
      ctaAluxLabel: str(config.travel_plan_cta_alux_label, base.travelPlan.ctaAluxLabel),
    },
  };

  return {
    content,
    // Preset bloqueado: variante única aprobada.
    heroVariant: "editorial",
    layout: "asimetrica",
    sections: {
      destinos: bool(config.show_destinos, true),
      pueblosMagicos: bool(config.show_pueblos_magicos, true),
      rutas: bool(config.show_rutas, true),
      experiencias: bool(config.show_experiencias, true),
      servicios: bool(config.show_servicios, true),
      eventos: bool(config.show_eventos, true),
      queHacer: bool(config.show_que_hacer, true),
      mapa: bool(config.show_mapa, true),
    },
    order: HOME_PREMIUM_DEFAULT_ORDER,
  };
}

/** Configuración por defecto del preset aprobado (snapshot inicial). */
export function homePremiumG4DefaultConfig(): Cfg {
  const c = HOME_PREMIUM_G4_CONTENT;
  const mediaRow = (m: HomePremiumMedia) => ({ media_url: m.url, media_alt: m.alt });
  return {
    variant: HOME_PREMIUM_G4_VARIANT,
    hero_eyebrow: c.hero.eyebrow,
    hero_title: c.hero.title,
    hero_subtitle: c.hero.subtitle,
    hero_cta_label: c.hero.primaryCta.label,
    hero_cta_href: c.hero.primaryCta.to,
    hero_cta_secondary_label: c.hero.secondaryCta.label,
    hero_cta_secondary_href: c.hero.secondaryCta.to,
    hero_slides: c.hero.slides.map((s) => ({ caption: s.caption, ...mediaRow(s.media) })),
    categorias_heading: c.categorias.heading,
    categorias_max_items: c.categorias.items.length,
    categorias_items: c.categorias.items.map((i) => ({ ...i })),
    alux_eyebrow: c.alux.eyebrow,
    alux_heading: c.alux.heading,
    alux_description: c.alux.description,
    alux_prompts: c.alux.prompts.map((label) => ({ label })),
    destinos_kicker: c.destinos.kicker,
    destinos_title: c.destinos.title,
    destinos_description: c.destinos.description,
    destinos_action: c.destinos.action,
    destinos_disclaimer: c.destinos.disclaimer,
    destinos_max_items: c.destinos.items.length,
    destinos_items: c.destinos.items.map((d) => ({
      name: d.name,
      note: d.note,
      pueblo_magico: d.puebloMagico,
      demo: d.demo,
      ...mediaRow(d.media),
    })),
    pueblos_kicker: c.pueblosMagicos.kicker,
    pueblos_title: c.pueblosMagicos.title,
    pueblos_description: c.pueblosMagicos.description,
    pueblos_action: c.pueblosMagicos.action,
    pueblos_badge_note: c.pueblosMagicos.badgeNote,
    pueblos_cta_label: c.pueblosMagicos.ctaLabel,
    rutas_kicker: c.rutas.kicker,
    rutas_title: c.rutas.title,
    rutas_description: c.rutas.description,
    rutas_action: c.rutas.action,
    rutas_max_items: c.rutas.items.length,
    rutas_items: c.rutas.items.map((r) => ({
      id: r.id,
      title: r.title,
      duration: r.duration,
      stops: r.stops,
      vibe: r.vibe,
      description: r.description,
      sequence: r.sequence.map((label) => ({ label })),
      ...mediaRow(r.media),
    })),
    experiencias_kicker: c.experiencias.kicker,
    experiencias_title: c.experiencias.title,
    experiencias_description: c.experiencias.description,
    experiencias_action: c.experiencias.action,
    experiencias_max_items: c.experiencias.items.length,
    experiencias_items: c.experiencias.items.map((e) => ({
      title: e.title,
      category: e.category,
      summary: e.summary,
      ...mediaRow(e.media),
    })),
    servicios_kicker: c.servicios.kicker,
    servicios_title: c.servicios.title,
    servicios_description: c.servicios.description,
    servicios_stays_title: c.servicios.staysTitle,
    servicios_food_title: c.servicios.foodTitle,
    servicios_max_items: Math.max(c.servicios.stays.length, c.servicios.food.length),
    servicios_stays: c.servicios.stays.map((s) => ({
      title: s.title,
      destination: s.destination,
      category: s.category,
      summary: s.summary,
      ...mediaRow(s.media),
    })),
    servicios_food: c.servicios.food.map((s) => ({
      title: s.title,
      destination: s.destination,
      category: s.category,
      summary: s.summary,
      ...mediaRow(s.media),
    })),
    eventos_kicker: c.eventos.kicker,
    eventos_title: c.eventos.title,
    eventos_description: c.eventos.description,
    eventos_media_url: c.eventos.media.url,
    eventos_media_alt: c.eventos.media.alt,
    eventos_max_items: c.eventos.items.length,
    eventos_items: c.eventos.items.map((e) => ({ ...e })),
    que_hacer_kicker: c.queHacer.kicker,
    que_hacer_title: c.queHacer.title,
    que_hacer_description: c.queHacer.description,
    que_hacer_action: c.queHacer.action,
    que_hacer_max_items: c.queHacer.items.length,
    que_hacer_items: c.queHacer.items.map((i) => ({
      kicker: i.kicker,
      title: i.title,
      body: i.body,
      ...mediaRow(i.media),
    })),
    mapa_kicker: c.mapa.kicker,
    mapa_title: c.mapa.title,
    mapa_description: c.mapa.description,
    travel_plan_eyebrow: c.travelPlan.eyebrow,
    travel_plan_title: c.travelPlan.title,
    travel_plan_cta_add_label: c.travelPlan.ctaAddLabel,
    travel_plan_cta_added_label: c.travelPlan.ctaAddedLabel,
    travel_plan_cta_alux_label: c.travelPlan.ctaAluxLabel,
    show_destinos: true,
    show_pueblos_magicos: true,
    show_rutas: true,
    show_experiencias: true,
    show_servicios: true,
    show_eventos: true,
    show_que_hacer: true,
    show_mapa: true,
  };
}
