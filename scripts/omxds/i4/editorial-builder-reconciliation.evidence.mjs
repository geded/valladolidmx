/**
 * I4-A/B/C · R — Evidencia de Governed Source Reconciliation (18.51).
 *
 * Declara el paquete exacto de 22 rutas candidatas y sus digests. No
 * ejecuta migraciones, ni despliegues, ni toca producción.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const evidencePath = "docs/governance/evidence/omxds-i4-abc-governed-source-reconciliation.json";
const files = [
  "src/lib/catalog/marketplace-reads.functions.ts",
  "src/lib/experience-builder/preview-registry.tsx",
  "src/lib/experience-builder/editorial-builder-policy.ts",
  "src/lib/experience-builder/blocks/experience-info-grid/contract.ts",
  "src/lib/experience-builder/block-library.ts",
  "src/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGridBlock.tsx",
  "src/lib/experience-builder/studio.functions.ts",
  "src/routes/preview/composition.$token.tsx",
  "src/components/experience-builder/VisualStudio.tsx",
  "scripts/omxds/i4/editorial-builder-authoring.test.ts",
  "scripts/omxds/i4/editorial-builder-reconciliation.test.ts",
  "scripts/omxds/i4/editorial-builder-reconciliation.evidence.mjs",
  "package.json",
  "scripts/governance/validate-full-suite.mjs",
  "docs/blueprint/18.51-OMXDS-V1-I4-ABC-GOVERNED-SOURCE-RECONCILIATION-REMEDIATION-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-016.json",
  evidencePath,
  "docs/governance/evidence/omxds-i4-c-preview-concurrency-audit-rollback.json",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
];

if (files.length !== 22)
  throw new Error(`I4-R must declare exactly 22 paths; found ${files.length}`);

const artifacts = files
  .filter((path) => path !== evidencePath)
  .map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  }));

const authorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-016.json", "utf8"),
);
if (authorization.status !== "Approved") throw new Error("PCA-2026-016 must be Approved");
if (authorization.branch !== "fix/omxds-i4-abc-governed-source-reconciliation-v1")
  throw new Error("PCA-2026-016 declares the wrong branch");
if (authorization.public_routes.length !== 0)
  throw new Error("I4-R must not declare public routes");

const evidence = {
  initiative: "I4-A/B/C · R · Governed Source Reconciliation",
  blueprint:
    "docs/blueprint/18.51-OMXDS-V1-I4-ABC-GOVERNED-SOURCE-RECONCILIATION-REMEDIATION-AUTHORIZATION-PACK-v1.0.md",
  authorization: "docs/governance/product-authorizations/PCA-2026-016.json",
  branch: "fix/omxds-i4-abc-governed-source-reconciliation-v1",
  base: "a987181a51dcfb36f026e96f784c1bd158c7629c",
  status: "PASS",
  canonical_governed_source: "geography.location",
  legacy_policy: "frozen historical render only — no edit, duplicate, reuse, template or authoring",
  provenance_rule: "only published provenance may feed the governed binding; demo is rejected",
  preview_rule:
    "server-side resolution from persisted page_type and slug; fail-closed without fictitious fallback",
  rollback_rule:
    "geography.location revalidated before eb_restore_revision; rollback stays a draft",
  release_rule:
    "publish and schedule require a clean local tree, approved workflow_state and draft_hash === approved_snapshot_hash",
  public_routes: [],
  required_feature_flags: ["omxds_visual_v1_contracts_enabled=false"],
  exact_route_count: files.length,
  exact_routes: files,
  artifacts,
};

mkdirSync("docs/governance/evidence", { recursive: true });
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
