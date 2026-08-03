import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const gate = path.join(import.meta.dir, "validate-change-package.mjs");
const temporaryRepositories = [];
const git = (root, args) =>
  childProcess.execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omxds-gate-test-"));
  temporaryRepositories.push(root);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "OMXDS Gate Test"]);
  git(root, ["config", "user.email", "gate-test@example.invalid"]);
  fs.writeFileSync(path.join(root, "a.txt"), "baseline\n");
  git(root, ["add", "a.txt"]);
  git(root, ["commit", "--quiet", "-m", "baseline"]);
  return { root, base: git(root, ["rev-parse", "HEAD"]) };
}

function run(root, args) {
  return childProcess.spawnSync(process.execPath, [gate, ...args, "--skip-full-suite"], {
    cwd: root,
    encoding: "utf8",
  });
}

function positiveCase() {
  const { root, base } = repository();
  fs.writeFileSync(path.join(root, "a.txt"), "updated\n");
  fs.writeFileSync(path.join(root, "b.txt"), "new\n");
  const result = run(root, [
    `--base=${base}`,
    "--allow=a.txt",
    "--allow=b.txt",
    "--expected-count=2",
    "--forbid=PROHIBITED",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"result": "PASS"/);
  assert.match(result.stdout, /"candidate_tree": "[0-9a-f]{40}"/);
}

function unauthorizedPathCase() {
  const { root, base } = repository();
  fs.writeFileSync(path.join(root, "a.txt"), "updated\n");
  fs.writeFileSync(path.join(root, "extra.txt"), "unexpected\n");
  const result = run(root, [
    `--base=${base}`,
    "--allow=a.txt",
    "--allow=b.txt",
    "--expected-count=2",
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Worktree allowlist mismatch/);
}

function forbiddenReferenceCase() {
  const { root, base } = repository();
  fs.writeFileSync(path.join(root, "a.txt"), "PROHIBITED\n");
  const result = run(root, [
    `--base=${base}`,
    "--allow=a.txt",
    "--expected-count=1",
    "--forbid=PROHIBITED",
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden references found/);
}

function unexpectedTreeCase() {
  const { root, base } = repository();
  fs.writeFileSync(path.join(root, "a.txt"), "updated\n");
  const result = run(root, [
    `--base=${base}`,
    "--allow=a.txt",
    "--expected-count=1",
    `--expected-tree=${"0".repeat(40)}`,
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Candidate tree mismatch/);
}

try {
  positiveCase();
  unauthorizedPathCase();
  forbiddenReferenceCase();
  unexpectedTreeCase();
  console.log(
    JSON.stringify(
      {
        result: "PASS",
        positive_cases: 1,
        negative_cases: 3,
        rejected: ["unauthorized path", "forbidden reference", "unexpected tree"],
      },
      null,
      2,
    ),
  );
} finally {
  for (const root of temporaryRepositories) fs.rmSync(root, { recursive: true, force: true });
}
