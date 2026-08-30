import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";

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

export function assertGovernedDependencyBaseline(currentPackage, basePackage, label) {
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
