import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "6ca2ebc61dbea827a28c80f5d8254096a9123e7b";
const i3aHead = "d47a41fe6f96edf4dad95f273a95fc2a8ebb63d5";
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

const originalI3AFiles = gitLines(["diff", "--name-only", `${base}...${i3aHead}`]);
for (const file of originalI3AFiles)
  assert.ok(allowed.has(file), `historical I3-A scope violation: ${file}`);
assert.ok(
  originalI3AFiles.includes(routePath),
  "the canonical destination route must own the flag boundary",
);
assert.ok(
  originalI3AFiles.includes("src/components/surfaces/DestinationSurface.tsx"),
  "DestinationSurface must consume the shared contract",
);

for (const file of [
  "src/components/surfaces/DestinationSurface.tsx",
  "scripts/omxds/i3/destination-surface.contract.test.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", i3aHead, "--", file], {
      encoding: "utf8",
    }),
    "",
    `I3-A regression: ${file}`,
  );

// 19.26 · Reconciliación fail-closed del gate I3-A.
// El baseline histórico (base…i3aHead) se conserva intacto. La única evolución
// tolerada de la ruta canónica de destino es el contenido EXACTO acreditado por
// PCA-2026-025 (19.23) y PCA-2026-026 (19.24), fijado por digest SHA-256.
// Cualquier otra modificación —presente o futura— vuelve a fallar el gate.
const acknowledgedRouteRevisions = [
  {
    package: "19.23+19.24",
    sha256: "9de7f1c8476780d719127c3bd4df3968db82116ab7ef8658269be2ff2d4e9f88",
    authorizations: ["PCA-2026-025", "PCA-2026-026"],
  },
];

const routeDrift = execFileSync("git", ["diff", "--name-only", i3aHead, "--", routePath], {
  encoding: "utf8",
});
if (routeDrift !== "") {
  const digest = createHash("sha256").update(readFileSync(routePath)).digest("hex");
  const acknowledged = acknowledgedRouteRevisions.find((revision) => revision.sha256 === digest);
  assert.ok(
    acknowledged,
    `I3-A regression: ${routePath} (digest ${digest} is not an acknowledged PCA revision)`,
  );
  for (const authorizationId of acknowledged.authorizations) {
    const authorizationPath = join(
      "docs/governance/product-authorizations",
      `${authorizationId}.json`,
    );
    const authorization = JSON.parse(readFileSync(authorizationPath, "utf8"));
    assert.equal(
      authorization.status,
      "Approved",
      `acknowledged route revision requires an Approved ${authorizationId}`,
    );
    assert.ok(
      (authorization.permissions ?? []).some(
        (permission) => permission.operation === "modify" && permission.path === routePath,
      ),
      `${authorizationId} does not authorize modifying ${routePath}`,
    );
    assert.ok(
      (authorization.required_feature_flags ?? []).includes(
        "omxds_visual_v1_contracts_enabled=false",
      ),
      `${authorizationId} must preserve the OFF flag invariant`,
    );
  }
}

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I3-A");
assertGovernedLockBaseline(base, "I3-A");

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

const authorizations = readdirSync("docs/governance/product-authorizations")
  .filter((file) => file.endsWith(".json"))
  .map((file) =>
    JSON.parse(readFileSync(join("docs/governance/product-authorizations", file), "utf8")),
  );
const authorizedChangedPaths = new Set(
  authorizations
    .filter((authorization) => authorization.status === "Approved")
    .flatMap((authorization) => authorization.permissions ?? [])
    .filter((permission) => ["create", "modify"].includes(permission.operation))
    .map((permission) => permission.path),
);

for (const forbiddenPath of [
  "src/lib/experience-builder/page-kind-registry.ts",
  "src/lib/experience-builder/preview-registry.tsx",
  "src/lib/experience-builder/composition-renderer.tsx",
]) {
  const changed = execFileSync("git", ["diff", "--name-only", base, "--", forbiddenPath], {
    encoding: "utf8",
  });
  if (forbiddenPath === "src/lib/experience-builder/preview-registry.tsx" && changed !== "") {
    assert.ok(
      authorizedChangedPaths.has(forbiddenPath),
      `post-I3-A preview registry change lacks Approved PCA: ${forbiddenPath}`,
    );
    continue;
  }
  assert.equal(changed, "");
}

assert.equal(
  execFileSync("git", ["diff", "--name-only", base, "--", "src/lib/discovery/seo.ts"], {
    encoding: "utf8",
  }),
  "",
  "SEO helper must remain untouched because no reproducible gap was found",
);
for (const file of gitLines([
  "diff",
  "--name-only",
  base,
  "--",
  "supabase",
  "src/integrations/supabase",
]))
  assert.ok(authorizedChangedPaths.has(file), `post-I3-A data change lacks Approved PCA: ${file}`);

console.log(
  "I3-A evidence: PASS (historical scope preserved; Destination contract intact; exact OFF legacy branch).",
);
