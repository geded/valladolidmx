import { describe, expect, it } from "vitest";
import { shouldRecoverPhotos } from "../../src/pwa/photo-link-recovery";

const signed = "/api/public/signed/destinations/a/hero.webp?token=x";

describe("fotos con enlace vencido", () => {
  it("una foto firmada que falla con señal pide datos nuevos", () => {
    expect(shouldRecoverPhotos({ url: signed, online: true, now: 10_000_000, lastRecoveryAt: 0 })).toBe(true);
  });
  it("no repite la renovación antes de 2 minutos", () => {
    expect(shouldRecoverPhotos({ url: signed, online: true, now: 100_000, lastRecoveryAt: 0 })).toBe(false);
  });
  it("sin señal no intenta renovar", () => {
    expect(shouldRecoverPhotos({ url: signed, online: false, now: 10_000_000, lastRecoveryAt: 0 })).toBe(false);
  });
  it("una foto pública normal no dispara renovación", () => {
    expect(shouldRecoverPhotos({ url: "/logo.png", online: true, now: 10_000_000, lastRecoveryAt: 0 })).toBe(false);
  });
});
