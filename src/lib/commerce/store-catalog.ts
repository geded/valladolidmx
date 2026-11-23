/**
 * Ventas en línea · fase 2 (tienda y pedidos para recoger) — reglas puras.
 *
 *  - Hoja de productos de tienda: una línea por producto «nombre, precio, piezas».
 *  - Pedido desde la carta: líneas con cantidad y total del pedido.
 *  - Piezas disponibles: cuántas se pueden pedir de un producto de tienda.
 */

export interface StoreSheetRow {
  name: string;
  /** Precio en pesos (MXN). */
  price: number;
  /** Piezas disponibles; `null` = sin límite. */
  stock: number | null;
  description: string | null;
}

export interface StoreSheetResult {
  rows: StoreSheetRow[];
  /** Líneas que no se entendieron, con su número (1 = primera línea). */
  problems: { line: number; text: string }[];
}

const MAX_ROWS = 200;

function parseMoney(raw: string): number | null {
  const clean = raw.replace(/[$\s]|MXN|mxn/g, "");
  if (!clean) return null;
  // «1,250.50» o «1250,50» o «1.250»
  let normalized = clean;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(clean)) normalized = clean.replace(/,/g, "");
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)) normalized = clean.replace(/\./g, "").replace(",", ".");
  else if (/^\d+,\d{1,2}$/.test(clean)) normalized = clean.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  // Coma como separador, pero respetando precios con miles «1,250».
  const parts = line.split(",");
  const out: string[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (prev !== undefined && /^\s*\$?\d{1,3}$/.test(prev) && /^\d{3}(\.\d+)?\s*$/.test(part)) {
      out[out.length - 1] = `${prev},${part}`;
    } else out.push(part);
  }
  return out;
}

/** Lee lo que se pega de una hoja de cálculo (Excel, Google Sheets o texto). */
export function parseStoreSheet(text: string): StoreSheetResult {
  const rows: StoreSheetRow[] = [];
  const problems: StoreSheetResult["problems"] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const cells = splitLine(line).map((c) => c.trim());
    const [name = "", priceRaw = "", stockRaw = "", ...rest] = cells;
    if (index === 0 && /nombre|producto/i.test(name) && !parseMoney(priceRaw)) return; // encabezado
    const price = parseMoney(priceRaw);
    if (!name || price === null) {
      problems.push({ line: index + 1, text: line.slice(0, 120) });
      return;
    }
    let stock: number | null = null;
    if (stockRaw) {
      const s = Number(stockRaw.replace(/\s|piezas?|pzas?/gi, ""));
      if (!Number.isInteger(s) || s < 0) {
        problems.push({ line: index + 1, text: line.slice(0, 120) });
        return;
      }
      stock = s;
    }
    if (rows.length >= MAX_ROWS) return;
    rows.push({ name: name.slice(0, 200), price, stock, description: rest.join(", ").trim() || null });
  });
  return { rows, problems };
}

/* ───────────────────────── Pedido desde la carta ───────────────────────── */

export const MENU_ORDER_MAX_PER_ITEM = 20;
export const MENU_ORDER_MAX_LINES = 40;

export interface MenuOrderable {
  id: string;
  name: string;
  /** Precio en pesos; sin precio no se puede pedir. */
  price: number | null;
  /** Pertenece a una sección de extras (leches, toppings…): nunca va sola. */
  extra?: boolean;
}

/**
 * Secciones de extras de la carta: «Extras», «Adicionales», «Complementos»,
 * «Toppings», «Agregados», «Add-ons». Misma regla que la función SQL
 * `menu_section_is_extra`.
 */
export function isMenuExtraSection(section: string | null | undefined): boolean {
  if (!section) return false;
  const clean = section
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /^(extras?|adicionales?|complementos?|toppings?|agregados?|add-?ons?)([^a-z]|$)/.test(clean);
}

/** ¿El pedido ya tiene al menos una bebida o platillo que no sea extra? */
export function menuOrderHasMainItem(
  cart: Readonly<Record<string, number>>,
  items: readonly MenuOrderable[],
): boolean {
  const byId = new Map(items.map((i) => [i.id, i]));
  return Object.entries(cart).some(([id, q]) => {
    const item = byId.get(id);
    return q > 0 && !!item && !item.extra && isMenuItemOrderable(item);
  });
}

/**
 * Cambia la cantidad aplicando la regla de extras: un extra sólo se agrega
 * con una bebida o platillo en el pedido, y al quitar la última bebida los
 * extras se quitan con ella.
 */
export function updateMenuOrder(
  cart: Readonly<Record<string, number>>,
  items: readonly MenuOrderable[],
  itemId: string,
  quantity: number,
): Record<string, number> {
  const item = items.find((i) => i.id === itemId);
  const current = cart[itemId] ?? 0;
  if (item?.extra && quantity > current && !menuOrderHasMainItem(cart, items)) return { ...cart };
  const next = setMenuOrderQuantity(cart, itemId, quantity);
  if (menuOrderHasMainItem(next, items)) return next;
  const extras = new Set(items.filter((i) => i.extra).map((i) => i.id));
  for (const id of Object.keys(next)) if (extras.has(id)) delete next[id];
  return next;
}

