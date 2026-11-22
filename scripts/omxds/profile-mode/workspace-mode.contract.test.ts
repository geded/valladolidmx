import { describe, expect, test } from "bun:test";
import {
  effectiveMode,
  hidesTravelerSurfaces,
  modeForPath,
} from "../../../src/lib/profile-mode/workspace-mode";

const ALL = ["traveler", "business", "concierge", "staff"] as const;

describe("el panel donde estás es el perfil con el que operas", () => {
  test("en el CMS se opera como Staff aunque el modo guardado sea Viajero", () => {
    expect(effectiveMode("/cms/destinos", "traveler", ["traveler", "business", "staff"])).toBe(
      "staff",
    );
  });
  test("en el Panel Fundador se opera como Staff", () => {
    expect(modeForPath("/admin", ALL)).toBe("staff");
  });
  test("en el Portal Empresarial se opera como Empresa", () => {
    expect(effectiveMode("/portal/whatsapp", "staff", ALL)).toBe("business");
  });
  test("en el Centro Concierge se opera como Concierge, o Staff sin perfil concierge", () => {
    expect(modeForPath("/concierge/prospectos", ALL)).toBe("concierge");
    expect(modeForPath("/concierge", ["traveler", "staff"])).toBe("staff");
  });
  test("en Mi Cuenta y Mi Viaje se opera como Viajero", () => {
    expect(effectiveMode("/cuenta/perfil", "staff", ALL)).toBe("traveler");
    expect(effectiveMode("/mi-viaje", "business", ALL)).toBe("traveler");
  });
  test("en el sitio público manda el modo guardado", () => {
    expect(effectiveMode("/oriente-maya/valladolid", "staff", ALL)).toBe("staff");
    expect(effectiveMode("/", "traveler", ALL)).toBe("traveler");
  });
  test("un panel que no corresponde a un perfil disponible no cambia el modo", () => {
    expect(modeForPath("/portal", ["traveler"])).toBeNull();
    expect(effectiveMode("/cms", "traveler", ["traveler"])).toBe("traveler");
  });
  test("rutas parecidas no se confunden con un panel", () => {
    expect(modeForPath("/cmsx", ALL)).toBeNull();
    expect(modeForPath("/cuentas-claras", ALL)).toBeNull();
  });
});

describe("como Staff no se ve nada de Mi Viaje ni del perfil de viajero", () => {
  test("Staff oculta las piezas de viajero", () => {
    expect(hidesTravelerSurfaces("staff")).toBe(true);
  });
  test("Empresa (anfitrión) oculta las piezas de viajero", () => {
    expect(hidesTravelerSurfaces("business")).toBe(true);
  });
  test("Concierge oculta las piezas de viajero", () => {
    expect(hidesTravelerSurfaces("concierge")).toBe(true);
  });
  test("Viajero sí ve Mi Viaje", () => {
    expect(hidesTravelerSurfaces("traveler")).toBe(false);
  });
});
