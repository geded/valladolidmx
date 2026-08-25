import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "c3d663e5c74bcd5c0f1c96f01da2974c992d1dc6";
const i3CHead = "1b67c610af4643f115a4901a2865f766c609018f";
const productRoutePath = "src/routes/producto.$slug.tsx";
const territorialProductRoutePath =
  "src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx";
const eventRoutePath = "src/routes/eventos.$slug.tsx";
const existingConsumers = [
  "src/routes/oriente-maya/$destino.index.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx",
];
const newConsumers = [productRoutePath, territorialProductRoutePath, eventRoutePath];
const allowed = new Set([
  "docs/blueprint/18.40-OMXDS-V1-I3-C-PRODUCT-EXPERIENCE-EVENT-SURFACES-IMPLEMENTATION-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "docs/governance/product-authorizations/PCA-2026-010.json",
  "package.json",
  "scripts/omxds/i3/business-vertical-surfaces.evidence.mjs",
  "scripts/omxds/i3/product-experience-event-surfaces.contract.test.ts",
  "scripts/omxds/i3/product-experience-event-surfaces.evidence.mjs",
  "src/components/surfaces/EventSurface.tsx",
  "src/components/surfaces/ProductSurface.tsx",
  "src/lib/omxds/surfaces/event-surface.contract.ts",
  "src/lib/omxds/surfaces/experience-surface.adapter.ts",
  "src/lib/omxds/surfaces/product-surface.contract.ts",
  eventRoutePath,
  territorialProductRoutePath,
  productRoutePath,
]);

function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const originalI3CFiles = gitLines(["diff", "--name-only", `${base}...${i3CHead}`]);
assert.equal(originalI3CFiles.length, 18, "historical I3-C must contain exactly 18 files");
for (const file of originalI3CFiles)
  assert.ok(allowed.has(file), `historical I3-C scope violation: ${file}`);
for (const file of allowed)
  assert.ok(originalI3CFiles.includes(file), `historical I3-C file missing: ${file}`);

for (const file of [
  productRoutePath,
  territorialProductRoutePath,
  eventRoutePath,
  "src/components/surfaces/ProductSurface.tsx",
  "src/components/surfaces/EventSurface.tsx",
  "src/lib/omxds/surfaces/product-surface.contract.ts",
  "src/lib/omxds/surfaces/experience-surface.adapter.ts",
  "src/lib/omxds/surfaces/event-surface.contract.ts",
  "scripts/omxds/i3/product-experience-event-surfaces.contract.test.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", i3CHead, "--", file], {
      encoding: "utf8",
    }),
    "",
    `I3-C regression: ${file}`,
  );

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I3-C");
assertGovernedLockBaseline(base, "I3-C");

for (const routePath of newConsumers) {
  const route = readFileSync(routePath, "utf8");
  assert.match(route, /getOmxdsSurfaceContractsFlag\(\)\.catch\(\(\) => false\)/);
  assert.match(route, /surfaceContractsEnabled/);
  assert.match(route, /legacy=/);
}
const legacyProductRoute = readFileSync(productRoutePath, "utf8");
assert.match(legacyProductRoute, /CompositionRenderer tree=\{composition\.snapshot\}/);
assert.match(legacyProductRoute, /<ProductSurface \/>/);
assert.match(legacyProductRoute, /ProductSurfaceContractBoundary/);
const territorialProductRoute = readFileSync(territorialProductRoutePath, "utf8");
assert.match(territorialProductRoute, /ProductSurfaceContractBoundary/);
assert.match(territorialProductRoute, /legacy=\{<ProductSurface \/>\}/);
const eventRoute = readFileSync(eventRoutePath, "utf8");
assert.match(eventRoute, /EventSurfaceContractBoundary/);
assert.match(eventRoute, /<EventSurface event=\{event\} \/>/);

