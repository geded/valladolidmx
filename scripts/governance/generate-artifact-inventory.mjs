import fs from "node:fs";
import path from "node:path";
import {
  INVENTORY_PATH,
  scanArtifacts,
  sha256File,
  summarizeArtifacts,
} from "./lib/artifact-inventory.mjs";
import { readMasterIndex } from "./lib/master-index.mjs";

const root = process.cwd();
const dateArg = process.argv.find((argument) => argument.startsWith("--generated-at="));
const requestedGeneratedAt = dateArg?.split("=")[1];
const masterIndex = readMasterIndex(root);
const reviewedDates = masterIndex.rows
  .map((row) => row.reviewedAt)
  .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
if (!reviewedDates.length)
  throw new Error("06 lacks a canonical reviewed date for deterministic inventory metadata");
const generatedAt = requestedGeneratedAt || `${reviewedDates.sort().at(-1)}T00:00:00.000Z`;

const dependencyMap = JSON.parse(
  fs.readFileSync(
    path.join(root, "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"),
    "utf8",
  ),
);
const sourceBasis = {
  master_index_sha256: sha256File(path.join(root, "docs/governance/06-BLUEPRINT-MASTER-INDEX.md")),
  dependency_map_sha256: sha256File(
    path.join(root, "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"),
  ),
  knowledge_graph_sha256: sha256File(
    path.join(root, "docs/governance/generated/08-KNOWLEDGE-GRAPH.json"),
  ),
  generator: "scripts/governance/generate-artifact-inventory.mjs",
};
const scannedArtifacts = scanArtifacts(root, dependencyMap);
const artifacts = scannedArtifacts.map((artifact) => ({
  path: artifact.path,
  kind: artifact.kind,
  sha256: artifact.sha256,
  coverage: { status: artifact.coverage.status },
}));
const output = path.join(root, INVENTORY_PATH);

const inventory = {
  schema_version: "1.0",
  status: "Approved baseline",
  generated_at: generatedAt,
  source_basis: sourceBasis,
  policy: {
    model: "ratchet",
    rule: "Existing gaps remain visible; new governance debt is rejected.",
    critical_additions_require_traceability: true,
    migrations_are_immutable: true,
    bootstrap_exceptions: [
      ".github/workflows/governance-integrity.yml",
      "scripts/governance/generate-artifact-inventory.mjs",
      "scripts/governance/lib/artifact-inventory.mjs",
      "scripts/governance/validate-governance-integrity.mjs",
    ],
  },
  summary: summarizeArtifacts(scannedArtifacts),
  artifacts,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(inventory)}\n`);
console.log(JSON.stringify({ output: INVENTORY_PATH, ...inventory.summary }, null, 2));
