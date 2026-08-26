/**
 * I4-D · G3 Integration & Evidence Closure.
 *
 * Integra evidencia ya cerrada por I4-A/B/C/R y la aceptación operativa single-actor.
 * No publica, no despliega y no toca datos reales.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const base = "d02942d07b9fc96e9a39f1faf4bbafb28ec7a5c2";
const branch = "feature/omxds-i4-d-g3-integration-evidence-closure-v1";
const evidencePath = "docs/governance/evidence/omxds-i4-d-g3-integration-closure.json";
const acceptancePath = "docs/governance/evidence/omxds-i4-d-g3/ACCEPTANCE-REPORT.md";

const files = [
  "scripts/omxds/i4/editorial-builder-g3.integration.test.ts",
  "scripts/omxds/i4/editorial-builder-g3.evidence.mjs",
  "package.json",
  "scripts/governance/validate-full-suite.mjs",
  "docs/blueprint/18.52-OMXDS-V1-I4-D-G3-INTEGRATION-EVIDENCE-CLOSURE-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-017.json",
  evidencePath,
  acceptancePath,
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
];

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
];

if (files.length !== 12)
  throw new Error(`I4-D must declare exactly 12 paths; found ${files.length}`);

const authorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-017.json", "utf8"),
);
if (authorization.status !== "Approved") throw new Error("PCA-2026-017 must be Approved");
if (authorization.branch !== branch) throw new Error("PCA-2026-017 declares the wrong branch");
if (!Array.isArray(authorization.public_routes) || authorization.public_routes.length !== 0)
  throw new Error("I4-D must not declare public routes");
if (
  authorization.permissions.length !== 1 ||
  authorization.permissions[0]?.operation !== "modify" ||
  authorization.permissions[0]?.path !== "package.json"
)
  throw new Error("I4-D PCA must authorize only package.json in protected product scope");
if (!authorization.required_feature_flags?.includes("omxds_visual_v1_contracts_enabled=false"))
  throw new Error("I4-D requires omxds_visual_v1_contracts_enabled=false");

const report = readFileSync(acceptancePath, "utf8");
const verdict = report.match(/\*\*Verdict:\*\*\s*([^\n]+)/)?.[1]?.trim();
const openP0 = report.match(/\*\*Open P0:\*\*\s*([^\n]+)/)?.[1]?.trim();
const openP1 = report.match(/\*\*Open P1:\*\*\s*([^\n]+)/)?.[1]?.trim();

if (verdict !== "SINGLE-ACTOR OPERATIONAL ACCEPTANCE: PASS")
  throw new Error(`G3 single-actor acceptance is not PASS; found ${verdict ?? "missing"}`);
if (openP0 !== "0") throw new Error(`G3 requires Open P0: 0; found ${openP0 ?? "missing"}`);
if (openP1 !== "0") throw new Error(`G3 requires Open P1: 0; found ${openP1 ?? "missing"}`);

const deferredScenarios = new Map([
  ["G3-H07", "DEFERRED — accesibilidad asistida no bloqueante"],
  ["G3-H11", "DEFERRED — segunda identidad no habilitada"],
  ["G3-H12", "DEFERRED — segunda identidad no habilitada"],
]);

for (const id of humanScenarios) {
  const line = report.split("\n").find((candidate) => candidate.startsWith(`| ${id} |`));
  if (!line) throw new Error(`Missing human acceptance scenario ${id}`);
  const cells = line.split("|").map((cell) => cell.trim());
  const status = cells[3];
  const evidence = cells[4];
  const deferredStatus = deferredScenarios.get(id);
  if (deferredStatus) {
    if (status !== deferredStatus)
      throw new Error(`${id} must remain ${deferredStatus}; found ${status || "missing"}`);
  } else if (!status.startsWith("PASS")) {
    throw new Error(`${id} must be PASS; found ${status || "missing"}`);
  }
  if (!evidence || /^(pendiente|n\/a)$/i.test(evidence))
    throw new Error(`${id} requires a concrete evidence reference`);
}

if (!report.includes("antes de habilitar una segunda identidad editorial"))
  throw new Error("G3 must preserve multi-actor validation before a second identity");
if (!report.includes("La separación técnica autor–aprobador no se elimina ni relaja"))
  throw new Error("G3 must preserve fail-closed author-approver separation");

const i4c = JSON.parse(
  readFileSync(
    "docs/governance/evidence/omxds-i4-c-preview-concurrency-audit-rollback.json",
    "utf8",
  ),
);
const reconciliation = JSON.parse(
  readFileSync("docs/governance/evidence/omxds-i4-abc-governed-source-reconciliation.json", "utf8"),
);
if (i4c.status !== "PASS") throw new Error("I4-C evidence must remain PASS");
for (const requirement of ["EBG-10", "EBG-11", "EBG-12", "EBG-13"])
  if (!i4c.closed_requirements?.includes(requirement))
    throw new Error(`I4-C no longer closes ${requirement}`);
if (reconciliation.status !== "PASS") throw new Error("I4-A/B/C reconciliation must remain PASS");
if (reconciliation.canonical_governed_source !== "geography.location")
  throw new Error("I4-D requires canonical governed source geography.location");

const artifacts = files
  .filter((path) => path !== evidencePath)
  .map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  }));

const evidence = {
  initiative: "I4-D · G3 Integration & Evidence Closure",
  gate: "G3",
  status: "PASS",
  base,
  branch,
  blueprint:
    "docs/blueprint/18.52-OMXDS-V1-I4-D-G3-INTEGRATION-EVIDENCE-CLOSURE-AUTHORIZATION-PACK-v1.0.md",
  authorization: "docs/governance/product-authorizations/PCA-2026-017.json",
  acceptance_report: acceptancePath,
  vertical_slice: {
    authorable_block: "vmx.experience.section",
    governed_read_only_block: "vmx.experience.info-grid",
    governed_source: "geography.location",
    preview_route: "/preview/composition/$token",
    public_routes_added: [],
  },
  inherited_closure: ["I4-A", "I4-B", "I4-C", "I4-R"],
  human_scenarios: humanScenarios,
  operational_model: "single-actor",
  deferred_non_blocking: [...deferredScenarios.keys()],
  open_p0: 0,
  open_p1: 0,
  required_feature_flags: ["omxds_visual_v1_contracts_enabled=false"],
  exact_route_count: files.length,
  exact_routes: files,
  artifacts,
};

mkdirSync("docs/governance/evidence", { recursive: true });
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
