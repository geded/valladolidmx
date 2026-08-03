/**
 * OMXDS I4-0 · Shared Editorial Builder Policy
 *
 * Pure contract only: no UI, network, database, route, flag or runtime consumer.
 * I4-A or a later authorized batch may connect this policy to authoring surfaces.
 */

export const EDITORIAL_BUILDER_CONTRACT_VERSION = "i4-0" as const;

export const EDITORIAL_BLOCK_MODES = [
  "authorable",
  "governed_read_only",
  "legacy_read_only",
  "prohibited",
] as const;
export type EditorialBlockMode = (typeof EDITORIAL_BLOCK_MODES)[number];

export const EDITORIAL_FIELD_CLASSES = [
  "editorial",
  "reference",
  "media",
  "governed",
  "calculated",
  "system",
  "legal",
] as const;
export type EditorialFieldClass = (typeof EDITORIAL_FIELD_CLASSES)[number];

export const EDITORIAL_ACTOR_CLASSES = [
  "founder_admin",
  "territorial_editor",
  "business_author",
  "reviewer_approver",
  "publisher",
  "system",
] as const;
export type EditorialActorClass = (typeof EDITORIAL_ACTOR_CLASSES)[number];

export const EDITORIAL_SURFACES = [
  "home",
  "landing",
  "institutional",
  "destination",
  "business",
  "product",
  "marketplace",
  "alux",
  "trip_builder",
  "region",
] as const;
export type EditorialSurface = (typeof EDITORIAL_SURFACES)[number];

export const EDITORIAL_BLOCK_OPERATIONS = [
  "insert",
  "edit",
  "duplicate",
  "ai_generate",
  "template_new",
  "bind",
  "render_legacy",
  "publish_new",
] as const;
export type EditorialBlockOperation = (typeof EDITORIAL_BLOCK_OPERATIONS)[number];

export const GOVERNED_SOURCE_IDS = [
  "routing.canonical",
  "geography.location",
  "operations.schedule",
  "commerce.price",
  "commerce.availability",
  "reputation.rating",
  "trust.badges",
  "publication.state",
  "premium.eligibility",
  "media.registry",
] as const;
export type GovernedSourceId = (typeof GOVERNED_SOURCE_IDS)[number];

export const EDITORIAL_WORKFLOW_STATES = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "unpublished",
  "archived",
] as const;
export type EditorialWorkflowState = (typeof EDITORIAL_WORKFLOW_STATES)[number];

export interface EditorialFieldMetadata {
  class: EditorialFieldClass;
  writable_by: readonly EditorialActorClass[];
  source_id?: GovernedSourceId;
}

export interface EditorialBlockMetadata {
  mode: EditorialBlockMode;
  family: string;
  variants: readonly string[];
  allowed_sources: readonly GovernedSourceId[];
}

export interface EditorialFieldPolicy extends EditorialFieldMetadata {
  field: string;
  type: "text" | "rich_text" | "number" | "boolean" | "reference" | "media" | "select";
  required?: boolean;
  max_length?: number;
  translatable?: boolean;
}

export interface EditorialBlockPolicy extends EditorialBlockMetadata {
  type: string;
  surfaces: readonly EditorialSurface[];
  authoring_roles: readonly EditorialActorClass[];
  fields: readonly EditorialFieldPolicy[];
}

export interface EditorialWorkflowTransition {
  from: EditorialWorkflowState;
  to: EditorialWorkflowState;
}

export interface EditorialBuilderPolicy {
  contract_version: typeof EDITORIAL_BUILDER_CONTRACT_VERSION;
  blocks: readonly EditorialBlockPolicy[];
  workflow: {
    states: readonly EditorialWorkflowState[];
    transitions: readonly EditorialWorkflowTransition[];
    distinct_author_and_approver: true;
    approval_bound_to_snapshot_hash: true;
    edit_invalidates_approval: true;
  };
  preview: {
    themes: readonly ["sol", "luna"];
    viewports: readonly [390, 768, 1024, 1440];
    expiring_token_required: true;
    noindex_required: true;
    may_publish: false;
    may_mutate_commerce: false;
  };
  concurrency: {
    expected_version_required: true;
    expected_hash_required: true;
    silent_last_write_wins: false;
  };
  audit: {
    immutable: true;
    required_fields: readonly ["actor", "action", "source", "version", "result", "occurred_at"];
  };
  rollback: {
    restores_as_new_draft: true;
    revalidates_current_sources: true;
    publishes_automatically: false;
  };
}

const AUTHORING_ROLES = ["founder_admin", "territorial_editor", "business_author"] as const;

