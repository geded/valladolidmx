import fs from "node:fs";
import path from "node:path";
import { INVENTORY_PATH, scanArtifacts, summarizeArtifacts } from "./lib/artifact-inventory.mjs";

const root = process.cwd();
const sourceArg = process.argv.find((argument) => argument.startsWith("--source="));
const dateArg = process.argv.find((argument) => argument.startsWith("--generated-at="));
const sourceCommit = sourceArg?.split("=")[1] || process.env.GITHUB_SHA || "WORKTREE";
const requestedGeneratedAt = dateArg?.split("=")[1];

const dependencyMap = JSON.parse(
  fs.readFileSync(
    path.join(root, "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"),
    "utf8",
  ),
);
const scannedArtifacts = scanArtifacts(root, dependencyMap);
const artifacts = scannedArtifacts.map((artifact) => ({
  path: artifact.path,
  kind: artifact.kind,
  sha256: artifact.sha256,
  coverage: { status: artifact.coverage.status },
}));
const output = path.join(root, INVENTORY_PATH);
let previousInventory;
if (fs.existsSync(output)) {
  try {
    previousInventory = JSON.parse(fs.readFileSync(output, "utf8"));
  } catch {
    previousInventory = undefined;
  }
}

const inventory = {
  schema_version: "1.0",
  status: "Approved baseline",
  generated_at: requestedGeneratedAt || new Date().toISOString(),
  source_commit: sourceCommit,
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

const withoutGeneratedAt = ({ generated_at: _generatedAt, ...value }) => value;
if (
  !requestedGeneratedAt &&
  previousInventory?.generated_at &&
  JSON.stringify(withoutGeneratedAt(previousInventory)) === JSON.stringify(withoutGeneratedAt(inventory))
) {
  inventory.generated_at = previousInventory.generated_at;
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(inventory)}\n`);
console.log(JSON.stringify({ output: INVENTORY_PATH, ...inventory.summary }, null, 2));
