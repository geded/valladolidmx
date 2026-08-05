import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260805090000_omxds_i4c_preview_concurrency_audit_rollback.sql",
  "utf8",
);
const server = readFileSync("src/lib/experience-builder/studio.functions.ts", "utf8");
const studio = readFileSync("src/components/experience-builder/VisualStudio.tsx", "utf8");
const previewRoute = readFileSync("src/routes/preview/composition.$token.tsx", "utf8");
const i3dEvidence = readFileSync("scripts/omxds/i3/business-premium-surface.evidence.mjs", "utf8");

describe("I4-C preview, concurrency, audit and rollback authority", () => {
  test("draft saves and rollbacks use DB compare-and-swap and audit conflicts", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS draft_version");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS draft_hash");
    expect(migration).toContain(
      "eb_save_composition_draft(_id uuid, _tree jsonb, _expected_hash text)",
    );
    expect(migration).toContain("Composition.DraftSaveConflict");
    expect(migration).toContain("RAISE EXCEPTION 'draft_conflict'");
    expect(migration).toContain(
      "eb_restore_revision(_id uuid, _revision_id uuid, _expected_hash text)",
    );
    expect(migration).toContain("Composition.RollbackConflict");
    expect(migration).toContain("approved_revision_id = NULL");
    expect(migration).toContain("scheduled_revision_id = NULL");
  });

  test("preview tokens are digest-backed, snapshot-bound, revocable and audited", () => {
    expect(migration).toContain("token_digest text");
    expect(migration).toContain("snapshot_hash text");
    expect(migration).toContain("revoked_at timestamptz");
    expect(migration).toContain("eb_issue_composition_preview");
    expect(migration).toContain("eb_revoke_composition_preview");
    expect(migration).toContain("eb_resolve_composition_preview");
    expect(migration).toContain("Composition.PreviewIssued");
    expect(migration).toContain("Composition.PreviewRevoked");
    expect(migration).toContain("Composition.PreviewResolved");
    expect(migration).toContain("Composition.PreviewExpired");
    expect(migration).toContain("Composition.PreviewRejected");
    expect(server).toContain("crypto.getRandomValues");
    expect(server).toContain("eb_issue_composition_preview");
    expect(server).toContain("eb_resolve_composition_preview");
    expect(server).not.toContain('.eq("token", data.token)');
  });

  test("consumers pass expected hashes and preview keeps noindex with Merida time", () => {
    expect(server).toContain("expected_hash: string");
    expect(studio).toContain("expected_hash: page.draft_hash ?? draftHash ??");
    expect(studio).toContain("draft_conflict");
    expect(previewRoute).toContain("noindex: true");
    expect(previewRoute).toContain('timeZone: "America/Merida"');
    expect(previewRoute).toContain("payload.snapshot_hash");
  });
  test("I3-D historical evidence accepts only exact paths from approved PCAs", () => {
    expect(i3dEvidence).toContain('const base = "ec9ae951412e8cb5223ba9fbf60d51d6814b0552"');
    expect(i3dEvidence).toContain('const i3DHead = "43c8ca6de4c10cf2430285aa8261adeda82dbf10"');
    expect(i3dEvidence).toContain(
      'const authorizationDir = "docs/governance/product-authorizations"',
    );
    expect(i3dEvidence).toContain('authorization.status !== "Approved"');
    expect(i3dEvidence).toContain('["create", "modify"].includes(permission.operation)');
    expect(i3dEvidence).toContain('!permission.path.endsWith("/")');
    expect(i3dEvidence).toContain("approvedPcaAuthorizedPaths.has(file)");
    expect(i3dEvidence).not.toContain("authorizedI4bPaths");
    expect(i3dEvidence).not.toContain("post-I3-D data change lacks PCA-2026-014");
  });
});
