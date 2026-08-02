import { describe, expect, test } from "bun:test";
import {
  createCardAnalyticsEvent,
  hasAnalyticsPii,
  type OmxdsCardFamily,
} from "../../../src/lib/omxds/cards/card-contract";
import { toExperienceCardContract } from "../../../src/lib/omxds/cards/experience-card.adapter";
import { toHotelCardContract } from "../../../src/lib/omxds/cards/hotel-card.adapter";
import { toRestaurantCardContract } from "../../../src/lib/omxds/cards/restaurant-card.adapter";
import { toEventCardContract } from "../../../src/lib/omxds/cards/event-card.adapter";
import { toProductCardContract } from "../../../src/lib/omxds/cards/product-card.adapter";

const route = "/destino-ficticio/recurso-ficticio";
describe("I2-C remaining card family contracts", () => {
  test("Experience preserves experience semantics and omits unauthorized commerce", () => {
    const card = toExperienceCardContract({
      id: "exp-001",
      name: "Taller de luz ficticio",
      benefit: "Crear una pieza ficticia",
      host: "Anfitrión Ficticio",
      territory: "Destino Ficticio",
      modality: "Presencial",
      canonicalUrl: route,
    });
    expect(card?.family).toBe("experience");
    expect(card?.price).toBeNull();
    expect(card?.availability).toBeNull();
  });
  test("Hotel and Restaurant preserve Business identity without invented signals", () => {
    const hotel = toHotelCardContract({
      businessId: "business-001",
      name: "Hotel Lucero Ficticio",
      hotelType: "Hotel",
      zone: "Zona Ficticia",
      promise: "Descanso ficticio",
      canonicalUrl: route,
    });
    const restaurant = toRestaurantCardContract({
      businessId: "business-002",
      name: "Mesa Ficticia",
      cuisine: "Regional ficticia",
      zone: "Zona Ficticia",
      promise: "Sabores ficticios",
      canonicalUrl: route,
      schedule: ["Lunes 10:00–18:00"],
    });
    expect(hotel?.availability).toBeNull();
    expect(hotel?.reputation).toBeNull();
    expect(restaurant && "open_now" in restaurant).toBe(false);
    expect(restaurant?.reservation).toBeNull();
  });
  test("Event is timezone-explicit and removes trip CTA when inactive", () => {
    const cancelled = toEventCardContract({
      id: "event-001",
      title: "Festival Ficticio",
      startsAt: "2026-12-01T19:00:00-06:00",
      temporalState: "cancelled",
      venue: "Foro Ficticio",
      organizer: "Organizador Ficticio",
      canonicalUrl: route,
    });
    expect(cancelled?.actions.some((action) => action.id === "add_to_trip")).toBe(false);
    expect(
      toEventCardContract({
        id: "event-002",
        title: "Evento",
        startsAt: "2026-12-01T19:00:00",
        temporalState: "scheduled",
        venue: "Foro",
        organizer: "Organizador",
        canonicalUrl: route,
      }),
    ).toBeNull();
  });
  test("Product is only produced for an acquisition decision", () => {
    const base = {
      id: "product-001",
      name: "Objeto Ficticio",
      host: "Anfitrión Ficticio",
      productType: "Objeto",
      unit: "Una pieza",
      canonicalUrl: route,
    } as const;
    expect(toProductCardContract({ ...base, primaryDecision: "experience" })).toBeNull();
    expect(toProductCardContract({ ...base, primaryDecision: "acquire" })?.family).toBe("product");
  });
  test("all seven families emit PII-free analytics and one dominant action", () => {
    const families: OmxdsCardFamily[] = [
      "destination",
      "business",
      "experience",
      "hotel",
      "restaurant",
      "event",
      "product",
    ];
    for (const family of families)
      expect(
        hasAnalyticsPii(
          createCardAnalyticsEvent(`technical:${family}`, "standard", "discover", family),
        ),
      ).toBe(false);
    const cards = [
      toExperienceCardContract({
        id: "e",
        name: "E",
        benefit: "B",
        host: "H",
        territory: "T",
        modality: "M",
        canonicalUrl: route,
      }),
      toProductCardContract({
        id: "p",
        name: "P",
        host: "H",
        productType: "T",
        unit: "U",
        canonicalUrl: route,
        primaryDecision: "acquire",
      }),
    ];
    for (const card of cards)
      expect(card?.actions.filter((action) => action.id === "discover")).toHaveLength(1);
  });
});
