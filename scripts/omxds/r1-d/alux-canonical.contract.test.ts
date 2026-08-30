/**
 * G8-R1-D-R1 · Gate `validate:r1:d` — Matriz formal de escenarios
 * autorizados por el Founder para el cierre de R1-D.
 *
 * Read-only: no toca datos, flags, rutas ni gobernanza.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildCanonicalEntityUrl,
  CANONICAL_ENTITY_BINDING_VERSION,
} from "../../../src/lib/experience-builder/canonical-entity-binding";
import {
  buildAluxUnifiedContext,
  hasSufficientAluxContext,
  resolveContextZoneSlug,
  ALUX_UNIFIED_CONTEXT_VERSION,
} from "../../../src/lib/alux/unified-context";
import { resolveZoneSlug } from "../../../src/lib/alux/canonical-catalog.server";
import type { AluxContext } from "../../../src/lib/alux/use-alux-context";

const CATALOG_RAW = readFileSync("src/lib/alux/canonical-catalog.server.ts", "utf8");
/** Código ejecutable sin comentarios: las reglas se verifican sobre el código. */
const CATALOG = CATALOG_RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const baseCtx = (over: Partial<AluxContext> = {}): AluxContext => ({
  hasContext: true,
  related: [],
  reason: "contexto de prueba",
  origin: "live",
  destination: { slug: "valladolid", label: "Valladolid", href: "/oriente-maya/valladolid" },
  ...over,
});

describe("R1-D · DEF-R1D-003 · URL canónica desde el binding oficial", () => {
  test("1 · hotel (empresa) resuelve ruta territorial", () => {
    expect(
      buildCanonicalEntityUrl({
        entityType: "business",
        slug: "hacienda-x",
        destinationSlug: "valladolid",
        categorySlug: "hoteles",
      }),
    ).toBe("/oriente-maya/valladolid/hoteles/hacienda-x");
  });

  test("2 · restaurante resuelve ruta territorial", () => {
    expect(
      buildCanonicalEntityUrl({
        entityType: "business",
        slug: "cocina-elsa",
        destinationSlug: "valladolid",
        categorySlug: "restaurantes",
      }),
    ).toBe("/oriente-maya/valladolid/restaurantes/cocina-elsa");
  });

  test("3 · lugar resuelve /lugares/{slug}", () => {
    expect(
      buildCanonicalEntityUrl({
        entityType: "place",
        slug: "convento-sisal",
        destinationSlug: "valladolid",
      }),
    ).toBe("/oriente-maya/valladolid/lugares/convento-sisal");
  });

  test("4 · evento resuelve /eventos/{slug}", () => {
    expect(buildCanonicalEntityUrl({ entityType: "event", slug: "feria-candelaria" })).toBe(
      "/eventos/feria-candelaria",
    );
  });

  test("5 · experiencia resuelve ruta completa con empresa", () => {
    expect(
      buildCanonicalEntityUrl({
        entityType: "product",
        slug: "nado-en-cenote",
        destinationSlug: "valladolid",
        categorySlug: "cenotes",
        businessSlug: "zazil-tunich",
      }),
    ).toBe("/oriente-maya/valladolid/cenotes/zazil-tunich/nado-en-cenote");
  });

  test("6 · tour resuelve ruta completa", () => {
    expect(
      buildCanonicalEntityUrl({
        entityType: "product",
        slug: "tour-cenote-suytun-guiado-demo",
        destinationSlug: "valladolid",
        categorySlug: "cenotes",
        businessSlug: "cenote-suytun",
      }),
    ).toContain("/cenote-suytun/tour-cenote-suytun-guiado-demo");
  });

  test("7 · producto genérico sin empresa ⇒ null (fail-closed)", () => {
    expect(
      buildCanonicalEntityUrl({
        entityType: "product",
        slug: "algo",
        destinationSlug: "valladolid",
        categorySlug: "artesanias",
        businessSlug: null,
      }),
    ).toBeNull();
  });

  test("8 · destino publicado resuelve ficha canónica", () => {
    expect(buildCanonicalEntityUrl({ entityType: "destination", slug: "rio-lagartos" })).toBe(
      "/oriente-maya/rio-lagartos",
    );
  });

  test("9 · el catálogo NO contiene plantillas literales de ruta", () => {
    expect(CATALOG).not.toContain("/oriente-maya/");
    expect(CATALOG).not.toContain("/producto/");
    expect(CATALOG).not.toContain("/eventos/");
    expect(CATALOG).toContain("buildCanonicalEntityUrl");
    expect(CANONICAL_ENTITY_BINDING_VERSION).toBe("1.0.0");
  });
});

