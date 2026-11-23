import { describe, expect, it } from "bun:test";
import { aluxCanPromote, replyMentions } from "../../../src/lib/alux/converse-priority";

const destacado = { alux_weight: 15, alux_proactive: false, alux_daily_cap: 0 };
const premium = { alux_weight: 55, alux_proactive: true, alux_daily_cap: 2 };
const elite = { alux_weight: 90, alux_proactive: true, alux_daily_cap: 5 };
const basico = { alux_weight: 0, alux_proactive: false, alux_daily_cap: 0 };

describe("Alux · tope diario de «Recomendado» por paquete", () => {
  it("Destacado sólo se lee primero: nunca sale como Recomendado", () => {
    expect(aluxCanPromote(destacado, 0)).toBe(false);
  });
  it("Premium: hasta 2 menciones al día", () => {
    expect(aluxCanPromote(premium, 0)).toBe(true);
    expect(aluxCanPromote(premium, 1)).toBe(true);
    expect(aluxCanPromote(premium, 2)).toBe(false);
  });
  it("Élite: hasta 5 menciones al día", () => {
    expect(aluxCanPromote(elite, 4)).toBe(true);
    expect(aluxCanPromote(elite, 5)).toBe(false);
  });
  it("Básico no tiene recomendación pagada", () => {
    expect(aluxCanPromote(basico, 0)).toBe(false);
  });
  it("cuenta la mención sólo si la respuesta nombra a la empresa", () => {
    expect(replyMentions("Te recomiendo Kurán Japonesa para cenar", "Kuran Japonesa")).toBe(true);
    expect(replyMentions("Te recomiendo el Mesón del Marqués", "Kuran Japonesa")).toBe(false);
  });
});
