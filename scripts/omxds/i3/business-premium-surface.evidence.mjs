import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import {
  assertGovernedDependencyBaseline,
  assertGovernedLockBaseline,
} from "../lib/platform-dependency-baseline.mjs";

const base = "ec9ae951412e8cb5223ba9fbf60d51d6814b0552";
const i3DHead = "43c8ca6de4c10cf2430285aa8261adeda82dbf10";
const routePath = "src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx";
const surfacePath = "src/components/surfaces/BusinessSurface.tsx";
const contractPath = "src/lib/omxds/surfaces/business-premium-surface.contract.ts";
const eligibilityPath = "src/lib/omxds/surfaces/business-premium-eligibility.server.ts";
const allowed = new Set([
  "docs/blueprint/18.41-OMXDS-V1-I3-D-BUSINESS-PREMIUM-SURFACE-IMPLEMENTATION-AUTHORIZATION-PACK-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
  "docs/governance/generated/08-KNOWLEDGE-GRAPH.json",
  "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json",
  "docs/governance/product-authorizations/PCA-2026-011.json",
  "package.json",
  "scripts/omxds/i3/business-premium-surface.contract.test.ts",
  "scripts/omxds/i3/business-premium-surface.evidence.mjs",
  "scripts/omxds/i3/business-vertical-surfaces.evidence.mjs",
  "scripts/omxds/i3/product-experience-event-surfaces.evidence.mjs",
  surfacePath,
  contractPath,
  eligibilityPath,
  routePath,
]);

function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const changed = new Set(gitLines(["diff", "--name-only", `${base}...${i3DHead}`]));
assert.equal(changed.size, 15, "I3-D must contain exactly 15 files");
for (const file of changed) assert.ok(allowed.has(file), `I3-D scope violation: ${file}`);
for (const file of allowed) assert.ok(changed.has(file), `I3-D authorized file missing: ${file}`);

for (const protectedPath of [
  routePath,
  surfacePath,
  contractPath,
  eligibilityPath,
  "scripts/omxds/i3/business-premium-surface.contract.test.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", i3DHead, "--", protectedPath], {
      encoding: "utf8",
    }),
    "",
    `I3-D protected artifact regressed after its authorized batch: ${protectedPath}`,
  );

const basePackage = JSON.parse(
  execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
);
const currentPackage = JSON.parse(readFileSync("package.json", "utf8"));
assertGovernedDependencyBaseline(currentPackage, basePackage, "I3-D");
assertGovernedLockBaseline(base, "I3-D");

const route = readFileSync(routePath, "utf8");
assert.match(route, /getOmxdsSurfaceContractsFlag\(\)\.catch\(\(\) => false\)/);
assert.match(route, /surfaceContractsEnabled\s*\?\s*await getBusinessPremiumEligibility/);
assert.ok(
  route.indexOf("getOmxdsSurfaceContractsFlag().catch(() => false)") <
    route.indexOf("await getBusinessPremiumEligibility"),
  "Premium eligibility must run only after the fail-closed flag read",
);
assert.match(route, /premiumEligibility=\{premiumEligibility\}/);
assert.match(route, /CompositionRenderer tree=\{composition\.snapshot\}/);
assert.match(route, /legacy=/);

const surface = readFileSync(surfacePath, "utf8");
assert.match(surface, /createBusinessPremiumSurfaceContract/);
assert.match(surface, /ExperienceGallery/);
assert.match(surface, /id="contacto"/);
assert.ok(
  surface.indexOf("adaptHotelSurfaceContract(input)") <
    surface.indexOf("createBusinessPremiumSurfaceContract(input, premiumEligibility)"),
  "Hotel must resolve before Business Premium",
);
assert.ok(
  surface.indexOf("adaptRestaurantSurfaceContract(input)") <
    surface.indexOf("createBusinessPremiumSurfaceContract(input, premiumEligibility)"),
  "Restaurant must resolve before Business Premium",
);
assert.match(surface, /if \(!enabled \|\| !business\) return legacy/);

const contract = readFileSync(contractPath, "utf8");
for (const reason of [
  "no_active_premium_grant",
  "verification_missing",
  "cover_missing",
  "gallery_incomplete",
  "content_incomplete",
  "location_missing",
  "contact_missing",
  "seo_incomplete",
  "accessibility_gate_failed",
])
  assert.match(contract, new RegExp(`"${reason}"`));
assert.match(contract, /facts\.hasActiveGrant/);
assert.match(contract, /!facts\.isDefaultPlan/);
assert.match(contract, /facts\.planSlug === "premium" \|\| facts\.planSlug === "elite"/);
assert.match(contract, /family: "business"/);
assert.match(contract, /id: "contact"/);
for (const omission of ["offer", "price", "availability", "reservation", "reputation", "delivery"])
  assert.match(contract, new RegExp(`"${omission}"`));
