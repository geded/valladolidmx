import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

// PCA-2026-019 · Platform Dependency Baseline Reconciliation.
// Authorizes EXACTLY one automatic platform change over every canonical evidence base:
// the devDependency @lovable.dev/vite-tanstack-config 2.7.7 -> 2.13.1 and the lockfile
// entries that this bump rewrites. Anything else keeps failing closed.

export const AUTHORIZATION_ID = "PCA-2026-019";
export const PLATFORM_PACKAGE = "@lovable.dev/vite-tanstack-config";
export const PLATFORM_VERSION_FROM = "2.7.7";
export const PLATFORM_VERSION_TO = "2.13.1";

// Transitive entries the authorized bump drops from the lockfile (they were folded
// into the platform package). No other lockfile line may change.
export const PLATFORM_LOCK_PACKAGES = [
  PLATFORM_PACKAGE,
  "@lovable.dev/vite-plugin-dev-server-bridge",
  "@lovable.dev/vite-plugin-hmr-gate",
];

// Founder reconciliation (2026-11-20): an Approved evidence record may pin the exact
// dependency set and lockfile in force. Only an exact match passes; anything else
// falls through to the historical fail-closed comparison below.
export const DEPENDENCY_RECONCILIATION_PATH =
  "docs/governance/evidence/platform-dependency-reconciliation-2026-11-20.json";

function readDependencyReconciliation() {
  if (!existsSync(DEPENDENCY_RECONCILIATION_PATH)) return null;
  const record = JSON.parse(readFileSync(DEPENDENCY_RECONCILIATION_PATH, "utf8"));
  return record.status === "Approved" ? record : null;
}

function sameEntries(left = {}, right = {}) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
  );
}

function matchesDependencyReconciliation(currentPackage) {
  const record = readDependencyReconciliation();
  return Boolean(
    record &&
    sameEntries(currentPackage.dependencies, record.dependencies) &&
    sameEntries(currentPackage.devDependencies, record.devDependencies),
  );
}

function matchesLockReconciliation() {
  const record = readDependencyReconciliation();
  if (!record || !existsSync("bun.lock")) return false;
  const digest = createHash("sha256").update(readFileSync("bun.lock")).digest("hex");
  return digest === record.bun_lock_sha256;
}

export function assertGovernedDependencyBaseline(currentPackage, basePackage, label) {
  if (matchesDependencyReconciliation(currentPackage)) return;
  assert.deepEqual(
    currentPackage.dependencies,
    basePackage.dependencies,
    `${label}: runtime dependencies must match the canonical base exactly`,
  );

  const baseDev = { ...(basePackage.devDependencies ?? {}) };
  const currentDev = { ...(currentPackage.devDependencies ?? {}) };

  const isAuthorizedBump =
    baseDev[PLATFORM_PACKAGE] === PLATFORM_VERSION_FROM &&
    currentDev[PLATFORM_PACKAGE] === PLATFORM_VERSION_TO;

  if (isAuthorizedBump) baseDev[PLATFORM_PACKAGE] = PLATFORM_VERSION_TO;

  assert.deepEqual(
    currentDev,
    baseDev,
    `${label}: devDependencies may only differ by the ${AUTHORIZATION_ID} platform bump ${PLATFORM_PACKAGE} ${PLATFORM_VERSION_FROM} -> ${PLATFORM_VERSION_TO}`,
  );
}

export function assertGovernedLockBaseline(base, label) {
  if (matchesLockReconciliation()) return;
  const diff = execFileSync("git", ["diff", "--unified=0", base, "--", "bun.lock"], {
    encoding: "utf8",
  });
  if (diff.trim() === "") return;

  const changedLines = diff
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") || line.startsWith("-")) &&
        !line.startsWith("+++") &&
        !line.startsWith("---"),
    );

  assert.ok(changedLines.length > 0, `${label}: unreadable bun.lock diff`);

  for (const line of changedLines) {
    const sign = line[0];
    const body = line.slice(1).trim();
    if (body === "") continue;

    if (body.includes(PLATFORM_PACKAGE)) {
      const expected = sign === "+" ? PLATFORM_VERSION_TO : PLATFORM_VERSION_FROM;
      const forbidden = sign === "+" ? PLATFORM_VERSION_FROM : PLATFORM_VERSION_TO;
      assert.ok(
        body.includes(expected) && !body.includes(forbidden),
        `${label}: bun.lock change on ${PLATFORM_PACKAGE} is outside ${AUTHORIZATION_ID}: ${line}`,
      );
      continue;
    }

    const transitive = PLATFORM_LOCK_PACKAGES.slice(1).some((name) => body.includes(name));
    assert.ok(
      transitive && sign === "-",
      `${label}: unauthorized bun.lock change outside ${AUTHORIZATION_ID}: ${line}`,
    );
  }
}
