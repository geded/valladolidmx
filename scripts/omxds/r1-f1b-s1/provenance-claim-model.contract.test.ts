/**
 * G8-R1-F1B-S1 · Gate `validate:r1:f1b:s1`.
 *
 * Cubre el modelo de procedencia, origen/revisión, vigencia de horarios,
 * snapshot inmutable, estado derivado de reclamación y lectura fail-closed.
 * Cero fichas creadas, cero backfill: el gate es contractual, no de datos.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  BUSINESS_RECORD_ORIGINS,
  BUSINESS_SOURCE_REVIEW_STATES,
  DERIVED_CLAIM_STATES,
  PROVENANCE_ENTITY_TYPES,
  PUBLIC_SOURCE_NOTICE,
  CLAIM_AFFORDANCE_ACTION,
  CLAIM_AFFORDANCE_QUESTION,
  canBePublic,
  canShowVerifiedEstablishmentBadge,
  claimStateAffectsCredibility,
  resolveClaimAffordance,
  createClaimSnapshotSchema,
  expectedRecordOriginForLegacy,
  hoursValidity,
  listEntityProvenanceSchema,
  recordFieldProvenanceSchema,
  resolveClaimState,
  supersedeFieldProvenanceSchema,
  toPublicSourceSummary,
} from "../../../src/lib/provenance/provenance-contracts";

const VALID = {
  entityType: "business" as const,
  entityId: "11111111-1111-4111-8111-111111111111",
  fieldPath: "business.contact_phone",
  sourceUrl: "https://ejemplo-oficial.mx/contacto",
  sourceOwner: "Hotel Ejemplo S.A. de C.V.",
  sourceKind: "official_site" as const,
  observedAt: "2026-08-01T12:00:00.000Z",
};

describe("Procedencia por campo", () => {
  test("allowlist cerrada de entity_type", () => {
    expect(PROVENANCE_ENTITY_TYPES).toEqual([
      "business",
      "place",
      "product",
      "event",
      "destination",
    ]);
    expect(recordFieldProvenanceSchema.safeParse({ ...VALID, entityType: "user" }).success).toBe(
      false,
    );
  });

  test("fuente por campo válida", () => {
    const parsed = recordFieldProvenanceSchema.parse(VALID);
    expect(parsed.verificationLevel).toBe("unverified");
    expect(parsed.metadata).toEqual({});
  });

  test("URL inválida (http, ftp o vacía) es rechazada", () => {
    for (const sourceUrl of ["http://ejemplo.mx", "ftp://ejemplo.mx", "", "javascript:alert(1)"]) {
      expect(recordFieldProvenanceSchema.safeParse({ ...VALID, sourceUrl }).success).toBe(false);
    }
  });

  test("field_path arbitrario es rechazado", () => {
    for (const fieldPath of ["telefono", "Business.Phone", "../secret", "business."]) {
      expect(recordFieldProvenanceSchema.safeParse({ ...VALID, fieldPath }).success).toBe(false);
    }
  });

  test("entidad inexistente: el uuid es obligatorio y la existencia la valida el trigger", () => {
    expect(recordFieldProvenanceSchema.safeParse({ ...VALID, entityId: "no-uuid" }).success).toBe(
      false,
    );
    const sql = readFileSync(
      "docs/governance/evidence/g8-r1-f1b-s1/MIGRATION-UP-DOWN-v1.0.sql",
      "utf8",
    );
    expect(sql).toContain("efp_assert_entity_exists");
    expect(sql).toContain("entity_not_found");
  });

  test("supersesión exige reemplazo completo (historial, no sobrescritura)", () => {
    expect(
      supersedeFieldProvenanceSchema.safeParse({
        provenanceId: VALID.entityId,
        replacement: VALID,
      }).success,
    ).toBe(true);
    expect(supersedeFieldProvenanceSchema.safeParse({ provenanceId: VALID.entityId }).success).toBe(
      false,
    );
  });

  test("checksum de evidencia sólo SHA-256", () => {
    expect(
      recordFieldProvenanceSchema.safeParse({ ...VALID, evidenceChecksum: "abc" }).success,
    ).toBe(false);
    expect(
      recordFieldProvenanceSchema.safeParse({ ...VALID, evidenceChecksum: "a".repeat(64) }).success,
    ).toBe(true);
  });

  test("lectura por entidad, superseded oculto por defecto", () => {
    expect(
      listEntityProvenanceSchema.parse({ entityType: "place", entityId: VALID.entityId })
        .includeSuperseded,
    ).toBe(false);
  });
});

describe("Origen y revisión de la ficha", () => {
  test("allowlists documentadas", () => {
    expect(BUSINESS_RECORD_ORIGINS).toContain("public_source");
    expect(BUSINESS_RECORD_ORIGINS).toContain("demo");
    expect(BUSINESS_SOURCE_REVIEW_STATES).toEqual([
      "unreviewed",
      "in_review",
      "approved",
      "stale",
      "rejected",
    ]);
  });

  test("reconciliación demo_seed sin backfill", () => {
    expect(expectedRecordOriginForLegacy({ is_demo_seed: true })).toBe("demo");
    expect(expectedRecordOriginForLegacy({ is_demo_seed: false })).toBeNull();
  });
});

describe("Horarios volátiles", () => {
  const now = new Date("2026-08-29T00:00:00.000Z");
  test("horario vigente", () => {
    expect(
      hoursValidity(
        { sourceVerifiedAt: "2026-08-01T00:00:00Z", validUntil: "2026-12-01T00:00:00Z" },
        now,
      ),
    ).toBe("current");
  });
  test("horario vencido nunca se presenta como vigente", () => {
    expect(
      hoursValidity(
        { sourceVerifiedAt: "2026-01-01T00:00:00Z", validUntil: "2026-02-01T00:00:00Z" },
        now,
      ),
    ).toBe("expired");
  });
  test("sin comprobación: pendiente de confirmar, jamás inventado", () => {
    expect(hoursValidity({ sourceVerifiedAt: null, validUntil: null }, now)).toBe(
      "pending_confirmation",
    );
  });
});

describe("Lectura pública fail-closed", () => {
  const base = {
    status: "published",
    deletedAt: null,
    sourceReviewState: "approved" as const,
    hasCanonicalRoute: true,
    hasDestination: true,
    hasCoordinates: true,
    verificationDueAt: null,
    seoReviewed: true,
    minimumEditorialFieldsComplete: true,
  };

  test("ficha aprobada y completa es pública aunque no esté reclamada", () => {
    expect(canBePublic(base)).toBe(true);
  });

  test("draft nunca es pública", () => {
    expect(canBePublic({ ...base, status: "draft" })).toBe(false);
  });

  test("fuente sin revisar nunca es pública", () => {
    expect(canBePublic({ ...base, sourceReviewState: "unreviewed" })).toBe(false);
    expect(canBePublic({ ...base, sourceReviewState: "stale" })).toBe(false);
    expect(canBePublic({ ...base, sourceReviewState: "rejected" })).toBe(false);
  });

  test("fuente vencida, SEO sin revisar o sin coordenadas bloquean", () => {
    expect(canBePublic({ ...base, verificationDueAt: "2020-01-01T00:00:00Z" })).toBe(false);
    expect(canBePublic({ ...base, seoReviewed: false })).toBe(false);
    expect(canBePublic({ ...base, hasCoordinates: false })).toBe(false);
    expect(canBePublic({ ...base, hasCanonicalRoute: false })).toBe(false);
  });

  test("resumen público no filtra notas internas ni evidencia", () => {
    const summary = toPublicSourceSummary({
      business_id: VALID.entityId,
      is_public_source: true,
      claim_state: "unclaimed",
      last_verified_at: "2026-08-01T00:00:00Z",
      source_is_current: true,
      source_owners: ["Sitio oficial del hotel"],
    });
    expect(summary.notice).toBe(PUBLIC_SOURCE_NOTICE);
    expect(summary.actions).toContain("claim_business");
    expect(summary.actions).toContain("report_incorrect_information");
    const keys = Object.keys(summary);
    for (const forbidden of ["snapshot", "hash", "evidence", "notes", "source_url"]) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    }
  });
});

describe("Estado derivado de reclamación", () => {
  const now = new Date("2026-08-29T00:00:00.000Z");
  const empty = { members: [], transfers: [] };

  test("sin dueño ni claim: unclaimed", () => {
    expect(resolveClaimState(empty, now)).toBe("unclaimed");
  });

  test("claim pendiente vigente", () => {
    expect(
      resolveClaimState(
        { members: [], transfers: [{ status: "pending", expiresAt: "2026-09-10T00:00:00Z" }] },
        now,
      ),
    ).toBe("claim_pending");
  });

  test("claim pendiente vencido no acredita nada", () => {
    expect(
      resolveClaimState(
        { members: [], transfers: [{ status: "pending", expiresAt: "2026-01-01T00:00:00Z" }] },
        now,
      ),
    ).toBe("unclaimed");
  });

  test("claim aprobado: owner activo ⇒ claimed", () => {
    expect(
      resolveClaimState({ members: [{ role: "owner", status: "active" }], transfers: [] }, now),
    ).toBe("claimed");
  });

  test("claim revocado", () => {
    expect(
      resolveClaimState({ members: [{ role: "owner", status: "removed" }], transfers: [] }, now),
    ).toBe("claim_revoked");
  });

  test("relación comercial (manager/editor) no acredita propiedad", () => {
    expect(
      resolveClaimState(
        {
          members: [
            { role: "manager", status: "active" },
            { role: "editor", status: "active" },
          ],
          transfers: [],
        },
        now,
      ),
    ).toBe("unclaimed");
  });

  test("estados derivados cerrados", () => {
    expect(DERIVED_CLAIM_STATES).toEqual([
      "unclaimed",
      "claim_pending",
      "claimed",
      "claim_revoked",
    ]);
  });
});

describe("Snapshot previo a reclamación", () => {
  test("motivo acotado y claim opcional", () => {
    expect(
      createClaimSnapshotSchema.safeParse({ businessId: VALID.entityId, reason: "claim_approval" })
        .success,
    ).toBe(true);
    expect(
      createClaimSnapshotSchema.safeParse({ businessId: VALID.entityId, reason: "porque_si" })
        .success,
    ).toBe(false);
  });

  test("inmutabilidad y ausencia de secretos garantizadas en la migración", () => {
    const sql = readFileSync(
      "docs/governance/evidence/g8-r1-f1b-s1/MIGRATION-UP-DOWN-v1.0.sql",
      "utf8",
    );
    expect(sql).toContain("claim_snapshot_is_immutable");
    expect(sql).toContain("BEFORE UPDATE OR DELETE ON public.business_claim_snapshots");
    expect(sql).toContain("- 'verification_notes'");
    // Rollback documentado y aditivo-reversible.
    expect(sql).toContain("-- ROLLBACK (DOWN)");
    expect(sql).toContain("DROP TABLE IF EXISTS public.business_claim_snapshots");
  });
});

describe("Invariante de autoridad y cero captura", () => {
  const src = readFileSync("src/lib/provenance/provenance.functions.ts", "utf8");
  const sql = readFileSync(
    "docs/governance/evidence/g8-r1-f1b-s1/MIGRATION-UP-DOWN-v1.0.sql",
    "utf8",
  );

  test("no existe columna claim_state almacenada", () => {
    expect(sql).not.toContain("claim_state text");
    expect(sql).toContain("resolve_business_claim_state");
  });

  test("no hay importador masivo ni inserción de fichas", () => {
    expect(src).not.toMatch(/from\("businesses"\)\s*\.insert/);
    expect(sql).not.toMatch(/INSERT INTO public\.businesses/i);
    expect(sql).not.toMatch(/UPDATE public\.businesses\s+SET/i);
  });

  test("una sola autoridad SEO: sin columna noindex nueva", () => {
    expect(sql).not.toMatch(/ADD COLUMN IF NOT EXISTS noindex/i);
    expect(sql).not.toMatch(/robots_directive/i);
  });

  test("anon no escribe procedencia ni snapshots", () => {
    expect(sql).not.toMatch(/GRANT[^;]*ON public\.entity_field_provenance TO anon/i);
    expect(sql).not.toMatch(/ON public\.business_claim_snapshots TO anon/i);
  });
});

describe("ADDENDUM UX · reclamación discreta", () => {
  const ui = readFileSync("src/components/provenance/ClaimAffordanceLink.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  test("ficha aprobada no reclamada: enlace secundario sólo en el pie de la ficha", () => {
    const a = resolveClaimAffordance({ claimState: "unclaimed", surface: "detail_footer" });
    expect(a.visible).toBe(true);
    expect(a.emphasis).toBe("secondary_link");
    expect(a.question).toBe(CLAIM_AFFORDANCE_QUESTION);
    expect(a.action).toBe(CLAIM_AFFORDANCE_ACTION);
  });

  test("nunca en tarjetas, listados ni hero", () => {
    for (const surface of ["card", "listing", "hero"] as const) {
      expect(resolveClaimAffordance({ claimState: "unclaimed", surface }).visible).toBe(false);
    }
  });

  test("ficha reclamada o con reclamación pendiente no muestra la afordancia", () => {
    for (const claimState of ["claimed", "claim_pending"] as const) {
      expect(resolveClaimAffordance({ claimState, surface: "detail_footer" }).visible).toBe(false);
    }
  });

  test("reclamación revocada vuelve a ser reclamable, siempre discreta", () => {
    const a = resolveClaimAffordance({ claimState: "claim_revoked", surface: "detail_footer" });
    expect(a.visible).toBe(true);
    expect(a.emphasis).toBe("secondary_link");
  });

  test("cero badges, alertas o textos prominentes de ficha no reclamada", () => {
    expect(ui).not.toMatch(/no reclamada|sin reclamar|unclaimed[^S]/i);
    expect(ui).not.toMatch(/<Badge|<Alert|role="alert"/);
    expect(ui).not.toMatch(/text-(base|lg|xl|2xl)|font-bold|destructive|warning/);
  });

  test("el estado de reclamación no degrada la credibilidad editorial", () => {
    expect(claimStateAffectsCredibility()).toBe(false);
    const approvedUnclaimed = {
      status: "published" as const,
      deletedAt: null,
      sourceReviewState: "approved" as const,
      hasCanonicalRoute: true,
      hasDestination: true,
      hasCoordinates: true,
      verificationDueAt: null,
      seoReviewed: true,
      minimumEditorialFieldsComplete: true,
    };
    expect(canBePublic(approvedUnclaimed)).toBe(true);
  });

  test("'Establecimiento verificado' exige operador acreditado y aprobación administrativa", () => {
    expect(
      canShowVerifiedEstablishmentBadge({ claimState: "claimed", administrativelyVerified: true }),
    ).toBe(true);
    expect(
      canShowVerifiedEstablishmentBadge({ claimState: "claimed", administrativelyVerified: false }),
    ).toBe(false);
    expect(
      canShowVerifiedEstablishmentBadge({
        claimState: "unclaimed",
        administrativelyVerified: true,
      }),
    ).toBe(false);
    expect(
      canShowVerifiedEstablishmentBadge({
        claimState: "claim_pending",
        administrativelyVerified: true,
      }),
    ).toBe(false);
  });
});