assert.doesNotMatch(contract, /checkout|purchase|book|reserve/i);

const eligibility = readFileSync(eligibilityPath, "utf8");
assert.match(eligibility, /business_effective_visibility/);
assert.match(eligibility, /permissions_audit_log/);
assert.match(eligibility, /business_published/);
assert.match(eligibility, /verification_document_url/);
assert.match(eligibility, /metadata\.source === "portal"/);
assert.match(eligibility, /asset\.metadata\.business_id === businessId/);
assert.match(eligibility, /pipeline_status === "ready"/);
assert.match(eligibility, /review_state === "approved"/);
assert.match(eligibility, /createSignedUrl/);
assert.doesNotMatch(eligibility, /plan_tier|\.verified\b/);

const authorizationDir = "docs/governance/product-authorizations";
const approvedPcaAuthorizedPaths = new Set();
for (const entry of readdirSync(authorizationDir)
  .filter((file) => file.endsWith(".json"))
  .sort()) {
  const authorizationPath = `${authorizationDir}/${entry}`;
  const authorization = JSON.parse(readFileSync(authorizationPath, "utf8"));
  if (authorization.status !== "Approved") continue;
  for (const permission of authorization.permissions ?? []) {
    if (!["create", "modify"].includes(permission.operation)) continue;
    assert.equal(
      typeof permission.path,
      "string",
      `${authorizationPath} permission path must be an exact string`,
    );
    assert.ok(
      !permission.path.endsWith("/"),
      `${authorizationPath} must not authorize broad directories: ${permission.path}`,
    );
    approvedPcaAuthorizedPaths.add(permission.path);
  }
}
assert.ok(
  approvedPcaAuthorizedPaths.has(
    "supabase/migrations/20260804233000_omxds_i4b_workflow_publication_authority.sql",
  ),
  "PCA approved exact-path set must preserve I4-B migration authorization",
);

const flagConsumers = gitLines([
  "grep",
  "-l",
  "surface-contracts-flag.server",
  "--",
  "src/routes",
]).sort();
assert.deepEqual(
  flagConsumers,
  [
    "src/routes/eventos.$slug.tsx",
    "src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx",
    routePath,
    "src/routes/oriente-maya/$destino.index.tsx",
    "src/routes/producto.$slug.tsx",
  ].sort(),
);

const publicShell = readFileSync("src/components/discovery/PublicShell.tsx", "utf8");
assert.match(publicShell, /<main id="main" tabIndex=\{-1\}/);
assert.ok(readFileSync("scripts/omxds/i1/contrast.mjs", "utf8").includes("WCAG 2.2 AA"));
const seo = readFileSync("src/lib/discovery/seo.ts", "utf8");
assert.match(seo, /export function localBusinessJsonLd/);
assert.match(seo, /if \(input\.image\) jsonLd\.image = input\.image/);
assert.match(seo, /if \(input\.latitude != null && input\.longitude != null\)/);

for (const pcaGovernedPath of [
  "src/lib/catalog/marketplace-reads.functions.ts",
  "src/lib/experience-builder/preview-registry.tsx",
]) {
  const pcaGovernedChange = execFileSync(
    "git",
    ["diff", "--name-only", base, "--", pcaGovernedPath],
    { encoding: "utf8" },
  );
  if (pcaGovernedChange)
    assert.ok(
      approvedPcaAuthorizedPaths.has(pcaGovernedPath),
      `post-I3-D change lacks Approved PCA: ${pcaGovernedPath}`,
    );
}

for (const forbiddenPath of [
  "src/lib/experience-builder/composition-renderer.tsx",
  "src/lib/experience-builder/page-kind-registry.ts",
  "src/lib/omxds/surfaces/surface-actions.ts",
  "src/lib/omxds/surfaces/surface-contract.ts",
  "src/lib/omxds/surfaces/surface-contracts-flag.server.ts",
  "src/lib/omxds/surfaces/surface-state.ts",
])
  assert.equal(
    execFileSync("git", ["diff", "--name-only", base, "--", forbiddenPath], {
      encoding: "utf8",
    }),
    "",
  );
for (const file of gitLines([
  "diff",
  "--name-only",
  base,
  "--",
  "supabase",
  "src/integrations/supabase",
]))
  assert.ok(
    approvedPcaAuthorizedPaths.has(file),
    `post-I3-D data change lacks an Approved PCA exact-path authorization: ${file}`,
  );

const tests = readFileSync("scripts/omxds/i3/business-premium-surface.contract.test.ts", "utf8");
assert.match(tests, /fictional/i);
assert.doesNotMatch(tests, /Zazil Tunich/i);

console.log(
  "I3-D evidence: PASS (conservative Premium eligibility; same Business owner/route; Hotel/Restaurant preserved; exact OFF legacy branch).",
);
