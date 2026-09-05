/**
 * Lote 3F-B1 — Contrato del fallback accesible y del montaje condicional.
 */
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MapUnavailableFallback } from "../../src/components/maps/MapUnavailableFallback";
import { InteractiveMap } from "../../src/components/maps/InteractiveMap";
import { MAP_UNAVAILABLE_MESSAGE } from "../../src/lib/maps/google-maps-loader";

describe("MapUnavailableFallback", () => {
  const html = renderToStaticMarkup(
    <MapUnavailableFallback
      points={[
        { lat: 20.6896, lng: -88.2019, title: "Cenote Zací" },
        { lat: 20.68, lng: -88.2, title: null },
      ]}
    />,
  );

  it("expone role=status para lectores de pantalla", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("muestra texto neutral y nunca queda vacío", () => {
    expect(html).toContain(MAP_UNAVAILABLE_MESSAGE);
  });

  it("lista los puntos alternativos con etiqueta legible", () => {
    expect(html).toContain("Cenote Zací");
    expect(html).toContain("Ubicación 2");
  });

  it("usa enlaces seguros a Google Maps", () => {
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(
      "https://www.google.com/maps/search/?api=1&amp;query=20.6896%2C-88.2019",
    );
    expect(html).toContain(
      "https://www.google.com/maps/dir/?api=1&amp;destination=20.6896%2C-88.2019",
    );
  });

  it("descarta coordenadas inválidas sin romper el bloque", () => {
    const empty = renderToStaticMarkup(<MapUnavailableFallback points={[{ lat: 0, lng: 0 }]} />);
    expect(empty).toContain('role="status"');
    expect(empty).not.toContain("<ul");
  });
});

describe("InteractiveMap · montaje condicional", () => {
  it("no marca el mapa como montado antes de ser visible", () => {
    const html = renderToStaticMarkup(<InteractiveMap lat={20.6896} lng={-88.2019} />);
    expect(html).toContain('data-map-mounted="false"');
    expect(html).toContain('data-ready="false"');
  });
});
