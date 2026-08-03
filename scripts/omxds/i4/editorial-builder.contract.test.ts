import { describe, expect, test } from "bun:test";
import {
  validateBlockContract,
  type BlockContract,
} from "../../../src/lib/experience-builder/block-contract";
import {
  EDITORIAL_BUILDER_POLICY,
  authorizeEditorialBlockOperation,
  validateEditorialAuthoringRequest,
  validateEditorialBuilderPolicy,
  validateEditorialWorkflowTransition,
  type EditorialBuilderPolicy,
} from "../../../src/lib/experience-builder/editorial-builder-policy";

const fictionalHeroRequest = {
  block_type: "vmx.hero",
  operation: "insert",
  surface: "destination",
  actor: "territorial_editor",
  variant: "default",
  fields: {
    heading: "Destino Lucero Ficticio",
    summary: "Una narración ficticia usada únicamente por el harness de I4-0.",
  },
  source_bindings: ["routing.canonical"],
} as const;

describe("I4-0 shared Editorial Builder contract", () => {
  test("accepts the canonical isolated policy and its closed vocabularies", () => {
    const result = validateEditorialBuilderPolicy(EDITORIAL_BUILDER_POLICY);
    expect(result).toEqual({ valid: true, errors: [] });
    expect(EDITORIAL_BUILDER_POLICY.preview.viewports).toEqual([390, 768, 1024, 1440]);
    expect(EDITORIAL_BUILDER_POLICY.preview.themes).toEqual(["sol", "luna"]);
    expect(EDITORIAL_BUILDER_POLICY.concurrency.silent_last_write_wins).toBe(false);
    expect(EDITORIAL_BUILDER_POLICY.rollback.publishes_automatically).toBe(false);
  });

  test("accepts only allowlisted block, surface, actor, variant, fields and sources", () => {
    expect(validateEditorialAuthoringRequest(fictionalHeroRequest)).toEqual({
      valid: true,
      errors: [],
    });

    const rejected = validateEditorialAuthoringRequest({
      ...fictionalHeroRequest,
      variant: "invented",
      fields: { ...fictionalHeroRequest.fields, rating: 5 },
      source_bindings: ["freeform.query"],
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.errors).toEqual([
      'variant "invented" is not allowed',
      'field "rating" is not allowed',
      'source "freeform.query" is not allowed',
    ]);
  });

  test("fails closed for unknown blocks and overlong editorial values", () => {
    expect(
      validateEditorialAuthoringRequest({
        ...fictionalHeroRequest,
        block_type: "vmx.unknown",
      }),
    ).toEqual({ valid: false, errors: ['unknown block "vmx.unknown"'] });

    const overlong = validateEditorialAuthoringRequest({
      ...fictionalHeroRequest,
      fields: { heading: "x".repeat(121) },
    });
    expect(overlong.valid).toBe(false);
    expect(overlong.errors).toContain('field "heading" exceeds max_length 120');
  });

  test("permits governed bindings but rejects manual governed values", () => {
    expect(
      validateEditorialAuthoringRequest({
        block_type: "vmx.governed.practical-info",
        operation: "bind",
        surface: "business",
        actor: "territorial_editor",
        variant: "compact",
        source_bindings: ["operations.schedule", "geography.location"],
      }),
    ).toEqual({ valid: true, errors: [] });

    const manualSchedule = validateEditorialAuthoringRequest({
      block_type: "vmx.governed.practical-info",
      operation: "bind",
      surface: "business",
      actor: "territorial_editor",
      variant: "compact",
      fields: { schedule: "Siempre abierto" },
      source_bindings: ["operations.schedule"],
    });
    expect(manualSchedule.valid).toBe(false);
    expect(manualSchedule.errors).toContain(
      'field "schedule" is read-only for actor "territorial_editor"',
    );
  });

  test("confines vmx.custom.html to historical read-only rendering", () => {
    expect(authorizeEditorialBlockOperation("vmx.custom.html", "render_legacy")).toBe(true);
    for (const operation of [
      "insert",
      "edit",
      "duplicate",
      "ai_generate",
      "template_new",
      "bind",
      "publish_new",
    ] as const)
      expect(authorizeEditorialBlockOperation("vmx.custom.html", operation)).toBe(false);
  });

  test("enforces author-approver separation and the exact approved snapshot", () => {
    expect(
      validateEditorialWorkflowTransition({
        from: "in_review",
        to: "approved",
        author_id: "author:fictitious",
        actor_id: "reviewer:fictitious",
      }),
    ).toEqual({ valid: true, errors: [] });

    expect(
      validateEditorialWorkflowTransition({
        from: "in_review",
        to: "approved",
        author_id: "same:fictitious",
        actor_id: "same:fictitious",
      }).valid,
    ).toBe(false);
    expect(
      validateEditorialWorkflowTransition({
        from: "approved",
        to: "published",
        author_id: "author:fictitious",
        actor_id: "publisher:fictitious",
        approved_snapshot_hash: "sha256:approved",
        current_snapshot_hash: "sha256:changed",
      }).valid,
    ).toBe(false);
  });

  test("rejects a policy that reopens legacy HTML or weakens preview", () => {
    const weakened = {
      ...EDITORIAL_BUILDER_POLICY,
      blocks: EDITORIAL_BUILDER_POLICY.blocks.map((block) =>
        block.type === "vmx.custom.html"
          ? { ...block, mode: "authorable" as const, authoring_roles: ["founder_admin" as const] }
          : block,
      ),
      preview: { ...EDITORIAL_BUILDER_POLICY.preview, may_publish: true as const },
    } as unknown as EditorialBuilderPolicy;
    const result = validateEditorialBuilderPolicy(weakened);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "vmx.custom.html must be registered exactly as legacy_read_only",
    );
    expect(result.errors).toContain("preview must not publish or mutate commerce");
  });

  test("extends BlockContract metadata without changing contracts that omit it", () => {
    const baseContract: BlockContract = {
      type: "vmx.fictional",
      category: "static",
      version: "1.0.0",
      display_name: "Fictitious",
      schema: { heading: { type: "text", label: "Heading" } },
      capabilities: {},
    };
    expect(validateBlockContract(baseContract)).toEqual({ valid: true, errors: [] });

    const invalidMetadata: BlockContract = {
      ...baseContract,
      schema: {
        heading: {
          type: "text",
          label: "Heading",
          editorial: {
            class: "system",
            writable_by: ["territorial_editor"],
            source_id: "routing.canonical",
          },
        },
      },
      editorial: {
        mode: "authorable",
        family: "fictional",
        variants: ["default"],
        allowed_sources: [],
      },
    };
    const result = validateBlockContract(invalidMetadata);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'editorial policy: read-only field "heading" must not declare writers',
    );
    expect(result.errors).toContain(
      'editorial policy: field "heading" source is outside the block allowlist',
    );
  });
});
