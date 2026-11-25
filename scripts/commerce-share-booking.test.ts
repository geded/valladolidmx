import { describe, expect, it } from "vitest";
import { tableBookingEmbedCode, tableBookingShareLink } from "../src/components/commerce/ShareTableBookingCard";
describe("share table booking", () => {
  it("short link lands on the booking calendar", () => {
    expect(tableBookingShareLink("restaurantes", "copalli-cafe")).toBe("https://www.quehacerenvalladolid.com/restaurante/copalli-cafe#reservar-mesa");
  });
  it("embed code points to the same link", () => {
    const l = tableBookingShareLink("restaurantes", "copalli-cafe");
    expect(tableBookingEmbedCode(l, "Copalli <x>")).toContain(`href="${l}"`);
    expect(tableBookingEmbedCode(l, "Copalli <x>")).not.toContain("<x>");
  });
});