const productSurface = readFileSync("src/components/surfaces/ProductSurface.tsx", "utf8");
assert.match(productSurface, /ProductSurfaceContractBoundary/);
assert.match(productSurface, /adaptExperienceSurfaceContract/);
assert.match(productSurface, /createProductSurfaceContract/);
const eventSurface = readFileSync("src/components/surfaces/EventSurface.tsx", "utf8");
assert.match(eventSurface, /EventSurfaceContractBoundary/);
assert.match(eventSurface, /createEventSurfaceContract/);
assert.doesNotMatch(
  productSurface,
  /(?:function|const)\s+ExperienceSurface\b|<ExperienceSurface\b/,
);

const productContract = readFileSync("src/lib/omxds/surfaces/product-surface.contract.ts", "utf8");
for (const family of ["product", "experience"])
  assert.match(productContract, new RegExp(`"${family}"`));
for (const omission of ["offer", "price", "availability", "reservation", "delivery"])
  assert.match(productContract, new RegExp(`"${omission}"`));
assert.match(productContract, /id: "add_to_trip"/);
assert.doesNotMatch(productContract, /checkout|purchase|book|reserve/);

const experienceAdapter = readFileSync(
  "src/lib/omxds/surfaces/experience-surface.adapter.ts",
  "utf8",
);
for (const productType of ["experiencia", "tour"])
  assert.match(experienceAdapter, new RegExp(`"${productType}"`));

const eventContract = readFileSync("src/lib/omxds/surfaces/event-surface.contract.ts", "utf8");
assert.match(eventContract, /family: "event"/);
assert.match(eventContract, /id: "add_to_trip"/);
for (const omission of ["offer", "price", "availability", "reservation", "delivery"])
  assert.match(eventContract, new RegExp(`"${omission}"`));
assert.doesNotMatch(eventContract, /checkout|purchase|book|reserve/);

const flagConsumers = gitLines([
  "grep",
  "-l",
  "surface-contracts-flag.server",
  "--",
  "src/routes",
]).sort();
assert.deepEqual(flagConsumers, [...existingConsumers, ...newConsumers].sort());
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
    .filter(
      (authorization) =>
        authorization.status === "Approved" &&
        authorization.required_feature_flags?.includes("omxds_visual_v1_contracts_enabled=false"),
    )
    .flatMap((authorization) => authorization.permissions ?? [])
    .filter((permission) => ["create", "modify"].includes(permission.operation))
    .map((permission) => permission.path),
);
for (const file of flagConsumers)
  assert.ok(authorizedRouteConsumers.has(file), `unauthorized SSR flag consumer: ${file}`);

const i3bEvidence = readFileSync(
  "scripts/omxds/i3/business-vertical-surfaces.evidence.mjs",
  "utf8",
);
assert.match(i3bEvidence, /historical I3-B scope violation/);
assert.match(i3bEvidence, /I3-B regression/);
assert.match(i3bEvidence, /authorizedRouteConsumers/);
assert.doesNotMatch(i3bEvidence, /deepEqual\(flagConsumers/);

for (const pcaGovernedPath of [
  "src/lib/experience-builder/preview-registry.tsx",
  "src/lib/catalog/marketplace-reads.functions.ts",
]) {
  const pcaGovernedChange = execFileSync(
    "git",
    ["diff", "--name-only", base, "--", pcaGovernedPath],
    { encoding: "utf8" },
  );
  if (pcaGovernedChange)
    assert.ok(
      authorizedChangedPaths.has(pcaGovernedPath),
      `post-I3-C change lacks Approved PCA: ${pcaGovernedPath}`,
    );
}

for (const forbiddenPath of [
  "src/lib/discovery/seo.ts",
  "src/lib/experience-builder/page-kind-registry.ts",
  "src/lib/experience-builder/composition-renderer.tsx",
  "src/lib/catalog/product-related.functions.ts",
  "src/lib/events/public-reads.functions.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", base, "--", forbiddenPath], {
      encoding: "utf8",
    }),
    "",
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
    `post-I3-C data change lacks Approved PCA: ${file}`,
  );

const tests = readFileSync(
  "scripts/omxds/i3/product-experience-event-surfaces.contract.test.ts",
  "utf8",
);
assert.match(tests, /fictional/);
assert.doesNotMatch(tests, /Zazil Tunich/i);

console.log(
  "I3-C evidence: PASS (historical scope preserved; Product/Event owners and Experience adapter intact; five PCA-authorized SSR consumers).",
);
