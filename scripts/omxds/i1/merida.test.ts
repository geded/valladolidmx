import { describe, expect, test } from "bun:test";
import {
  formatMeridaDate,
  formatMeridaDateTime,
  formatMeridaRange,
  formatMeridaTime,
  MERIDA_TIME_ZONE,
} from "../../../src/lib/time/merida";

describe("destination time contract", () => {
  test("uses the canonical IANA zone", () => {
    expect(MERIDA_TIME_ZONE).toBe("America/Merida");
  });

  test("does not inherit the visitor time zone around midnight UTC", () => {
    expect(formatMeridaTime("2026-01-01T05:30:00Z", "en-GB")).toBe("23:30");
    expect(formatMeridaDate("2026-01-01T05:30:00Z", "en-CA")).toContain("2025");
  });

  test("preserves date-only editorial semantics and fails closed", () => {
    expect(formatMeridaDate("2026-12-31", "en-CA")).toContain("2026");
    expect(formatMeridaDateTime("not-a-date")).toBeNull();
    expect(formatMeridaRange("2026-02-02T12:00:00Z", "2026-02-01T12:00:00Z")).toBeNull();
  });
});
