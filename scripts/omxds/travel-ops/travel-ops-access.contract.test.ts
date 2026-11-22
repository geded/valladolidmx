import { describe, expect, test } from "bun:test";
import { canViewTravelOps } from "../../../src/lib/admin/travel-ops-access";

describe("«Viajes en curso» sólo para administración y concierge", () => {
  test("un editor no ve «Viajes en curso»", () => {
    expect(canViewTravelOps(["traveler", "editor"])).toBe(false);
  });
  test("un viajero no ve «Viajes en curso»", () => {
    expect(canViewTravelOps(["traveler"])).toBe(false);
  });
  test("el súper admin sí lo ve", () => {
    expect(canViewTravelOps(["traveler", "admin", "super_admin"])).toBe(true);
  });
  test("el concierge sí lo ve", () => {
    expect(canViewTravelOps(["traveler", "concierge"])).toBe(true);
  });
});
