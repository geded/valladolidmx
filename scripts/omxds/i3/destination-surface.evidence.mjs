import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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

for (const file of ["scripts/omxds/i3/destination-surface.contract.test.ts"])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", i3aHead, "--", file], {
      encoding: "utf8",
    }),
    "",
    `I3-A regression: ${file}`,
  );

function assertApprovedExactModification(authorizationId, protectedPath) {
  const authorizationPath = join(
    "docs/governance/product-authorizations",
    `${authorizationId}.json`,
  );
  const authorization = JSON.parse(readFileSync(authorizationPath, "utf8"));
  assert.equal(
    authorization.status,
    "Approved",
    `acknowledged revision requires an Approved ${authorizationId}`,
  );
  assert.ok(
    (authorization.permissions ?? []).some(
      (permission) => permission.operation === "modify" && permission.path === protectedPath,
    ),
    `${authorizationId} does not authorize modifying ${protectedPath}`,
  );
  assert.ok(
    (authorization.required_feature_flags ?? []).includes(
      "omxds_visual_v1_contracts_enabled=false",
    ),
    `${authorizationId} must preserve the OFF flag invariant`,
  );
}

const surfacePath = "src/components/surfaces/DestinationSurface.tsx";
const acknowledgedSurfaceRevisions = [
  {
    package: "19.28-g5-destination",
    sha256: "f2107c0abb8c55b62cbb737123eba415b5333e884bf15e4fb9d7f8ad4ea6d328",
    authorizations: ["PCA-2026-032"],
  },
  {
    // D-01 · PremiumHero contract remediation (sin `className` en el contrato del primitivo).
    package: "19.28-g5-destination-d01",
    sha256: "6a98bbd9942dde9aa794929694f245578bf108dec9df2a5f0de5b04bdc5c1e45",
    authorizations: ["PCA-2026-032"],
  },
  {
    // 19.29 · D-03 · El breadcrumb territorial navegable lo emite PublicShell;
    // la superficie deja de emitir crumbs decorativos al Hero.
    package: "19.29-g5-responsive-visual-remediation",
    sha256: "e0073c58b623b32c871f54f95c00becd39de5750b77f73c2423d72f6ce465b05",
    authorizations: ["PCA-2026-035"],
  },
];
const surfaceDrift = execFileSync("git", ["diff", "--name-only", i3aHead, "--", surfacePath], {
  encoding: "utf8",
});
if (surfaceDrift !== "") {
  const digest = createHash("sha256").update(readFileSync(surfacePath)).digest("hex");
  const acknowledged = acknowledgedSurfaceRevisions.find((revision) => revision.sha256 === digest);
  assert.ok(
    acknowledged,
    `I3-A regression: ${surfacePath} (digest ${digest} is not an acknowledged PCA revision)`,
  );
  for (const authorizationId of acknowledged.authorizations) {
    assertApprovedExactModification(authorizationId, surfacePath);
  }
}

// 19.26 · Reconciliación fail-closed del gate I3-A.
// El baseline histórico (base…i3aHead) se conserva intacto. La única evolución
// tolerada de la ruta canónica de destino es el contenido EXACTO acreditado por
// PCA-2026-025 (19.23) y PCA-2026-026 (19.24), fijado por digest SHA-256.
// Cualquier otra modificación —presente o futura— vuelve a fallar el gate.
const acknowledgedRouteRevisions = [
  {
    package: "19.23+19.24+19.28-g5-destination",
    sha256: "757b76081ec68a96d5df0c204d0662907800275ea2b8b90d52c6d3fa0534244e",
    authorizations: ["PCA-2026-025", "PCA-2026-026", "PCA-2026-032"],
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
    assertApprovedExactModification(authorizationId, routePath);
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
// 19.26 · Reconocimiento fail-closed y NO genérico de dos artefactos generados por
// la plataforma (broker de sesión de preview), presentes desde 66c4386c, sin
// secretos embebidos y no editables por el proyecto. Sólo estas dos rutas exactas
// con estos digest exactos; cualquier cambio de contenido, ausencia o ruta
// adicional bajo src/integrations/supabase vuelve a fallar el gate.
const generatedPlatformArtifacts = new Map([
  [
    "src/integrations/supabase/client.ts",
    "fd07c64d4e312b11ff629b520abb36c613cbfa688db4096b36c53f5832dee741",
  ],
  [
    "src/integrations/supabase/previewAuthStorage.ts",
    "634c0f279327b7c79f6e38b54b7ab4ae3737f0d6c3a660d8ac02a9659be48a0f",
  ],
]);

for (const [artifactPath, expectedDigest] of generatedPlatformArtifacts) {
  let contents;
  try {
    contents = readFileSync(artifactPath);
  } catch {
    assert.fail(`acknowledged generated artifact is missing: ${artifactPath}`);
  }
  assert.equal(
    createHash("sha256").update(contents).digest("hex"),
    expectedDigest,
    `acknowledged generated artifact changed without Approved PCA: ${artifactPath}`,
  );
}

for (const file of gitLines([
  "diff",
  "--name-only",
  base,
  "--",
  "supabase",
  "src/integrations/supabase",
]))
  assert.ok(
    authorizedChangedPaths.has(file) || generatedPlatformArtifacts.has(file),
    `post-I3-A data change lacks Approved PCA: ${file}`,
  );

console.log(
  "I3-A evidence: PASS (historical scope preserved; Destination contract intact; exact OFF legacy branch).",
);