export const EDITORIAL_BUILDER_POLICY: EditorialBuilderPolicy = {
  contract_version: EDITORIAL_BUILDER_CONTRACT_VERSION,
  blocks: [
    {
      type: "vmx.hero",
      mode: "authorable",
      family: "identity",
      variants: ["default", "media_left"],
      allowed_sources: ["media.registry", "routing.canonical"],
      surfaces: [
        "home",
        "landing",
        "institutional",
        "destination",
        "business",
        "product",
        "region",
      ],
      authoring_roles: AUTHORING_ROLES,
      fields: [
        {
          field: "eyebrow",
          class: "editorial",
          type: "text",
          max_length: 80,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "heading",
          class: "editorial",
          type: "text",
          required: true,
          max_length: 120,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "summary",
          class: "editorial",
          type: "rich_text",
          max_length: 400,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "media",
          class: "media",
          type: "media",
          source_id: "media.registry",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "canonical_target",
          class: "system",
          type: "reference",
          source_id: "routing.canonical",
          writable_by: [],
        },
      ],
    },
    {
      type: "vmx.rich-narrative",
      mode: "authorable",
      family: "narrative",
      variants: ["default", "chapter", "quote_led"],
      allowed_sources: [],
      surfaces: ["landing", "institutional", "destination", "business", "product", "region"],
      authoring_roles: AUTHORING_ROLES,
      fields: [
        {
          field: "heading",
          class: "editorial",
          type: "text",
          max_length: 120,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "body",
          class: "editorial",
          type: "rich_text",
          required: true,
          max_length: 2400,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
      ],
    },
    {
      type: "vmx.gallery",
      mode: "authorable",
      family: "media",
      variants: ["grid", "carousel_accessible"],
      allowed_sources: ["media.registry"],
      surfaces: ["landing", "institutional", "destination", "business", "product", "region"],
      authoring_roles: AUTHORING_ROLES,
      fields: [
        {
          field: "assets",
          class: "media",
          type: "media",
          required: true,
          source_id: "media.registry",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "caption",
          class: "editorial",
          type: "text",
          max_length: 180,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
      ],
    },
    {
      type: "vmx.governed.practical-info",
      mode: "governed_read_only",
      family: "operations",
      variants: ["compact", "detailed"],
      allowed_sources: ["operations.schedule", "geography.location"],
      surfaces: ["destination", "business", "product"],
      authoring_roles: ["founder_admin", "territorial_editor"],
      fields: [
        {
          field: "schedule",
          class: "governed",
          type: "reference",
          source_id: "operations.schedule",
          writable_by: [],
        },
        {
          field: "location",
          class: "governed",
          type: "reference",
          source_id: "geography.location",
          writable_by: [],
        },
      ],
    },
    {
      type: "vmx.governed.trust-signals",
      mode: "governed_read_only",
      family: "trust",
      variants: ["summary", "badges"],
      allowed_sources: ["reputation.rating", "trust.badges"],
      surfaces: ["destination", "business", "product"],
      authoring_roles: ["founder_admin", "territorial_editor"],
      fields: [
        {
          field: "rating",
          class: "governed",
          type: "reference",
          source_id: "reputation.rating",
          writable_by: [],
        },
        {
          field: "badges",
          class: "governed",
          type: "reference",
          source_id: "trust.badges",
          writable_by: [],
        },
      ],
    },
    {
      type: "vmx.custom.html",
      mode: "legacy_read_only",
      family: "legacy",
      variants: ["legacy"],
      allowed_sources: [],
      surfaces: EDITORIAL_SURFACES,
      authoring_roles: [],
      fields: [],
    },
  ],
  workflow: {
    states: EDITORIAL_WORKFLOW_STATES,
    transitions: [
      { from: "draft", to: "in_review" },
      { from: "in_review", to: "changes_requested" },
      { from: "in_review", to: "approved" },
      { from: "changes_requested", to: "draft" },
      { from: "approved", to: "scheduled" },
      { from: "approved", to: "published" },
      { from: "scheduled", to: "published" },
      { from: "scheduled", to: "draft" },
      { from: "published", to: "draft" },
      { from: "published", to: "unpublished" },
      { from: "unpublished", to: "draft" },
      { from: "unpublished", to: "archived" },
    ],
    distinct_author_and_approver: true,
    approval_bound_to_snapshot_hash: true,
    edit_invalidates_approval: true,
  },
  preview: {
    themes: ["sol", "luna"],
    viewports: [390, 768, 1024, 1440],
    expiring_token_required: true,
    noindex_required: true,
    may_publish: false,
    may_mutate_commerce: false,
  },
  concurrency: {
    expected_version_required: true,
    expected_hash_required: true,
    silent_last_write_wins: false,
  },
  audit: {
    immutable: true,
    required_fields: ["actor", "action", "source", "version", "result", "occurred_at"],
  },
  rollback: {
    restores_as_new_draft: true,
    revalidates_current_sources: true,
    publishes_automatically: false,
  },
};

export interface EditorialPolicyValidation {
  valid: boolean;
  errors: string[];
}

const validValues = <T extends string>(values: readonly T[]) => new Set<string>(values);
const MODES = validValues(EDITORIAL_BLOCK_MODES);
const CLASSES = validValues(EDITORIAL_FIELD_CLASSES);
const ACTORS = validValues(EDITORIAL_ACTOR_CLASSES);
const SURFACES = validValues(EDITORIAL_SURFACES);
const SOURCES = validValues(GOVERNED_SOURCE_IDS);
const READ_ONLY_CLASSES = new Set<EditorialFieldClass>([
  "governed",
  "calculated",
  "system",
  "legal",
]);

export function validateEditorialBlockMetadata(
  metadata: EditorialBlockMetadata,
  schemaFields: readonly string[],
  fieldMetadata: Readonly<Record<string, EditorialFieldMetadata | undefined>> = {},
): EditorialPolicyValidation {
  const errors: string[] = [];
  if (!MODES.has(metadata.mode)) errors.push(`unknown editorial block mode "${metadata.mode}"`);
  if (!metadata.family?.trim()) errors.push("editorial block family is required");
  if (!metadata.variants.length || new Set(metadata.variants).size !== metadata.variants.length)
    errors.push("editorial block variants must be non-empty and unique");
  if (metadata.allowed_sources.some((source) => !SOURCES.has(source)))
    errors.push("editorial block declares an unknown governed source");
  for (const field of Object.keys(fieldMetadata))
    if (!schemaFields.includes(field))
      errors.push(`editorial metadata references missing schema field "${field}"`);
  for (const [field, policy] of Object.entries(fieldMetadata)) {
    if (!policy) continue;
    if (!CLASSES.has(policy.class)) errors.push(`field "${field}" has an unknown editorial class`);
    if (policy.writable_by.some((actor) => !ACTORS.has(actor)))
      errors.push(`field "${field}" has an unknown writer`);
    if (READ_ONLY_CLASSES.has(policy.class) && policy.writable_by.length)
      errors.push(`read-only field "${field}" must not declare writers`);
    if (policy.source_id && !metadata.allowed_sources.includes(policy.source_id))
      errors.push(`field "${field}" source is outside the block allowlist`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateEditorialBuilderPolicy(
  policy: EditorialBuilderPolicy,
): EditorialPolicyValidation {
  const errors: string[] = [];
  if (policy.contract_version !== EDITORIAL_BUILDER_CONTRACT_VERSION)
    errors.push("unsupported editorial builder contract version");
  const blockTypes = policy.blocks.map((block) => block.type);
  if (new Set(blockTypes).size !== blockTypes.length) errors.push("block types must be unique");

  for (const block of policy.blocks) {
    const fieldNames = block.fields.map((field) => field.field);
    if (new Set(fieldNames).size !== fieldNames.length)
      errors.push(`${block.type}: field names must be unique`);
    if (block.surfaces.some((surface) => !SURFACES.has(surface)))
      errors.push(`${block.type}: surface is outside the allowlist`);
    if (block.authoring_roles.some((actor) => !ACTORS.has(actor)))
      errors.push(`${block.type}: actor is outside the allowlist`);
    const metadata = validateEditorialBlockMetadata(
      block,
      fieldNames,
      Object.fromEntries(block.fields.map((field) => [field.field, field])),
    );
    errors.push(...metadata.errors.map((error) => `${block.type}: ${error}`));
    if (block.mode === "legacy_read_only" && (block.authoring_roles.length || block.fields.length))
      errors.push(`${block.type}: legacy blocks must expose no authoring roles or fields`);
  }

  const legacyHtml = policy.blocks.find((block) => block.type === "vmx.custom.html");
  if (!legacyHtml || legacyHtml.mode !== "legacy_read_only")
    errors.push("vmx.custom.html must be registered exactly as legacy_read_only");

  if (!policy.workflow.distinct_author_and_approver)
    errors.push("workflow must separate author and approver");
  if (!policy.workflow.approval_bound_to_snapshot_hash)
    errors.push("approval must bind to a snapshot hash");
  if (!policy.workflow.edit_invalidates_approval) errors.push("edits must invalidate approval");
  if (policy.preview.may_publish || policy.preview.may_mutate_commerce)
    errors.push("preview must not publish or mutate commerce");
  if (!policy.preview.expiring_token_required || !policy.preview.noindex_required)
    errors.push("preview must require an expiring token and noindex");
  if (
    !policy.concurrency.expected_version_required ||
    !policy.concurrency.expected_hash_required ||
    policy.concurrency.silent_last_write_wins
  )
    errors.push("concurrency must require version/hash and reject silent last-write-wins");
  if (!policy.audit.immutable) errors.push("audit must be immutable");
  if (
    !policy.rollback.restores_as_new_draft ||
    !policy.rollback.revalidates_current_sources ||
    policy.rollback.publishes_automatically
  )
    errors.push("rollback must create a draft, revalidate sources and never auto-publish");
  return { valid: errors.length === 0, errors };
}

const OPERATIONS_BY_MODE: Readonly<Record<EditorialBlockMode, readonly EditorialBlockOperation[]>> =
  {
    authorable: ["insert", "edit", "duplicate", "ai_generate", "template_new", "publish_new"],
    governed_read_only: ["bind", "publish_new"],
    legacy_read_only: ["render_legacy"],
    prohibited: [],
  };

export function authorizeEditorialBlockOperation(
  blockType: string,
  operation: EditorialBlockOperation,
  policy: EditorialBuilderPolicy = EDITORIAL_BUILDER_POLICY,
): boolean {
  const block = policy.blocks.find((candidate) => candidate.type === blockType);
  return Boolean(block && OPERATIONS_BY_MODE[block.mode].includes(operation));
}

export interface EditorialAuthoringRequest {
  block_type: string;
  operation: EditorialBlockOperation;
  surface: EditorialSurface;
  actor: EditorialActorClass;
  variant: string;
  fields?: Readonly<Record<string, unknown>>;
  source_bindings?: readonly string[];
}

export function validateEditorialAuthoringRequest(
  request: EditorialAuthoringRequest,
  policy: EditorialBuilderPolicy = EDITORIAL_BUILDER_POLICY,
): EditorialPolicyValidation {
  const errors: string[] = [];
  const block = policy.blocks.find((candidate) => candidate.type === request.block_type);
  if (!block) return { valid: false, errors: [`unknown block "${request.block_type}"`] };
  if (!authorizeEditorialBlockOperation(request.block_type, request.operation, policy))
    errors.push(`operation "${request.operation}" is forbidden for mode "${block.mode}"`);
  if (!block.surfaces.includes(request.surface))
    errors.push(`surface "${request.surface}" is not allowed`);
  if (request.operation !== "render_legacy" && !block.authoring_roles.includes(request.actor))
    errors.push(`actor "${request.actor}" is not allowed`);
  if (!block.variants.includes(request.variant))
    errors.push(`variant "${request.variant}" is not allowed`);

  const values = request.fields ?? {};
  const policies = new Map(block.fields.map((field) => [field.field, field]));
  for (const field of Object.keys(values)) {
    const fieldPolicy = policies.get(field);
    if (!fieldPolicy) errors.push(`field "${field}" is not allowed`);
    else if (!fieldPolicy.writable_by.includes(request.actor))
      errors.push(`field "${field}" is read-only for actor "${request.actor}"`);
    else if (
      fieldPolicy.max_length &&
      typeof values[field] === "string" &&
      values[field].length > fieldPolicy.max_length
    )
      errors.push(`field "${field}" exceeds max_length ${fieldPolicy.max_length}`);
  }
  for (const fieldPolicy of block.fields)
    if (fieldPolicy.required && !(fieldPolicy.field in values))
      errors.push(`required field "${fieldPolicy.field}" is missing`);

  for (const source of request.source_bindings ?? [])
    if (!block.allowed_sources.includes(source as GovernedSourceId))
      errors.push(`source "${source}" is not allowed`);

  return { valid: errors.length === 0, errors };
}

export interface WorkflowTransitionRequest {
  from: EditorialWorkflowState;
  to: EditorialWorkflowState;
  author_id: string;
  actor_id: string;
  approved_snapshot_hash?: string;
  current_snapshot_hash?: string;
}

export function validateEditorialWorkflowTransition(
  request: WorkflowTransitionRequest,
  policy: EditorialBuilderPolicy = EDITORIAL_BUILDER_POLICY,
): EditorialPolicyValidation {
  const errors: string[] = [];
  if (
    !policy.workflow.transitions.some(({ from, to }) => from === request.from && to === request.to)
  )
    errors.push(`transition ${request.from} -> ${request.to} is not allowed`);
  if (request.to === "approved" && request.author_id === request.actor_id)
    errors.push("author cannot approve their own snapshot");
  if (["scheduled", "published"].includes(request.to)) {
    if (
      !request.approved_snapshot_hash ||
      request.approved_snapshot_hash !== request.current_snapshot_hash
    )
      errors.push("publication requires the exact approved snapshot hash");
  }
  return { valid: errors.length === 0, errors };
}
