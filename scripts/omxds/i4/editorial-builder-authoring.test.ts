import { describe, expect, test } from "bun:test";
import {
  EDITORIAL_BUILDER_POLICY,
  canListEditorialBlock,
  collectEditorialMediaPaths,
  resolveEditorialActor,
  resolveEditorialSurface,
  validateEditorialCompositionTree,
} from "../../../src/lib/experience-builder/editorial-builder-policy";
import { getBlock, listAuthorableBlocks } from "../../../src/lib/experience-builder/block-registry";
import "../../../src/lib/experience-builder/block-library";

const mediaPath = "2026/fictitious-i4-a.webp";
const mediaUrl = `/api/public/studio-media/${mediaPath}`;
const media = new Set([mediaPath]);
const hero = (overrides: Record<string, unknown> = {}) => ({
  id: "hero-fictitious",
  type: "vmx.experience.hero",
  version: "1.0.0",
  config: { variant: "immersive", title: "Destino Lucero Ficticio", ...overrides },
});
const tree = (...children: ReturnType<typeof hero>[]) => ({ root: { children } });

describe("I4-A authoring allowlist and legacy confinement", () => {
  test("reconciles the six concepts to the runtime families plus legacy HTML", () => {
    expect(EDITORIAL_BUILDER_POLICY.blocks.map((block) => block.type)).toEqual([
      "vmx.experience.hero",
      "vmx.experience.section",
      "vmx.experience.gallery",
      "vmx.experience.info-grid",
      "vmx.experience.institutional-badges",
      "vmx.discovery.navigator",
      // G8-E · plantillas compuestas premium aprobadas (schema cerrado).
      "vmx.home.premium-g4",
      "vmx.alux.planner",
      // G8 · paridad de autoría de la Home premium aprobada.
      "vmx.hero",
      "vmx.smart.destinations-grid",
      "vmx.smart.businesses-grid",
      "vmx.smart.products-grid",
      "vmx.smart.events-list",
      "vmx.section.rutas",
      "vmx.section.arma-tu-viaje",
      "vmx.experience.map",
      "vmx.destination.premium-g4",
      "vmx.listing.premium-g5",
      "vmx.custom.html",
    ]);
    expect(getBlock("vmx.experience.hero")?.editorial?.mode).toBe("authorable");
    expect(getBlock("vmx.custom.html")?.editorial?.mode).toBe("legacy_read_only");
  });

  test("normalizes page kinds and RBAC without trusting client aliases", () => {
    expect(resolveEditorialSurface("hotel")).toBe("business");
    expect(resolveEditorialSurface("event")).toBe("product");
    expect(resolveEditorialSurface("custom")).toBeNull();
    expect(resolveEditorialActor(["admin"])).toBe("founder_admin");
    expect(resolveEditorialActor(["editor"])).toBe("territorial_editor");
    expect(resolveEditorialActor(["business_owner"])).toBe("business_author");
    expect(resolveEditorialActor(["traveler"])).toBeNull();
  });

  test("exposes only policy blocks for the resolved surface and actor", () => {
    const blocks = listAuthorableBlocks("destination", "territorial_editor").map(
      (block) => block.type,
    );
    expect(blocks).toContain("vmx.experience.hero");
    expect(blocks).not.toContain("vmx.custom.html");
    expect(blocks).not.toContain("vmx.hero");
    expect(canListEditorialBlock("vmx.experience.hero", "business", "business_author")).toBe(true);
    expect(canListEditorialBlock("vmx.experience.hero", "destination", "business_author")).toBe(
      false,
    );
  });

  test("accepts a canonical authorable tree and registered media", () => {
    const candidate = tree(hero({ mediaUrl }));
    expect(collectEditorialMediaPaths(candidate)).toEqual([mediaPath]);
    expect(
      validateEditorialCompositionTree({
        tree: candidate,
        surface: "destination",
        actor: "territorial_editor",
        registered_media_paths: media,
      }),
    ).toEqual({ valid: true, errors: [] });
  });

  test("fails closed for aliases, unknown fields, variants, HTML and external URLs", () => {
    // G8 · `vmx.hero` ya es un contrato productivo; el alias inexistente
    // sigue congelado como nodo histórico (fail-closed).
    const aliases = validateEditorialCompositionTree({
      tree: tree({ ...hero(), type: "vmx.hero.alias" }),
      surface: "destination",
      actor: "territorial_editor",
      registered_media_paths: media,
    });
    expect(aliases.valid).toBe(false);
    expect(aliases.errors.join(" ")).toContain("historical node");

    // El contrato productivo `vmx.hero` sólo autoriza home y landing.
    const outOfSurface = validateEditorialCompositionTree({
      tree: tree({ ...hero(), type: "vmx.hero", config: { variant: "cinematic", title: "X" } }),
      surface: "destination",
      actor: "territorial_editor",
      registered_media_paths: media,
    });
    expect(outOfSurface.valid).toBe(false);
    expect(outOfSurface.errors.join(" ")).toContain('surface "destination" is not allowed');

    const malicious = validateEditorialCompositionTree({
      tree: tree(
        hero({
          variant: "invented",
          extensions: { html: "<script>alert(1)</script>" },
          ctaPrimary: { label: "Salir", href: "https://example.invalid" },
        }),
      ),
      surface: "destination",
      actor: "territorial_editor",
      registered_media_paths: media,
    });
    expect(malicious.valid).toBe(false);
    expect(malicious.errors.join(" ")).toMatch(/variant|field|external URL|markup/);
  });

  test("requires every new media URL to resolve in Media Registry", () => {
    const result = validateEditorialCompositionTree({
      tree: tree(hero({ mediaUrl })),
      surface: "destination",
      actor: "territorial_editor",
      registered_media_paths: new Set(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "vmx.experience.hero.mediaUrl: media.registry reference required",
    );
  });

  test("allows historical nodes only when identity, payload, parent and order remain exact", () => {
    const legacy = {
      id: "legacy-fictitious",
      type: "vmx.custom.html",
      version: "1.0.0",
      config: { html: "<p>Archivo histórico ficticio</p>" },
    };
    const previous = { root: { children: [legacy, hero()] } };
    const unchanged = { root: { children: [legacy, hero({ title: "Título actualizado" })] } };
    expect(
      validateEditorialCompositionTree({
        tree: unchanged,
        previous_tree: previous,
        surface: "destination",
        actor: "territorial_editor",
        registered_media_paths: media,
      }).valid,
    ).toBe(true);

    for (const candidate of [
      { root: { children: [hero(), legacy] } },
      { root: { children: [{ ...legacy, config: { html: "<p>Editado</p>" } }, hero()] } },
      tree(hero()),
    ]) {
      const rejected = validateEditorialCompositionTree({
        tree: candidate,
        previous_tree: previous,
        surface: "destination",
        actor: "territorial_editor",
        registered_media_paths: media,
      });
      expect(rejected.valid).toBe(false);
    }
  });

  test("rejects legacy and governed bypass through duplicate or template", () => {
    const legacyTree = {
      root: {
        children: [
          {
            id: "legacy-fictitious",
            type: "vmx.custom.html",
            version: "1.0.0",
            config: { html: "<p>Histórico</p>" },
          },
        ],
      },
    };
    for (const operation of ["duplicate", "template_new"] as const) {
      expect(
        validateEditorialCompositionTree({
          tree: legacyTree,
          surface: "destination",
          actor: "founder_admin",
          operation,
          registered_media_paths: media,
        }).valid,
      ).toBe(false);
    }
  });

  test("freezes legacy info-grid and admits only the canonical geography.location binding", () => {
    const legacyGoverned = {
      id: "info-fictitious",
      type: "vmx.experience.info-grid",
      version: "1.0.0",
      config: {
        variant: "cards",
        heading: "Información",
        source: "business",
        items: [{ label: "Horario", value: "Registro ficticio" }],
      },
    };
    const previous = { root: { children: [legacyGoverned] } };
    // 18.51 · El render histórico se conserva sólo byte a byte.
    expect(
      validateEditorialCompositionTree({
        tree: previous,
        previous_tree: previous,
        surface: "business",
        actor: "territorial_editor",
        registered_media_paths: media,
      }).valid,
    ).toBe(true);
    // Toda edición sobre legacy queda prohibida, incluso presentacional.
    expect(
      validateEditorialCompositionTree({
        tree: {
          root: {
            children: [
              { ...legacyGoverned, config: { ...legacyGoverned.config, variant: "list" } },
            ],
          },
        },
        previous_tree: previous,
        surface: "business",
        actor: "territorial_editor",
        registered_media_paths: media,
      }).valid,
    ).toBe(false);
    // Legacy no se duplica ni se convierte en plantilla.
    for (const operation of ["duplicate", "template_new"] as const)
      expect(
        validateEditorialCompositionTree({
          tree: previous,
          previous_tree: previous,
          surface: "business",
          actor: "territorial_editor",
          operation,
          registered_media_paths: media,
        }).valid,
      ).toBe(false);
  });

  test("admits new info-grid authoring only through geography.location without client items", () => {
    const governedNew = {
      id: "info-governed",
      type: "vmx.experience.info-grid",
      version: "1.0.0",
      config: {
        variant: "cards",
        heading: "Información clave",
        source: "geography.location",
        items: [],
      },
    };
    expect(
      validateEditorialCompositionTree({
        tree: { root: { children: [governedNew] } },
        surface: "business",
        actor: "territorial_editor",
        registered_media_paths: media,
      }).valid,
    ).toBe(true);
    for (const forbidden of [
      { ...governedNew.config, source: "manual" },
      { ...governedNew.config, items: [{ label: "Horario", value: "Escrito por el cliente" }] },
    ])
      expect(
        validateEditorialCompositionTree({
          tree: { root: { children: [{ ...governedNew, config: forbidden }] } },
          surface: "business",
          actor: "territorial_editor",
          registered_media_paths: media,
        }).valid,
      ).toBe(false);
  });
});