describe("R1-D · DEF-R1D-002 · Fail-closed estructural de candidatos", () => {
  test("10 · lugar publicado es recomendable (filtros de publicación presentes)", () => {
    expect(CATALOG).toContain('.eq("status", "published")');
    expect(CATALOG).toContain('.is("deleted_at", null)');
  });

  test("11 · lugar en draft nunca entra (sin lectura de borradores)", () => {
    expect(CATALOG).not.toContain('"draft"');
    expect(CATALOG).not.toContain("'draft'");
  });

  test("12 · tour/producto sin empresa publicada se excluye y registra razón", () => {
    expect(CATALOG).toContain("empresa contenedora no publicada");
    expect(CATALOG).toContain("rejected.push");
  });

  test("13 · entidad eliminada nunca es candidata", () => {
    expect(CATALOG.match(/\.is\("deleted_at", null\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  test("14 · ruta no construible ⇒ exclusión (sin petición HTTP por candidato)", () => {
    expect(CATALOG).toContain("ruta canónica no construible");
    expect(CATALOG).toContain("buildCanonicalEntityUrl(");
    expect(CATALOG).not.toContain("fetch(");
  });

  test("15 · zonas y rutas quedan fuera del catálogo recomendable", () => {
    expect(CATALOG_RAW).toContain("BLOQUEADO como candidato");
    expect(CATALOG).not.toContain('from("destination_zones")');
    expect(CATALOG).not.toContain('from("editorial_routes")');
  });
});

describe("R1-D · DEF-R1D-004 · Zona validada contra el destino", () => {
  test("16 · zona del mismo destino se acredita", () => {
    expect(resolveZoneSlug({ slug: "centro", destination_id: "d1" }, "d1")).toBe("centro");
    expect(
      resolveContextZoneSlug({ slug: "centro", destinationSlug: "valladolid" }, "valladolid"),
    ).toBe("centro");
  });

  test("17 · zona incompatible ⇒ null sin bloquear la recomendación", () => {
    expect(resolveZoneSlug({ slug: "centro", destination_id: "otro" }, "d1")).toBeNull();
    expect(
      resolveContextZoneSlug({ slug: "centro", destinationSlug: "izamal" }, "valladolid"),
    ).toBeNull();
    const unified = buildAluxUnifiedContext({
      context: baseCtx(),
      zone: { slug: "centro", destinationSlug: "izamal" },
    });
    expect(unified.territory.zoneSlug).toBeNull();
    expect(hasSufficientAluxContext(unified)).toBe(true);
  });
});

describe("R1-D · DEF-R1D-005 · Contexto unificado único", () => {
  test("18 · consentimiento denegado ⇒ sin coordenadas", () => {
    const unified = buildAluxUnifiedContext({
      context: baseCtx(),
      locationConsent: false,
      coords: { lat: 20.68, lng: -88.2 },
    });
    expect(unified.coords).toBeUndefined();
    expect(unified.permissions.canUseLocation).toBe(false);
  });

  test("19 · consentimiento otorgado ⇒ coordenadas presentes", () => {
    const unified = buildAluxUnifiedContext({
      context: baseCtx(),
      locationConsent: true,
      coords: { lat: 20.68, lng: -88.2 },
    });
    expect(unified.coords).toEqual({ lat: 20.68, lng: -88.2 });
  });

  test("20 · continuidad anónima declarada y fusión al registrarse", () => {
    const anon = buildAluxUnifiedContext({
      context: baseCtx(),
      isAuthenticated: false,
      hasAnonymousDraft: true,
    });
    expect(anon.permissions.hasAnonymousDraft).toBe(true);
    expect(anon.permissions.canSaveRemotely).toBe(false);
    const authed = buildAluxUnifiedContext({
      context: baseCtx(),
      isAuthenticated: true,
      hasAnonymousDraft: false,
    });
    expect(authed.permissions.canSaveRemotely).toBe(true);
  });

  test("21 · contexto insuficiente ⇒ no sugerir", () => {
    const empty = buildAluxUnifiedContext({
      context: {
        hasContext: false,
        related: [],
        reason: "sin contexto",
        origin: "none",
      },
    });
    expect(hasSufficientAluxContext(empty)).toBe(false);
  });

  test("22 · fechas, etapa y grupo viajan en el contexto, sin PII", () => {
    const unified = buildAluxUnifiedContext({
      context: baseCtx(),
      plan: {
        id: "active",
        start_date: "2026-09-10",
        end_date: "2026-09-14",
        party_size: 3,
        item_count: 4,
      },
      now: new Date("2026-09-01T00:00:00Z"),
    });
    expect(unified.trip.daysUntilStart).toBe(9);
    expect(unified.trip.partySize).toBe(3);
    expect(unified.trip.planItemCount).toBe(4);
    expect(unified.trip.stage).toBeTruthy();
    expect(unified.reason.length).toBeGreaterThan(0);
    expect(JSON.stringify(unified)).not.toContain("@");
  });

  test("23 · versión única del contrato (sin autoridad competidora)", () => {
    expect(ALUX_UNIFIED_CONTEXT_VERSION).toBe("1.0.0");
    const dock = readFileSync("src/components/layout/AluxFloatingTrigger.tsx", "utf8");
    expect(dock).toContain("buildAluxUnifiedContext");
    expect(dock).toContain("hasSufficientAluxContext");
    expect(dock).toContain("data-alux-context-version");
  });
});

describe("R1-D · DEF-R1D-001 · Chrome global con selector inequívoco", () => {
  test("24 · un SiteHeader, un PublicFooter, un dock y un planner marcados", () => {
    expect(readFileSync("src/components/layout/SiteHeader.tsx", "utf8")).toContain(
      'data-omxds-chrome="site-header"',
    );
    expect(readFileSync("src/components/layout/SiteFooter.tsx", "utf8")).toContain(
      'data-omxds-chrome="public-footer"',
    );
    expect(readFileSync("src/components/layout/AluxFloatingTrigger.tsx", "utf8")).toContain(
      'data-omxds-chrome="alux-dock"',
    );
    expect(
      readFileSync(
        "src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx",
        "utf8",
      ),
    ).toContain('data-omxds-chrome="alux-planner"');
  });
});
