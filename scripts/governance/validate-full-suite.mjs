import childProcess from "node:child_process";

const root = process.cwd();
const baseArg = process.argv.find((argument) => argument.startsWith("--base="));
const base = baseArg?.slice("--base=".length) || process.env.GITHUB_BASE_SHA || "";
const bun = process.execPath;

const checks = [
  ["lint", ["run", "lint"]],
  ["I1", ["run", "validate:i1"]],
  ["I2-A", ["run", "validate:i2a"]],
  ["I2-B", ["run", "validate:i2b"]],
  ["I2-C", ["run", "validate:i2c"]],
  ["I3-0", ["run", "validate:i3:0"]],
  ["I3-A", ["run", "validate:i3:a"]],
  ["I3-B", ["run", "validate:i3:b"]],
  ["I3-C", ["run", "validate:i3:c"]],
  ["I3-D", ["run", "validate:i3:d"]],
  ["I4-0", ["run", "validate:i4:0"]],
  ["I4-A", ["run", "validate:i4:a"]],
  ["I4-B", ["run", "validate:i4:b"]],
  ["I4-C", ["run", "validate:i4:c"]],
  ["I4-R", ["run", "validate:i4:r"]],
  ["I4-D", ["run", "validate:i4:d"]],
  ["typecheck", ["run", "typecheck"]],
  ["build", ["run", "build"]],
  ["governance projections", ["scripts/governance/sync-governance.mjs", "--check"]],
  ["dependency map", ["scripts/governance/validate-dependency-map.mjs"]],
  ["knowledge graph", ["scripts/governance/validate-knowledge-graph.mjs"]],
  [
    "governance integrity",
    ["scripts/governance/validate-governance-integrity.mjs", ...(base ? [`--base=${base}`] : [])],
  ],
  [
    "product authorization",
    ["scripts/governance/validate-product-authorization.mjs", ...(base ? [`--base=${base}`] : [])],
  ],
  ["product authorization tests", ["scripts/governance/test-product-authorization.mjs"]],
  ["change package tests", ["scripts/governance/test-change-package.mjs"]],
];

const completed = [];
for (const [name, args] of checks) {
  console.log(`\n=== ${name} ===`);
  const result = childProcess.spawnSync(bun, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Full validation failed at ${name} with exit ${result.status}`);
  completed.push(name);
}

console.log(JSON.stringify({ result: "PASS", base: base || null, checks: completed }, null, 2));
