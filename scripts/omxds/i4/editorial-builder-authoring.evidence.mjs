import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const base = "1fe83c8bfb8874468560c9c3c7d89ded0073a252";
const branch = "feature/omxds-i4-a-authoring-allowlist-legacy-confinement-v1";
const allowed = new Set([
  "src/lib/experience-builder/editorial-builder-policy.ts",
  "src/lib/experience-builder/block-registry.ts",
  "src/lib/experience-builder/block-library.ts",
  "src/components/experience-builder/VisualStudio.tsx",
  "src/lib/experience-builder/studio.functions.ts",
  "scripts/omxds/i4/editorial-builder-authoring.test.ts",
  "scripts/omxds/i4/editorial-builder-authoring.evidence.mjs",
  "package.json",
  "scripts/governance/validate-full-suite.mjs",
  "docs/blueprint/18.48-OMXDS-V1-I4-A-AUTHORING-ALLOWLIST-LEGACY-CONFINEMENT-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-013.json",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "scripts/omxds/i4/editorial-builder.evidence.mjs",
]);

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function lines(value) {
  return value.split("\n").filter(Boolean);
}

const head = git(["rev-parse", "HEAD"]);
let comparisonTip = head;
let mode = "single_commit";
if (head === base) {
  mode = "base_worktree";
} else if (process.env.GITHUB_EVENT_NAME === "pull_request") {
  assert.ok(process.env.GITHUB_EVENT_PATH);
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  assert.equal(event.pull_request?.base?.sha, base);
  comparisonTip = event.pull_request?.head?.sha;
  assert.match(comparisonTip, /^[0-9a-f]{40}$/);
  assert.equal(head, process.env.GITHUB_SHA);
  mode = "github_pr_merge";
} else {
  assert.equal(git(["merge-base", base, head]), base);
  assert.equal(git(["rev-list", "--count", `${base}..${head}`]), "1");
}

const changed =
  mode === "base_worktree"
    ? new Set([
        ...lines(git(["diff", "--name-only", base, "--"])),
        ...lines(git(["ls-files", "--others", "--exclude-standard"])),
      ])
    : new Set(lines(git(["diff", "--name-only", base, comparisonTip, "--"])));
assert.equal(changed.size, 16, `I4-A must contain exactly 16 paths; found ${changed.size}`);
assert.deepEqual([...changed].sort(), [...allowed].sort());

const currentBranch = process.env.GITHUB_HEAD_REF || git(["branch", "--show-current"]);
if (currentBranch) assert.equal(currentBranch, branch);

const basePackage = JSON.parse(git(["show", `${base}:package.json`]));
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(currentPackage.dependencies, basePackage.dependencies);
assert.deepEqual(currentPackage.devDependencies, basePackage.devDependencies);
assert.equal(git(["diff", "--name-only", base, "--", "bun.lock"]), "");
assert.equal(
  currentPackage.scripts["test:i4:a"],
  "bun test scripts/omxds/i4/editorial-builder-authoring.test.ts",
);
assert.equal(
  currentPackage.scripts["validate:i4:a"],
  "bun run test:i4:a && bun scripts/omxds/i4/editorial-builder-authoring.evidence.mjs",
);

const authorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-013.json", "utf8"),
);
assert.equal(authorization.status, "Approved");
assert.equal(authorization.branch, branch);
assert.deepEqual(authorization.public_routes, []);
assert.deepEqual(authorization.required_feature_flags, ["omxds_visual_v1_contracts_enabled=false"]);

const packPath =
  "docs/blueprint/18.48-OMXDS-V1-I4-A-AUTHORING-ALLOWLIST-LEGACY-CONFINEMENT-AUTHORIZATION-PACK-v1.0.md";
const pack = readFileSync(packPath, "utf8");
for (const file of allowed) assert.ok(pack.includes(`\`${file}\``), `18.48 omits ${file}`);

function filesBelow(directory) {
  const result = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) result.push(...filesBelow(path));
    else result.push(path);
  }
  return result;
}

const policyConsumers = filesBelow("src")
  .filter(
    (file) =>
      ![
        "src/lib/experience-builder/editorial-builder-policy.ts",
        "src/lib/experience-builder/block-contract.ts",
      ].includes(relative(".", file)),
  )
  .filter((file) => readFileSync(file, "utf8").includes("editorial-builder-policy"))
  .map((file) => relative(".", file))
  .sort();
assert.deepEqual(policyConsumers, [
  "src/components/experience-builder/VisualStudio.tsx",
  "src/lib/experience-builder/block-library.ts",
  "src/lib/experience-builder/block-registry.ts",
  "src/lib/experience-builder/studio.functions.ts",
]);

const policy = readFileSync("src/lib/experience-builder/editorial-builder-policy.ts", "utf8");
for (const runtimeType of [
  "vmx.experience.hero",
  "vmx.experience.section",
  "vmx.experience.gallery",
  "vmx.experience.info-grid",
  "vmx.experience.institutional-badges",
  "vmx.custom.html",
])
  assert.ok(policy.includes(`type: "${runtimeType}"`));
const authoringHarness = readFileSync(
  "scripts/omxds/i4/editorial-builder-authoring.test.ts",
  "utf8",
);
assert.match(authoringHarness, /fails closed for aliases/);
assert.match(policy, /I4_ZERO_REQUEST_COMPATIBILITY/);

for (const forbidden of [
  "src/lib/experience-builder/composition-renderer.tsx",
  "src/lib/experience-builder/composition-tree.ts",
  "src/lib/experience-builder/page-kind-registry.ts",
  "bun.lock",
])
  assert.ok(!changed.has(forbidden), `forbidden I4-A path changed: ${forbidden}`);

console.log(
  `I4-A evidence: PASS (${mode}; exact 16-path scope; four consumers; PCA approved; aliases, legacy HTML, external URLs, unregistered media, duplicate and template bypass fail closed).`,
);
