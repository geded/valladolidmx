import { describe, expect, it } from "bun:test";
import { canAccessAluxSession } from "../../src/lib/alux/session-access";

describe("Alux session ownership", () => {
  it("a known identifier never grants anonymous memory access", () => {
    expect(canAccessAluxSession(null, "attacker", "owner-proof", null)).toBe(false);
    expect(canAccessAluxSession(null, null, "owner-proof", "other-proof")).toBe(false);
  });
  it("only a proved device may access unbound memory", () => {
    expect(canAccessAluxSession(null, null, "owner-proof", "owner-proof")).toBe(true);
    expect(canAccessAluxSession(null, null, null, null)).toBe(false);
  });
  it("linked memory belongs only to the authenticated owner", () => {
    expect(canAccessAluxSession("owner", "attacker", "proof", "proof")).toBe(false);
    expect(canAccessAluxSession("owner", null, "proof", "proof")).toBe(false);
    expect(canAccessAluxSession("owner", "owner", "proof", null)).toBe(true);
  });
});