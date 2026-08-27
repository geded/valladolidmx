/**
 * OMXDS I4-0 · Shared Editorial Builder Policy
 *
 * Pure policy: no UI, network, database, route or flag access. I4-A connects
 * this module to the four explicitly authorized authoring consumers.
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
      type: "vmx.experience.hero",
      mode: "authorable",
      family: "identity",
      variants: ["immersive", "compact", "editorial", "cinematic", "gallery"],
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
        { field: "source", class: "system", type: "select", writable_by: [] },
        {
          field: "eyebrow",
          class: "editorial",
          type: "text",
          max_length: 80,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "title",
          class: "editorial",
          type: "text",
          required: true,
          max_length: 120,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "description",
          class: "editorial",
          type: "rich_text",
          max_length: 400,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "mediaUrl",
          class: "media",
          type: "media",
          source_id: "media.registry",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "mediaAlt",
          class: "editorial",
          type: "text",
          max_length: 240,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "mediaSlides",
          class: "media",
          type: "media",
          source_id: "media.registry",
          writable_by: AUTHORING_ROLES,
        },
        { field: "variant", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        { field: "overlay", class: "editorial", type: "number", writable_by: AUTHORING_ROLES },
        { field: "alignment", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        { field: "eyebrowStyle", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        {
          field: "overlapHeader",
          class: "editorial",
          type: "boolean",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "slideIntervalMs",
          class: "editorial",
          type: "number",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "ctaPrimary",
          class: "reference",
          type: "reference",
          source_id: "routing.canonical",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "ctaSecondary",
          class: "reference",
          type: "reference",
          source_id: "routing.canonical",
          writable_by: AUTHORING_ROLES,
        },
      ],
    },
    {
      type: "vmx.experience.section",
      mode: "authorable",
      family: "narrative",
      variants: ["editorial", "split", "centered", "quote"],
      allowed_sources: ["media.registry", "routing.canonical"],
      surfaces: ["landing", "institutional", "destination", "business", "product", "region"],
      authoring_roles: AUTHORING_ROLES,
      fields: [
        { field: "source", class: "system", type: "select", writable_by: [] },
        {
          field: "eyebrow",
          class: "editorial",
          type: "text",
          max_length: 120,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "title",
          class: "editorial",
          type: "rich_text",
          max_length: 160,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "lead",
          class: "editorial",
          type: "text",
          max_length: 400,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "body",
          class: "editorial",
          type: "rich_text",
          max_length: 2400,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "mediaUrl",
          class: "media",
          type: "media",
          source_id: "media.registry",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "mediaAlt",
          class: "editorial",
          type: "text",
          max_length: 240,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "attribution",
          class: "editorial",
          type: "text",
          max_length: 240,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "ariaLabel",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        { field: "variant", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        { field: "align", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        { field: "tone", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        {
          field: "ctas",
          class: "reference",
          type: "reference",
          source_id: "routing.canonical",
          writable_by: AUTHORING_ROLES,
        },
      ],
    },
    {
      type: "vmx.experience.gallery",
      mode: "authorable",
      family: "media",
      variants: ["mosaic", "grid", "carousel", "strip"],
      allowed_sources: ["media.registry"],
      surfaces: ["landing", "institutional", "destination", "business", "product", "region"],
      authoring_roles: AUTHORING_ROLES,
      fields: [
        { field: "source", class: "system", type: "select", writable_by: [] },
        {
          field: "items",
          class: "media",
          type: "media",
          required: true,
          source_id: "media.registry",
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "heading",
          class: "editorial",
          type: "text",
          max_length: 180,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "subheading",
          class: "editorial",
          type: "text",
          max_length: 240,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        {
          field: "ariaLabel",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: AUTHORING_ROLES,
        },
        { field: "variant", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
        { field: "maxVisible", class: "editorial", type: "number", writable_by: AUTHORING_ROLES },
        { field: "aspect", class: "editorial", type: "select", writable_by: AUTHORING_ROLES },
      ],
    },
    {
      type: "vmx.experience.info-grid",
      mode: "governed_read_only",
      family: "operations",
      variants: ["cards", "list", "inline"],
      allowed_sources: ["geography.location"],
      surfaces: ["destination", "business", "product"],
      authoring_roles: ["founder_admin", "territorial_editor"],
      fields: [
        { field: "source", class: "system", type: "select", writable_by: [] },
        {
          field: "items",
          class: "governed",
          type: "reference",
          source_id: "geography.location",
          writable_by: [],
        },
        {
          field: "heading",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "variant",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "columns",
          class: "editorial",
          type: "number",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "ariaLabel",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
      ],
    },
    {
      type: "vmx.experience.institutional-badges",
      mode: "governed_read_only",
      family: "trust",
      variants: ["filled", "soft", "outline", "icon-only"],
      allowed_sources: ["trust.badges"],
      surfaces: ["destination", "business", "product"],
      authoring_roles: ["founder_admin", "territorial_editor"],
      fields: [
        { field: "source", class: "system", type: "select", writable_by: [] },
        {
          field: "items",
          class: "governed",
          type: "reference",
          source_id: "trust.badges",
          writable_by: [],
        },
        {
          field: "variant",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "size",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "layout",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "ariaLabel",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
      ],
    },
    // G7-B · Bloques premium insertables desde "Añadir sección".
    {
      type: "vmx.discovery.navigator",
      mode: "authorable",
      family: "discovery",
      variants: ["panel", "list", "grid"],
      allowed_sources: ["routing.canonical"],
      surfaces: ["home", "landing", "institutional", "destination", "region"],
      authoring_roles: ["founder_admin", "territorial_editor"],
      fields: [
        {
          field: "title",
          class: "editorial",
          type: "text",
          max_length: 120,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "variant",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "showCounts",
          class: "editorial",
          type: "boolean",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "ctaLabel",
          class: "editorial",
          type: "text",
          max_length: 120,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "ctaHref",
          class: "reference",
          type: "text",
          max_length: 240,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "emptyLabel",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "scope",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "manualDestinationSlug",
          class: "reference",
          type: "text",
          max_length: 120,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "manualRegionSlug",
          class: "reference",
          type: "text",
          max_length: 120,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "categorySlugs",
          class: "reference",
          type: "reference",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "hiddenSlugs",
          class: "reference",
          type: "reference",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "maxItems",
          class: "editorial",
          type: "number",
          writable_by: ["founder_admin", "territorial_editor"],
        },
      ],
    },
    {
      type: "vmx.alux.planner",
      mode: "authorable",
      family: "alux",
      variants: ["compact", "editorial", "panel"],
      allowed_sources: ["routing.canonical"],
      surfaces: ["home", "landing", "destination"],
      authoring_roles: ["founder_admin", "territorial_editor"],
      fields: [
        {
          field: "variant",
          class: "editorial",
          type: "select",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "eyebrow",
          class: "editorial",
          type: "text",
          max_length: 80,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "heading",
          class: "editorial",
          type: "text",
          required: true,
          max_length: 120,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "subheading",
          class: "editorial",
          type: "text",
          max_length: 240,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "placeholder",
          class: "editorial",
          type: "text",
          max_length: 160,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "cta_label",
          class: "editorial",
          type: "text",
          max_length: 80,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "cta_href",
          class: "reference",
          type: "text",
          max_length: 240,
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "show_prompts",
          class: "editorial",
          type: "boolean",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "prompts",
          class: "editorial",
          type: "reference",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "show_disclaimer",
          class: "editorial",
          type: "boolean",
          writable_by: ["founder_admin", "territorial_editor"],
        },
        {
          field: "disclaimer",
          class: "editorial",
          type: "text",
          max_length: 240,
          translatable: true,
          writable_by: ["founder_admin", "territorial_editor"],
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
    governed_read_only: ["edit", "bind", "publish_new"],
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

// I4-0's immutable contract harness exercises the conceptual vocabulary that
// preceded 18.47. It remains valid only at this pure request boundary; tree
// validation below resolves runtime types first and therefore rejects aliases.
const I4_ZERO_REQUEST_COMPATIBILITY: readonly EditorialBlockPolicy[] = [
  {
    type: "vmx.hero",
    mode: "authorable",
    family: "identity",
    variants: ["default", "media_left"],
    allowed_sources: ["media.registry", "routing.canonical"],
    surfaces: ["home", "landing", "institutional", "destination", "business", "product", "region"],
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
];

export function validateEditorialAuthoringRequest(
  request: EditorialAuthoringRequest,
  policy: EditorialBuilderPolicy = EDITORIAL_BUILDER_POLICY,
): EditorialPolicyValidation {
  const errors: string[] = [];
  const block =
    policy.blocks.find((candidate) => candidate.type === request.block_type) ??
    (policy === EDITORIAL_BUILDER_POLICY
      ? I4_ZERO_REQUEST_COMPATIBILITY.find((candidate) => candidate.type === request.block_type)
      : undefined);
  if (!block) return { valid: false, errors: [`unknown block "${request.block_type}"`] };
  if (!OPERATIONS_BY_MODE[block.mode].includes(request.operation))
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

const PAGE_KIND_TO_SURFACE: Readonly<Record<string, EditorialSurface>> = {
  home: "home",
  landing: "landing",
  campaign: "landing",
  promo: "landing",
  wedding: "landing",
  microsite: "institutional",
  institutional: "institutional",
  site_section: "institutional",
  destination: "destination",
  route: "destination",
  region: "region",
  business: "business",
  hotel: "business",
  restaurant: "business",
  product: "product",
  experience: "product",
  event: "product",
  marketplace: "marketplace",
  alux: "alux",
  trip_builder: "trip_builder",
};

export function resolveEditorialSurface(pageKind: string): EditorialSurface | null {
  return PAGE_KIND_TO_SURFACE[pageKind] ?? null;
}

export function resolveEditorialActor(roles: readonly string[]): EditorialActorClass | null {
  if (roles.includes("super_admin") || roles.includes("admin")) return "founder_admin";
  if (roles.includes("editor")) return "territorial_editor";
  if (roles.includes("business_owner")) return "business_author";
  return null;
}

export function getEditorialBlockPolicy(type: string): EditorialBlockPolicy | undefined {
  return EDITORIAL_BUILDER_POLICY.blocks.find((block) => block.type === type);
}

export function canListEditorialBlock(
  type: string,
  surface: EditorialSurface,
  actor: EditorialActorClass,
): boolean {
  if (actor === "business_author" && surface !== "business") return false;
  const block = getEditorialBlockPolicy(type);
  return Boolean(
    block &&
    block.mode !== "legacy_read_only" &&
    block.mode !== "prohibited" &&
    block.surfaces.includes(surface) &&
    block.authoring_roles.includes(actor),
  );
}

interface EditorialTreeNode {
  id: string;
  type: string;
  version: string;
  config: Record<string, unknown>;
  hidden?: boolean;
  i18n?: Record<string, Record<string, string>>;
  children?: EditorialTreeNode[];
}

export interface EditorialCompositionTree {
  root: { children: EditorialTreeNode[] };
}

export interface EditorialTreeValidationInput {
  tree: EditorialCompositionTree;
  previous_tree?: EditorialCompositionTree | null;
  surface: EditorialSurface;
  actor: EditorialActorClass;
  operation?: "edit" | "duplicate" | "template_new";
  registered_media_paths?: ReadonlySet<string>;
}

const unsafeMarkup =
  /<\/?(?:script|style|iframe|embed|object)|\bon[a-z]+\s*=|javascript:|data:|blob:/i;
const externalUrl = /^(?:https?:)?\/\//i;

function canonicalizePolicyValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalizePolicyValue).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizePolicyValue(object[key])}`)
    .join(",")}}`;
}

function flattenNodes(
  nodes: readonly EditorialTreeNode[],
  parentPath = "root",
  output = new Map<string, { path: string; node: EditorialTreeNode }>(),
) {
  nodes.forEach((node, index) => {
    const path = `${parentPath}/${index}`;
    output.set(node.id, { path, node });
    flattenNodes(node.children ?? [], path, output);
  });
  return output;
}

function withoutChildren(node: EditorialTreeNode) {
  const { children: _children, ...rest } = node;
  return rest;
}

function visitStrings(value: unknown, visit: (value: string, key: string) => void, key = "") {
  if (typeof value === "string") return visit(value, key);
  if (Array.isArray(value)) return value.forEach((entry) => visitStrings(entry, visit, key));
  if (!value || typeof value !== "object") return;
  for (const [childKey, child] of Object.entries(value as Record<string, unknown>))
    visitStrings(child, visit, childKey);
}

function validateClosedValue(type: string, key: string, value: unknown, errors: string[]) {
  const enumValues: Readonly<Record<string, readonly unknown[]>> = {
    "vmx.experience.hero:variant": ["immersive", "compact", "editorial", "cinematic", "gallery"],
    "vmx.experience.section:variant": ["editorial", "split", "centered", "quote"],
    "vmx.experience.section:align": ["left", "center"],
    "vmx.experience.section:tone": ["default", "muted", "accent"],
    "vmx.experience.gallery:variant": ["mosaic", "grid", "carousel", "strip"],
    "vmx.experience.gallery:aspect": ["landscape", "square", "portrait", "auto"],
    "vmx.experience.info-grid:variant": ["cards", "list", "inline"],
    "vmx.experience.institutional-badges:variant": ["filled", "soft", "outline", "icon-only"],
    "vmx.experience.institutional-badges:size": ["sm", "md", "lg"],
    "vmx.experience.institutional-badges:layout": ["strip", "stack"],
  };
  const allowed = enumValues[`${type}:${key}`];
  if (allowed && !allowed.includes(value)) errors.push(`${type}.${key}: value is outside the enum`);
  if (
    type === "vmx.experience.hero" &&
    key === "overlay" &&
    (typeof value !== "number" || value < 0 || value > 1)
  )
    errors.push(`${type}.overlay: expected a number from 0 to 1`);
  if (
    type === "vmx.experience.hero" &&
    key === "slideIntervalMs" &&
    (typeof value !== "number" || value < 3000 || value > 15000)
  )
    errors.push(`${type}.slideIntervalMs: expected 3000..15000`);
  if (
    type === "vmx.experience.gallery" &&
    key === "maxVisible" &&
    (typeof value !== "number" || value < 1 || value > 24)
  )
    errors.push(`${type}.maxVisible: expected 1..24`);
  if (
    type === "vmx.experience.info-grid" &&
    key === "columns" &&
    (typeof value !== "number" || value < 1 || value > 4)
  )
    errors.push(`${type}.columns: expected 1..4`);
}

function mediaPathFromCanonicalUrl(value: string): string | null {
  const prefix = "/api/public/studio-media/";
  if (!value.startsWith(prefix)) return null;
  try {
    return value
      .slice(prefix.length)
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
}

export function collectEditorialMediaPaths(tree: EditorialCompositionTree): string[] {
  const paths = new Set<string>();
  for (const { node } of flattenNodes(tree.root.children).values()) {
    visitStrings(node.config, (value, key) => {
      if (!/^(?:mediaUrl|url)$/i.test(key)) return;
      const path = mediaPathFromCanonicalUrl(value);
      if (path) paths.add(path);
    });
  }
  return [...paths].sort();
}

/**
 * I4-A/B/C · Governed Source Reconciliation (18.51).
 * `vmx.experience.info-grid` sólo admite autoría nueva mediante el
 * binding canónico `geography.location`; `source: "manual"` y los
 * `items` escritos por el cliente quedan confinados a render histórico.
 */
