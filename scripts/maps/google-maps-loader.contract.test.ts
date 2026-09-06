/**
 * Lote 3F-B1 — Contrato del cargador único de Google Maps y del fallback
 * accesible. Cubre: cargador único, múltiples instancias suscritas, limpieza
 * de suscripciones, fallo simulado, texto neutral, enlaces seguros.
 */
import { describe, expect, it, beforeEach, afterEach } from "bun:test";

interface ScriptStub {
  id: string;
  src: string;
  async: boolean;
  defer: boolean;
  onerror: (() => void) | null;
}

function installDom() {
  const scripts: ScriptStub[] = [];
  const doc = {
    getElementById: (id: string) => scripts.find((s) => s.id === id) ?? null,
    createElement: () =>
      ({ id: "", src: "", async: false, defer: false, onerror: null }) as ScriptStub,
    head: {
      appendChild: (s: ScriptStub) => {
        scripts.push(s);
      },
    },
  };
  (globalThis as Record<string, unknown>).document = doc;
  (globalThis as Record<string, unknown>).window = globalThis;
  return scripts;
}

function clearDom() {
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).google;
}

let scripts: ScriptStub[] = [];
let loader: typeof import("../../src/lib/maps/google-maps-loader");

beforeEach(async () => {
  scripts = installDom();
  loader = await import("../../src/lib/maps/google-maps-loader");
  loader.__resetGoogleMapsLoaderForTests();
});

afterEach(() => {
  loader.__resetGoogleMapsLoaderForTests();
  clearDom();
});

describe("cargador único del SDK", () => {
  it("crea un solo <script> aunque se pida varias veces", () => {
    void loader.loadGoogleMaps("test-key");
    void loader.loadGoogleMaps("test-key");
    void loader.loadGoogleMaps("test-key");
    expect(scripts.length).toBe(1);
    expect(scripts[0].id).toBe(loader.GOOGLE_MAPS_SCRIPT_ID);
  });

  it("usa loading=async y callback global, sin mapId", () => {
    void loader.loadGoogleMaps("test-key");
    expect(scripts[0].src).toContain("loading=async");
    expect(scripts[0].src).toContain("callback=vmxInitGoogleMaps");
    expect(scripts[0].src).not.toContain("mapId");
  });

  it("reutiliza la misma promesa en llamadas concurrentes", () => {
    const a = loader.loadGoogleMaps("test-key");
    const b = loader.loadGoogleMaps("test-key");
    expect(a).toBe(b);
  });

  it("resuelve a todas las instancias cuando el SDK termina de cargar", async () => {
    const first = loader.loadGoogleMaps("test-key");
    const second = loader.loadGoogleMaps("test-key");
    (globalThis as Record<string, unknown>).google = { maps: {} };
    (globalThis as { vmxInitGoogleMaps?: () => void }).vmxInitGoogleMaps?.();
    await expect(first).resolves.toBeDefined();
    await expect(second).resolves.toBeDefined();
  });
});

describe("gm_authFailure multiinstancia", () => {
  it("notifica a todas las instancias suscritas, no sólo a la última", () => {
    const seen: string[] = [];
    loader.subscribeGoogleMapsAuthFailure(() => seen.push("a"));
    loader.subscribeGoogleMapsAuthFailure(() => seen.push("b"));
    loader.subscribeGoogleMapsAuthFailure(() => seen.push("c"));
    expect(loader.googleMapsAuthListenerCount()).toBe(3);
    (globalThis as { gm_authFailure?: () => void }).gm_authFailure?.();
    expect(seen.sort()).toEqual(["a", "b", "c"]);
  });

  it("limpia la suscripción al desmontar", () => {
    const unsubscribeA = loader.subscribeGoogleMapsAuthFailure(() => {});
    loader.subscribeGoogleMapsAuthFailure(() => {});
    expect(loader.googleMapsAuthListenerCount()).toBe(2);
    unsubscribeA();
    expect(loader.googleMapsAuthListenerCount()).toBe(1);
  });

  it("no vuelve a llamar a un listener desuscrito", () => {
    let calls = 0;
    const off = loader.subscribeGoogleMapsAuthFailure(() => {
      calls += 1;
    });
    off();
    (globalThis as { gm_authFailure?: () => void }).gm_authFailure?.();
    expect(calls).toBe(0);
  });

  it("aplica el fallo a las instancias montadas después del error", () => {
    (globalThis as { gm_authFailure?: () => void }).gm_authFailure?.();
    loader.subscribeGoogleMapsAuthFailure(() => {});
    expect(loader.hasGoogleMapsAuthFailed()).toBe(false);
    // Se dispara sólo tras instalar el hook (primera suscripción o carga).
    (globalThis as { gm_authFailure?: () => void }).gm_authFailure?.();
    let late = 0;
    loader.subscribeGoogleMapsAuthFailure(() => {
      late += 1;
    });
    expect(loader.hasGoogleMapsAuthFailed()).toBe(true);
    expect(late).toBe(1);
  });
});

describe("enlaces seguros a Google Maps", () => {
  it("construye enlaces de ficha y de ruta con coordenadas codificadas", () => {
    const place = loader.googleMapsPlaceUrl({ lat: 20.6896, lng: -88.2019, title: "Zací" });
    const dir = loader.googleMapsDirectionsUrl({ lat: 20.6896, lng: -88.2019 });
    expect(place).toBe("https://www.google.com/maps/search/?api=1&query=20.6896%2C-88.2019");
    expect(dir).toBe("https://www.google.com/maps/dir/?api=1&destination=20.6896%2C-88.2019");
  });
});

describe("mensaje del fallback", () => {
  it("es neutral: no menciona dominio, clave ni proveedor", () => {
    const msg = loader.MAP_UNAVAILABLE_MESSAGE.toLowerCase();
    expect(msg).not.toContain("dominio");
    expect(msg).not.toContain("clave");
    expect(msg).not.toContain("key");
    expect(msg).not.toContain("referer");
    expect(msg.length).toBeGreaterThan(20);
  });
});
