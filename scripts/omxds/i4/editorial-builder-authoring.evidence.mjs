import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "1fe83c8bfb8874468560c9c3c7d89ded0073a252";
const authorizedCommit = "3c8e138ae768380f6656fad40b84515615002d7d";
const authorizedMergeCommit = "860c4928a7c848b40d6f5f5f9fc3c1869d57c832";
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

function words(value) {
  return value.split(/\s+/).filter(Boolean);
}

function gitIsAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function resolveMainPushContext({ eventName, ref, eventSha, head, isAncestor }) {
  assert.equal(eventName, "push", "I4-A post-merge validation requires a push event");
  assert.equal(ref, "refs/heads/main", "I4-A post-merge push must target refs/heads/main");
  assert.match(eventSha ?? "", /^[0-9a-f]{40}$/);
  assert.equal(head, eventSha, "checked-out main commit must match GITHUB_SHA");
  assert.ok(
    isAncestor(authorizedMergeCommit, head),
    "authorized PR #51 merge commit must be an ancestor of main",
  );
  return authorizedCommit;
}

function verifyPostMergeContextChecks() {
  const valid = {
    eventName: "push",
    ref: "refs/heads/main",
    eventSha: "f".repeat(40),
    head: "f".repeat(40),
    isAncestor: () => true,
  };
  assert.equal(resolveMainPushContext(valid), authorizedCommit);
  assert.throws(
    () => resolveMainPushContext({ ...valid, ref: "refs/heads/release" }),
    /refs\/heads\/main/,
  );
  assert.throws(() => resolveMainPushContext({ ...valid, eventSha: "e".repeat(40) }), /GITHUB_SHA/);
  assert.throws(
    () => resolveMainPushContext({ ...valid, isAncestor: () => false }),
    /merge commit must be an ancestor/,
  );
}

verifyPostMergeContextChecks();
assert.deepEqual(words(git(["show", "-s", "--format=%P", authorizedCommit])), [base]);
assert.deepEqual(words(git(["show", "-s", "--format=%P", authorizedMergeCommit])), [
  base,
  authorizedCommit,
]);

const head = git(["rev-parse", "HEAD"]);
let comparisonTip = head;
let mode = "single_commit";
if (head === base) {
  mode = "base_worktree";
} else if (process.env.GITHUB_EVENT_NAME === "pull_request") {
  assert.ok(process.env.GITHUB_EVENT_PATH);
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const eventBase = event.pull_request?.base?.sha ?? "";
  const eventHead = event.pull_request?.head?.sha ?? "";
  assert.match(eventBase, /^[0-9a-f]{40}$/);
  assert.match(eventHead, /^[0-9a-f]{40}$/);
  assert.equal(head, process.env.GITHUB_SHA);
  assert.ok(gitIsAncestor(eventHead, head), "PR head must be an ancestor of its checked-out merge");
  if (eventBase === base) {
    comparisonTip = eventHead;
    mode = "github_authoring_pr_merge";
  } else {
    assert.ok(
      gitIsAncestor(authorizedMergeCommit, eventBase),
      "later PR base must contain the authorized PR #51 merge commit",
    );
    assert.ok(
      gitIsAncestor(authorizedMergeCommit, eventHead),
      "later PR head must contain the authorized PR #51 merge commit",
    );
    comparisonTip = authorizedCommit;
    mode = "post_merge_pr";
  }
} else if (process.env.GITHUB_EVENT_NAME === "push") {
  comparisonTip = resolveMainPushContext({
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    eventSha: process.env.GITHUB_SHA,
    head,
    isAncestor: gitIsAncestor,
  });
  mode = "main_push";
} else if (gitIsAncestor(authorizedMergeCommit, head)) {
  comparisonTip = authorizedCommit;
  mode = "post_merge_local";
} else {
  assert.equal(git(["merge-base", base, head]), base);
  assert.equal(git(["rev-list", "--count", `${base}..${head}`]), "1");
}

if (mode !== "base_worktree") {
  assert.equal(git(["merge-base", base, comparisonTip]), base);
  assert.equal(git(["rev-list", "--count", `${base}..${comparisonTip}`]), "1");
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
if (currentBranch && ["base_worktree", "single_commit", "github_authoring_pr_merge"].includes(mode))
  assert.equal(currentBranch, branch);

const basePackage = JSON.parse(git(["show", `${base}:package.json`]));
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I4-A");
assertGovernedLockBaseline(base, "I4-A");
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
  "src/lib/experience-builder/premium-template-registry.ts",
  "src/lib/experience-builder/studio.functions.ts",
]);
const premiumTemplateRegistryPath = "src/lib/experience-builder/premium-template-registry.ts";
const premiumTemplateRegistrySha256 =
  "5f05a70a0ebb8e8ea8880e3b2531eb430251c87f565d7ea35ce38f910daadbb1";
assert.equal(
  createHash("sha256").update(readFileSync(premiumTemplateRegistryPath)).digest("hex"),
  premiumTemplateRegistrySha256,
  "I4-A premium template registry changed after exact acknowledgment",
);
assert.ok(
  (authorization.permissions ?? []).some(
    (permission) =>
      permission.operation === "create" && permission.path === premiumTemplateRegistryPath,
  ),
  "PCA-2026-013 does not authorize the exact premium template registry path",
);
assert.match(authorization.founder_authority, new RegExp(premiumTemplateRegistrySha256));

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
  `I4-A evidence: PASS (${mode}; exact 16-path scope; five consumers; PCA approved; aliases, legacy HTML, external URLs, unregistered media, duplicate and template bypass fail closed).`,
);
