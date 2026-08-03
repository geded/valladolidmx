import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const base = "69f4767ec2773f0948c4a61177d4141357dcc5a2";
const allowed = new Set([
  "src/lib/experience-builder/editorial-builder-policy.ts",
  "src/lib/experience-builder/block-contract.ts",
  "scripts/omxds/i4/editorial-builder.contract.test.ts",
  "scripts/omxds/i4/editorial-builder.evidence.mjs",
  "package.json",
  "scripts/governance/validate-full-suite.mjs",
  "docs/blueprint/18.46-OMXDS-V1-I4-0-SHARED-EDITORIAL-BUILDER-CONTRACT-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-012.json",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
]);

function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
let comparisonTip = head;
let validationMode = "single_commit";

if (head === base) {
  validationMode = "base_worktree";
} else if (process.env.GITHUB_EVENT_NAME === "pull_request") {
  assert.ok(process.env.GITHUB_EVENT_PATH, "GitHub PR validation requires GITHUB_EVENT_PATH");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  assert.equal(event.pull_request?.base?.sha, base, "GitHub PR base must be the authorized SHA");
  assert.match(event.pull_request?.head?.sha ?? "", /^[0-9a-f]{40}$/);
  comparisonTip = event.pull_request.head.sha;
  validationMode = "github_pr_merge";
  assert.equal(head, process.env.GITHUB_SHA, "checked-out PR merge must match GITHUB_SHA");
  execFileSync("git", ["merge-base", "--is-ancestor", comparisonTip, head]);
}

if (validationMode !== "base_worktree") {
  assert.equal(
    execFileSync("git", ["merge-base", base, comparisonTip], { encoding: "utf8" }).trim(),
    base,
    "I4-0 commit must descend from the exact authorized base",
  );
  assert.equal(
    execFileSync("git", ["rev-list", "--count", `${base}..${comparisonTip}`], {
      encoding: "utf8",
    }).trim(),
    "1",
    "I4-0 must contain exactly one commit above the authorized base",
  );
}

const changed =
  validationMode === "base_worktree"
    ? new Set([
        ...gitLines(["diff", "--name-only", base, "--"]),
        ...gitLines(["ls-files", "--others", "--exclude-standard"]),
      ])
    : new Set(gitLines(["diff", "--name-only", base, comparisonTip, "--"]));
assert.equal(changed.size, 12, `I4-0 must contain exactly 12 paths; found ${changed.size}`);
assert.deepEqual([...changed].sort(), [...allowed].sort());

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

function filesBelow(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...filesBelow(path));
    else files.push(path);
  }
  return files;
}

const forbiddenConsumers = filesBelow("src")
  .filter(
    (file) =>
      ![
        "src/lib/experience-builder/editorial-builder-policy.ts",
        "src/lib/experience-builder/block-contract.ts",
      ].includes(relative(".", file)),
  )
  .filter((file) => readFileSync(file, "utf8").includes("editorial-builder-policy"))
  .map((file) => relative(".", file));
assert.deepEqual(
  forbiddenConsumers,
  [],
  `I4-0 policy gained consumers: ${forbiddenConsumers.join(", ")}`,
);

const policy = readFileSync("src/lib/experience-builder/editorial-builder-policy.ts", "utf8");
assert.match(policy, /type: "vmx\.custom\.html"/);
assert.match(policy, /mode: "legacy_read_only"/);
assert.match(policy, /legacy_read_only: \["render_legacy"\]/);
assert.doesNotMatch(
  policy,
  /createServerFn|createClient|supabase|fetch\(|process\.env|window\.|document\./,
);

const blockContract = readFileSync("src/lib/experience-builder/block-contract.ts", "utf8");
assert.match(blockContract, /editorial\?: EditorialBlockMetadata/);
assert.doesNotMatch(blockContract, /EDITORIAL_BUILDER_POLICY/);

const pack = readFileSync(
  "docs/blueprint/18.46-OMXDS-V1-I4-0-SHARED-EDITORIAL-BUILDER-CONTRACT-AUTHORIZATION-PACK-v1.0.md",
  "utf8",
);
for (const file of allowed) assert.ok(pack.includes(`\`${file}\``), `18.46 omits ${file}`);

const authorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-012.json", "utf8"),
);
assert.equal(authorization.status, "Approved");
assert.equal(authorization.branch, "feature/omxds-i4-0-shared-editorial-builder-contract-v1");
assert.deepEqual(authorization.public_routes, []);
assert.deepEqual(authorization.required_feature_flags, ["omxds_visual_v1_contracts_enabled=false"]);

assert.equal(
  currentPackage.scripts["test:i4:0"],
  "bun test scripts/omxds/i4/editorial-builder.contract.test.ts",
);
assert.equal(
  currentPackage.scripts["validate:i4:0"],
  "bun run test:i4:0 && bun scripts/omxds/i4/editorial-builder.evidence.mjs",
);

console.log(
  `I4-0 evidence: PASS (${validationMode}; 12-path scope exact; pure contract isolated; no dependencies, routes, schema, flags or consumers; vmx.custom.html legacy-only).`,
);
