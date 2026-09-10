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

function assertApprovedExactAddendum(addendumFile, protectedPath, expectedDigest) {
  const addendum = JSON.parse(readFileSync(join("docs/governance/addenda", addendumFile), "utf8"));
  assert.equal(addendum.status, "Approved", `${addendumFile} must be Approved`);
  assert.equal(addendum.parent, "PCA-2026-056", `${addendumFile} must extend PCA-2026-056`);
  assert.equal(addendum.supersedes_acknowledged_revision?.operation, "modify");
  assert.equal(addendum.supersedes_acknowledged_revision?.path, protectedPath);
  assert.equal(addendum.supersedes_acknowledged_revision?.current_sha256, expectedDigest);
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
  {
    // G8-R1-F1L · revisión exacta acreditada para consolidación pública gobernada.
    package: "g8-r1-f1l-destination-surface-consolidation",
    sha256: "05b6b12f4c2d065d999dba8b951a462564f852635c50d63a377cbb6130946c71",
    authorizations: ["PCA-2026-056"],
  },
  {
    // Integración Premium · revisión exacta ya presente, reconciliada tras el gate del PR #60.
    package: "integration-premium-pr60-destination-surface-reconciliation",
    sha256: "4dd81bbfb907aa3c0b557fa72ac44d8420b84b7e1099c18dc9b066e44d163b33",
    authorizations: ["PCA-2026-056"],
    addendum: "PCA-2026-056-ADDENDUM-ZZ-PR60-006.json",
  },
  {
    // Reconciliación cerrada · constructor, preview y ruta pública comparten autoridad Premium.
    package: "main-premium-routes-territorial-cms-reconciliation",
    sha256: "12c1e19fa15d0d52638ef4a799046a52e77f6681e1b8bf315269b79126504129",
    authorizations: ["PCA-2026-067"],
  },
  {
    // Continuidad Premium · conserva medios públicos relacionados sin inventar contenido.
    package: "premium-continuity-destination-related-media",
    sha256: "07af6dd30bde81d2d3a0df290a07d1ebc980414d548a0c2d84db0c9f42629836",
    authorizations: ["PCA-2026-056"],
    addendum: "PCA-2026-056-ADDENDUM-ZZZZZZZZZZ-PREMIUM-CONTINUITY-DESTINATION-SURFACE.json",
  },
  {
    // Primera oleada territorial · la misma superficie Premium enlaza categorías públicas reales.
    package: "first-wave-territorial-category-navigation",
    sha256: "a791bb51e99556761a6603986152365c89b57ef8fe2583034adad72ecd29199d",
    authorizations: ["PCA-2026-056"],
    addendum: "PCA-2026-056-ADDENDUM-ZZZZZZZZZZZZZZZZ-FIRST-WAVE-DESTINATION.json",
  },
  {
    // Remediación P1 · sólo expone enlaces acreditados por la taxonomía pública del CMS.
    package: "first-wave-territorial-category-navigation-cms",
    sha256: "6910f8b85cd97ba977b97ac113d713bfdf9ebc93dc911ac984ab24787bf445e0",
    authorizations: ["PCA-2026-082"],
    addendum: "PCA-2026-056-ADDENDUM-ZZZZZZZZZZZZZZZZZ-P1-CMS-DESTINATION.json",
  },
  {
    // Remediación P1 final · resuelve cada slug desde listing_family_key administrado por CMS.
    package: "first-wave-territorial-category-navigation-cms-family",
    sha256: "f875988bf7ef6d16553f5fdfea2c680edaeb6294006cb1b47468878242a17db7",
    authorizations: ["PCA-2026-082"],
    addendum: "PCA-2026-056-ADDENDUM-ZZZZZZZZZZZZZZZZZZZZ-P1-CMS-FAMILY-SURFACE.json",
  },
  {
    // Cierre PR #77 · prioriza slugs presentes en el destino y conserva fallback contractual.
    package: "first-wave-territorial-category-navigation-destination-aware",
    sha256: "941e972e74cc320bff57b7ae6fbe3e311f718e94eedffc0df46eeae37d27ca1d",
    authorizations: ["PCA-2026-082"],
    addendum: "PCA-2026-082-ADDENDUM-PR77-DESTINATION-AWARE-NAVIGATION.json",
  },
  {
    // P1 PR #77 · familias sin categoría territorial usan su ruta canónica contractual.
    package: "pr77-canonical-routes-without-territorial-category",
    sha256: "0e2841380cdaabe7f5e8289bbca5cc2d296797cf97903430fc8bc28506c9c796",
    authorizations: ["PCA-2026-082"],
    addendum: "PCA-2026-082-ADDENDUM-PR77-CANONICAL-FAMILY-ROUTES.json",
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
  if (acknowledged.addendum)
    assertApprovedExactAddendum(acknowledged.addendum, surfacePath, digest);
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
  {
    // G8-R1-F1L · noindex gobernado del piloto en la ruta canónica de destino.
    package: "g8-r1-f1l-destination-route-consolidation",
    sha256: "86f91f43dd57299f6eaa909e7cf19795bf7fe2f4c4f85ca3cd2839ceb8b2a4b0",
    authorizations: ["PCA-2026-056"],
  },
  {
    // Diagnóstico PR #60 · revisión exacta ya presente en integración.
    package: "integration-premium-pr60-destination-route-reconciliation",
    sha256: "e52e5843d039fd154b9e21c0361cfb793c65e12b9180c7c9395456da2015be88",
    authorizations: ["PCA-2026-056"],
    addendum: "PCA-2026-056-ADDENDUM-ZZ-PR60-007.json",
  },
  {
    // Reconciliación cerrada · la ruta pública hidrata las rutas editoriales publicadas del CMS.
    package: "main-premium-routes-destination-route-reconciliation",
    sha256: "34bc5197fa820a6b5e638bef5a8b98e09d30bad4c04470acf8397118a2c869e2",
    authorizations: ["PCA-2026-067"],
  },
  {
    // Remediación P1 · hidrata los slugs publicados que gobiernan los enlaces de categoría.
    package: "first-wave-destination-route-public-category-slugs",
    sha256: "f9303601cda2237c5bd1114f90742ac5ab615b1a280990913c843514e0753016",
    authorizations: ["PCA-2026-082"],
    addendum: "PCA-2026-056-ADDENDUM-ZZZZZZZZZZZZZZZZZ-P1-CMS-ROUTE.json",
  },
  {
    // Remediación P1 final · hidrata la taxonomía CMS-first de familias de listado.
    package: "first-wave-destination-route-listing-family-taxonomy",
    sha256: "112c37ef15e96bb8290d5ca62c0ff16b6ea28a0fe08ebfc2b64b4dafb68ab8e8",
    authorizations: ["PCA-2026-082"],
    addendum: "PCA-2026-056-ADDENDUM-ZZZZZZZZZZZZZZZZZZZZ-P1-CMS-FAMILY-ROUTE.json",
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
  if (acknowledged.addendum) assertApprovedExactAddendum(acknowledged.addendum, routePath, digest);
}

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I3-A");
assertGovernedLockBaseline(base, "I3-A");

const route = readFileSync(routePath, "utf8");
assert.match(route, /if \(!db\) throw notFound\(\)/);
assert.match(route, /DestinationSurfaceContractBoundary/);
assert.match(route, /DestinationSurfaceProvider/);
assert.match(route, /presentation=\{search\.presentacion === "cinematografica"/);
assert.doesNotMatch(route, /DESTINOS_MOCK/);

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

const acknowledgedProtectedRevisions = new Map([
  [
    "src/lib/experience-builder/page-kind-registry.ts",
    {
      sha256: "3948b56730bbee1ec6e6c7fa689fbba19fb6e7224b1b9947867620466733917c",
      authorizations: ["PCA-2026-056"],
    },
  ],
  [
    "src/lib/experience-builder/composition-renderer.tsx",
    {
      sha256: "ef0e4749f83c8c83a99c3da17acc04eacaa06cf338fb3b34f6d8e1f453d83262",
      authorizations: ["PCA-2026-056"],
      addendum: "PCA-2026-056-ADDENDUM-ZZ-PR60-008.json",
    },
  ],
  [
    "src/lib/discovery/seo.ts",
    {
      sha256: "53a3e3499de8e64c5d238f31769e5fa6bb62af98046c1941756c100bdff19a05",
      authorizations: ["PCA-2026-056"],
    },
  ],
]);

for (const protectedPath of [
  "src/lib/experience-builder/page-kind-registry.ts",
  "src/lib/experience-builder/preview-registry.tsx",
  "src/lib/experience-builder/composition-renderer.tsx",
  "src/lib/discovery/seo.ts",
]) {
  const changed = execFileSync("git", ["diff", "--name-only", base, "--", protectedPath], {
    encoding: "utf8",
  });
  if (protectedPath === "src/lib/experience-builder/preview-registry.tsx" && changed !== "") {
    assert.ok(
      authorizedChangedPaths.has(protectedPath),
      `post-I3-A preview registry change lacks Approved PCA: ${protectedPath}`,
    );
    continue;
  }
  if (changed === "") continue;

  const acknowledged = acknowledgedProtectedRevisions.get(protectedPath);
  assert.ok(
    acknowledged,
    `I3-A regression: ${protectedPath} changed without an exact acknowledged revision`,
  );
  const digest = createHash("sha256").update(readFileSync(protectedPath)).digest("hex");
  assert.equal(
    digest,
    acknowledged.sha256,
    `I3-A regression: ${protectedPath} digest ${digest} is not the exact acknowledged revision`,
  );
  for (const authorizationId of acknowledged.authorizations) {
    assertApprovedExactModification(authorizationId, protectedPath);
  }
  if (acknowledged.addendum)
    assertApprovedExactAddendum(acknowledged.addendum, protectedPath, digest);
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

// G8-R1-F1L · reconciliación cerrada de migraciones históricas ya presentes.
// La ruta Y el digest deben coincidir. No se admiten prefijos, comodines ni
// futuras migraciones por pertenecer al mismo directorio.
const acknowledgedHistoricalMigrations = new Map([
  [
    "supabase/migrations/20260827214117_63152f35-7ee6-49e5-af4f-f2fec5ec6b34.sql",
    "ce656e33fa2a236b64f8519425227caca3c62ab0d9ea0bdca4324fc9a42424f9",
  ],
  [
    "supabase/migrations/20260827214359_604c0109-bd38-4ffb-9ea0-97a00ecaa519.sql",
    "ce656e33fa2a236b64f8519425227caca3c62ab0d9ea0bdca4324fc9a42424f9",
  ],
  [
    "supabase/migrations/20260828204226_4793613a-f45d-4635-a595-c53ee101cf58.sql",
    "6088b5b936439f34a20e7085765116f030095e3f0d24b1a1e206ecce89fec373",
  ],
  [
    "supabase/migrations/20260828220117_e2fcc5fa-be09-4350-9f74-2344a2c13c5b.sql",
    "ab5a719e0880f55239d5fe982d26f499ea7392c750457ec7f982dcc75ff18b21",
  ],
  [
    "supabase/migrations/20260829064842_283114c3-9498-491d-846f-1db486601eb6.sql",
    "1e6dbedbf4cac5a08613d8fdc7f4efcef8e517f411046524de6b19dfd426b0a8",
  ],
  [
    "supabase/migrations/20260829070641_959a44c6-4ddf-4810-aba3-7f80895563a1.sql",
    "99b81f982a95df01e894e30cfe1ed9a4a2c11f0b6562190b21b49af3fd2c079d",
  ],
  [
    "supabase/migrations/20260829074909_55bc2a54-6904-4c1e-88e3-6653cee1e03d.sql",
    "a3825853c690fba1739268a47295f69264d0c36b21b7946924da9150ce70bb85",
  ],
  [
    "supabase/migrations/20260830010427_7eabcc34-63e3-46a9-8a44-5fd07956065b.sql",
    "770b3b7cec5ea91f15c9b57c30a74252ec96a68a70f81ce9584bdb00e7d15216",
  ],
  [
    "supabase/migrations/20260830010547_4b12cc68-4b53-44ab-a63d-1111d2ea99e9.sql",
    "deb6546e1690f3bc4c1fc137b9ce84f03ebb99df982a0fa5dea527c1fdb9e67f",
  ],
  [
    "supabase/migrations/20260830012531_0ec3e62d-a748-4699-882b-c00c46e3d42b.sql",
    "3fc920f383e4f43d4e76476e1f9e93cffdeae2fc21ca9ff558225957b213d75a",
  ],
  [
    "supabase/migrations/20260830013318_5ba0c631-644e-440f-8736-b4a631837a3b.sql",
    "7fb1a8438ce8b3bfb10567bd4c852dcce535ad50a2c18fd408f2eb71e892e74d",
  ],
  [
    "supabase/migrations/20260830023112_3fa6c24e-b35f-40e4-9a11-40f101d8d4ee.sql",
    "765c5572598da4aad5c968c24fb4afe1aa17feefb861c853e545384a32cca13d",
  ],
  [
    "supabase/migrations/20260830031550_88a59552-8f9e-4575-acc9-7721b2015fe0.sql",
    "5fe1792a72d43b35af85f1916df6ae389dc1ada09fa6f8b01504e039ac713afe",
  ],
  [
    "supabase/migrations/20260830032801_a07b4165-db34-49c6-8ba3-fcef32be4975.sql",
    "ff786dd354683a94104454d9e9b54f5cf2f72546cc1393a96127a776e83550ac",
  ],
  [
    "supabase/migrations/20260830032821_2b64c84f-7d91-4f68-bd79-76f6423013b0.sql",
    "354b7196c9ba5fb4b21cf615bb6ec4cd5c07503c34229feef033fc081a8c03f4",
  ],
  [
    "supabase/migrations/20260830032831_c6039095-dd13-4846-b408-ee3ebbba271c.sql",
    "354b7196c9ba5fb4b21cf615bb6ec4cd5c07503c34229feef033fc081a8c03f4",
  ],
  [
    "supabase/migrations/20260830032850_7124625f-09a6-4e7b-9e26-ed9cf9335a4a.sql",
    "354b7196c9ba5fb4b21cf615bb6ec4cd5c07503c34229feef033fc081a8c03f4",
  ],
  [
    "supabase/migrations/20260830032901_6377dfbe-e823-4196-bbcc-f19aa032707b.sql",
    "354b7196c9ba5fb4b21cf615bb6ec4cd5c07503c34229feef033fc081a8c03f4",
  ],
  [
    "supabase/migrations/20260830032925_695e1257-6844-42b2-946f-8f4e5df36184.sql",
    "354b7196c9ba5fb4b21cf615bb6ec4cd5c07503c34229feef033fc081a8c03f4",
  ],
  [
    "supabase/migrations/20260830032934_956967e9-6362-448d-9082-2c792658ee5c.sql",
    "354b7196c9ba5fb4b21cf615bb6ec4cd5c07503c34229feef033fc081a8c03f4",
  ],
  [
    "supabase/migrations/20260830034311_63bb4c3a-49e6-46f2-9055-67ba6f42ccb5.sql",
    "41acc445b69a622b31af8d60bd520b9c4d954c364a3f37e2eaa560db6ae2aef6",
  ],
  [
    "supabase/migrations/20260830055802_b9ccf253-32dc-4d95-8a35-1e34926abd53.sql",
    "61a0754ced03d009753bd4a31cd46f7f40ef5e183cd3f108220d5ed0979a938d",
  ],
  [
    "supabase/migrations/20260830143421_d5d27075-8fd6-4b15-b115-a16b7ed7aa4b.sql",
    "3398df13e6a1637460642b9b5ace266113026a180b2cd2c3b93045435d0aeffa",
  ],
  [
    "supabase/migrations/20260830143533_2b67c92f-81d4-4199-bbb1-8a613b12352c.sql",
    "df9065196a7ccc91651e47849b7fd48c7b35cb34abe8ef44ed1ba2fbd5e49d67",
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
])) {
  if (generatedPlatformArtifacts.has(file)) continue;

  const expectedDigest = acknowledgedHistoricalMigrations.get(file);
  if (!expectedDigest) {
    assert.ok(
      authorizedChangedPaths.has(file),
      `post-I3-A data change lacks Approved PCA: ${file}`,
    );
    continue;
  }
  const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
  assert.equal(
    digest,
    expectedDigest,
    `historical migration changed after exact Founder acknowledgment: ${file}`,
  );
  assertApprovedExactModification("PCA-2026-056", file);
}

console.log(
  "I3-A evidence: PASS (historical scope preserved; Destination contract intact; exact OFF legacy branch).",
);
