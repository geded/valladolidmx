import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.join(root, "scripts/lint/lint-baseline.json");
const sourceCommit = "7084b2a7c15a05029cdbc7e62a483f49b47e05cb";
const excludedPaths = [
  "docs/evidence/omxds-visual/v0-baseline/accessibility/axe.min.js",
  "src/integrations/supabase/types.ts",
  "src/integrations/supabase/previewAuthStorage.ts",
];
const i3ExactPaths = new Set([
  "src/components/surfaces/DestinationSurface.tsx",
  "src/components/surfaces/BusinessSurface.tsx",
  "src/components/surfaces/ProductSurface.tsx",
  "src/components/surfaces/EventSurface.tsx",
  "src/routes/oriente-maya/$destino.index.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx",
  "src/routes/eventos.$slug.tsx",
]);
const i3Prefixes = ["src/lib/omxds/surfaces/", "scripts/omxds/i3/"];

function run(command, args, options = {}) {
  return childProcess.spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function runEslint() {
  const result = run(path.join(root, "node_modules/.bin/eslint"), [".", "--format", "json"]);
  if (![0, 1].includes(result.status)) {
    process.stderr.write(result.stderr || result.stdout || "ESLint did not complete.\n");
    process.exit(result.status ?? 1);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    process.stderr.write("ESLint did not return valid JSON.\n");
    process.exit(1);
  }
}

function aggregate(results) {
  const entries = new Map();
  for (const result of results) {
    const file = normalizePath(result.filePath);
    for (const message of result.messages) {
      const severity = message.severity === 2 ? "error" : "warning";
      const rule = message.ruleId || "<parser>";
      const key = `${file}\0${rule}\0${severity}`;
      entries.set(key, {
        path: file,
        rule,
        severity,
        count: (entries.get(key)?.count || 0) + 1,
      });
    }
  }
  return [...entries.values()].sort((a, b) =>
    [a.path, a.rule, a.severity].join("\0").localeCompare([b.path, b.rule, b.severity].join("\0")),
  );
}

function totals(entries) {
  return entries.reduce(
    (sum, entry) => {
      sum[entry.severity === "error" ? "errors" : "warnings"] += entry.count;
      return sum;
    },
    { errors: 0, warnings: 0 },
  );
}

function changedPaths() {
  const paths = new Set();
  for (const args of [
    ["diff", "--name-only", "--diff-filter=ACMRT", sourceCommit, "--"],
    ["diff", "--name-only", "--diff-filter=ACMRT", "HEAD", "--"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    const result = run("git", args);
    if (result.status !== 0) continue;
    for (const file of result.stdout.split("\n").filter(Boolean))
      paths.add(file.replaceAll("\\", "/"));
  }
  return paths;
}

function isI3Path(file) {
  return i3ExactPaths.has(file) || i3Prefixes.some((prefix) => file.startsWith(prefix));
}

function key(entry) {
  return `${entry.path}\0${entry.rule}\0${entry.severity}`;
}

function writeBaseline(entries) {
  const baseline = {
    schema_version: 1,
    source_commit: sourceCommit,
    excluded_paths: excludedPaths,
    totals: totals(entries),
    entries,
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(
    `Lint baseline written: ${entries.length} buckets, ${baseline.totals.errors} errors, ${baseline.totals.warnings} warnings.`,
  );
}

function validate(entries, results) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const failures = [];
  if (baseline.source_commit !== sourceCommit)
    failures.push("Baseline source commit does not match the authorized base.");
  if (JSON.stringify(baseline.excluded_paths) !== JSON.stringify(excludedPaths))
    failures.push("Baseline exclusions differ from the two authorized exact paths.");

  const previous = new Map(baseline.entries.map((entry) => [key(entry), entry.count]));
  for (const entry of entries) {
    const delta = entry.count - (previous.get(key(entry)) || 0);
    if (delta > 0)
      failures.push(`NEW_DEBT +${delta} ${entry.severity} ${entry.path} ${entry.rule}`);
  }

  const changedI3 = new Set([...changedPaths()].filter(isI3Path));
  for (const result of results) {
    const file = normalizePath(result.filePath);
    if (!changedI3.has(file)) continue;
    for (const message of result.messages) {
      failures.push(
        `I3_NOT_CLEAN ${file}:${message.line || 0}:${message.column || 0} ${message.ruleId || "<parser>"}`,
      );
    }
  }

  const currentTotals = totals(entries);
  console.log(
    `Lint baseline: ${currentTotals.errors} errors, ${currentTotals.warnings} warnings (historical debt remains visible).`,
  );
  console.log(`I3 changed files checked: ${changedI3.size}.`);
  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n")}\nLint gate: FAIL\n`);
    process.exit(1);
  }
  console.log("Lint gate: PASS — no new lint debt; changed I3 files are clean.");
}

const results = runEslint();
const entries = aggregate(results);
if (process.argv.includes("--write")) writeBaseline(entries);
else validate(entries, results);
