import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "bc04fc43008c506c967ee2034a724533f254e7d6";
const i3BHead = "0f740b84cd72f7cb07672ff7e350e998f0f4bc45";
const routePath = "src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx";
const destinationRoutePath = "src/routes/oriente-maya/$destino.index.tsx";
const allowed = new Set([
  "docs/blueprint/18.39-OMXDS-V1-I3-B-BUSINESS-VERTICAL-SURFACES-IMPLEMENTATION-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "docs/governance/product-authorizations/PCA-2026-009.json",
  "package.json",
  "scripts/omxds/i3/business-vertical-surfaces.contract.test.ts",
  "scripts/omxds/i3/business-vertical-surfaces.evidence.mjs",
  "scripts/omxds/i3/destination-surface.evidence.mjs",
  "scripts/omxds/i3/shared-surface.evidence.mjs",
  "src/components/surfaces/BusinessSurface.tsx",
  "src/lib/omxds/surfaces/business-surface.contract.ts",
  "src/lib/omxds/surfaces/hotel-surface.adapter.ts",
  "src/lib/omxds/surfaces/restaurant-surface.adapter.ts",
  routePath,
]);

function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const originalI3BFiles = gitLines(["diff", "--name-only", `${base}...${i3BHead}`]);
assert.equal(originalI3BFiles.length, 16);
for (const file of originalI3BFiles)
  assert.ok(allowed.has(file), `historical I3-B scope violation: ${file}`);
for (const file of allowed)
  assert.ok(originalI3BFiles.includes(file), `historical I3-B file missing: ${file}`);

for (const file of [
  "src/lib/omxds/surfaces/business-surface.contract.ts",
  "src/lib/omxds/surfaces/hotel-surface.adapter.ts",
  "src/lib/omxds/surfaces/restaurant-surface.adapter.ts",
  "scripts/omxds/i3/business-vertical-surfaces.contract.test.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", i3BHead, "--", file], {
      encoding: "utf8",
    }),
    "",
    `I3-B regression: ${file}`,
  );

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I3-B");
assertGovernedLockBaseline(base, "I3-B");

const route = readFileSync(routePath, "utf8");
assert.match(route, /getOmxdsSurfaceContractsFlag\(\)\.catch\(\(\) => false\)/);
assert.match(route, /surfaceContractsEnabled/);
assert.match(route, /BusinessSurfaceContractBoundary/);
assert.match(route, /CompositionRenderer tree=\{composition\.snapshot\}/);
assert.match(route, /legacy=/);

const surface = readFileSync("src/components/surfaces/BusinessSurface.tsx", "utf8");
assert.match(surface, /BusinessSurfaceContractBoundary/);
assert.match(surface, /adaptHotelSurfaceContract/);
assert.match(surface, /adaptRestaurantSurfaceContract/);
assert.doesNotMatch(
  surface,
  /(?:function|const)\s+(?:HotelSurface|RestaurantSurface)\b|<(?:HotelSurface|RestaurantSurface)\b/,
);

const contract = readFileSync("src/lib/omxds/surfaces/business-surface.contract.ts", "utf8");
for (const family of ["business", "hotel", "restaurant"])
  assert.match(contract, new RegExp(`"${family}"`));
for (const omission of ["offer", "price", "availability", "reservation", "reputation"])
  assert.match(contract, new RegExp(`"${omission}"`));
assert.match(contract, /id: "contact"/);
assert.doesNotMatch(contract, /checkout|purchase|book|open_now/);

const hotelAdapter = readFileSync("src/lib/omxds/surfaces/hotel-surface.adapter.ts", "utf8");
const restaurantAdapter = readFileSync(
  "src/lib/omxds/surfaces/restaurant-surface.adapter.ts",
  "utf8",
);
for (const category of ["hotel", "hoteles", "hospedaje", "hospedajes"])
  assert.match(hotelAdapter, new RegExp(`"${category}"`));
for (const category of ["restaurante", "restaurantes", "cafeteria", "cafeterias"])
  assert.match(restaurantAdapter, new RegExp(`"${category}"`));

const flagConsumers = gitLines([
  "grep",
  "-l",
  "surface-contracts-flag.server",
  "--",
  "src/routes",
]).sort();
assert.ok(flagConsumers.includes(destinationRoutePath));
assert.ok(flagConsumers.includes(routePath));
const authorizations = readdirSync("docs/governance/product-authorizations")
  .filter((file) => file.endsWith(".json"))
  .map((file) =>
    JSON.parse(readFileSync(join("docs/governance/product-authorizations", file), "utf8")),
  );
