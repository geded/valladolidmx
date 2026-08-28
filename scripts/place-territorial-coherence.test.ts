/**
 * G8-Q2B · Addendum territorial Destino → Zona → Lugar.
 * Cubre los cinco escenarios exigidos por el Founder.
 */
import { describe, expect, it } from "vitest";
import {
  isZoneCompatible,
  reconcileZoneForDestination,
  zonesForDestination,
  type TerritorialZone,
} from "@/lib/places/place-territory";

const ZONES: TerritorialZone[] = [
  { id: "z-centro", name: "Centro Histórico", destination_id: "d-valladolid", status: "published" },
  { id: "z-sisal", name: "Barrio de Sisal", destination_id: "d-valladolid", status: "approved" },
  { id: "z-vieja", name: "Zona retirada", destination_id: "d-valladolid", status: "archived" },
  { id: "z-izamal", name: "Centro Amarillo", destination_id: "d-izamal", status: "published" },
];

describe("coherencia territorial destino–zona", () => {
  it("destino sin zonas: lista vacía y guardar sin zona es válido", () => {
    expect(zonesForDestination(ZONES, "d-espita")).toEqual([]);
    expect(isZoneCompatible(ZONES, "d-espita", null)).toBe(true);
  });

  it("destino con varias zonas: sólo activas del destino, ordenadas", () => {
    expect(zonesForDestination(ZONES, "d-valladolid").map((z) => z.id)).toEqual([
      "z-sisal",
      "z-centro",
    ]);
  });

  it("cambio de destino: la zona incompatible se limpia", () => {
    expect(reconcileZoneForDestination(ZONES, "d-izamal", "z-centro")).toBe("");
    expect(reconcileZoneForDestination(ZONES, "d-valladolid", "z-centro")).toBe("z-centro");
  });

  it("zona incompatible o archivada se rechaza", () => {
    expect(isZoneCompatible(ZONES, "d-valladolid", "z-izamal")).toBe(false);
    expect(isZoneCompatible(ZONES, "d-valladolid", "z-vieja")).toBe(false);
    expect(isZoneCompatible(ZONES, "", "z-centro")).toBe(false);
  });

  it("edición de registro existente: conserva su zona válida", () => {
    expect(reconcileZoneForDestination(ZONES, "d-izamal", "z-izamal")).toBe("z-izamal");
    expect(reconcileZoneForDestination(ZONES, "d-valladolid", null)).toBe("");
  });
});
