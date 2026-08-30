import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "799cf248a92894893c75df22a229bf0255c72f91";
const i3ZeroHead = "6ca2ebc61dbea827a28c80f5d8254096a9123e7b";
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

const originalI3ZeroFiles = gitLines(["diff", "--name-only", `${base}...${i3ZeroHead}`]);
for (const file of originalI3ZeroFiles)
  assert.ok(allowed.has(file), `historical I3-0 scope violation: ${file}`);

for (const file of [
  "src/lib/omxds/surfaces/surface-actions.ts",
  "src/lib/omxds/surfaces/surface-contract.ts",
  "src/lib/omxds/surfaces/surface-contracts-flag.server.ts",
  "src/lib/omxds/surfaces/surface-state.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", i3ZeroHead, "--", file], {
      encoding: "utf8",
    }),
    "",
    `I3-0 shared contract regression: ${file}`,
  );

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I3-0");
assertGovernedLockBaseline(base, "I3-0");

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

const authorizations = readdirSync("docs/governance/product-authorizations")
  .filter((file) => file.endsWith(".json"))
  .map((file) =>
    JSON.parse(readFileSync(join("docs/governance/product-authorizations", file), "utf8")),
  );
const authorizedRouteConsumers = new Set(
  authorizations
    .filter(
      (authorization) =>
        authorization.status === "Approved" &&
        authorization.required_feature_flags?.includes("omxds_visual_v1_contracts_enabled=false"),
    )
    .flatMap((authorization) => authorization.permissions ?? [])
    .filter(
      (permission) =>
        ["create", "modify"].includes(permission.operation) &&
        permission.path.startsWith("src/routes/"),
    )
    .map((permission) => permission.path),
);
const flagConsumers = filesBelow("src/routes")
  .filter((file) => readFileSync(file, "utf8").includes("surface-contracts-flag.server"))
  .map((file) => relative(".", file));

for (const file of flagConsumers)
  assert.ok(authorizedRouteConsumers.has(file), `unauthorized SSR flag consumer: ${file}`);

console.log(
  "I3-0 evidence: PASS (historical scope preserved; shared contract intact; flag OFF/fail-closed; SSR consumers PCA-authorized).",
);
