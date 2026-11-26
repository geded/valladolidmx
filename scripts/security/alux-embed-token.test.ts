import { describe, expect, it } from "bun:test";
import { issueAluxEmbedToken, verifyAluxEmbedToken } from "../../src/lib/alux/embed-token.server";

const secret = "test-only-secret";
const now = Date.parse("2026-11-26T06:00:00Z");

describe("Autorización de Alux insertado", () => {
  it("firma host y pistas normalizadas y los recupera", () => {
    const token = issueAluxEmbedToken(
      { host: "HTTPS://HotelMeson.COM/", destino: "Valladolid", empresa: "Copalli-Cafe" },
      secret,
      now,
    );
    expect(token).toBeTruthy();
    expect(verifyAluxEmbedToken(token!, secret, now)).toEqual({
      host: "hotelmeson.com",
      destino: "valladolid",
      empresa: "copalli-cafe",
      exp: Math.floor(now / 1000) + 900,
    });
  });

  it("rechaza una firma alterada o de otra clave", () => {
    const token = issueAluxEmbedToken({ host: "hotelmeson.com" }, secret, now)!;
    expect(verifyAluxEmbedToken(`${token.slice(0, -1)}x`, secret, now)).toBeNull();
    expect(verifyAluxEmbedToken(token, "otra-clave", now)).toBeNull();
  });

  it("rechaza una autorización vencida o sin clave", () => {
    const token = issueAluxEmbedToken({ host: "hotelmeson.com" }, secret, now)!;
    expect(verifyAluxEmbedToken(token, secret, now + 901_000)).toBeNull();
    expect(issueAluxEmbedToken({ host: "hotelmeson.com" }, "", now)).toBeNull();
  });
});
