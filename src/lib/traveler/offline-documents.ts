/**
 * Documentos del viaje disponibles sin conexión — CV6 · "Documentos Offline del Día"
 *
 * Guarda en el propio dispositivo una copia mínima del voucher y el recibo del
 * viaje vigente, para que el viajero pueda mostrarlos en destino aunque no
 * tenga señal.
 *
 * Reglas de seguridad (Security Before Offline):
 * - Nunca se guarda en el Service Worker ni en cachés compartidas: las rutas
 *   bajo `/cuenta` siguen siendo `NetworkOnly`. Esta copia vive sólo en el
 *   `localStorage` del dispositivo del viajero.
 * - Sólo se guardan datos ya visibles en el propio documento: folio, título,
 *   destino, fecha de confirmación, conceptos e importes. Nunca datos de
 *   contacto, identificadores de pago ni información de terceros.
 * - Caduca sola a los 45 días y sólo se conserva la copia de un viaje.
 *
 * Cero infraestructura nueva: no hay tablas, RPCs ni server functions.
 */

const PREFIX = "vll:trip-docs:v1:";
const TTL_MS = 45 * 24 * 60 * 60 * 1000;

export interface OfflineDocumentItem {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_amount: number;
  subtotal_amount: number;
  currency: string;
}

export interface OfflineDocumentSnapshot {
  order_id: string;
  folio: string;
  paid_at: string | null;
  editorial_title: string | null;
  editorial_summary: string | null;
  destination_name: string | null;
  currency: string;
  total_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  items: OfflineDocumentItem[];
  /** Momento en que se guardó la copia local (ISO). */
  saved_at: string;
}

type OrderLike = {
  id: string;
  folio: string;
  paid_at: string | null;
  editorial_title: string | null;
  editorial_summary: string | null;
  destination_name: string | null;
  currency: string;
  total_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    quantity: number;
    unit_amount: number;
    subtotal_amount: number;
    currency: string;
  }>;
};

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isFresh(snapshot: OfflineDocumentSnapshot): boolean {
  const savedAt = Date.parse(snapshot.saved_at);
  if (Number.isNaN(savedAt)) return false;
  return Date.now() - savedAt < TTL_MS;
}

/** Elimina copias de otros viajes y las caducadas. */
function prune(keepOrderId: string) {
  const store = storage();
  if (!store) return;
  const stale: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    if (key !== `${PREFIX}${keepOrderId}`) {
      stale.push(key);
      continue;
    }
    try {
      const parsed = JSON.parse(store.getItem(key) ?? "null") as OfflineDocumentSnapshot | null;
      if (!parsed || !isFresh(parsed)) stale.push(key);
    } catch {
      stale.push(key);
    }
  }
  for (const key of stale) {
    try {
      store.removeItem(key);
    } catch {
      /* almacenamiento lleno o bloqueado: se ignora */
    }
  }
}

export function saveOfflineDocuments(order: OrderLike): OfflineDocumentSnapshot | null {
  const store = storage();
  if (!store) return null;
  const snapshot: OfflineDocumentSnapshot = {
    order_id: order.id,
    folio: order.folio,
    paid_at: order.paid_at,
    editorial_title: order.editorial_title,
    editorial_summary: order.editorial_summary,
    destination_name: order.destination_name,
    currency: order.currency,
    total_amount: order.total_amount,
    subtotal_amount: order.subtotal_amount,
    discount_amount: order.discount_amount,
    tax_amount: order.tax_amount,
    items: order.items.map((it) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      quantity: it.quantity,
      unit_amount: it.unit_amount,
      subtotal_amount: it.subtotal_amount,
      currency: it.currency,
    })),
    saved_at: new Date().toISOString(),
  };
  try {
    store.setItem(`${PREFIX}${order.id}`, JSON.stringify(snapshot));
  } catch {
    return null;
  }
  prune(order.id);
  return snapshot;
}

export function readOfflineDocuments(orderId: string): OfflineDocumentSnapshot | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(`${PREFIX}${orderId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineDocumentSnapshot;
    if (!parsed || parsed.order_id !== orderId || !isFresh(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOfflineDocuments(orderId: string) {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(`${PREFIX}${orderId}`);
  } catch {
    /* ignorado */
  }
}

/** Texto del código QR del voucher: identifica el folio, sin datos personales. */
export function tripQrPayload(folio: string): string {
  return `VMX:${folio}`;
}
