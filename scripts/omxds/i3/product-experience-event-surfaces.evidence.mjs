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

const reconciliationAuthorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-056.json", "utf8"),
);
assert.equal(reconciliationAuthorization.status, "Approved");
assert.ok(
  (reconciliationAuthorization.required_feature_flags ?? []).includes(
    "omxds_visual_v1_contracts_enabled=false",
  ),
);
const acknowledgedConsumerRevisions = new Map([
  [productRoutePath, "b9c1ba9a015ec4d0974a1a57dd6ac03905d162d998073c9fee197420d8044b3f"],
  [territorialProductRoutePath, "2dd89fb8ab9a6e6ba42307ba0a45dfe3f424c1d436d96b91182e5255ac008dbb"],
  [eventRoutePath, "1ce68f037ab27c43d79b4abba1ac7d1c3f4927378595268e8fd1feae6efdd4f0"],
]);

for (const file of [
  productRoutePath,
  territorialProductRoutePath,
  eventRoutePath,
  "src/lib/omxds/surfaces/product-surface.contract.ts",
  "src/lib/omxds/surfaces/experience-surface.adapter.ts",
  "src/lib/omxds/surfaces/event-surface.contract.ts",
  "scripts/omxds/i3/product-experience-event-surfaces.contract.test.ts",
]) {
  const changed = execFileSync("git", ["diff", "--name-only", i3CHead, "--", file], {
    encoding: "utf8",
  });
  if (changed === "") continue;
  const expectedDigest = acknowledgedConsumerRevisions.get(file);
  assert.ok(expectedDigest, `I3-C regression: ${file}`);
  assert.equal(
    createHash("sha256").update(readFileSync(file)).digest("hex"),
    expectedDigest,
    `I3-C consumer changed after exact acknowledgment: ${file}`,
  );
  assert.ok(
    (reconciliationAuthorization.acknowledged_revisions ?? []).some(
      (entry) => entry.path === file && entry.sha256 === expectedDigest,
    ),
    `PCA-2026-056 does not acknowledge the exact I3-C consumer revision: ${file}`,
  );
}

