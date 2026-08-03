import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const git = (args, options = {}) =>
  childProcess.execFileSync("git", args, { encoding: "utf8", ...options }).trim();
const values = (name) =>
  process.argv
    .filter((argument) => argument.startsWith(`--${name}=`))
    .map((argument) => argument.slice(name.length + 3));
const value = (name) => values(name).at(-1) || "";

function exactPath(candidate) {
  return (
    candidate &&
    !path.isAbsolute(candidate) &&
    !candidate.split(/[\\/]/).includes("..") &&
    !/[?*\[\]{}!]/.test(candidate)
  );
}

function changedPaths(base) {
  const tracked = git(["diff", "--name-only", base, "--"]).split("\n").filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

function assertExactPaths(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch\nexpected: ${right.join(", ")}\nactual: ${left.join(", ")}`);
  }
}

function forbiddenMatches(tree, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    const result = childProcess.spawnSync("git", ["grep", "-n", "-F", pattern, tree, "--", "."], {
      encoding: "utf8",
    });
    if (result.status === 0) matches.push(...result.stdout.trim().split("\n").filter(Boolean));
    else if (result.status !== 1)
      throw new Error(`Forbidden-reference scan failed for ${pattern}: ${result.stderr}`);
  }
  return matches;
}

export function validateChangePackage() {
  const root = process.cwd();
  const base = value("base");
  const allowlist = values("allow");
  const forbidden = values("forbid");
  const expectedTree = value("expected-tree");
  const expectedCount = Number(value("expected-count"));
  const skipFullSuite = process.argv.includes("--skip-full-suite");

  if (!base) throw new Error("--base is required");
  if (!allowlist.length || allowlist.some((candidate) => !exactPath(candidate)))
    throw new Error("Every --allow path must be exact");
  if (new Set(allowlist).size !== allowlist.length) throw new Error("Duplicate --allow path");
  if (!Number.isInteger(expectedCount) || expectedCount < 1)
    throw new Error("--expected-count must be a positive integer");
  if (expectedCount !== allowlist.length)
    throw new Error("Expected count must equal the exact allowlist length");
  childProcess.execFileSync("git", ["cat-file", "-e", `${base}^{commit}`], { cwd: root });
  const head = git(["rev-parse", "HEAD"], { cwd: root });
  if (head !== base) throw new Error(`Base mismatch: expected HEAD ${base}, found ${head}`);

  const worktreePaths = changedPaths(base);
  if (worktreePaths.length !== expectedCount)
    throw new Error(
      `Changed-file count mismatch: expected ${expectedCount}, found ${worktreePaths.length}`,
    );
  assertExactPaths(worktreePaths, allowlist, "Worktree allowlist");

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "omxds-change-package-"));
  const temporaryIndex = path.join(temporaryDirectory, "index");
  const environment = { ...process.env, GIT_INDEX_FILE: temporaryIndex };
  try {
    git(["read-tree", base], { cwd: root, env: environment });
    childProcess.execFileSync("git", ["add", "-A", "--", ...allowlist], {
      cwd: root,
      env: environment,
    });
    const candidateTree = git(["write-tree"], { cwd: root, env: environment });
    const treePaths = git(
      ["diff-tree", "--no-commit-id", "--name-only", "-r", base, candidateTree],
      { cwd: root },
    )
      .split("\n")
      .filter(Boolean);
    if (treePaths.length !== expectedCount)
      throw new Error(
        `Candidate-tree count mismatch: expected ${expectedCount}, found ${treePaths.length}`,
      );
    assertExactPaths(treePaths, allowlist, "Candidate-tree allowlist");
    const matches = forbiddenMatches(candidateTree, forbidden);
    if (matches.length)
      throw new Error(`Forbidden references found in candidate tree:\n${matches.join("\n")}`);
    if (expectedTree && candidateTree !== expectedTree)
      throw new Error(`Candidate tree mismatch: expected ${expectedTree}, found ${candidateTree}`);

    if (!skipFullSuite) {
      childProcess.execFileSync(
        process.execPath,
        ["scripts/governance/validate-full-suite.mjs", `--base=${base}`],
        { cwd: root, env: process.env, stdio: "inherit" },
      );
    }

    const headAfter = git(["rev-parse", "HEAD"], { cwd: root });
    if (headAfter !== base) throw new Error(`HEAD moved during validation: ${headAfter}`);
    assertExactPaths(changedPaths(base), allowlist, "Post-validation worktree allowlist");

    const result = {
      result: "PASS",
      base,
      expected_count: expectedCount,
      paths: [...allowlist].sort(),
      forbidden_patterns: forbidden.length,
      candidate_tree: candidateTree,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (import.meta.main) validateChangePackage();