export const INFO_GRID_TYPE = "vmx.experience.info-grid";
export const INFO_GRID_CANONICAL_SOURCE: GovernedSourceId = "geography.location";

export function isLegacyInfoGridConfig(config: Record<string, unknown>): boolean {
  const items = config.items;
  if (Array.isArray(items) && items.length > 0) return true;
  return config.source !== INFO_GRID_CANONICAL_SOURCE;
}

function isCanonicalInfoGridBinding(
  type: string,
  key: string,
  config: Record<string, unknown>,
): boolean {
  if (type !== INFO_GRID_TYPE) return false;
  if (key === "source") return config.source === INFO_GRID_CANONICAL_SOURCE;
  return Array.isArray(config.items) && config.items.length === 0;
}

export function validateEditorialCompositionTree(
  input: EditorialTreeValidationInput,
): EditorialPolicyValidation {
  const errors: string[] = [];
  if (input.actor === "business_author" && input.surface !== "business")
    errors.push("business_author is confined to the business surface");
  const previous = flattenNodes(input.previous_tree?.root.children ?? []);
  const current = flattenNodes(input.tree.root.children);
  const operation = input.operation ?? "edit";

  for (const [id, entry] of current) {
    const { node, path } = entry;
    const old = previous.get(id);
    const block = getEditorialBlockPolicy(node.type);
    const frozen = !block || block.mode === "legacy_read_only" || block.mode === "prohibited";
    if (frozen) {
      if (
        !old ||
        old.path !== path ||
        canonicalizePolicyValue(withoutChildren(old.node)) !==
          canonicalizePolicyValue(withoutChildren(node))
      )
        errors.push(
          `${node.type}: historical node "${id}" must remain byte-equivalent and in place`,
        );
      continue;
    }

    const requestOperation: EditorialBlockOperation =
      operation === "template_new"
        ? "template_new"
        : operation === "duplicate"
          ? "duplicate"
          : old
            ? "edit"
            : block.mode === "governed_read_only"
              ? "bind"
              : "insert";
    const variant =
      typeof node.config.variant === "string" ? node.config.variant : block.variants[0];
    const allowedFields = new Set(block.fields.map((field) => field.field));
    const requestFields = Object.fromEntries(
      Object.entries(node.config).filter(([key]) => {
        const field = block.fields.find((candidate) => candidate.field === key);
        return !field || field.writable_by.includes(input.actor);
      }),
    );
    const request = validateEditorialAuthoringRequest({
      block_type: node.type,
      operation: requestOperation,
      surface: input.surface,
      actor: input.actor,
      variant,
      fields: requestFields,
      source_bindings: block.mode === "governed_read_only" ? block.allowed_sources : [],
    });
    errors.push(...request.errors.map((error) => `${node.type}: ${error}`));
    if (!/^\d+\.\d+\.\d+$/.test(node.version))
      errors.push(`${node.type}: invalid contract version`);

    for (const [key, value] of Object.entries(node.config)) {
      if (!allowedFields.has(key)) continue;
      validateClosedValue(node.type, key, value, errors);
    }
    if (block.mode === "governed_read_only") {
      for (const key of ["items", "source"]) {
        if (!(key in node.config)) continue;
        if (isCanonicalInfoGridBinding(node.type, key, node.config)) continue;
        if (
          !old ||
          canonicalizePolicyValue(old.node.config[key]) !==
            canonicalizePolicyValue(node.config[key])
        )
          errors.push(`${node.type}.${key}: governed value cannot be authored manually`);
      }
    }
    if (node.type === INFO_GRID_TYPE && isLegacyInfoGridConfig(node.config)) {
      const frozenInPlace =
        Boolean(old) &&
        old!.path === path &&
        canonicalizePolicyValue(withoutChildren(old!.node)) ===
          canonicalizePolicyValue(withoutChildren(node));
      if (!frozenInPlace)
        errors.push(
          `${node.type}: legacy configuration is frozen render-only; new authoring requires the ${INFO_GRID_CANONICAL_SOURCE} binding`,
        );
      if (operation === "duplicate" || operation === "template_new")
        errors.push(`${node.type}: legacy configuration cannot be duplicated, reused or templated`);
    }
    visitStrings(node.config, (value, key) => {
      if (unsafeMarkup.test(value) || externalUrl.test(value))
        errors.push(
          `${node.type}.${key || "value"}: external URL or executable markup is forbidden`,
        );
      if (
        /href/i.test(key) &&
        (!value.startsWith("/") || value.includes("?") || value.includes("#"))
      )
        errors.push(`${node.type}.${key}: canonical internal route required`);
      if (/^(?:mediaUrl|url)$/i.test(key)) {
        const mediaPath = mediaPathFromCanonicalUrl(value);
        if (!mediaPath || !input.registered_media_paths?.has(mediaPath))
          errors.push(`${node.type}.${key}: media.registry reference required`);
      }
    });
  }

  for (const [id, old] of previous) {
    const block = getEditorialBlockPolicy(old.node.type);
    if (
      (!block || block.mode === "legacy_read_only" || block.mode === "prohibited") &&
      !current.has(id)
    )
      errors.push(`${old.node.type}: historical node "${id}" cannot be removed`);
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
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
