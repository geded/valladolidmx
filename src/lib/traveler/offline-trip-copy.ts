/**
 * Copia de Mi Viaje sin señal — itinerario, expediente del concierge,
 * reservas y documentos del viajero registrado.
 *
 * Solicitud Founder (2026-11-21): «El viajero debe ver su itinerario ya una
 * vez que se le armó su viaje por un concierge», con la opción autorizada
 * «Copia con documentos».
 *
 * Cómo funciona:
 * - Con señal, cada lectura de Mi Viaje que llega bien se guarda en el
 *   `localStorage` del propio teléfono, asociada a la cuenta que la leyó.
 * - Sin señal (o si la lectura falla por red), Mi Viaje recibe esa copia y
 *   se ve igual que la última vez. Con señal vuelve a leerse en segundos.
 * - Sólo lectura: no se guardan cambios hechos sin señal.
 *
 * Reglas de seguridad:
 * - Una sola cuenta por teléfono: si entra otra cuenta, la copia anterior se
 *   borra. Al cerrar sesión se borra completa.
 * - Nunca se guardan identificadores de pago, tarjetas, tokens ni secretos.
 * - Caduca sola a los 45 días, igual que los documentos sin señal.
 * - Vive sólo en el teléfono: nunca en cachés compartidas del sitio.
 */
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const OFFLINE_TRIP_COPY_KEY = "vmx.trip.offline-copy.v1";
export const OFFLINE_TRIP_COPY_TTL_MS = 45 * 24 * 60 * 60 * 1000;
/** Límite de tamaño de la copia: protege el espacio del teléfono. */
const MAX_BYTES = 1_500_000;

interface StoredEntry {
  key: QueryKey;
  data: unknown;
  updatedAt: number;
}

export interface OfflineTripCopy {
  userId: string;
  savedAt: number;
  entries: Record<string, StoredEntry>;
}

/**
 * Lecturas de Mi Viaje que forman parte del viaje del viajero. Cualquier otra
 * lectura (mensajes, perfil, pagos, CMS, administración) nunca se guarda.
 */
export function isTripCopyKey(key: QueryKey): boolean {
  const [a, b, c] = key as readonly unknown[];
  if (a === "traveler" && (b === "active-plan" || b === "confirmed-travel")) return true;
  if (a === "cc" && b === "my-cases") return true;
  if (a === "alux" && b === "concierge-ctx") return true;
  if (a === "concierge" && b === "case-file" && c === "traveler") return true;
  if (a === "mi-viaje" && b === "itinerario-geo") return true;
  if (a === "concierge-order" && (c === "reservations" || c === "offline-snapshot")) return true;
  return false;
}

const SENSITIVE_FIELD =
  /(stripe|paddle|payment_(intent|method|id|ref|reference|provider_id)|checkout|card|token|secret|password|iban|clabe|cvv)/i;

/** Quita campos de pago, tarjetas, tokens o secretos a cualquier profundidad. */
export function stripSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitiveFields);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD.test(k)) continue;
      out[k] = stripSensitiveFields(v);
    }
    return out;
  }
  return value;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readOfflineTripCopy(userId: string, now = Date.now()): OfflineTripCopy | null {
  const store = storage();
  if (!store || !userId) return null;
  try {
    const raw = store.getItem(OFFLINE_TRIP_COPY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineTripCopy;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.userId !== userId || now - parsed.savedAt > OFFLINE_TRIP_COPY_TTL_MS) {
      store.removeItem(OFFLINE_TRIP_COPY_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveTripCopyEntry(
  userId: string,
  key: QueryKey,
  data: unknown,
  now = Date.now(),
): boolean {
  const store = storage();
  if (!store || !userId || !isTripCopyKey(key) || data === undefined) return false;
  const current = readOfflineTripCopy(userId, now) ?? { userId, savedAt: now, entries: {} };
  current.entries[JSON.stringify(key)] = {
    key,
    data: stripSensitiveFields(data),
    updatedAt: now,
  };
  current.savedAt = now;
  try {
    const payload = JSON.stringify(current);
    if (payload.length > MAX_BYTES) return false;
    store.setItem(OFFLINE_TRIP_COPY_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineTripCopy() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(OFFLINE_TRIP_COPY_KEY);
  } catch {
    /* almacenamiento bloqueado: se ignora */
  }
}

/** Entrega la copia de una lectura sólo si nadie la ha leído en esta visita. */
function seedEntry(qc: QueryClient, entry: StoredEntry): boolean {
  if (qc.getQueryData(entry.key) !== undefined) return false;
  qc.setQueryData(entry.key, entry.data, { updatedAt: entry.updatedAt });
  return true;
}

/** Sin señal: entrega a Mi Viaje la última copia guardada de la cuenta. */
export function seedOfflineTripCopy(qc: QueryClient, userId: string): number {
  const copy = readOfflineTripCopy(userId);
  if (!copy) return 0;
  let seeded = 0;
  for (const entry of Object.values(copy.entries)) {
    if (isTripCopyKey(entry.key) && seedEntry(qc, entry)) seeded += 1;
  }
  return seeded;
}

export function isDeviceOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Mantiene la copia al día y la entrega cuando falta señal.
 * Devuelve la función para dejar de escuchar.
 */
export function connectOfflineTripCopy(qc: QueryClient, userId: string): () => void {
  if (isDeviceOffline()) seedOfflineTripCopy(qc, userId);
  return qc.getQueryCache().subscribe((event) => {
    if (event.type !== "updated") return;
    const { query, action } = event;
    if (!isTripCopyKey(query.queryKey)) return;
    // Lectura real que llegó bien: se guarda. Las copias entregadas y los
    // cambios locales (`manual`) nunca se vuelven a guardar como nuevas.
    if (action.type === "success" && !action.manual) {
      saveTripCopyEntry(userId, query.queryKey, action.data);
      return;
    }
    // Señal débil: la lectura falló sin datos. Se entrega la copia guardada.
    if (action.type === "error" && query.state.data === undefined) {
      const copy = readOfflineTripCopy(userId);
      const entry = copy?.entries[JSON.stringify(query.queryKey)];
      if (entry) seedEntry(qc, entry);
    }
  });
}
