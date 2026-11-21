import { beforeEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  OFFLINE_TRIP_COPY_KEY,
  OFFLINE_TRIP_COPY_TTL_MS,
  clearOfflineTripCopy,
  connectOfflineTripCopy,
  isTripCopyKey,
  readOfflineTripCopy,
  saveTripCopyEntry,
  seedOfflineTripCopy,
  stripSensitiveFields,
} from "../src/lib/traveler/offline-trip-copy";
import { parseStoredSession, OFFLINE_SESSION_GRACE_MS } from "../src/lib/traveler/offline-session";

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const storage = new MemoryStorage();
(globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
  localStorage: storage,
};

const ITINERARY_KEY = ["traveler", "active-plan", "user-a"];
const itinerary = { plan: { id: "plan-1", title: "Viaje a Valladolid" }, items: [{ id: "i1" }] };

beforeEach(() => storage.clear());

describe("Mi Viaje sin señal · copia en el teléfono", () => {
  it("guarda itinerario, expediente, reservas y documentos, pero no mensajes ni perfil", () => {
    expect(isTripCopyKey(["traveler", "active-plan", "u"])).toBe(true);
    expect(isTripCopyKey(["concierge", "case-file", "traveler", "c1"])).toBe(true);
    expect(isTripCopyKey(["concierge-order", "o1", "reservations"])).toBe(true);
    expect(isTripCopyKey(["concierge-order", "o1", "offline-snapshot"])).toBe(true);
    expect(isTripCopyKey(["concierge", "case-messages", "c1"])).toBe(false);
    expect(isTripCopyKey(["traveler", "profile", "u"])).toBe(false);
  });

  it("nunca guarda identificadores de pago, tarjetas ni tokens", () => {
    const clean = stripSensitiveFields({
      folio: "VMX-1",
      stripe_payment_intent_id: "pi_123",
      payment_method: "card",
      items: [{ title: "Cena", card_last4: "4242", access_token: "x" }],
    });
    expect(clean).toEqual({ folio: "VMX-1", items: [{ title: "Cena" }] });
  });

  it("si entra otra cuenta en el teléfono, la copia anterior se borra", () => {
    saveTripCopyEntry("user-a", ITINERARY_KEY, itinerary);
    expect(readOfflineTripCopy("user-b")).toBeNull();
    expect(storage.getItem(OFFLINE_TRIP_COPY_KEY)).toBeNull();
  });

  it("la copia caduca a los 45 días", () => {
    const t0 = Date.parse("2026-11-21T00:00:00Z");
    saveTripCopyEntry("user-a", ITINERARY_KEY, itinerary, t0);
    expect(readOfflineTripCopy("user-a", t0 + OFFLINE_TRIP_COPY_TTL_MS - 1000)).not.toBeNull();
    expect(readOfflineTripCopy("user-a", t0 + OFFLINE_TRIP_COPY_TTL_MS + 1000)).toBeNull();
    expect(OFFLINE_TRIP_COPY_TTL_MS).toBe(45 * 24 * 60 * 60 * 1000);
  });

  it("sin señal, Mi Viaje recibe el itinerario guardado sin pisar datos recién leídos", () => {
    saveTripCopyEntry("user-a", ITINERARY_KEY, itinerary);
    saveTripCopyEntry("user-a", ["cc", "my-cases"], [{ id: "old" }]);
    const qc = new QueryClient();
    qc.setQueryData(["cc", "my-cases"], [{ id: "fresh" }]);
    expect(seedOfflineTripCopy(qc, "user-a")).toBe(1);
    expect(qc.getQueryData(ITINERARY_KEY)).toEqual(itinerary);
    expect(qc.getQueryData(["cc", "my-cases"])).toEqual([{ id: "fresh" }]);
  });

  it("al cerrar sesión la copia desaparece", () => {
    saveTripCopyEntry("user-a", ITINERARY_KEY, itinerary);
    clearOfflineTripCopy();
    expect(readOfflineTripCopy("user-a")).toBeNull();
  });

  it("con señal, cada lectura real de Mi Viaje actualiza la copia", async () => {
    const qc = new QueryClient();
    const stop = connectOfflineTripCopy(qc, "user-a");
    await qc.fetchQuery({ queryKey: ITINERARY_KEY, queryFn: async () => itinerary });
    await qc.fetchQuery({ queryKey: ["traveler", "profile", "user-a"], queryFn: async () => 1 });
    stop();
    const copy = readOfflineTripCopy("user-a");
    expect(Object.keys(copy?.entries ?? {})).toEqual([JSON.stringify(ITINERARY_KEY)]);
  });
});

describe("Sesión del viajero sin señal", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");
  const session = (expiresAtMs: number, refresh = "r") =>
    JSON.stringify({
      access_token: "a",
      refresh_token: refresh,
      expires_at: Math.floor(expiresAtMs / 1000),
      user: { id: "user-a" },
    });

  it("reconoce la cuenta guardada aunque el acceso haya vencido hace horas", () => {
    expect(parseStoredSession(session(now - 6 * 3600_000), now)?.user.id).toBe("user-a");
  });

  it("no la reconoce después de 45 días ni sin renovación guardada", () => {
    expect(parseStoredSession(session(now - OFFLINE_SESSION_GRACE_MS - 1000), now)).toBeNull();
    expect(parseStoredSession(session(now, ""), now)).toBeNull();
  });
});
