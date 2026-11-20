/**
 * Contrato · Resumen de reseñas en Alux (autorizado 2026-11-20).
 *
 * Reglas del Founder y de Google verificadas:
 *  1. Alux presenta el resumen con «Este es un resumen basado en las reseñas de [Nombre]».
 *  2. Dos momentos: planeando («Estás explorando…») y en sitio («Estás a 150 m de…»).
 *  3. Más de 20 km del lugar no cuenta como «en sitio».
 *  4. El vínculo con Google sólo se acepta a ≤ 250 m de nuestras coordenadas.
 *  5. Un intento fallido no se repite antes de 30 días.
 *  6. Sólo se aceptan referencias de negocio, lugar, producto o evento con id válido.
 *
 * Ejecutar con: `bun test scripts/alux/alux-review-summary.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  buildReviewSummaryIntro,
  isAcceptableGoogleMatch,
  parseReviewEntityRef,
  resolveTravelerMoment,
  shouldRetryMatch,
} from "../../src/lib/alux/review-summary-contract";

const MICHA = { lat: 20.6908512514298, lng: -88.2002484975258 };

describe("presentación del resumen", () => {
  test("planeando: frase de exploración + resumen basado en reseñas", () => {
    expect(buildReviewSummaryIntro({ name: "Casa Tía Micha", moment: "planning" })).toBe(
      "Estás explorando Casa Tía Micha. Este es un resumen basado en las reseñas de Casa Tía Micha:",
    );
  });

  test("en sitio: indica la distancia en metros", () => {
    expect(
      buildReviewSummaryIntro({ name: "El Mesón del Marqués", moment: "onsite", distanceKm: 0.15 }),
    ).toBe(
      "Estás a 150 m de El Mesón del Marqués. Este es un resumen basado en las reseñas de El Mesón del Marqués:",
    );
  });

  test("a más de 20 km se trata como planeación", () => {
    const merida = { lat: 20.9674, lng: -89.5926 };
    expect(resolveTravelerMoment(merida, MICHA).moment).toBe("planning");
    const nearby = { lat: 20.6895, lng: -88.2015 };
    expect(resolveTravelerMoment(nearby, MICHA).moment).toBe("onsite");
  });
});

describe("vínculo con Google", () => {
  test("acepta 18 m y rechaza ~1.1 km", () => {
    expect(isAcceptableGoogleMatch(MICHA, { lat: 20.6908534, lng: -88.2004134 })).toBe(true);
    expect(isAcceptableGoogleMatch(MICHA, { lat: 20.7008, lng: -88.2002 })).toBe(false);
  });

  test("no repite un intento antes de 30 días", () => {
    const now = Date.parse("2026-11-20T00:00:00Z");
    expect(shouldRetryMatch("2026-11-01T00:00:00Z", now)).toBe(false);
    expect(shouldRetryMatch("2026-10-20T00:00:00Z", now)).toBe(true);
    expect(shouldRetryMatch(null, now)).toBe(true);
  });

  test("sólo referencias business/place/product/event con id válido", () => {
    expect(parseReviewEntityRef("event:4367fd6a-3116-4d95-9808-78fbdc68f5ad")?.kind).toBe("event");
    expect(parseReviewEntityRef("business:2f6437fd-b5f0-48e7-a666-8c1249c46022")).toEqual({
      kind: "business",
      id: "2f6437fd-b5f0-48e7-a666-8c1249c46022",
    });
    expect(parseReviewEntityRef("destination:2f6437fd-b5f0-48e7-a666-8c1249c46022")).toBeNull();
    expect(parseReviewEntityRef("business:Casa Tia Micha")).toBeNull();
  });
});
