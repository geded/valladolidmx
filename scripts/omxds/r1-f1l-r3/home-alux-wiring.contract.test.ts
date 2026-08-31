import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("G8-R1-F1L-R3 · cableado mínimo Home Premium → Alux y Travel Plan", () => {
  test("la Home transmite prompt, ruta y destino al dock global existente", () => {
    const home = read("src/components/home-premium/HomePremiumSurface.tsx");
    const bus = read("src/lib/alux/floating-bus.ts");
    const dock = read("src/components/layout/AluxFloatingTrigger.tsx");

    expect(home).toContain('reason: "home-premium-route"');
    expect(home).toContain("hint: prompt");
    expect(home).toContain("sequence: route.sequence");
    expect(home).toContain("openAluxFloating");
    expect(bus).toContain('"home-premium-route"');
    expect(dock).toContain('launch?.reason === "home-premium-route"');
    expect(dock).toContain("launch.route.sequence");
  });

  test("Agregar ruta reutiliza note y continuidad anónima sin crear un kind route", () => {
    const adapter = read(
      "src/components/home-premium/AddHomeRouteToTravelPlanButton.tsx",
    );
    expect(adapter).toContain("addPlanItem");
    expect(adapter).toContain("anon.addPlannedItem");
    expect(adapter).toContain('kind: "note"');
    expect(adapter).not.toContain('kind: "route"');
    expect(adapter).toContain("notifyPlanChanged");
  });

  test("se elimina el estado local ficticio de agregado", () => {
    const home = read("src/components/home-premium/HomePremiumSurface.tsx");
    expect(home).not.toContain("const [added, setAdded]");
    expect(home).not.toContain("onAdd={() => setAdded(true)}");
  });
});
