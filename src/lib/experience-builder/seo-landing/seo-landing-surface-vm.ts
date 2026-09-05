/**
 * LOTE 3I.1 · Corrección de rumbo — View-Model puro de la superficie
 * `premium-seo-landing`.
 *
 * Traduce la composición de 18 slots a las CUATRO regiones narrativas de la
 * maqueta autorizada (Zazil Tunich):
 *   1 · Hero editorial con imagen
 *   2 · Franja de confianza
 *   3 * Cuerpo editorial en columnas
 *   4 · Banda Alux de cierre
 *
 * Módulo PURO (sin React, sin red): un slot sin dato real no produce región.
 */
import type { CompositionNode, CompositionTree } from "../composition-tree";
import type { SeoLandingSlotId } from "./seo-landing-template";

export interface SeoLandingMedia {
  readonly url: string;
  readonly alt: string;
}

export interface SeoLandingHeroVM {
  readonly title: string;
  readonly eyebrow: string | null;
  readonly description: string | null;
  readonly media: SeoLandingMedia | null;
  readonly primary: { label: string; href: string } | null;
  readonly secondaryLabel: string | null;
}

export interface SeoLandingTrustItem {
  readonly id: string;
  readonly label: string;
  readonly detail: string | null;
  readonly icon: "award" | "badge" | "star" | "pin" | "info";
}

export interface SeoLandingOfferItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly href: string | null;
  readonly media: SeoLandingMedia | null;
  readonly tags: readonly string[];
}

export interface SeoLandingInfoItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface SeoLandingTerritoryVM {
  readonly heading: string;
  readonly body: string | null;
  readonly address: string | null;
  readonly destinationName: string | null;
  readonly href: string | null;
  readonly media: SeoLandingMedia | null;
}

export interface SeoLandingSurfaceVM {
  readonly hero: SeoLandingHeroVM;
  readonly trust: readonly SeoLandingTrustItem[];
  readonly intro: { heading: string; paragraphs: readonly string[] } | null;
  readonly features: readonly { id: string; label: string }[];
  readonly offers: { heading: string; items: readonly SeoLandingOfferItem[] } | null;
  readonly info: { heading: string; items: readonly SeoLandingInfoItem[] } | null;
  readonly territory: SeoLandingTerritoryVM | null;
  readonly gallery: readonly SeoLandingMedia[];
  readonly alux: { heading: string; body: string | null; ctaLabel: string } | null;
}

type Cfg = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function rows(value: unknown): Cfg[] {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object") as Cfg[]) : [];
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
  return url && alt ? { url, alt } : null;
}

/** Construye el VM de la superficie a partir del árbol persistido. */
export function buildSeoLandingSurfaceVM(tree: CompositionTree): SeoLandingSurfaceVM | null {
  const bySlot = new Map<string, Cfg>();
  for (const node of tree.root.children ?? [])
    bySlot.set(slotIdOf(node), (node.config ?? {}) as Cfg);

  const get = (id: SeoLandingSlotId): Cfg | null => bySlot.get(id) ?? null;

  const heroCfg = get("hero");
  const title = str(heroCfg?.["title"]);
  if (!heroCfg || !title) return null;

  const ctaCfg = get("ctaBar");
  const ctaActions = rows(ctaCfg?.["actions"]);
  const navigate = ctaActions.find((a) => a["action"] === "navigate" && str(a["href"]));
  const addToTrip = ctaActions.find((a) => a["action"] === "add-to-trip");

  const hero: SeoLandingHeroVM = {
    title,
    eyebrow: str(heroCfg["eyebrow"]),
    description: str(heroCfg["description"]),
    media: media(heroCfg),
    primary:
      navigate && str(navigate["href"])
        ? { label: str(navigate["label"]) ?? "Ver ficha completa", href: str(navigate["href"])! }
        : null,
    secondaryLabel: addToTrip ? (str(addToTrip["label"]) ?? "Agregar a Mi Viaje") : null,
  };

  const trust: SeoLandingTrustItem[] = rows(get("badges")?.["items"])
    .map((item, i) => {
      const label = str(item["label"]);
      if (!label) return null;
      const iconRaw = str(item["icon"]);
      const icon: SeoLandingTrustItem["icon"] =
        iconRaw === "award" ||
        iconRaw === "badge" ||
        iconRaw === "star" ||
        iconRaw === "pin" ||
        iconRaw === "info"
          ? iconRaw
          : "badge";
      return { id: str(item["id"]) ?? `trust-${i}`, label, detail: str(item["detail"]), icon };
    })
    .filter((v): v is SeoLandingTrustItem => v !== null);

  const introCfg = get("intro");
  const introParagraphs = toEditorialParagraphs(str(introCfg?.["body"]));
  const intro =
    introParagraphs.length > 0
      ? {
          heading: str(introCfg?.["title"]) ?? "Por qué es extraordinario",
          paragraphs: introParagraphs,
        }
      : null;

  const features = rows(get("features")?.["items"])
    .map((item, i) => {
      const label = str(item["label"]) ?? str(item["title"]);
      return label ? { id: str(item["id"]) ?? `feature-${i}`, label } : null;
    })
    .filter((v): v is { id: string; label: string } => v !== null);

  const offersCfg = get("offers");
  const offerItems: SeoLandingOfferItem[] = rows(offersCfg?.["items"])
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
    .map((item, i) => {
      const label = str(item["label"]);
      const value = str(item["value"]);
      return label && value ? { id: str(item["id"]) ?? `info-${i}`, label, value } : null;
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
  const territory =
    territoryBody || territoryAddress || territoryHref
      ? {
          heading: str(mapCfg?.["heading"]) ?? "Contexto territorial",
          body: territoryBody,
          address: territoryAddress,
          destinationName: str(mapCfg?.["destinationName"]),
          href: territoryHref,
          media: media(mapCfg ?? {}),
        }
      : null;

  const gallery: SeoLandingMedia[] = rows(get("gallery")?.["items"])
    .map((item) => {
      const url = str(item["url"]);
      const alt = str(item["alt"]);
      return url && alt ? { url, alt } : null;
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

  return { hero, trust, intro, features, offers, info, territory, gallery, alux };
}
