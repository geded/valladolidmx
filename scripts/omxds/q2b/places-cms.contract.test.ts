/**
 * G8-Q2B · Contrato del CMS de Lugares y Atractivos.
 *
 * Verifica el contrato real (rutas, contratos Zod, server functions,
 * territorio, medios, auditoría, campos protegidos y ausencia de superficie
 * pública). No escribe en la base compartida ni crea contenido turístico.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  PLACE_MEDIA_ROLES,
  PLACE_PROTECTED_COLUMNS,
  attachPlaceMediaSchema,
  createPlaceCmsSchema,
  isPlaceEditableColumn,
  isPlaceProtectedColumn,
  placeAdvanceBlockers,
  placeDetailsPatchSchema,
  placeLocationSchema,
  placePublishBlockers,
  setPlaceAuthoritiesSchema,
  setPlaceCategoriesSchema,
  setPlaceEventsSchema,
  setPlaceHoursSchema,
  setPlaceProductsSchema,
  updatePlaceCmsSchema,
} from "@/lib/places/places-cms-contracts";
import {
  ZONE_DESTINATION_MISMATCH,
  isZoneCompatible,
  reconcileZoneForDestination,
  zonesForDestination,
} from "@/lib/places/place-territory";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const ROUTES = [
  "src/routes/_authenticated/cms/lugares.index.tsx",
  "src/routes/_authenticated/cms/lugares.nuevo.tsx",
  "src/routes/_authenticated/cms/lugares.$placeId.editar.tsx",
];
const FUNCTIONS = read("src/lib/places/places-cms.functions.ts");
const EDITOR = read("src/components/cms/places/PlaceEditor.tsx");
const MEDIA_PANEL = read("src/components/cms/places/PlaceMediaPanel.tsx");
const uuid = "00000000-0000-4000-8000-000000000001";
const uuid2 = "00000000-0000-4000-8000-000000000002";

describe("G8-Q2B · rutas CMS", () => {
  test("las tres pantallas existen y son autenticadas", () => {
    for (const route of ROUTES) {
      expect(fs.existsSync(path.join(root, route))).toBe(true);
      expect(read(route)).toContain("/_authenticated/cms/lugares");
    }
  });

  test("no se declara ninguna ruta pública nueva de lugares", () => {
    const publicRoutes = fs
      .readdirSync(path.join(root, "src/routes"))
      .filter((file) => /^lugares?[.$]/i.test(file));
    expect(publicRoutes).toEqual([]);
  });

  test("las pantallas están registradas en el Route Inventory canónico", () => {
    const inventory = read("src/lib/experience-builder/route-inventory.ts");
    for (const route of ROUTES) expect(inventory).toContain(route);
  });
});

describe("G8-Q2B · autorización y campos protegidos", () => {
  test("toda server function exige sesión y autoridad de staff", () => {
    const handlers = FUNCTIONS.match(/createServerFn\(/g) ?? [];
    const middleware = FUNCTIONS.match(/requireSupabaseAuth\]/g) ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    expect(middleware.length).toBe(handlers.length);
    expect(FUNCTIONS).toContain("is_editor_or_admin");
    expect(FUNCTIONS).toContain('"poi.write"');
  });

  test("los campos protegidos nunca viajan en el patch libre", () => {
    for (const column of PLACE_PROTECTED_COLUMNS) {
      expect(isPlaceProtectedColumn(column)).toBe(true);
      expect(isPlaceEditableColumn(column)).toBe(false);
    }
    expect(FUNCTIONS).toContain("protected_field:");
    expect(
      updatePlaceCmsSchema.safeParse({
        place_id: uuid,
        expected_updated_at: "2026-08-28T00:00:00Z",
        patch: { status: "published" },
      }).success,
    ).toBe(false);
  });

  test("relacionar productos, eventos o autoridades no concede administración", () => {
    expect(FUNCTIONS).toContain("grantsPlaceAdministration: false");
    expect(FUNCTIONS.match(/grantsPlaceAdministration: false/g)?.length).toBeGreaterThanOrEqual(3);
    expect(FUNCTIONS).not.toContain("business_users");
    expect(FUNCTIONS).not.toContain("claim");
  });
});

describe("G8-Q2B · territorio destino/zona", () => {
  test("el destino es obligatorio en el alta", () => {
    expect(
      createPlaceCmsSchema.safeParse({ slug: "lugar", name: "Lugar", place_type_id: uuid }).success,
    ).toBe(false);
  });

  test("la zona es opcional y dependiente del destino", () => {
    const zones = [
      { id: uuid, name: "Centro", destination_id: uuid, status: "published" },
      { id: uuid2, name: "Otra", destination_id: uuid2, status: "published" },
    ];
    expect(zonesForDestination(zones, uuid).map((z) => z.id)).toEqual([uuid]);
    expect(isZoneCompatible(zones, uuid, uuid2)).toBe(false);
    expect(reconcileZoneForDestination(zones, uuid, uuid2)).toBe("");
    expect(reconcileZoneForDestination(zones, uuid, uuid)).toBe(uuid);
    expect(zonesForDestination(zones, null)).toEqual([]);
  });

  test("el servidor rechaza fail-closed la zona incompatible", () => {
    expect(FUNCTIONS).toContain("assertZoneBelongsToDestination");
    expect(ZONE_DESTINATION_MISMATCH).toBe("zone_destination_mismatch");
    expect(FUNCTIONS).toContain("ZONE_DESTINATION_MISMATCH");
    expect(FUNCTIONS).toContain("current.destination_id");
  });
});

describe("G8-Q2B · datos gobernados", () => {
  test("las coordenadas son obligatorias y acotadas", () => {
    expect(placeLocationSchema.safeParse({ place_id: uuid }).success).toBe(false);
    expect(
      placeLocationSchema.safeParse({ place_id: uuid, latitude: 20.68, longitude: -88.2 }).success,
    ).toBe(true);
    expect(
      placeLocationSchema.safeParse({ place_id: uuid, latitude: 120, longitude: -88.2 }).success,
    ).toBe(false);
    expect(placePublishBlockers({ latitude: null, longitude: null }).length).toBeGreaterThan(0);
    expect(placeAdvanceBlockers({ latitude: null, longitude: null }).length).toBeGreaterThan(0);
  });

  test("moneda, WhatsApp y HTTPS están validados", () => {
    expect(placeDetailsPatchSchema.safeParse({ price_currency: "peso" }).success).toBe(false);
    expect(placeDetailsPatchSchema.safeParse({ price_currency: "MXN" }).success).toBe(true);
    expect(placeDetailsPatchSchema.safeParse({ contact_whatsapp: "999 tel" }).success).toBe(false);
    expect(placeDetailsPatchSchema.safeParse({ contact_website: "http://x.com" }).success).toBe(
      false,
    );
    expect(placeDetailsPatchSchema.safeParse({ contact_website: "https://x.com" }).success).toBe(
      true,
    );
  });

  test("la detección de duplicados está conectada al modelo real", () => {
    expect(FUNCTIONS).toContain("place_duplicate_warnings");
    expect(EDITOR + read(ROUTES[1]!)).toContain("checkPlaceDuplicates");
  });

  test("relaciones de categorías, horarios, productos, eventos y autoridades", () => {
    expect(
      setPlaceCategoriesSchema.safeParse({ place_id: uuid, category_ids: [uuid] }).success,
    ).toBe(true);
    expect(
      setPlaceHoursSchema.safeParse({
        place_id: uuid,
        hours: [{ day_of_week: 1, is_closed: true, opens_at: null, closes_at: null }],
      }).success,
    ).toBe(true);
    expect(
      setPlaceProductsSchema.safeParse({
        place_id: uuid,
        relations: [{ product_id: uuid, relation_kind: "oficial" }],
      }).success,
    ).toBe(true);
    expect(
      setPlaceEventsSchema.safeParse({
        place_id: uuid,
        relations: [{ event_id: uuid, relation_kind: "sede" }],
      }).success,
    ).toBe(true);
    expect(
      setPlaceAuthoritiesSchema.safeParse({
        place_id: uuid,
        authorities: [{ authority_kind_id: uuid, business_id: null, authority_name: "INAH" }],
      }).success,
    ).toBe(true);
    for (const table of [
      "place_category_links",
      "place_hours",
      "place_products",
      "place_events",
      "place_authorities",
    ])
      expect(FUNCTIONS).toContain(table);
  });

  test("el flujo de medios G8-M1 usa media_assets y roles cerrados", () => {
    expect([...PLACE_MEDIA_ROLES]).toEqual(["cover", "gallery"]);
    expect(
      attachPlaceMediaSchema.safeParse({ place_id: uuid, media_asset_id: uuid, role: "hero" })
        .success,
    ).toBe(false);
    expect(FUNCTIONS).toContain("media_assets");
    expect(FUNCTIONS).toContain("review_state");
    expect(MEDIA_PANEL).toContain("MediaPickerDialog");
  });
});

describe("G8-Q2B · auditoría", () => {
  const actions = [
    "place.create",
    "place.update",
    "place.location.set",
    "place.type.set",
    "place.categories.set",
    "place.hours.set",
    "place.products.set",
    "place.events.set",
    "place.authorities.set",
    "place.media.attach",
    "place.media.detach",
    "place.media.reorder",
    "place.status.transition",
  ];

  test("todas las operaciones mutables auditan en content_audit_log", () => {
    expect(FUNCTIONS).toContain('from("content_audit_log")');
    expect(FUNCTIONS).toContain('entity_kind: "point_of_interest"');
    expect(FUNCTIONS).toContain("actor_user_id: ctx.userId");
    for (const action of actions) expect(FUNCTIONS).toContain(`"${action}"`);
  });

  test("la auditoría es best-effort y no crea sistema paralelo", () => {
    expect(FUNCTIONS).toContain("best-effort");
    expect(FUNCTIONS).not.toContain("place_audit");
    const migrations = fs.readdirSync(path.join(root, "supabase/migrations"));
    expect(migrations.filter((file) => file > "20260828145637_z")).toEqual([]);
  });
});

describe("G8-Q2B · invariantes de cierre", () => {
  test("cero mocks o datos turísticos reales en el código de producción", () => {
    const sources = [FUNCTIONS, EDITOR, ...ROUTES.map(read)].join("\n");
    for (const forbidden of [
      "Chichén",
      "Ek' Balam",
      "Ek Balam",
      "Casa de los Venados",
      "Tinum",
      "Temozón",
    ])
      expect(sources).not.toContain(forbidden);
    expect(sources).not.toContain("MOCK_PLACES");
    expect(sources).not.toContain("faker");
  });

  test("el alta siempre nace en borrador y nunca publica sola", () => {
    expect(FUNCTIONS).toContain("admin_create_place");
    expect(FUNCTIONS).toContain('status: "draft" as const');
    expect(FUNCTIONS).toContain("assertAllowedTransition");
  });

  test("el flag visual permanece apagado en el contrato de cierre", () => {
    const pca = JSON.parse(read("docs/governance/product-authorizations/PCA-2026-044.json"));
    expect(pca.required_feature_flags).toContain("omxds_visual_v1_contracts_enabled=false");
    expect(pca.public_routes).toEqual([]);
  });
});
