import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildRegionPremiumRuntime } from "../../../src/components/destination-premium/region-premium-runtime";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("G8-R1-F1L-R2 · conexiones premium runtime", () => {
  test("cada destino regional conserva una única ruta canónica en tarjeta y mapa", () => {
    const content = buildRegionPremiumRuntime({
      destinations: [
        { slug: "rio-lagartos", name: "Río Lagartos", latitude: 21.59, longitude: -88.16 },
        { slug: "ek-balam", name: "Ek Balam", latitude: 20.89, longitude: -88.13 },
      ],
    });

    expect(content.nearby.items.map((item) => item.href)).toEqual([
      "/oriente-maya/rio-lagartos",
      "/oriente-maya/ek-balam",
    ]);
    expect(content.map.points.map((item) => item.href)).toEqual([
      "/oriente-maya/rio-lagartos",
      "/oriente-maya/ek-balam",
    ]);
  });

  test("la portada regional no presenta destinos como selector de servicios", () => {
    const route = read("src/routes/oriente-maya/index.tsx");
    expect(route).toContain("services: false");
    expect(route).toContain('data-destination-template="premium-g4"');
  });

  test("la autoridad visual conserva los enlaces del mapa y de las tarjetas", () => {
    const surface = read("src/components/destination-premium/DestinationPremiumSurface.tsx");
    expect(surface).toContain("href: p.href ?? null");
    expect(surface).toContain("d.href ? (");
    expect(surface).toContain("to={d.href}");
  });

  test("la siembra de medios es acreditada, reversible y nunca se ejecuta implícitamente", () => {
    const manifest = JSON.parse(
      read("scripts/omxds/r1-f1l-r2/destination-open-media.manifest.json"),
    ) as {
      items: Array<{
        destinationSlug: string;
        sourceUrl: string;
        author: string;
        license: string;
        credit: string;
        alt: string;
      }>;
    };
    const script = read("scripts/omxds/r1-f1l-r2/seed-destination-open-media.mjs");

    expect(manifest.items).toHaveLength(7);
    expect(new Set(manifest.items.map((item) => item.destinationSlug)).size).toBe(7);
    for (const item of manifest.items) {
      expect(item.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(item.author.trim().length).toBeGreaterThan(0);
      expect(item.license).toMatch(/^CC BY(?:-SA)? /);
      expect(item.credit).toContain(item.author);
      expect(item.alt.trim().length).toBeGreaterThan(12);
    }

    expect(script).toContain('const APPLY = process.argv.includes("--apply")');
    expect(script).toContain('arg.startsWith("--rollback=")');
    expect(script).toContain('reason: "accredited_cover_exists"');
    expect(script).toContain("is_demo_seed: false");
    expect(script).toContain('action: "media.link"');
    expect(script).not.toContain('storage_bucket: "demo-media"');
  });
});
