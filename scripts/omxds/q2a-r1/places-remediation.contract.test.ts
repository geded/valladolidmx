import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  placeEventLinkSchema,
  placeProductLinkSchema,
  placeRecordCoherentSchema,
  placeRecordSchema,
} from "@/lib/places/place-contracts";
import {
  PLACE_ADMISSION_KINDS,
  PLACE_EVENT_RELATION_KINDS,
  PLACE_PRODUCT_RELATION_KINDS,
  isPlaceAdmissionKind,
} from "@/lib/places/place-taxonomy";

const uuid = "00000000-0000-4000-8000-000000000001";
const MIGRATION_DIR = path.join(process.cwd(), "supabase/migrations");
const R1_FILE = fs
  .readdirSync(MIGRATION_DIR)
  .filter((file) => file.startsWith("20260828145637"))
  .map((file) => path.join(MIGRATION_DIR, file))[0]!;
const R1 = fs.readFileSync(R1_FILE, "utf8");

const base = {
  id: uuid,
  destination_id: uuid,
  slug: "lugar",
  name: "Lugar",
  place_type_id: null,
  status: "published" as const,
  price_currency: "MXN",
};

describe("G8-Q2A-R1 · modelo completado", () => {
  test("la ficha admite los campos operativos añadidos", () => {
    const parsed = placeRecordSchema.safeParse({
      ...base,
      directions: "A 200 m del centro",
      admission_kind: "mixto",
      price_from: 50,
      price_to: 120,
      contact_whatsapp: "+529999999999",
      social_links: { instagram: "https://instagram.com/x" },
      published_at: "2026-08-28T00:00:00Z",
    });
    expect(parsed.success).toBe(true);
  });

  test("admission_kind es un código cerrado de cuatro valores", () => {
    expect([...PLACE_ADMISSION_KINDS]).toEqual(["gratuito", "pago", "mixto", "no_aplica"]);
    expect(isPlaceAdmissionKind("donativo")).toBe(false);
    expect(placeRecordSchema.safeParse({ ...base, admission_kind: "donativo" }).success).toBe(false);
  });

  test("el rango de precio debe ser coherente", () => {
    expect(placeRecordCoherentSchema.safeParse({ ...base, price_from: 100, price_to: 40 }).success).toBe(false);
    expect(placeRecordCoherentSchema.safeParse({ ...base, price_from: 40, price_to: 100 }).success).toBe(true);
  });

  test("las relaciones lugar-producto y lugar-evento usan códigos contratados", () => {
    expect([...PLACE_PRODUCT_RELATION_KINDS]).toEqual(["oficial", "operado", "ofrecido", "recomendado"]);
    expect([...PLACE_EVENT_RELATION_KINDS]).toEqual(["sede", "organizado", "asociado"]);
    expect(
      placeProductLinkSchema.safeParse({
        id: uuid,
        place_id: uuid,
        product_id: uuid,
        relation_kind: "texto-libre",
        sort_order: 1,
      }).success,
    ).toBe(false);
    expect(
      placeEventLinkSchema.safeParse({
        id: uuid,
        place_id: uuid,
        event_id: uuid,
        relation_kind: "sede",
        sort_order: 1,
      }).success,
    ).toBe(true);
  });

  test("el SEO sigue fuera de la ficha de Lugar", () => {
    const shape = Object.keys(placeRecordSchema.shape);
    for (const forbidden of ["seo_title", "seo_description", "seo_keywords", "opening_hours"]) {
      expect(shape).not.toContain(forbidden);
    }
  });
});

describe("G8-Q2A-R1 · invariantes de la migración", () => {
  test("no introduce ningún enum de PostgreSQL", () => {
    expect(R1).not.toMatch(/CREATE\s+TYPE/i);
    expect(R1).toMatch(/admission_kind IN \('gratuito','pago','mixto','no_aplica'\)/);
  });

  test("aplica REVOKE ALL antes de los grants mínimos en cada tabla place_*", () => {
    const tables = [
      "place_types",
      "place_categories",
      "place_authority_kinds",
      "place_category_links",
      "place_hours",
      "place_media",
      "place_authorities",
      "place_products",
      "place_events",
    ];
    for (const table of tables) {
      expect(R1).toContain(`REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated;`);
      expect(R1).toContain(`GRANT ALL ON public.${table} TO service_role;`);
    }
  });

  test("place_authorities nunca recibe privilegios anónimos", () => {
    expect(R1).not.toMatch(/GRANT[^;]*ON public\.place_authorities TO[^;]*anon/);
  });

  test("no toca el ACL de tablas históricas ni los default privileges", () => {
    expect(R1).not.toMatch(/REVOKE[^;]*ON public\.points_of_interest/);
    expect(R1).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
    for (const historical of ["destinations", "businesses", "products", "events", "media_assets"]) {
      expect(R1).not.toMatch(new RegExp(`REVOKE[^;]*ON public\\.${historical}`));
    }
  });

  test("place_duplicate_warnings queda como SECURITY INVOKER con guardia de staff", () => {
    expect(R1).toMatch(/place_duplicate_warnings[\s\S]*SECURITY INVOKER/);
    expect(R1).not.toMatch(/place_duplicate_warnings[\s\S]*SECURITY DEFINER/);
    expect(R1).toMatch(/RAISE EXCEPTION 'not authorized'/);
    expect(R1).toContain("REVOKE ALL ON FUNCTION public.place_duplicate_warnings(text) FROM PUBLIC, anon;");
  });

  test("no crea, clasifica ni modifica contenido turístico real", () => {
    expect(R1).not.toMatch(/Chich[eé]n|Ek.?\s?Balam|Tinum|Temoz[oó]n|Suytun|Zazil|Venados/i);
    expect(R1).not.toMatch(/UPDATE public\.points_of_interest/i);
    expect(R1).not.toMatch(/INSERT INTO public\.points_of_interest/i);
  });
});