/** Sólo se pide lo que tiene identidad y precio publicado. */
export function isMenuItemOrderable(item: { id?: string | null; price?: number | null }): boolean {
  return Boolean(item.id) && typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0;
}

/** Cambia la cantidad de una línea respetando los límites; 0 la quita. */
export function setMenuOrderQuantity(
  cart: Readonly<Record<string, number>>,
  itemId: string,
  quantity: number,
): Record<string, number> {
  const next = { ...cart };
  const q = Math.max(0, Math.min(MENU_ORDER_MAX_PER_ITEM, Math.floor(quantity)));
  if (q === 0) {
    delete next[itemId];
    return next;
  }
  if (!(itemId in next) && Object.keys(next).length >= MENU_ORDER_MAX_LINES) return next;
  next[itemId] = q;
  return next;
}

export interface MenuOrderSummary {
  lines: { id: string; name: string; quantity: number; subtotal: number }[];
  pieces: number;
  /** Total en pesos. */
  total: number;
}

export function summarizeMenuOrder(
  cart: Readonly<Record<string, number>>,
  items: readonly MenuOrderable[],
): MenuOrderSummary {
  const byId = new Map(items.map((i) => [i.id, i]));
  const lines: MenuOrderSummary["lines"] = [];
  for (const [id, quantity] of Object.entries(cart)) {
    const item = byId.get(id);
    if (!item || !isMenuItemOrderable(item) || quantity < 1) continue;
    lines.push({ id, name: item.name, quantity, subtotal: Math.round((item.price as number) * quantity * 100) / 100 });
  }
  return {
    lines,
    pieces: lines.reduce((s, l) => s + l.quantity, 0),
    total: Math.round(lines.reduce((s, l) => s + l.subtotal, 0) * 100) / 100,
  };
}

/** Extras y nota elegidos para una bebida o platillo (aplican a cada unidad). */
export interface MenuLineCustom {
  extras: string[];
  note: string;
}

export const MENU_ORDER_NOTE_MAX = 140;

export interface MenuOrderLine {
  menuItemId: string;
  quantity: number;
  name: string;
  subtotal: number;
  note?: string;
  /** Extra ligado: la bebida o platillo al que acompaña. */
  forItemId?: string;
  forName?: string;
}

export function cleanMenuNote(note: string | null | undefined): string {
  return (note ?? "").replace(/\s+/g, " ").trim().slice(0, MENU_ORDER_NOTE_MAX);
}

/**
 * Líneas finales del pedido: cada bebida con su nota, sus extras ligados
 * (una unidad del extra por cada bebida) y los extras sueltos. Si no queda
 * ninguna bebida o platillo, no hay pedido.
 */
export function buildMenuOrderLines(
  cart: Readonly<Record<string, number>>,
  custom: Readonly<Record<string, MenuLineCustom>>,
  items: readonly MenuOrderable[],
): { lines: MenuOrderLine[]; pieces: number; total: number } {
  const byId = new Map(items.map((i) => [i.id, i]));
  const lines: MenuOrderLine[] = [];
  const money = (n: number) => Math.round(n * 100) / 100;
  for (const [id, quantity] of Object.entries(cart)) {
    const item = byId.get(id);
    if (!item || !isMenuItemOrderable(item) || quantity < 1) continue;
    const price = item.price as number;
    if (item.extra) {
      lines.push({ menuItemId: id, quantity, name: item.name, subtotal: money(price * quantity) });
      continue;
    }
    const c = custom[id];
    const note = cleanMenuNote(c?.note);
    lines.push({
      menuItemId: id,
      quantity,
      name: item.name,
      subtotal: money(price * quantity),
      ...(note ? { note } : {}),
    });
    for (const extraId of new Set(c?.extras ?? [])) {
      const extra = byId.get(extraId);
      if (!extra?.extra || !isMenuItemOrderable(extra)) continue;
      lines.push({
        menuItemId: extraId,
        quantity,
        name: extra.name,
        subtotal: money((extra.price as number) * quantity),
        forItemId: id,
        forName: item.name,
      });
    }
  }
  if (!lines.some((l) => !byId.get(l.menuItemId)?.extra)) return { lines: [], pieces: 0, total: 0 };
  return {
    lines: lines.slice(0, MENU_ORDER_MAX_LINES),
    // «productos» cuenta bebidas y platillos; los extras van dentro del total.
    pieces: lines.filter((l) => !byId.get(l.menuItemId)?.extra).reduce((s, l) => s + l.quantity, 0),
    total: money(lines.reduce((s, l) => s + l.subtotal, 0)),
  };
}

/* ───────────────────────── Piezas de tienda ───────────────────────── */

/** Máximo que se puede pedir: el menor entre piezas, tope por compra y 20. */
export function maxPurchasable(stock: number | null, maxQuantity: number | null): number {
  const caps = [20];
  if (stock !== null) caps.push(Math.max(0, stock));
  if (maxQuantity !== null && maxQuantity > 0) caps.push(maxQuantity);
  return Math.min(...caps);
}
