import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  INVENTORY_PATH,
  classifyArtifact,
  extractMasterIndexPaths,
  isRelevantArtifact,
  scanArtifacts,
  summarizeArtifacts,
} from "./lib/artifact-inventory.mjs";

const root = process.cwd();
const baseArg = process.argv.find((argument) => argument.startsWith("--base="));
const base = baseArg?.split("=")[1];
const errors = [];
const warnings = [];

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const dependencyMap = JSON.parse(
  read("docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"),
);
const inventory = JSON.parse(read(INVENTORY_PATH));
const bootstrapExceptions = new Set(inventory.policy?.bootstrap_exceptions || []);
const currentArtifacts = scanArtifacts(root, dependencyMap);
const currentByPath = new Map(currentArtifacts.map((artifact) => [artifact.path, artifact]));
const registeredByPath = new Map(
  (inventory.artifacts || []).map((artifact) => [artifact.path, artifact]),
);
const currentSummary = summarizeArtifacts(currentArtifacts);

for (const artifact of currentArtifacts) {
  const registered = registeredByPath.get(artifact.path);
  if (!registered) {
    errors.push(`Unregistered artifact: ${artifact.path}`);
    continue;
  }
  if (registered.sha256 !== artifact.sha256) errors.push(`Stale fingerprint: ${artifact.path}`);
  if (registered.kind !== artifact.kind) errors.push(`Stale classification: ${artifact.path}`);
  if (registered.coverage?.status !== artifact.coverage.status)
    errors.push(`Stale coverage: ${artifact.path}`);
}
for (const registered of inventory.artifacts || []) {
  if (!currentByPath.has(registered.path))
    errors.push(`Registered artifact no longer exists: ${registered.path}`);
}

const blueprintFiles = currentArtifacts
  .filter((artifact) => artifact.kind === "blueprint_document")
  .map((artifact) => artifact.path)
  .sort();
const indexPaths = extractMasterIndexPaths(read("docs/governance/06-BLUEPRINT-MASTER-INDEX.md"));
for (const file of blueprintFiles)
  if (!indexPaths.includes(file)) errors.push(`Blueprint absent from 06: ${file}`);
for (const file of indexPaths)
  if (!blueprintFiles.includes(file)) errors.push(`06 references missing Blueprint: ${file}`);

function changedFilesFromGit(baseRef) {
  const output = childProcess.execFileSync(
    "git",
    ["diff", "--name-status", "--find-renames", `${baseRef}...HEAD`],
    { cwd: root, encoding: "utf8" },
  );
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const status = parts[0];
      const file = status.startsWith("R") ? parts[2] : parts[1];
      const previous = status.startsWith("R") ? parts[1] : null;
      return { status, file, previous };
    });
}

if (base) {
  const changes = changedFilesFromGit(base);
  let baseInventory = null;
  try {
    baseInventory = JSON.parse(
      childProcess.execFileSync("git", ["show", `${base}:${INVENTORY_PATH}`], {
        cwd: root,
        encoding: "utf8",
      }),
    );
  } catch {
    warnings.push("BASELINE_INVENTORY_NOT_FOUND first activation of governance integrity");
  }

  if (baseInventory) {
    if (currentSummary.gaps > baseInventory.summary.gaps) {
      errors.push(
        `Governance debt increased: gaps ${baseInventory.summary.gaps} -> ${currentSummary.gaps}`,
      );
    }
    if (currentSummary.covered_exact < baseInventory.summary.covered_exact) {
      errors.push(
        `Exact coverage decreased: ${baseInventory.summary.covered_exact} -> ${currentSummary.covered_exact}`,
      );
    }
  }

  const evidenceChanged = changes.some(
    (change) =>
      change.file?.startsWith("docs/blueprint/") ||
      change.file?.startsWith("docs/decisions/") ||
      change.file?.startsWith("docs/governance/audit/"),
  );
  const sensitiveKinds = new Set(["domain_config", "seo", "surface_template", "workflow"]);

  for (const change of changes) {
    const file = change.file;
    const relevantNow = file && isRelevantArtifact(file);
    const relevantBefore = change.previous && isRelevantArtifact(change.previous);
    if (!relevantNow && !relevantBefore) continue;

    const kind = relevantNow ? classifyArtifact(file) : classifyArtifact(change.previous);
    if (kind === "migration" && !change.status.startsWith("A")) {
      errors.push(`Migration history is immutable (${change.status}): ${file || change.previous}`);
    }

    if (change.status.startsWith("A")) {
      const artifact = currentByPath.get(file);
      if (
        artifact &&
        artifact.coverage.status !== "covered_exact" &&
        !bootstrapExceptions.has(file)
      ) {
        errors.push(`New artifact lacks exact 07/08 traceability: ${file}`);
      }
    }

    if (sensitiveKinds.has(kind) && !evidenceChanged) {
      errors.push(
        `Sensitive ${kind} change requires evidence in docs/blueprint, docs/decisions or governance audit: ${file}`,
      );
    }

    if ((change.status.startsWith("D") || change.status.startsWith("R")) && !evidenceChanged) {
      errors.push(
        `Removed or renamed governed artifact requires documentary evidence: ${file || change.previous}`,
      );
    }
  }
}

if (inventory.summary?.gaps !== currentSummary.gaps) {
  errors.push(
    `Gap count is stale: registry=${inventory.summary?.gaps}, current=${currentSummary.gaps}`,
  );
}
if (inventory.policy?.model !== "ratchet") errors.push("Inventory policy must remain ratchet");

for (const artifact of currentArtifacts.filter(
  (item) => item.coverage.status !== "covered_exact",
)) {
  warnings.push(
    `GRANDFATHERED_${artifact.coverage.status.toUpperCase()} ${artifact.kind} ${artifact.path}`,
  );
}

const result = {
  result: errors.length ? "FAIL" : "PASS",
  source_commit: inventory.source_commit,
  total_artifacts: currentSummary.total,
  covered: currentSummary.covered,
  covered_exact: currentSummary.covered_exact,
  covered_inherited: currentSummary.covered_inherited,
  grandfathered_gaps: currentSummary.gaps,
  coverage_percent: currentSummary.coverage_percent,
  errors,
  warning_count: warnings.length,
};

console.log(JSON.stringify(result, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Governance Integrity\n\n- Result: **${result.result}**\n- Artifacts: ${result.total_artifacts}\n- Exact coverage: ${result.covered_exact}\n- Inherited coverage: ${result.covered_inherited}\n- Uncovered gaps: ${result.grandfathered_gaps}\n- Coverage: ${result.coverage_percent}%\n- Errors: ${errors.length}\n`,
  );
}
if (errors.length) process.exitCode = 1;
