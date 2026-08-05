import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260804233000_omxds_i4b_workflow_publication_authority.sql";
const migration = readFileSync(migrationPath, "utf8");
const server = readFileSync("src/lib/experience-builder/studio.functions.ts", "utf8");
const types = readFileSync("src/integrations/supabase/types.ts", "utf8");
const studio = readFileSync("src/components/experience-builder/VisualStudio.tsx", "utf8");

function functionBody(name: string) {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}`;
  const start = migration.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf("CREATE OR REPLACE FUNCTION public.", start + marker.length);
  return migration.slice(start, next < 0 ? migration.length : next);
}

describe("I4-B workflow, RBAC and publication authority", () => {
  test("is additive and data-neutral for existing rows", () => {
    const schemaPreamble = migration.slice(0, migration.indexOf("CREATE OR REPLACE FUNCTION"));
    expect(migration.match(/ADD COLUMN IF NOT EXISTS/g)?.length).toBe(8);
    expect(migration).not.toMatch(/CREATE TABLE|DROP TABLE|TRUNCATE|DELETE FROM/);
    expect(schemaPreamble).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
    expect(migration).toContain("Existing rows remain readable");
  });

  test("removes direct-write bypasses while preserving authenticated RPCs", () => {
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.page_compositions FROM authenticated",
    );
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.page_revisions FROM authenticated",
    );
    for (const rpc of [
      "eb_save_composition_draft(uuid, jsonb)",
      "eb_create_revision(uuid, text)",
      "eb_restore_revision(uuid, uuid)",
      "eb_set_workflow_state(uuid, text, text)",
      "eb_publish_composition(uuid, text)",
      "eb_unpublish_composition(uuid, text)",
      "eb_schedule_publish_composition(uuid, timestamptz, text)",
      "eb_cancel_scheduled_publish(uuid, text)",
    ])
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${rpc} TO authenticated`);
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.eb_process_scheduled_publishes() FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() TO service_role",
    );
  });

  test("creates immutable revision/hash approval with distinct author and approver", () => {
    const workflow = functionBody("eb_set_workflow_state");
    expect(workflow).toContain("author_cannot_self_approve");
    expect(workflow).toContain("WHERE id = _composition_id\n  FOR UPDATE");
    expect(workflow).toContain("approved_revision_id = _revision_id");
    expect(workflow).toContain("approved_snapshot_hash = _hash");
    expect(workflow).toContain("approved_by = _uid");
    expect(workflow).toContain("approved_at = now()");
    expect(workflow).toMatch(/_current <> 'in_review'/);
  });

  test("invalidates approval and scheduling atomically after every draft edit", () => {
    const save = functionBody("eb_save_composition_draft");
    for (const field of [
      "workflow_state = 'draft'",
      "approved_revision_id = NULL",
      "approved_snapshot_hash = NULL",
      "approved_by = NULL",
      "approved_at = NULL",
      "scheduled_publish_at = NULL",
      "scheduled_revision_id = NULL",
      "scheduled_snapshot_hash = NULL",
    ])
      expect(save).toContain(field);
    expect(save).toContain("approval_invalidated");
  });

  test("publishes only the exact approved revision belonging to the composition", () => {
    const publish = functionBody("eb_publish_composition");
    expect(publish).toContain("WHERE id = _id AND workflow_state = 'approved'");
    expect(publish).toContain("WHERE id = _revision_id AND composition_id = _id");
    expect(publish).toContain("approved_snapshot_hash_mismatch");
    expect(publish).toContain("active_revision_id = _revision_id");
    expect(publish).not.toContain("current_draft");
  });

  test("freezes the exact approved revision/hash when scheduling", () => {
    const schedule = functionBody("eb_schedule_publish_composition");
    expect(schedule).toContain("WHERE id = _id AND workflow_state = 'approved'");
    expect(schedule).toContain("scheduled_revision_id = _revision_id");
    expect(schedule).toContain("scheduled_snapshot_hash = _approved_hash");
    expect(schedule).toContain("workflow_state = 'scheduled'");
  });

  test("scheduled processor is fail-closed for legacy or mismatched snapshots", () => {
    const process = functionBody("eb_process_scheduled_publishes");
    expect(process).toContain("_row.scheduled_revision_id IS NULL");
    expect(process).toContain("_actual_hash IS DISTINCT FROM _row.scheduled_snapshot_hash");
    expect(process).toContain("Composition.PublishRejected");
    expect(process).toContain("active_revision_id = _row.scheduled_revision_id");
    expect(process).not.toContain("current_draft");
  });

  test("keeps every mutation isolated to the requested composition", () => {
    for (const rpc of [
      "eb_save_composition_draft",
      "eb_create_revision",
      "eb_restore_revision",
      "eb_set_workflow_state",
      "eb_publish_composition",
      "eb_unpublish_composition",
      "eb_schedule_publish_composition",
      "eb_cancel_scheduled_publish",
    ]) {
      const body = functionBody(rpc);
      expect(body).toMatch(/WHERE id = _(id|composition_id)/);
    }
    expect(functionBody("eb_restore_revision")).toContain(
      "WHERE id = _revision_id AND composition_id = _id",
    );
  });

  test("audits author, approver, revision, hash and rejected scheduled work", () => {
    for (const value of [
      "author_id",
      "approver_id",
      "approved_revision_id",
      "snapshot_hash",
      "Composition.PublishRejected",
      "Composition.WorkflowTransition",
    ])
      expect(migration).toContain(value);
  });

  test("server and generated types expose the atomic authority without client trust", () => {
    expect(server).toContain("approved_revision_id");
    expect(server).toContain("approved_snapshot_hash");
    expect(server).toContain("scheduled_revision_id");
    expect(server).toContain('rpc("eb_publish_composition"');
    expect(server).toContain('rpc("eb_schedule_publish_composition"');
    expect(types).toContain("approved_revision_id: string | null");
    expect(types).toContain("snapshot_hash: string | null");
    expect(studio).toContain('state: CompositionDetail["workflow_state"]');
    expect(studio).toContain('scheduled: "Programado"');
    expect(studio).toContain('published: "Publicado"');
    expect(studio).toContain(
      'onChange: (next: "draft" | "in_review" | "approved") => void | Promise<void>',
    );
  });

  test("keeps the visual flag and all public routes untouched", () => {
    expect(migration).not.toContain("omxds_visual_v1_contracts_enabled");
    expect(server).not.toContain("omxds_visual_v1_contracts_enabled = true");
    expect(migration).not.toMatch(/CREATE (OR REPLACE )?VIEW|CREATE POLICY/);
  });
});
