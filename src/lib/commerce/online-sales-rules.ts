/**
 * Ventas en línea por empresa · reglas puras (fase 1 de la propuesta
 * «Ventas en línea por empresa»).
 *
 * Una sola regla para página, Alux y WhatsApp:
 *  - Las experiencias se venden como siempre (sin interruptor).
 *  - Tienda, pedidos para recoger, reservas de hotel y salidas con fecha
 *    (tours, eventos, traslados, servicios) sólo se venden si Administración
 *    activó «Ventas en línea» en la empresa con ese modo y ese canal.
 * La base de datos aplica la misma regla en `business_online_sale_allows`.
 */

export const ONLINE_SALES_MODES = ["tienda", "pedidos", "reservas", "salidas", "mesas"] as const;
export type OnlineSalesMode = (typeof ONLINE_SALES_MODES)[number];

export const ONLINE_SALES_CHANNELS = ["pagina", "alux_pagina", "whatsapp"] as const;
export type OnlineSalesChannel = (typeof ONLINE_SALES_CHANNELS)[number];

/** Opciones previstas; en el piloto sólo la primera de cada lista está activa. */
export const ONLINE_SALES_DELIVERY = ["recoger", "envio"] as const;
export const ONLINE_SALES_BOOKING = ["confirmacion", "inmediata"] as const;
export const ONLINE_SALES_CALENDAR = ["manual", "ical"] as const;
export const PILOT_DELIVERY = ["recoger"] as const;
export const PILOT_BOOKING = ["confirmacion"] as const;
export const PILOT_CALENDAR = ["manual"] as const;

export const ONLINE_SALES_MODE_LABEL: Record<OnlineSalesMode, { title: string; hint: string }> = {
  tienda: { title: "Tienda", hint: "Artesanías, ropa, café en grano, recuerdos. Productos con piezas." },
  pedidos: { title: "Pedidos para recoger", hint: "Cafeterías y restaurantes: se paga en línea y se recoge en el local." },
  reservas: { title: "Reservas por fecha", hint: "Hoteles y casas de vacaciones, con confirmación del hotel." },
  salidas: { title: "Tours, eventos y servicios con fecha", hint: "Tours, eventos, traslados y guías con fecha y hora." },
  mesas: { title: "Reservar mesa", hint: "Restaurantes y cafeterías: el cliente aparta mesa por fecha, hora y personas. Gratis." },
};

export const ONLINE_SALES_CHANNEL_LABEL: Record<OnlineSalesChannel, string> = {
  pagina: "Botón «Comprar» o «Reservar» en su página",
  alux_pagina: "Alux en su página",
  whatsapp: "WhatsApp de Alux de la empresa",
};

/** Forma de venta de cada tipo de producto. `experiencias` no necesita interruptor. */
export function onlineSaleModeFor(productType: string | null | undefined): OnlineSalesMode | "experiencias" | null {
  switch (productType) {
    case "experiencia":
      return "experiencias";
    case "artesanal":
      return "tienda";
    case "restaurante":
      return "pedidos";
    case "hotel":
      return "reservas";
    case "tour":
    case "evento":
    case "servicio":
    case "transporte":
      return "salidas";
    default:
      return null;
  }
}

export interface BusinessOnlineSales {
  readonly enabled: boolean;
  readonly modes: readonly string[];
  readonly channels: readonly string[];
}

/**
 * `true` si la empresa puede vender en línea ese tipo de producto por ese canal.
 * Sin canal, basta con que el modo esté activo (lo usa el cobro).
 */
export function businessAllowsOnlineSale(
  settings: BusinessOnlineSales | null | undefined,
  productType: string | null | undefined,
  channel?: OnlineSalesChannel,
): boolean {
  const mode = onlineSaleModeFor(productType);
  if (mode === "experiencias") return true;
  if (!mode || !settings || settings.enabled !== true) return false;
  if (!settings.modes.includes(mode)) return false;
  return channel ? settings.channels.includes(channel) : true;
}

/** Limpia lo que llega del formulario: sólo valores conocidos, sin repetir. */
export function normalizeOnlineSalesInput(input: {
  enabled: boolean;
  modes: readonly string[];
  channels: readonly string[];
}): { enabled: boolean; modes: OnlineSalesMode[]; channels: OnlineSalesChannel[] } {
  const modes = ONLINE_SALES_MODES.filter((m) => input.modes.includes(m));
  const channels = ONLINE_SALES_CHANNELS.filter((c) => input.channels.includes(c));
  return { enabled: input.enabled && modes.length > 0 && channels.length > 0, modes, channels };
}

/* ───────────────────────────── Comisión por tipo ───────────────────────────── */

/** Comisión distinta por tipo de venta: tienda, pedidos y hoteles. */
export const COMMISSION_MODES = ["tienda", "pedidos", "reservas"] as const;
export type CommissionMode = (typeof COMMISSION_MODES)[number];
export type CommissionByMode = Record<CommissionMode, number>;

export const ONLINE_SALES_COMMISSION_SETTING_KEY = "commerce.online_sales.commission_bps";
/** Comisión inicial de tienda, pedidos y hoteles (15 %); Administración la cambia. */
export const DEFAULT_COMMISSION_BPS = 1500;

export function normalizeCommissionByMode(value: unknown): CommissionByMode {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out = {} as CommissionByMode;
  for (const mode of COMMISSION_MODES) {
    const n = Number(raw[mode]);
    out[mode] = Number.isInteger(n) && n >= 0 && n <= 10000 ? n : DEFAULT_COMMISSION_BPS;
  }
  return out;
}

/**
 * Comisión sugerida al autorizar un producto. Experiencias y salidas con fecha
 * conservan la comisión por producto de siempre (devuelve `null`).
 */
export function commissionBpsForProduct(
  productType: string | null | undefined,
  table: CommissionByMode,
): number | null {
  const mode = onlineSaleModeFor(productType);
  if (mode === "tienda" || mode === "pedidos" || mode === "reservas") return table[mode];
  return null;
}
