/**
 * LOTE 3I.2 · View-Model puro de la superficie `premium-seo-landing`.
 *
 * Traduce la composición de 18 slots a la arquitectura reconocible de la
 * maqueta autorizada (Zazil Tunich):
 *   1 · Hero dividido premium (editorial + fotografía)
 *   2 · Franja de confianza (hasta 4 señales administrables)
 *   3 · Cuerpo editorial modular (por qué · experiencias · visita · territorio)
 *   4 · Cierre Alux compacto
 *
 * Módulo PURO (sin React, sin red): un slot sin dato real no produce región.
 * Cero contenido inventado: lo que el editor no capturó no se muestra.
 */
import type { CompositionNode, CompositionTree } from "../composition-tree";
import type { SeoLandingSlotId } from "./seo-landing-template";

export interface SeoLandingMedia {
  readonly url: string;
  readonly alt: string;
  /** Punto focal `x% y%` para `object-position` (default `50% 50%`). */
  readonly focal: string | null;
}

export interface SeoLandingHeroVM {
  readonly title: string;
  readonly eyebrow: string | null;
  /** Tipo / subtipo · destino (línea de identidad bajo el título). */
  readonly typeLine: string | null;
  /** Promesa editorial breve (una frase). */
  readonly promise: string | null;
  readonly description: string | null;
  readonly media: SeoLandingMedia | null;
  /** Portada alternativa para viewport móvil (opcional, administrable). */
  readonly mobileMedia: SeoLandingMedia | null;
  readonly primary: { label: string; href: string } | null;
  readonly secondaryLabel: string | null;
  readonly saveLabel: string | null;
}

export interface SeoLandingTrustItem {
  readonly id: string;
  readonly label: string;
  readonly value: string | null;
  readonly detail: string | null;
  readonly icon: "award" | "badge" | "star" | "pin" | "info";
  /** `verified` muestra la señal como hecho; `pending` la matiza. */
  readonly status: "verified" | "pending";
}

export interface SeoLandingOfferItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly href: string | null;
  readonly media: SeoLandingMedia | null;
  readonly tags: readonly string[];
}

export type SeoLandingInfoIcon =
  | "clock"
  | "calendar"
  | "backpack"
  | "accessibility"
  | "leaf"
  | "ticket"
  | "info";

export interface SeoLandingInfoItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly icon: SeoLandingInfoIcon;
}

export interface SeoLandingFeatureItem {
  readonly id: string;
  readonly label: string;
  readonly detail: string | null;
  readonly icon: "sparkles" | "leaf" | "clock" | "users" | "shield" | "heart";
}

export interface SeoLandingTerritoryVM {
  readonly heading: string;
  readonly body: string | null;
  readonly address: string | null;
  readonly destinationName: string | null;
  readonly distanceLabel: string | null;
  readonly coordinates: string | null;
  readonly href: string | null;
  readonly media: SeoLandingMedia | null;
}

/** Áreas del cuerpo editorial cuyo orden es administrable desde el CMS. */
export type SeoLandingBodySection = "intro" | "offers" | "info" | "territory";

export interface SeoLandingSurfaceVM {
  readonly hero: SeoLandingHeroVM;
  readonly trust: readonly SeoLandingTrustItem[];
  readonly intro: { heading: string; blocks: readonly SeoLandingEditorialBlock[] } | null;
  readonly features: readonly SeoLandingFeatureItem[];
  readonly offers: { heading: string; items: readonly SeoLandingOfferItem[] } | null;
  readonly info: { heading: string; items: readonly SeoLandingInfoItem[] } | null;
  readonly territory: SeoLandingTerritoryVM | null;
  readonly gallery: readonly SeoLandingMedia[];
  readonly alux: { heading: string; body: string | null; ctaLabel: string } | null;
  /** Orden administrable de las áreas del cuerpo editorial. */
  readonly sections: readonly SeoLandingBodySection[];
}

