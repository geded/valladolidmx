import { describe, expect, it } from "vitest";
import { groupCardsByDestination } from "@/lib/listings/listing-public-contract";

const card = (id: string, label: string | null) =>
  ({ id, location: label ? { label, distanceKm: null } : null }) as never;

describe("listado regional agrupado por destino", () => {
  it("pone Valladolid primero, luego alfabético, conservando el orden interno", () => {
    const out = groupCardsByDestination([
      card("a", "Izamal"),
      card("b", "Valladolid"),
      card("c", null),
      card("d", "Espita"),
      card("e", "Valladolid"),
      card("f", "Izamal"),
    ]) as unknown as { id: string }[];
    expect(out.map((c) => c.id)).toEqual(["b", "e", "d", "a", "f", "c"]);
  });
});
