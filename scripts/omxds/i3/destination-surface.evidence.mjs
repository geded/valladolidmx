import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = "6ca2ebc61dbea827a28c80f5d8254096a9123e7b";
const routePath = "src/routes/oriente-maya/$destino.index.tsx";
const allowed = new Set([
  "docs/blueprint/18.38-OMXDS-V1-I3-A-DESTINATION-SURFACE-IMPLEMENTATION-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "docs/governance/product-authorizations/PCA-2026-008.json",
  "package.json",
  "scripts/omxds/i3/destination-surface.contract.test.ts",
  "scripts/omxds/i3/destination-surface.evidence.mjs",
  "scripts/omxds/i3/shared-surface.evidence.mjs",
  "src/components/surfaces/DestinationSurface.tsx",
  "src/lib/discovery/seo.ts",
  routePath,
]);

function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const changed = new Set([
  ...gitLines(["diff", "--name-only", `${base}...HEAD`]),
  ...gitLines(["diff", "--name-only", "HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);
for (const file of changed) assert.ok(allowed.has(file), `I3-A scope violation: ${file}`);
assert.ok(changed.has(routePath), "the canonical destination route must own the flag boundary");
assert.ok(
  changed.has("src/components/surfaces/DestinationSurface.tsx"),
  "DestinationSurface must consume the shared contract",
);

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(currentPackage.dependencies, basePackage.dependencies);
assert.deepEqual(currentPackage.devDependencies, basePackage.devDependencies);
assert.equal(
  execFileSync("git", ["diff", "--name-only", base, "--", "bun.lock"], {
    encoding: "utf8",
  }),
  "",
);

const route = readFileSync(routePath, "utf8");
assert.match(route, /getOmxdsSurfaceContractsFlag\(\)\.catch\(\(\) => false\)/);
assert.match(route, /surfaceContractsEnabled/);
assert.match(route, /DestinationSurfaceContractBoundary/);
assert.match(route, /legacy=/);
assert.match(route, /CompositionRenderer tree=\{composition\.snapshot\}/);

const surface = readFileSync("src/components/surfaces/DestinationSurface.tsx", "utf8");
assert.match(surface, /createOmxdsSurfaceContract/);
assert.match(surface, /family: "destination"/);
assert.match(surface, /role: "dominant"/);
assert.match(surface, /omissions\.push\("media"\)/);
assert.match(surface, /omissions\.push\("map"\)/);
assert.match(surface, /omissions\.push\("collection"\)/);

for (const forbiddenPath of [
  "src/lib/experience-builder/page-kind-registry.ts",
  "src/lib/experience-builder/preview-registry.tsx",
  "src/lib/experience-builder/composition-renderer.tsx",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", base, "--", forbiddenPath], {
      encoding: "utf8",
    }),
    "",
  );

assert.equal(
  execFileSync("git", ["diff", "--name-only", base, "--", "src/lib/discovery/seo.ts"], {
    encoding: "utf8",
  }),
  "",
  "SEO helper must remain untouched because no reproducible gap was found",
);
assert.equal(
  execFileSync("git", ["diff", "--name-only", base, "--", "supabase"], {
    encoding: "utf8",
  }),
  "",
);

console.log(
  "I3-A evidence: PASS (canonical route only; SSR flag boundary; exact OFF legacy branch; fictitious contract fixture).",
);