const authorizedRouteConsumers = new Set(
  authorizations
    .filter(
      (authorization) =>
        authorization.status === "Approved" &&
        authorization.required_feature_flags?.includes("omxds_visual_v1_contracts_enabled=false"),
    )
    .flatMap((authorization) => authorization.permissions ?? [])
    .filter(
      (permission) =>
        ["create", "modify"].includes(permission.operation) &&
        permission.path.startsWith("src/routes/"),
    )
    .map((permission) => permission.path),
);
const authorizedChangedPaths = new Set(
  authorizations
    .filter((authorization) => authorization.status === "Approved")
    .flatMap((authorization) => authorization.permissions ?? [])
    .filter((permission) => ["create", "modify"].includes(permission.operation))
    .map((permission) => permission.path),
);
for (const file of [routePath, "src/components/surfaces/BusinessSurface.tsx"]) {
  const changedAfterI3B = execFileSync("git", ["diff", "--name-only", i3BHead, "--", file], {
    encoding: "utf8",
  });
  if (changedAfterI3B)
    assert.ok(authorizedChangedPaths.has(file), `post-I3-B change lacks Approved PCA: ${file}`);
}
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

for (const file of flagConsumers)
  assert.ok(authorizedRouteConsumers.has(file), `unauthorized SSR flag consumer: ${file}`);

const sharedEvidence = readFileSync("scripts/omxds/i3/shared-surface.evidence.mjs", "utf8");
assert.match(sharedEvidence, /authorizedRouteConsumers/);
assert.doesNotMatch(sharedEvidence, /deepEqual\(flagConsumers/);
const destinationEvidence = readFileSync(
  "scripts/omxds/i3/destination-surface.evidence.mjs",
  "utf8",
);
assert.match(destinationEvidence, /historical I3-A scope violation/);
assert.match(destinationEvidence, /I3-A regression/);

const pcaGovernedPath = "src/lib/experience-builder/preview-registry.tsx";
const pcaGovernedChange = execFileSync(
  "git",
  ["diff", "--name-only", base, "--", pcaGovernedPath],
  { encoding: "utf8" },
);
if (pcaGovernedChange)
  assert.ok(
    authorizedChangedPaths.has(pcaGovernedPath),
    `post-I3-B change lacks Approved PCA: ${pcaGovernedPath}`,
  );

const acknowledgedProtectedRevisions = new Map([
  ["src/lib/discovery/seo.ts", "53a3e3499de8e64c5d238f31769e5fa6bb62af98046c1941756c100bdff19a05"],
  [
    "src/lib/experience-builder/page-kind-registry.ts",
    "3948b56730bbee1ec6e6c7fa689fbba19fb6e7224b1b9947867620466733917c",
  ],
  [
    "src/lib/experience-builder/composition-renderer.tsx",
    "17617151ad23b58315af726499008593d86fa30b9383caadc4834148dc07bf90",
  ],
]);
const reconciliationAuthorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-056.json", "utf8"),
);
assert.equal(reconciliationAuthorization.status, "Approved");
assert.ok(
  (reconciliationAuthorization.required_feature_flags ?? []).includes(
    "omxds_visual_v1_contracts_enabled=false",
  ),
);
for (const [protectedPath, expectedDigest] of acknowledgedProtectedRevisions) {
  const changed = execFileSync("git", ["diff", "--name-only", base, "--", protectedPath], {
    encoding: "utf8",
  });
  if (changed === "") continue;
  assert.equal(
    createHash("sha256").update(readFileSync(protectedPath)).digest("hex"),
    expectedDigest,
    `I3-B protected artifact changed after exact acknowledgment: ${protectedPath}`,
  );
  assert.ok(
    (reconciliationAuthorization.acknowledged_revisions ?? []).some(
      (entry) => entry.path === protectedPath && entry.sha256 === expectedDigest,
    ),
    `PCA-2026-056 does not acknowledge the exact I3-B revision: ${protectedPath}`,
  );
}

for (const file of execFileSync(
  "git",
  ["diff", "--name-only", base, "--", "supabase", "src/integrations/supabase"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean))
  assert.ok(
    authorizedChangedPaths.has(file) || generatedPlatformArtifacts.has(file),
    `post-I3-B data change lacks Approved PCA: ${file}`,
  );

console.log(
  "I3-B evidence: PASS (Business owner; Hotel/Restaurant adapters; PCA-authorized SSR; exact OFF legacy branch).",
);
