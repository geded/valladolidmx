import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const base = "799cf248a92894893c75df22a229bf0255c72f91";
const allowed = new Set([
  "docs/blueprint/18.37-OMXDS-V1-I3-0-SHARED-SURFACE-CONTRACT-IMPLEMENTATION-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "docs/governance/product-authorizations/PCA-2026-007.json",
  "package.json",
  "scripts/omxds/i3/shared-surface.contract.test.ts",
  "scripts/omxds/i3/shared-surface.evidence.mjs",
  "src/lib/omxds/surfaces/surface-actions.ts",
  "src/lib/omxds/surfaces/surface-contract.ts",
  "src/lib/omxds/surfaces/surface-contracts-flag.server.ts",
  "src/lib/omxds/surfaces/surface-state.ts",
]);

function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const changed = new Set([
  ...gitLines(["diff", "--name-only", `${base}...HEAD`]),
  ...gitLines(["diff", "--name-only", "HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);
for (const file of changed) assert.ok(allowed.has(file), `I3-0 scope violation: ${file}`);

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(currentPackage.dependencies, basePackage.dependencies);
assert.deepEqual(currentPackage.devDependencies, basePackage.devDependencies);
assert.equal(
  execFileSync("git", ["diff", "--name-only", base, "--", "bun.lock"], { encoding: "utf8" }),
  "",
);

const flagAlias = readFileSync("src/lib/omxds/surfaces/surface-contracts-flag.server.ts", "utf8");
assert.match(flagAlias, /OMXDS_CARD_CONTRACTS_FLAG as OMXDS_SURFACE_CONTRACTS_FLAG/);
assert.match(flagAlias, /getOmxdsCardContractsFlag as getOmxdsSurfaceContractsFlag/);
assert.doesNotMatch(flagAlias, /createServerFn|createClient|platform_settings/);

const flagMigration = readFileSync(
  "supabase/migrations/20260723093000_omxds_visual_v1_contracts_flag.sql",
  "utf8",
);
assert.match(flagMigration, /omxds_visual_v1_contracts_enabled/);
assert.match(flagMigration, /to_jsonb\(false\)/);

function filesBelow(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...filesBelow(path));
    else files.push(path);
  }
  return files;
}

for (const directory of ["src/routes", "src/components"])
  for (const file of filesBelow(directory)) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /omxds\/surfaces|surface-contracts-flag\.server/,
      `public consumer introduced: ${relative(".", file)}`,
    );
  }

console.log(
  "I3-0 evidence: PASS (shared contract only; fictitious fixtures; existing flag OFF/fail-closed; no public consumers).",
);
