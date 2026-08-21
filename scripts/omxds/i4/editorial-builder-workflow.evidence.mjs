import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "bb1b17ffcbed0594d1433957e8f2b5d864e1a5a8";
const branch = "feature/omxds-i4-b-workflow-publication-authority-v1";
const allowed = new Set([
  "supabase/migrations/20260804233000_omxds_i4b_workflow_publication_authority.sql",
  "src/lib/experience-builder/studio.functions.ts",
  "src/integrations/supabase/types.ts",
  "src/components/experience-builder/VisualStudio.tsx",
  "scripts/omxds/i4/editorial-builder-workflow.test.ts",
  "scripts/omxds/i4/editorial-builder-workflow.evidence.mjs",
  "package.json",
  "scripts/governance/validate-full-suite.mjs",
  "scripts/omxds/i3/business-vertical-surfaces.evidence.mjs",
  "scripts/omxds/i3/product-experience-event-surfaces.evidence.mjs",
  "scripts/omxds/i3/business-premium-surface.evidence.mjs",
  "scripts/omxds/i3/destination-surface.evidence.mjs",
  "docs/blueprint/18.49-OMXDS-V1-I4-B-WORKFLOW-PUBLICATION-AUTHORITY-PACK-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-014.json",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
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
function isAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}
function exactCandidate(commit) {
  if (words(git(["show", "-s", "--format=%P", commit])).join(" ") !== base) return false;
  const changed = new Set(lines(git(["diff", "--name-only", base, commit, "--"])));
  return changed.size === allowed.size && [...changed].every((path) => allowed.has(path));
}
function historicalCandidate(head) {
  const merges = lines(
    git(["rev-list", "--ancestry-path", "--reverse", "--merges", `${base}..${head}`]),
  );
  const candidates = [];
  for (const merge of merges) {
    const parents = words(git(["show", "-s", "--format=%P", merge]));
    if (parents.length === 2 && parents[0] === base && exactCandidate(parents[1]))
      candidates.push(parents[1]);
  }
  assert.equal(candidates.length, 1, "I4-B canonical merge topology must resolve exactly once");
  return candidates[0];
}

const head = git(["rev-parse", "HEAD"]);
let tip = head;
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
  assert.ok(isAncestor(eventHead, head), "PR head must be an ancestor of the checked-out merge");
  if (eventBase === base) {
    tip = eventHead;
    mode = "github_i4b_pr_merge";
  } else {
    tip = historicalCandidate(eventBase);
    assert.ok(isAncestor(tip, eventHead));
    mode = "post_i4b_pr";
  }
} else if (head !== base && exactCandidate(head)) {
  mode = "single_commit";
} else {
  tip = historicalCandidate(head);
  mode = process.env.GITHUB_EVENT_NAME === "push" ? "main_push" : "post_i4b_local";
  if (process.env.GITHUB_EVENT_NAME === "push") {
    assert.equal(process.env.GITHUB_REF, "refs/heads/main");
    assert.equal(process.env.GITHUB_SHA, head);
  }
}

const changed =
  mode === "base_worktree"
    ? new Set([
        ...lines(git(["diff", "--name-only", base, "--"])),
        ...lines(git(["ls-files", "--others", "--exclude-standard"])),
      ])
    : new Set(lines(git(["diff", "--name-only", base, tip, "--"])));
assert.equal(changed.size, allowed.size, `I4-B must contain exactly ${allowed.size} paths`);
assert.deepEqual([...changed].sort(), [...allowed].sort());

if (!mode.startsWith("post_") && mode !== "main_push") {
  const currentBranch = process.env.GITHUB_HEAD_REF || git(["branch", "--show-current"]);
  if (currentBranch) assert.equal(currentBranch, branch);
}
if (mode !== "base_worktree") {
  assert.equal(git(["merge-base", base, tip]), base);
  assert.equal(git(["rev-list", "--count", `${base}..${tip}`]), "1");
}

const basePackage = JSON.parse(git(["show", `${base}:package.json`]));
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I4-B");
assertGovernedLockBaseline(base, "I4-B");
assert.equal(
  currentPackage.scripts["validate:i4:b"],
  "bun run test:i4:b && bun scripts/omxds/i4/editorial-builder-workflow.evidence.mjs",
);

const authorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-014.json", "utf8"),
);
assert.equal(authorization.status, "Approved");
assert.equal(authorization.branch, branch);
assert.deepEqual(authorization.public_routes, []);
assert.deepEqual(authorization.required_feature_flags, ["omxds_visual_v1_contracts_enabled=false"]);

const pack = readFileSync(
  "docs/blueprint/18.49-OMXDS-V1-I4-B-WORKFLOW-PUBLICATION-AUTHORITY-PACK-v1.0.md",
  "utf8",
);
for (const file of allowed) assert.ok(pack.includes(`\`${file}\``), `18.49 omits ${file}`);

const migration = readFileSync(
  "supabase/migrations/20260804233000_omxds_i4b_workflow_publication_authority.sql",
  "utf8",
);
assert.doesNotMatch(migration, /CREATE TABLE|DROP TABLE|TRUNCATE|DELETE FROM/);
assert.match(migration, /author_cannot_self_approve/);
assert.match(migration, /publication_requires_approved_snapshot/);
assert.match(migration, /approved_snapshot_hash_mismatch/);
assert.match(migration, /scheduled snapshot is absent or no longer exact/);
assert.match(migration, /TO service_role/);
const scheduledProcessor = migration.slice(
  migration.indexOf("CREATE OR REPLACE FUNCTION public.eb_process_scheduled_publishes"),
  migration.indexOf("-- The legacy publish-reset trigger"),
);
assert.doesNotMatch(scheduledProcessor, /GRANT EXECUTE[^;]+TO authenticated/);

for (const forbidden of [
  "bun.lock",
  "src/lib/experience-builder/composition-renderer.tsx",
  "src/routes",
  "supabase/functions",
])
  assert.ok(!changed.has(forbidden), `forbidden I4-B path changed: ${forbidden}`);

console.log(
  `I4-B evidence: PASS (${mode}; exact ${allowed.size}-path scope; additive migration; atomic approved revision/hash; author-approver separation; publication and scheduling fail closed).`,
);