const acknowledgedSurfaceRevisions = new Map([
  [
    "src/components/surfaces/ProductSurface.tsx",
    "f9f70fae41023133c79bcce5bcf750f6b79c666e296eb8f84b5f1d4f0147e55a",
  ],
  [
    "src/components/surfaces/EventSurface.tsx",
    "964fd6a43f656be98dd92e0af2adfe56677a280f46a07657d0cddb6b05a8131f",
  ],
]);
const g5Authorization = JSON.parse(
  readFileSync("docs/governance/product-authorizations/PCA-2026-034.json", "utf8"),
);
assert.equal(g5Authorization.status, "Approved", "I3-C G5 requires Approved PCA-2026-034");
assert.ok(
  (g5Authorization.required_feature_flags ?? []).includes(
    "omxds_visual_v1_contracts_enabled=false",
  ),
  "PCA-2026-034 must preserve the OFF flag invariant",
);
for (const [surfacePath, expectedDigest] of acknowledgedSurfaceRevisions) {
  const digest = createHash("sha256").update(readFileSync(surfacePath)).digest("hex");
  assert.equal(
    digest,
    expectedDigest,
    `I3-C regression: ${surfacePath} changed after PCA-2026-034`,
  );
  assert.ok(
    (g5Authorization.permissions ?? []).some(
      (permission) => permission.operation === "modify" && permission.path === surfacePath,
    ),
    `PCA-2026-034 does not authorize modifying ${surfacePath}`,
  );
}

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
  [
    "src/lib/catalog/product-related.functions.ts",
    "d4f4d4f9aef25bb08228a5f50d1de6a42fb9f572f7946e8c039761c869b802fc",
  ],
  [
    "src/lib/events/public-reads.functions.ts",
    "c40ae17d1aa9697de5ad8c1c492b43472454ffe695339fa3d7e8689ab2fef7a6",
  ],
]);
for (const [protectedPath, expectedDigest] of acknowledgedProtectedRevisions) {
  const changed = execFileSync("git", ["diff", "--name-only", base, "--", protectedPath], {
    encoding: "utf8",
  });
  if (changed === "") continue;
  assert.equal(
    createHash("sha256").update(readFileSync(protectedPath)).digest("hex"),
    expectedDigest,
    `I3-C protected artifact changed after exact acknowledgment: ${protectedPath}`,
  );
  assert.ok(
    (reconciliationAuthorization.acknowledged_revisions ?? []).some(
      (entry) => entry.path === protectedPath && entry.sha256 === expectedDigest,
    ),
    `PCA-2026-056 does not acknowledge the exact I3-C revision: ${protectedPath}`,
  );
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

// 19.26 · Reconocimiento nominal y fail-closed de transiciones historicas documentadas:
// migraciones ya autorizadas por una PCA Approved con la ruta EXACTA, cuyo campo
// required_feature_flags quedo vacio porque el flag OFF era postcondicion (PCA-2026-022)
// o porque el paquete era data-only (PCA-2026-024), y que por ello quedan fuera del filtro
// del gate. Cada caso se reconoce por ruta EXACTA y digest SHA-256 EXACTO, mediante un
// addendum append-only Approved ligado nominalmente a su PCA base. La precondicion global
// del flag OFF permanece intacta para cualquier otra ruta.
const acknowledgedHistoricalMigrations = new Map([
  [
    "supabase/migrations/20260825163531_3ed38299-f9a2-488c-9686-8d2373075753.sql",
    {
      addendum: "docs/governance/addenda/PCA-2026-022-ADDENDUM-A.json",
      basePca: "docs/governance/product-authorizations/PCA-2026-022.json",
      basePcaId: "PCA-2026-022",
      sha256: "cf0c31ab1eeb8b051154697b6d26c671b5e2105dba9770c0aa8e6e5b46dba252",
    },
  ],
  [
    "supabase/migrations/20260825193309_61f9e8e4-608e-46a8-b4ac-4d8930c4eb78.sql",
    {
      addendum: "docs/governance/addenda/PCA-2026-024-ADDENDUM-A.json",
      basePca: "docs/governance/product-authorizations/PCA-2026-024.json",
      basePcaId: "PCA-2026-024",
      sha256: "e103b39b9178834dcedd74ad2c0bedfd1a912e021ea5280e1ae61b0452026b34",
    },
  ],
]);

function isAcknowledgedHistoricalMigration(file) {
  const acknowledged = acknowledgedHistoricalMigrations.get(file);
  if (!acknowledged) return false;

  const addendum = JSON.parse(readFileSync(acknowledged.addendum, "utf8"));
  assert.equal(
    addendum.status,
    "Approved",
    `historical migration acknowledgement requires an Approved addendum: ${acknowledged.addendum}`,
  );
  assert.equal(
    addendum.addendum_to,
    acknowledged.basePcaId,
    `addendum is not bound to ${acknowledged.basePcaId}: ${acknowledged.addendum}`,
  );
  const basePca = JSON.parse(readFileSync(acknowledged.basePca, "utf8"));
  assert.equal(basePca.id, acknowledged.basePcaId);
  assert.equal(
    basePca.status,
    "Approved",
    `historical migration acknowledgement requires an Approved ${acknowledged.basePcaId}`,
  );
  assert.ok(
    (basePca.permissions ?? []).some(
      (permission) => permission.operation === "create" && permission.path === file,
    ),
    `${acknowledged.basePcaId} does not authorize creating ${file}`,
  );
  const declared = (addendum.acknowledged_paths ?? []).find((entry) => entry.path === file);
  assert.ok(declared, `addendum does not acknowledge ${file}`);
  assert.equal(
    createHash("sha256").update(readFileSync(file)).digest("hex"),
    declared.sha256,
    `acknowledged historical migration changed after its addendum: ${file}`,
  );
  assert.equal(declared.sha256, acknowledged.sha256);
  return true;
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
    authorizedChangedPaths.has(file) ||
      generatedPlatformArtifacts.has(file) ||
      isAcknowledgedHistoricalMigration(file),
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
