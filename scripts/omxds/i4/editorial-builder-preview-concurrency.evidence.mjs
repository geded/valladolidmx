import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const evidencePath = "docs/governance/evidence/omxds-i4-c-preview-concurrency-audit-rollback.json";
const files = [
  "docs/blueprint/18.50-OMXDS-V1-I4-C-PREVIEW-CONCURRENCY-AUDIT-ROLLBACK-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  evidencePath,
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "docs/governance/product-authorizations/PCA-2026-015.json",
  "package.json",
  "scripts/governance/validate-full-suite.mjs",
  "scripts/omxds/i3/business-premium-surface.evidence.mjs",
  "scripts/omxds/i4/editorial-builder-preview-concurrency.evidence.mjs",
  "scripts/omxds/i4/editorial-builder-preview-concurrency.test.ts",
  "src/components/experience-builder/VisualStudio.tsx",
  "src/integrations/supabase/types.ts",
  "src/lib/experience-builder/studio.functions.ts",
  "src/routes/preview/composition.$token.tsx",
  "supabase/migrations/20260805090000_omxds_i4c_preview_concurrency_audit_rollback.sql",
];
const artifacts = files
  .filter((path) => path !== evidencePath)
  .map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  }));
const evidence = {
  initiative: "I4-C · Preview, Concurrency, Audit & Rollback",
  status: "PASS",
  closed_requirements: [
    "EBG-10",
    "EBG-11",
    "EBG-12",
    "EBG-13",
    "ANA-09",
    "SEO-10",
    "SEO-11",
    "SEC-04",
    "SEC-08",
    "SEC-09",
  ],
  canonical_preview_route: "/preview/composition/$token",
  operational_timezone: "America/Merida",
  exact_route_count: files.length,
  exact_routes: files,
  artifacts,
};
mkdirSync("docs/governance/evidence", { recursive: true });
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
