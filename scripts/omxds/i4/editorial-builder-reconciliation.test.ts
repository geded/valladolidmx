/**
 * I4-A/B/C · R — Governed Source Reconciliation (18.51 · PCA-2026-016).
 *
 * Verifica la remediación mínima: binding canónico único para
 * `vmx.experience.info-grid`, legacy congelado, procedencia publicada,
 * preview server-side fail-closed, rollback revalidado y publicación
 * sin guardado implícito.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  INFO_GRID_CANONICAL_SOURCE,
  INFO_GRID_TYPE,
  getEditorialBlockPolicy,
  isLegacyInfoGridConfig,
  validateEditorialCompositionTree,
} from "../../../src/lib/experience-builder/editorial-builder-policy";
import {
  EXPERIENCE_INFO_GRID_CANONICAL_SOURCE,
  buildGovernedLocationItems,
  experienceInfoGridAuthoringConfigSchema,
  isLegacyExperienceInfoGridConfig,
} from "../../../src/lib/experience-builder/blocks/experience-info-grid/contract";
import { getBlock } from "../../../src/lib/experience-builder/block-registry";
import "../../../src/lib/experience-builder/block-library";

const media = new Set<string>();
const node = (config: Record<string, unknown>) => ({
  id: "info-reconciliation",
  type: INFO_GRID_TYPE,
  version: "1.0.0",
  config,
});
const tree = (config: Record<string, unknown>) => ({ root: { children: [node(config)] } });
const read = (path: string) => readFileSync(path, "utf8");

describe("I4-R governed source reconciliation", () => {
  test("declares geography.location as the single canonical binding", () => {
    expect(EXPERIENCE_INFO_GRID_CANONICAL_SOURCE).toBe("geography.location");
    expect(INFO_GRID_CANONICAL_SOURCE).toBe("geography.location");
    const policy = getEditorialBlockPolicy(INFO_GRID_TYPE);
    expect(policy?.mode).toBe("governed_read_only");
    expect(policy?.allowed_sources).toEqual(["geography.location"]);
    expect(policy?.fields.find((field) => field.field === "items")?.source_id).toBe(
      "geography.location",
    );
    const contract = getBlock(INFO_GRID_TYPE);
    expect(Object.keys(contract?.schema ?? {})).not.toContain("items");
    expect(
      (contract?.schema.source as { options?: Array<{ value: string }> } | undefined)?.options,
    ).toEqual([{ value: "geography.location", label: "Ubicación gobernada (geography.location)" }]);
  });

  test("rejects manual source and client-authored items for new authoring", () => {
    expect(experienceInfoGridAuthoringConfigSchema.safeParse({ source: "manual" }).success).toBe(
      false,
    );
    expect(
      experienceInfoGridAuthoringConfigSchema.safeParse({
        source: "geography.location",
        items: [{ label: "Horario", value: "Manual" }],
      }).success,
    ).toBe(false);
    expect(
      experienceInfoGridAuthoringConfigSchema.safeParse({ source: "geography.location" }).success,
    ).toBe(true);
    expect(
      validateEditorialCompositionTree({
        tree: tree({ variant: "cards", source: "geography.location", items: [] }),
        surface: "business",
        actor: "territorial_editor",
        registered_media_paths: media,
      }).valid,
    ).toBe(true);
    for (const config of [
      { variant: "cards", source: "manual", items: [] },
      {
        variant: "cards",
        source: "geography.location",
        items: [{ label: "Horario", value: "Manual" }],
      },
    ])
      expect(
        validateEditorialCompositionTree({
          tree: tree(config),
          surface: "business",
          actor: "territorial_editor",
          registered_media_paths: media,
        }).valid,
      ).toBe(false);
  });

  test("keeps legacy configurations as frozen historical render only", () => {
    const legacy = { variant: "cards", source: "business", items: [{ label: "A", value: "B" }] };
    expect(isLegacyInfoGridConfig(legacy)).toBe(true);
    expect(isLegacyExperienceInfoGridConfig(legacy)).toBe(true);
    expect(isLegacyExperienceInfoGridConfig({ source: "geography.location", items: [] })).toBe(
      false,
    );
    expect(
      validateEditorialCompositionTree({
        tree: tree(legacy),
        previous_tree: tree(legacy),
        surface: "business",
        actor: "territorial_editor",
        registered_media_paths: media,
      }).valid,
    ).toBe(true);
    for (const operation of ["duplicate", "template_new"] as const)
      expect(
        validateEditorialCompositionTree({
          tree: tree(legacy),
          previous_tree: tree(legacy),
          surface: "business",
          actor: "territorial_editor",
          operation,
          registered_media_paths: media,
        }).valid,
      ).toBe(false);
  });

  test("only published provenance with real coordinates feeds the binding", () => {
    const location = {
      label: "Sede",
      address_line1: "Calle 41 s/n",
      address_line2: "Centro, Valladolid",
      latitude: 20.6893,
      longitude: -88.2011,
    };
    expect(
      buildGovernedLocationItems({ provenance: "published", primary_location: location })?.length,
    ).toBe(2);
    expect(
      buildGovernedLocationItems({ provenance: "demo", primary_location: location }),
    ).toBeNull();
    expect(
      buildGovernedLocationItems({ provenance: "published", primary_location: null }),
    ).toBeNull();
    expect(
      buildGovernedLocationItems({
        provenance: "published",
        primary_location: { ...location, latitude: null },
      }),
    ).toBeNull();
    expect(buildGovernedLocationItems(null)).toBeNull();
  });

  test("reuses the canonical reader and surface provider without new readers", () => {
    const reader = read("src/lib/catalog/marketplace-reads.functions.ts");
    expect(reader).toContain("export const getMarketplaceBusinessBySlug");
    expect(reader).toContain('provenance: "published"');
    expect(reader).toContain("detailPrimaryLocation");
    const registry = read("src/lib/experience-builder/preview-registry.tsx");
    expect(registry).toContain('provenance: "demo"');
    const block = read(
      "src/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGridBlock.tsx",
    );
    expect(block).toContain("BusinessSurfaceContext");
    expect(block).toContain("GovernedSourceUnavailable");
  });

  test("resolves preview server-side and fails closed without a governed source", () => {
    const functions = read("src/lib/experience-builder/studio.functions.ts");
    expect(functions).toContain("export async function resolveGovernedLocationSource");
    expect(functions).toContain("pageType: String(comp.page_type)");
    expect(functions).toContain("slug: String(comp.slug)");
    expect(functions).toContain("governed_source_error");
    expect(functions).toContain("i4_rollback_rejected");
    expect(functions.indexOf("i4_rollback_rejected")).toBeLessThan(
      functions.indexOf('.rpc("eb_restore_revision"'),
    );
    const route = read("src/routes/preview/composition.$token.tsx");
    expect(route).toContain("requires_governed_source");
    expect(route).toContain("Fuente gobernada no disponible");
    expect(route).toContain("BusinessSurfaceProvider");
  });

  test("publishes and schedules without implicit saving", () => {
    const studio = read("src/components/experience-builder/VisualStudio.tsx");
    expect(studio).toContain("const releaseBlocker = ()");
    expect(studio).toContain("approved_snapshot_hash");
    expect(studio).not.toContain(
      "const saveResult = await save({\n        data: { id: page.id, tree, expected_hash:",
    );
    const publishBody = studio.slice(
      studio.indexOf("const onPublish = async () => {"),
      studio.indexOf("const openPublishDialog"),
    );
    expect(publishBody).not.toContain("await save(");
    const scheduleBody = studio.slice(
      studio.indexOf("const onSchedule = async () => {"),
      studio.indexOf("const onCancelSchedule"),
    );
    expect(scheduleBody).not.toContain("await save(");
  });
});