type Cfg = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function rows(value: unknown): Cfg[] {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object") as Cfg[]) : [];
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface SeoLandingEditorialBlock {
  readonly kind: "heading" | "paragraph";
  readonly text: string;
}

/**
 * Convierte el texto fuente del CMS (con marcas Markdown residuales como
 * `## Título` o `**`) en bloques editoriales tipados: subtítulo o párrafo.
 * Ninguna marca cruda llega a la superficie pública.
 */
export function toEditorialParagraphs(body: string | null): SeoLandingEditorialBlock[] {
  if (!body) return [];
  return body
    .replace(/\r/g, "")
    .split(/\n{2,}|(?=#{1,6}\s)/g)
    .map((raw) => {
      const isHeading = /^#{1,6}\s/.test(raw.trim());
      const text = raw
        .replace(/^#{1,6}\s*/g, "")
        .replace(/\*\*/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return { kind: (isHeading ? "heading" : "paragraph") as "heading" | "paragraph", text };
    })
    .filter((block) => block.text.length > 0);
}

function slotIdOf(node: CompositionNode): string {
  const parts = node.id.split("-");
  return parts[parts.length - 1] ?? "";
}

function media(cfg: Cfg, urlKey = "mediaUrl", altKey = "mediaAlt"): SeoLandingMedia | null {
  const url = str(cfg[urlKey]);
  const alt = str(cfg[altKey]);
  if (!url || !alt) return null;
  return { url, alt, focal: str(cfg["mediaFocal"]) ?? str(cfg["focalPoint"]) };
}

/** Un slot puede ocultarse desde el CMS sin perder su contenido. */
function hidden(cfg: Cfg | null): boolean {
  return cfg?.["hidden"] === true || cfg?.["visible"] === false;
}

const TRUST_ICONS = ["award", "badge", "star", "pin", "info"] as const;
const FEATURE_ICONS = ["sparkles", "leaf", "clock", "users", "shield", "heart"] as const;
const INFO_ICONS = [
  "clock",
  "calendar",
  "backpack",
  "accessibility",
  "leaf",
  "ticket",
  "info",
] as const;

/** Construye el VM de la superficie a partir del árbol persistido. */
export function buildSeoLandingSurfaceVM(tree: CompositionTree): SeoLandingSurfaceVM | null {
  const bySlot = new Map<string, Cfg>();
  for (const node of tree.root.children ?? [])
    bySlot.set(slotIdOf(node), (node.config ?? {}) as Cfg);

  const get = (id: SeoLandingSlotId): Cfg | null => {
    const cfg = bySlot.get(id) ?? null;
    return cfg && !hidden(cfg) ? cfg : null;
  };

  const heroCfg = get("hero");
  const title = str(heroCfg?.["title"]);
  if (!heroCfg || !title) return null;

  const ctaCfg = get("ctaBar");
  const ctaActions = rows(ctaCfg?.["actions"]);
  const navigate = ctaActions.find((a) => a["action"] === "navigate" && str(a["href"]));
  const addToTrip = ctaActions.find((a) => a["action"] === "add-to-trip");
  const save = ctaActions.find((a) => a["action"] === "save");

  const hero: SeoLandingHeroVM = {
    title,
    eyebrow: str(heroCfg["eyebrow"]),
    typeLine: str(heroCfg["typeLine"]),
    promise: str(heroCfg["promise"]),
    description: str(heroCfg["description"]),
    media: media(heroCfg),
    mobileMedia: media(heroCfg, "mediaMobileUrl", "mediaMobileAlt"),
    primary:
      navigate && str(navigate["href"])
        ? { label: str(navigate["label"]) ?? "Ver ficha completa", href: str(navigate["href"])! }
        : null,
    secondaryLabel: addToTrip ? (str(addToTrip["label"]) ?? "Agregar a Mi Viaje") : null,
    saveLabel: save ? (str(save["label"]) ?? "Guardar") : null,
  };

  const trust: SeoLandingTrustItem[] = rows(get("badges")?.["items"])
    .filter((item) => item["hidden"] !== true && item["visible"] !== false)
    .map((item, i) => {
      const label = str(item["label"]);
      if (!label) return null;
      const iconRaw = str(item["icon"]);
      const icon = (TRUST_ICONS as readonly string[]).includes(iconRaw ?? "")
        ? (iconRaw as SeoLandingTrustItem["icon"])
        : "badge";
      const status = str(item["status"]) === "pending" ? "pending" : "verified";
      return {
        id: str(item["id"]) ?? `trust-${i}`,
        label,
        value: str(item["value"]),
        detail: str(item["detail"]),
        icon,
        status: status as SeoLandingTrustItem["status"],
      };
    })
    .filter((v): v is SeoLandingTrustItem => v !== null)
    .slice(0, 4);

  const introCfg = get("intro");
  const introParagraphs = toEditorialParagraphs(str(introCfg?.["body"]));
  const intro =
    introParagraphs.length > 0
      ? {
          heading: str(introCfg?.["title"]) ?? "Por qué es extraordinario",
          blocks: introParagraphs,
        }
      : null;

  const features: SeoLandingFeatureItem[] = rows(get("features")?.["items"])
    .filter((item) => item["hidden"] !== true && item["visible"] !== false)
    .map((item, i) => {
      const label = str(item["label"]) ?? str(item["title"]);
      if (!label) return null;
      const iconRaw = str(item["icon"]);
      const icon = (FEATURE_ICONS as readonly string[]).includes(iconRaw ?? "")
        ? (iconRaw as SeoLandingFeatureItem["icon"])
        : "sparkles";
      return {
        id: str(item["id"]) ?? `feature-${i}`,
        label,
        detail: str(item["detail"]) ?? str(item["description"]),
        icon,
      };
    })
    .filter((v): v is SeoLandingFeatureItem => v !== null)
    .slice(0, 4);

  const offersCfg = get("offers");
  const offerItems: SeoLandingOfferItem[] = rows(offersCfg?.["items"])
    .filter((item) => item["hidden"] !== true && item["visible"] !== false)
    .map((item, i): SeoLandingOfferItem | null => {
      const t = str(item["title"]);
      if (!t) return null;
      const rawTags = Array.isArray(item["tags"]) ? (item["tags"] as unknown[]) : [];
      return {
        id: str(item["id"]) ?? `offer-${i}`,
        title: t,
        subtitle: str(item["subtitle"]),
        href: str(item["href"]),
        media: media(item, "imageUrl", "imageAlt"),
        tags: rawTags.map((x) => str(x)).filter((x): x is string => x !== null),
      };
    })
    .filter((v): v is SeoLandingOfferItem => v !== null);

  const offers =
    offerItems.length > 0
      ? { heading: str(offersCfg?.["heading"]) ?? "Experiencias destacadas", items: offerItems }
      : null;

  const infoCfg = get("infoGrid");
  const infoItems: SeoLandingInfoItem[] = rows(infoCfg?.["items"])
    .filter((item) => item["hidden"] !== true && item["visible"] !== false)
    .map((item, i) => {
      const label = str(item["label"]);
      const value = str(item["value"]);
      const iconRaw = str(item["icon"]);
      const icon = (INFO_ICONS as readonly string[]).includes(iconRaw ?? "")
        ? (iconRaw as SeoLandingInfoIcon)
        : "info";
      return label && value ? { id: str(item["id"]) ?? `info-${i}`, label, value, icon } : null;
    })
    .filter((v): v is SeoLandingInfoItem => v !== null);
  const info =
    infoItems.length > 0
      ? { heading: str(infoCfg?.["heading"]) ?? "Información para tu visita", items: infoItems }
      : null;

  const mapCfg = get("map");
  const territoryBody = str(mapCfg?.["body"]);
  const territoryAddress = str(mapCfg?.["address"]);
  const territoryHref = str(mapCfg?.["href"]);
  const lat = num(mapCfg?.["latitude"]);
  const lng = num(mapCfg?.["longitude"]);
  const territory =
    territoryBody || territoryAddress || territoryHref
      ? {
          heading: str(mapCfg?.["heading"]) ?? "Contexto territorial",
          body: territoryBody,
          address: territoryAddress,
          destinationName: str(mapCfg?.["destinationName"]),
          distanceLabel: str(mapCfg?.["distanceLabel"]),
          coordinates: lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : null,
          href: territoryHref,
          media: media(mapCfg ?? {}),
        }
      : null;

  const gallery: SeoLandingMedia[] = rows(get("gallery")?.["items"])
    .map((item) => {
      const url = str(item["url"]);
      const alt = str(item["alt"]);
      return url && alt ? { url, alt, focal: str(item["focal"]) } : null;
    })
    .filter((v): v is SeoLandingMedia => v !== null);

  const aluxCfg = get("aluxPlanner");
  const aluxHeading = str(aluxCfg?.["heading"]);
  const alux = aluxHeading
    ? {
        heading: aluxHeading,
        body: str(aluxCfg?.["body"]),
        ctaLabel: str(aluxCfg?.["ctaLabel"]) ?? "Planear mi ruta con Alux",
      }
    : null;

  // Orden administrable: cada slot puede declarar `order` desde el CMS.
  const present: { key: SeoLandingBodySection; order: number; on: boolean }[] = [
    {
      key: "intro",
      order: num(introCfg?.["order"]) ?? 1,
      on: Boolean(intro) || features.length > 0,
    },
    { key: "offers", order: num(offersCfg?.["order"]) ?? 2, on: Boolean(offers) },
    { key: "info", order: num(infoCfg?.["order"]) ?? 3, on: Boolean(info) },
    { key: "territory", order: num(mapCfg?.["order"]) ?? 4, on: Boolean(territory) },
  ];
  const sections = present
    .filter((s) => s.on)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.key);

  return { hero, trust, intro, features, offers, info, territory, gallery, alux, sections };
}
