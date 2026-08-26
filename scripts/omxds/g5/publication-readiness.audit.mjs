import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sourcePath = "docs/governance/evidence/p0-19-25/data-readiness.json";
const sourceBytes = readFileSync(sourcePath);
const source = JSON.parse(sourceBytes.toString("utf8"));
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");

assert.equal(source.package, "19.25");
assert.equal(source.feature_flag.omxds_visual_v1_contracts_enabled, false);
assert.equal(sourceSha256, "1fddc8f2af22bf7d6f60330e2b47c126a4e5e4110bd5c8ef8efaefb95b2b9dc4");
assert.equal(source.seo_metadata_seeded.length, 4);
assert.equal(source.unpublished.length, 5);
assert.equal(source.declared_debt.published_products_without_media.length, 9);
assert.equal(source.post_execution_verification.signed_urls_in_seo_metadata, 0);

const accredited = source.seo_metadata_seeded.map(({ kind, id, slug }) => ({
  kind,
  id,
  slug,
  classification: "READY_ACCREDITED",
  action: "retain_current_state",
}));
const incomplete = source.unpublished.map(({ kind, id, slug, cause }) => ({
  kind,
  id,
  slug,
  classification: "BLOCKED_INCOMPLETE",
  reason: cause,
  action: "remain_draft",
}));
const productsWithoutMedia = source.declared_debt.published_products_without_media.map((slug) => ({
  kind: "product",
  slug,
  classification: "BLOCKED_NO_MEDIA",
  demoHint: slug.endsWith("-demo"),
  action: "do_not_promote",
}));

const identities = [...accredited, ...incomplete]
  .map((entity) => `${entity.kind}:${entity.id}`)
  .sort();
assert.equal(new Set(identities).size, identities.length, "readiness identities must not overlap");

console.log(
  JSON.stringify(
    {
      result: "PASS",
      mode: "READ_ONLY_EVIDENCE_SNAPSHOT",
      source: sourcePath,
      source_sha256: sourceSha256,
      cutoff: source.executed_at,
      live_backend_verified: false,
      feature_flag: false,
      summary: {
        ready_accredited: accredited.length,
        blocked_incomplete: incomplete.length,
        blocked_no_media: productsWithoutMedia.length,
      },
      accredited,
      incomplete,
      products_without_media: productsWithoutMedia,
      exclusions: [
        "no database writes",
        "no publication",
        "no demo promotion",
        "no migration",
        "no feature flag change",
      ],
    },
    null,
    2,
  ),
);
