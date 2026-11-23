import { describe, expect, it } from "vitest";
import {
  CLUSTER_MAX_ZOOM,
  clusterMarkers,
  pointInBounds,
} from "../src/lib/maps/marker-clusters";

/* 200 empresas alrededor del Parque Principal de Valladolid. */
function valladolidCenter(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    lat: 20.6894 + ((i % 20) - 10) * 0.0006,
    lng: -88.2017 + (Math.floor(i / 20) - 5) * 0.0006,
  }));
}

describe("agrupación de pines del mapa", () => {
  it("con 200 empresas en el centro, de lejos se ven pocas burbujas y ningún pin se pierde", () => {
    const pts = valladolidCenter(200);
    const r = clusterMarkers(pts, 13);
    const covered = r.singles.length + r.clusters.reduce((s, c) => s + c.members.length, 0);
    expect(covered).toBe(200);
    expect(r.clusters.length + r.singles.length).toBeLessThan(20);
  });

  it("a nivel de calle todo se ve suelto", () => {
    const r = clusterMarkers(valladolidCenter(200), CLUSTER_MAX_ZOOM);
    expect(r.clusters).toHaveLength(0);
    expect(r.singles).toHaveLength(200);
  });

  it("con menos de 12 pines no se agrupa", () => {
    const r = clusterMarkers(valladolidCenter(11), 10);
    expect(r.clusters).toHaveLength(0);
    expect(r.singles).toHaveLength(11);
  });

  it("un pin dorado nunca queda dentro de una burbuja", () => {
    const pts = valladolidCenter(200).map((p, i) => ({ ...p, featured: i === 37 }));
    const r = clusterMarkers(pts, 12);
    expect(r.singles).toContain(37);
    expect(r.clusters.some((c) => c.members.includes(37))).toBe(false);
  });

  it("la lista sincronizada solo incluye lo que se ve en el mapa", () => {
    const view = { north: 20.7, south: 20.68, east: -88.19, west: -88.21 };
    expect(pointInBounds({ lat: 20.6894, lng: -88.2017 }, view)).toBe(true);
    expect(pointInBounds({ lat: 20.6833, lng: -88.5683 }, view)).toBe(false); // Chichén Itzá
  });
});

import { chunkIds, selectInChunks } from "../src/lib/catalog/chunk-ids";

describe("lecturas por lotes para 200 empresas", () => {
  it("200 ids se piden en 2 lotes de máximo 150", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `b${i}`);
    const parts = chunkIds(ids);
    expect(parts.map((p) => p.length)).toEqual([150, 50]);
  });

  it("une los resultados de todos los lotes sin perder empresas", async () => {
    const ids = Array.from({ length: 200 }, (_, i) => `b${i}`);
    const rows = await selectInChunks<{ id: string }>(ids, async (chunk) => ({
      data: chunk.map((id) => ({ id })),
      error: null,
    }));
    expect(rows).toHaveLength(200);
  });
});
