import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

// Founder reconciliation (2026-11-20, paso 3 de la puesta al día de gobernanza).
// Pins the exact SHA-256 of each governed file whose version in force the Founder
// approved after the Lovable work recovery, formatting and lint fixes. A file is
// reconciled only while its bytes match that digest; any later edit fails closed again.
export const FOUNDER_REVISION_RECONCILIATION_PATH =
  "docs/governance/evidence/founder-revision-reconciliation-2026-11-20.json";

let cached;
function readRecord() {
  if (cached !== undefined) return cached;
  cached = null;
  if (existsSync(FOUNDER_REVISION_RECONCILIATION_PATH)) {
    const record = JSON.parse(readFileSync(FOUNDER_REVISION_RECONCILIATION_PATH, "utf8"));
    if (record.status === "Approved") cached = record;
  }
  return cached;
}

export function isFounderReconciled(path) {
  const record = readRecord();
  const expected = record?.revisions?.[path];
  if (!expected) return false;
  if (expected === "deleted") return !existsSync(path);
  if (!existsSync(path)) return false;
  return createHash("sha256").update(readFileSync(path)).digest("hex") === expected;
}

// Content guards written for earlier revisions apply again as soon as the file leaves
// its reconciled digest.
export function assertMatchUnlessReconciled(path, text, pattern, message) {
  if (!isFounderReconciled(path)) assert.match(text, pattern, message);
}

export function assertDoesNotMatchUnlessReconciled(path, text, pattern, message) {
  if (!isFounderReconciled(path)) assert.doesNotMatch(text, pattern, message);
}
