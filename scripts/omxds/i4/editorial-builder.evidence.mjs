import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "69f4767ec2773f0948c4a61177d4141357dcc5a2";
const authorizedCommit = "1e6541eef0c27d58dd1afc56863070ee2a1f4f88";
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
  assert.equal(eventName, "push", "main post-merge validation requires a push event");
  assert.equal(ref, "refs/heads/main", "post-merge push must target refs/heads/main");
  assert.match(eventSha ?? "", /^[0-9a-f]{40}$/);
  assert.equal(head, eventSha, "checked-out main commit must match GITHUB_SHA");
  assert.ok(
    isAncestor(authorizedCommit, head),
    "authorized I4-0 commit must be an ancestor of main",
  );
  return authorizedCommit;
}

function verifyMainPushContextChecks() {
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
    /must be an ancestor/,
  );
}

verifyMainPushContextChecks();
console.log(
  "I4-0 main-push context checks: PASS (1 positive; 3 negative: wrong ref, SHA mismatch, missing ancestry).",
);

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
let comparisonTip = head;
let validationMode = "single_commit";

if (head === base) {
  validationMode = "base_worktree";
} else if (process.env.GITHUB_EVENT_NAME === "pull_request") {
  assert.ok(process.env.GITHUB_EVENT_PATH, "GitHub PR validation requires GITHUB_EVENT_PATH");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const eventBase = event.pull_request?.base?.sha ?? "";
  const eventHead = event.pull_request?.head?.sha ?? "";
  assert.match(eventBase, /^[0-9a-f]{40}$/);
  assert.match(eventHead, /^[0-9a-f]{40}$/);
  assert.equal(head, process.env.GITHUB_SHA, "checked-out PR merge must match GITHUB_SHA");
  assert.ok(gitIsAncestor(eventHead, head), "PR head must be an ancestor of its checked-out merge");
  if (eventBase === base) {
    comparisonTip = eventHead;
    validationMode = "github_pr_merge";
  } else {
    assert.ok(
      gitIsAncestor(authorizedCommit, eventBase),
      "later PR base must contain the authorized I4-0 commit",
    );
    assert.ok(
      gitIsAncestor(authorizedCommit, eventHead),
      "later PR head must contain the authorized I4-0 commit",
    );
    comparisonTip = authorizedCommit;
    validationMode = "post_merge_pr";
  }
} else if (process.env.GITHUB_EVENT_NAME === "push") {
  comparisonTip = resolveMainPushContext({
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    eventSha: process.env.GITHUB_SHA,
    head,
    isAncestor: gitIsAncestor,
  });
  validationMode = "main_push";
} else if (gitIsAncestor(authorizedCommit, head)) {
  comparisonTip = authorizedCommit;
  validationMode = "post_merge_local";
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
// 19.26 · I4-0 adopta el baseline de dependencias ya gobernado (PCA-2026-019):
// la ÚNICA diferencia tolerada frente al baseline canónico es el bump de plataforma
// @lovable.dev/vite-tanstack-config 2.7.7 -> 2.13.1 y las entradas de bun.lock que ese
// bump reescribe. Cualquier otra dependencia, versión o cambio adicional falla cerrado.
assertGovernedDependencyBaseline(currentPackage, basePackage, "I4-0");
assertGovernedLockBaseline(base, "I4-0");

function filesBelow(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...filesBelow(path));
    else files.push(path);
  }
  return files;
}

const authorizedI4AConsumers = [
  "src/lib/experience-builder/block-registry.ts",
  "src/lib/experience-builder/block-library.ts",
  "src/components/experience-builder/VisualStudio.tsx",
  "src/lib/experience-builder/studio.functions.ts",
];
const i4AConsumers = filesBelow("src")
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
if (i4AConsumers.length) {
  const i4AAuthorization = JSON.parse(
    readFileSync("docs/governance/product-authorizations/PCA-2026-013.json", "utf8"),
  );
  assert.equal(i4AAuthorization.status, "Approved");
  assert.deepEqual(i4AConsumers, [...authorizedI4AConsumers].sort());
} else {
  assert.deepEqual(i4AConsumers, []);
}

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
  `I4-0 evidence: PASS (${validationMode}; 12-path scope exact; no dependencies, routes, schema or flags; ${i4AConsumers.length ? "four PCA-2026-013 consumers exact" : "pure contract isolated"}; vmx.custom.html legacy-only).`,
);
