/**
 * G8-R1-C+L · CL3 — Contrato de creación contextual de Landings SEO.
 * Sólo capa pura: identidad, idempotencia, SEO anticanibalización y legacy.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  LEGACY_SEO_LANDING_DRAFTS,
  SEO_LANDING_CREATION_TEMPLATE,
  SEO_LANDING_PILOTS,
  buildSeoLandingEntityRef,
  buildSeoLandingSeoPolicy,
  buildSeoLandingSlug,
  canManageSeoLandings,
  parseSeoLandingEntityRef,
  resolveSeoLandingState,
} from "../../../src/lib/experience-builder/seo-landing/seo-landing-creation";

describe("PR #60 · persistencia SEO gobernada", () => {
  test("el editor usa la RPC ampliada y nunca UPDATE directo", () => {
    const editor = readFileSync(
      "src/lib/experience-builder/seo-landing/seo-landing-editor.functions.ts",
      "utf8",
    );
    const migration = readFileSync(
      "supabase/migrations/20260906010000_pr60_p1_governed_seo_metadata.sql",
      "utf8",
    );
    expect(editor).toContain('rpc("eb_set_composition_seo_metadata"');
    expect(editor).toContain("_title: data.seo.title.trim()");
    expect(editor).toContain("_description: data.seo.description.trim()");
    expect(editor).not.toContain('.from("page_compositions")\n        .update');
    expect(migration).toContain("title = COALESCE(_title, title)");
    expect(migration).toContain("description = CASE");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.eb_set_composition_seo_metadata(uuid, public.eb_page_kind, text, text)",
    );
  });
});

describe("CL3 · permisos", () => {
  test("sólo roles editoriales gestionan landings", () => {
    expect(canManageSeoLandings(["super_admin"])).toBe(true);
    expect(canManageSeoLandings(["admin"])).toBe(true);
    expect(canManageSeoLandings(["editor"])).toBe(true);
    expect(canManageSeoLandings(["business_owner", "traveler"])).toBe(false);
    expect(canManageSeoLandings([])).toBe(false);
  });
});

describe("CL3 · identidad determinista", () => {
  test("entityRef ida y vuelta", () => {
    const ref = buildSeoLandingEntityRef("business", "abc");
    expect(ref).toBe("business:abc");
    expect(parseSeoLandingEntityRef(ref)).toEqual({ entityType: "business", entityId: "abc" });
    expect(parseSeoLandingEntityRef("unknown:1")).toBeNull();
    expect(parseSeoLandingEntityRef(null)).toBeNull();
  });

  test("slug estable e independiente del título", () => {
    expect(buildSeoLandingSlug("place", "Chichén Itzá", "id-1")).toBe("landing-place-chichen-itza");
    expect(buildSeoLandingSlug("place", "Chichén Itzá", "id-1")).toBe(
      buildSeoLandingSlug("place", "chichen-itza", "id-1"),
    );
  });
});

describe("CL3 · idempotencia", () => {
  test("sin landing previa se ofrece crear", () => {
    const r = resolveSeoLandingState(null);
    expect(r.state).toBe("none");
    expect(r.wouldDuplicate).toBe(false);
    expect(r.actionLabel).toBe("Crear Landing SEO");
  });

  test("con borrador existente no se duplica", () => {
    const r = resolveSeoLandingState({
      id: "1",
      slug: "landing-business-x",
      title: "X",
      status: "draft",
      published_at: null,
    });
    expect(r.state).toBe("draft");
    expect(r.wouldDuplicate).toBe(true);
    expect(r.actionLabel).toBe("Editar Landing SEO");
  });

  test("con landing publicada se administra", () => {
    const r = resolveSeoLandingState({
      id: "1",
      slug: "landing-business-x",
      title: "X",
      status: "published",
      published_at: "2026-08-01T00:00:00Z",
    });
    expect(r.state).toBe("published");
    expect(r.actionLabel).toBe("Administrar Landing SEO");
  });
});

describe("CL3 · SEO y anticanibalización", () => {
  test("borrador siempre noindex", () => {
    expect(buildSeoLandingSeoPolicy(null).robotsDirective).toBe("noindex,nofollow");
    expect(buildSeoLandingSeoPolicy("/producto/x").robotsDirective).toBe("noindex,nofollow");
  });

  test("canonical apunta a la ficha real cuando existe", () => {
    expect(buildSeoLandingSeoPolicy("/producto/x").canonicalOverride).toBe("/producto/x");
    expect(buildSeoLandingSeoPolicy("   ").canonicalOverride).toBeNull();
  });
});

describe("CL3 · plantilla, pilotos y legacy", () => {
  test("la plantilla aplicada es la familia acreditada", () => {
    expect(SEO_LANDING_CREATION_TEMPLATE).toEqual({
      templateId: "premium-seo-landing",
      variant: "authority-editorial-zazil",
      pageKind: "landing",
      presentation: "editorial",
    });
  });

  test("cuatro pilotos configurables", () => {
    expect(SEO_LANDING_PILOTS).toHaveLength(4);
    expect(SEO_LANDING_PILOTS.every((p) => p.enabled)).toBe(true);
  });

  test("cuatro borradores legacy con disposición declarada", () => {
    expect(LEGACY_SEO_LANDING_DRAFTS.map((d) => d.slug)).toEqual([
      "hoteles",
      "restaurantes",
      "experiencias",
      "oriente-maya",
    ]);
    expect(LEGACY_SEO_LANDING_DRAFTS.every((d) => d.disposition === "archive")).toBe(true);
  });
});
