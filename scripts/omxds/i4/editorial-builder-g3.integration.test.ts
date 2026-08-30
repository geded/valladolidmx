import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { EDITORIAL_BUILDER_POLICY } from "../../../src/lib/experience-builder/editorial-builder-policy";

const read = (path: string) => readFileSync(path, "utf8");
const json = <T = Record<string, unknown>>(path: string): T => JSON.parse(read(path)) as T;

const acceptancePath = "docs/governance/evidence/omxds-i4-d-g3/ACCEPTANCE-REPORT.md";
const i4cPath = "docs/governance/evidence/omxds-i4-c-preview-concurrency-audit-rollback.json";
const reconciliationPath =
  "docs/governance/evidence/omxds-i4-abc-governed-source-reconciliation.json";

const humanScenarios = [
  "G3-H01",
  "G3-H02",
  "G3-H03",
  "G3-H04",
  "G3-H05",
  "G3-H06",
  "G3-H07",
  "G3-H08",
  "G3-H09",
  "G3-H10",
  "G3-H11",
  "G3-H12",
] as const;

describe("I4-D · G3 Integration & Evidence Closure", () => {
  test("declares one authorable block and one canonical governed read-only binding", () => {
    const section = EDITORIAL_BUILDER_POLICY.blocks.find(
      (block) => block.type === "vmx.experience.section",
    );
    const infoGrid = EDITORIAL_BUILDER_POLICY.blocks.find(
      (block) => block.type === "vmx.experience.info-grid",
    );

    expect(section?.mode).toBe("authorable");
    expect(section?.authoring_roles).toContain("territorial_editor");
    expect(infoGrid?.mode).toBe("governed_read_only");
    expect(infoGrid?.allowed_sources).toEqual(["geography.location"]);
    expect(infoGrid?.fields.find((field) => field.field === "items")?.writable_by).toEqual([]);
  });

  test("integrates workflow, preview, conflict, audit and rollback contracts already closed by I4", () => {
    expect(EDITORIAL_BUILDER_POLICY.workflow.distinct_author_and_approver).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.workflow.approval_bound_to_snapshot_hash).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.workflow.edit_invalidates_approval).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.preview.may_publish).toBe(false);
    expect(EDITORIAL_BUILDER_POLICY.preview.may_mutate_commerce).toBe(false);
    expect(EDITORIAL_BUILDER_POLICY.preview.expiring_token_required).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.preview.noindex_required).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.concurrency.silent_last_write_wins).toBe(false);
    expect(EDITORIAL_BUILDER_POLICY.audit.immutable).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.rollback.restores_as_new_draft).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.rollback.revalidates_current_sources).toBe(true);
    expect(EDITORIAL_BUILDER_POLICY.rollback.publishes_automatically).toBe(false);

    const i4c = json<{
      status: string;
      closed_requirements: string[];
    }>(i4cPath);
    expect(i4c.status).toBe("PASS");
    for (const requirement of ["EBG-10", "EBG-11", "EBG-12", "EBG-13"])
      expect(i4c.closed_requirements).toContain(requirement);

    const reconciliation = json<{ status: string; canonical_governed_source: string }>(
      reconciliationPath,
    );
    expect(reconciliation.status).toBe("PASS");
    expect(reconciliation.canonical_governed_source).toBe("geography.location");
  });

  test("keeps preview non-public, non-indexable and fail-closed for missing governed data", () => {
    const preview = read("src/routes/preview/composition.$token.tsx");
    expect(preview).toContain("noindex: true");
    expect(preview).toContain("Este enlace no es válido o ya caducó.");
    expect(preview).toContain("Fuente gobernada no disponible");
    expect(preview).toContain("geography.location");
    expect(EDITORIAL_BUILDER_POLICY.preview.themes).toEqual(["sol", "luna"]);
    expect(EDITORIAL_BUILDER_POLICY.preview.viewports).toEqual([390, 768, 1024, 1440]);
  });

  test("Studio exposes keyboard, pointer/touch, dialog semantics and responsive controls for human G3 validation", () => {
    const studio = read("src/components/experience-builder/VisualStudio.tsx");
    expect(studio).toContain("KeyboardSensor");
    expect(studio).toContain("PointerSensor");
    expect(studio).toMatch(/role=["']dialog["']/);
    expect(studio).toMatch(/aria-modal=["']true["']/);
    expect(studio).toContain("flex-wrap");
    expect(studio).toContain("md:flex");
    expect(studio).toContain("max-w-[92vw]");
    expect(studio).toContain("aria-label");
  });

  test("acceptance report declares every mandatory human scenario and remains the authority for final G3 PASS", () => {
    const report = read(acceptancePath);
    expect(report).toContain("**Gate:** G3");
    expect(report).toContain("**Verdict:**");
    expect(report).toContain("**Open P0:**");
    expect(report).toContain("**Open P1:**");
    for (const scenario of humanScenarios) expect(report).toContain(`| ${scenario} |`);
  });
});
