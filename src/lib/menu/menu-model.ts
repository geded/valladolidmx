/**
 * Carta de restaurantes y cafeterías — modelo puro compartido por el CMS, el
 * Portal de la empresa, la lectura de fotos/PDF y Alux.
 *
 * Regla de venta: los platillos nunca se venden en línea; el precio es sólo de
 * referencia y Alux lo presenta así (ver `mem://constraints/direct-sale-experiences-only.md`).
 */
import { normalizeText } from "@/lib/alux/converse-contract";

export const MENU_MAX_ITEMS = 400;
export const MENU_FILE_MAX_BYTES = 8 * 1024 * 1024;
export const MENU_FILE_MAX_COUNT = 6;
export const MENU_DEFAULT_SECTION = "Carta";

/** Etiquetas oficiales: valor guardado → nombre que ven editores y visitantes. */
export const MENU_TAGS = {
  vegano: "Vegano",
  vegetariano: "Vegetariano",
  "sin-gluten": "Sin gluten",
  picante: "Picante",
  "de-la-casa": "De la casa",
  "mas-pedido": "El más pedido",
  "cocina-yucateca": "Cocina yucateca",
  "sin-alcohol": "Sin alcohol",
} as const;
export type MenuTag = keyof typeof MENU_TAGS;
export const MENU_TAG_KEYS = Object.keys(MENU_TAGS) as MenuTag[];

export interface MenuItemInput {
  id?: string | null;
  section: string;
  name: string;
  description?: string | null;
  priceAmount?: number | null;
  priceCurrency?: "MXN" | "USD";
  tags?: string[];
  isAvailable?: boolean;
}

export interface MenuItem {
  id: string | null;
  section: string;
  name: string;
  description: string | null;
  priceAmount: number | null;
  priceCurrency: "MXN" | "USD";
  tags: MenuTag[];
  isAvailable: boolean;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number" ? value : Number(String(value).replace(/[^\d.,]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Normaliza una lista (del editor o leída de la carta): sin vacíos, sin duplicados, con tope. */
export function normalizeMenuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: MenuItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = clean(r["name"], 120);
    if (!name) continue;
    const rawSection = clean(r["section"], 80) || MENU_DEFAULT_SECTION;
    /* Cartas en MAYÚSCULAS («BEBIDAS FRÍAS») se guardan como «Bebidas frías». */
    const section =
      rawSection === rawSection.toUpperCase() && /\p{L}{2}/u.test(rawSection)
        ? rawSection.charAt(0) + rawSection.slice(1).toLocaleLowerCase("es-MX")
        : rawSection;
    const key = `${normalizeText(section)}|${normalizeText(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = Array.isArray(r["tags"])
      ? Array.from(
          new Set(
            (r["tags"] as unknown[]).filter(
              (t): t is MenuTag => typeof t === "string" && t in MENU_TAGS,
            ),
          ),
        )
      : [];
    const currency = r["priceCurrency"] === "USD" ? "USD" : "MXN";
    const id = typeof r["id"] === "string" && r["id"].length >= 8 ? r["id"] : null;
    out.push({
      id,
      section,
      name,
      description: clean(r["description"], 280) || null,
      priceAmount: cleanPrice(r["priceAmount"]),
      priceCurrency: currency,
      tags,
      isAvailable: r["isAvailable"] !== false,
    });
    if (out.length >= MENU_MAX_ITEMS) break;
  }
  return out;
}

/** Agrupa por sección conservando el orden de aparición. */
export function groupMenuBySection(items: readonly MenuItem[]): { section: string; items: MenuItem[] }[] {
  const groups: { section: string; items: MenuItem[] }[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.section === item.section);
    if (!group) {
      group = { section: item.section, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/** Une la carta leída con la actual: lo nuevo se agrega, lo repetido actualiza precio/descripcion. */
export function mergeMenuItems(current: readonly MenuItem[], incoming: readonly MenuItem[]): MenuItem[] {
  const out = current.map((i) => ({ ...i }));
  const sectionName = new Map(out.map((i) => [normalizeText(i.section), i.section]));
  for (const raw of incoming) {
    const item = { ...raw, section: sectionName.get(normalizeText(raw.section)) ?? raw.section };
    const match = out.find(
      (c) => normalizeText(c.name) === normalizeText(item.name) && normalizeText(c.section) === normalizeText(item.section),
    );
    if (match) {
      if (item.priceAmount !== null) match.priceAmount = item.priceAmount;
      if (item.description) match.description = item.description;
      match.tags = Array.from(new Set([...match.tags, ...item.tags]));
    } else out.push({ ...item, id: null });
  }
  return normalizeMenuItems(out);
}

export function formatMenuPrice(item: Pick<MenuItem, "priceAmount" | "priceCurrency">): string | null {
  if (item.priceAmount === null) return null;
  const n = Number.isInteger(item.priceAmount) ? String(item.priceAmount) : item.priceAmount.toFixed(2);
  return `$${n} ${item.priceCurrency}`;
}

/** Texto con el que Alux encuentra el negocio por lo que trae su carta. */
export function menuSearchText(items: readonly Pick<MenuItem, "section" | "name" | "description" | "tags">[]): string {
  const parts: string[] = [];
  for (const i of items) {
    parts.push(i.section, i.name, i.description ?? "", ...i.tags.map((t) => MENU_TAGS[t] ?? t));
  }
  return parts.join(" ").slice(0, 4000);
}

/**
 * Hechos de la carta para Alux: primero los platillos que coinciden con la
 * pregunta, siempre con precio marcado como referencia (no se vende en línea).
 */
export function menuFactsFor(
  items: readonly MenuItem[],
  terms: readonly string[],
  max = 4,
): string[] {
  /* Una sola línea: el chat público lee pocos datos por opción. */
  if (items.length === 0) return [];
  const scored = items.map((item, index) => {
    const hay = normalizeText(
      [item.name, item.description ?? "", item.section, ...item.tags.map((t) => MENU_TAGS[t])].join(" "),
    );
    const hits = terms.reduce((sum, t) => sum + (hay.includes(t) ? 1 : 0), 0);
    return { item, index, hits };
  });
  const matching = scored.filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits || a.index - b.index);
  const facts: string[] = [];
  const describe = (item: MenuItem) => {
    const price = formatMenuPrice(item);
    const tags = item.tags.length ? ` (${item.tags.map((t) => MENU_TAGS[t]).join(", ")})` : "";
    return `${item.name}${tags}${price ? ` · ${price}` : ""}`;
  };
  const note = " (precios de referencia; los platillos no se venden en línea)";
  if (matching.length) {
    facts.push(`En su carta: ${matching.slice(0, max).map((s) => describe(s.item)).join("; ")}${note}`);
  } else {
    const sections = groupMenuBySection(items).map((g) => g.section);
    facts.push(
      `Carta con ${items.length} opciones (${sections.slice(0, 5).join(", ")}); por ejemplo: ${items
        .slice(0, 3)
        .map(describe)
        .join("; ")}${note}`,
    );
  }
  return facts;
}
