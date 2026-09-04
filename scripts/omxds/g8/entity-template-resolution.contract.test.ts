/**
 * G8-P2 · Contrato de Automatic Premium Entity Template Resolution v1.0
 *
 * 18 casos obligatorios: familias, alias, fail-closed, overrides,
 * elegibilidad, flag OFF, rutas canónicas, sitemap, JSON-LD, medios
 * ausentes y aislamiento entre entidades.
 */
import assert from "node:assert/strict";
import {
  ENTITY_PREMIUM_TEMPLATE_PRESETS,
  entityFamilyJsonLdType,
  getEntityPremiumTemplatePreset,
  listEntityPremiumTemplatePresetsForKind,
  resolveEntityPremiumTemplate,
  resolveEntityTemplate,
} from "../../../src/lib/experience-builder/entity-premium-templates";
import { PAGE_KIND_REGISTRY } from "../../../src/lib/experience-builder/page-kind-registry";
import { adaptTourSurfaceContract } from "../../../src/lib/omxds/surfaces/tour-surface.adapter";
import { adaptVacationRentalSurfaceContract } from "../../../src/lib/omxds/surfaces/vacation-rental-surface.adapter";
import { adaptHotelSurfaceContract } from "../../../src/lib/omxds/surfaces/hotel-surface.adapter";

// 0 · Registro de seis presets, ids estables y versión declarada.
assert.deepEqual(
  ENTITY_PREMIUM_TEMPLATE_PRESETS.map((p) => p.id).sort(),
  [
    "premium-entity-event",
    "premium-entity-experience",
    "premium-entity-hotel",
    "premium-entity-restaurant",
    "premium-entity-tour",
    "premium-entity-vacation-rental",
  ],
  "el registro debe declarar exactamente los seis presets de familia",
);
for (const preset of ENTITY_PREMIUM_TEMPLATE_PRESETS) {
  assert.match(preset.version, /^\d+\.\d+\.\d+$/, `${preset.id} requiere versión semver`);
  assert.ok(preset.canonicalRoutePattern.startsWith("/"), `${preset.id} requiere ruta canónica`);
  assert.ok(preset.jsonLdType.length > 0, `${preset.id} requiere JSON-LD`);
  assert.ok(preset.dataSchema.length > 0, `${preset.id} requiere schema de datos`);
  assert.ok(preset.presetRoles.length > 0, `${preset.id} requiere roles`);
  assert.ok(
    !preset.presetRoles.includes("business_author"),
    `${preset.id} no puede abrirse a la empresa`,
  );
}

// 1 · hotel
assert.equal(resolveEntityPremiumTemplate("business", "hotel")?.id, "premium-entity-hotel");
// 2 · hospedaje (alias acreditado, con espacios y mayúsculas)
assert.equal(
  resolveEntityPremiumTemplate("business", "  Hospedaje ")?.id,
  "premium-entity-hotel",
  "el alias hospedaje debe resolver a hotel",
);
// 3 · restaurante
assert.equal(
  resolveEntityPremiumTemplate("business", "restaurantes")?.id,
  "premium-entity-restaurant",
);
// 4 · cafetería (alias con acento)
assert.equal(
  resolveEntityPremiumTemplate("business", "Cafetería")?.id,
  "premium-entity-restaurant",
);
// 5 · evento
assert.equal(resolveEntityPremiumTemplate("event")?.id, "premium-entity-event");
// 6 · experiencia
assert.equal(
  resolveEntityPremiumTemplate("product", null, "experiencia")?.id,
  "premium-entity-experience",
);
// 7 · tour
assert.equal(resolveEntityPremiumTemplate("product", null, "tour")?.id, "premium-entity-tour");
// 8 · casa de vacaciones
assert.equal(
  resolveEntityPremiumTemplate("business", "casa-de-vacaciones")?.id,
  "premium-entity-vacation-rental",
);

// 9 · categoría desconocida → fail-closed a superficie estándar
assert.equal(resolveEntityPremiumTemplate("business", "spa-desconocido"), null);
const unknown = resolveEntityTemplate({
  entityId: "b-1",
  entityType: "business",
  categorySlug: "spa-desconocido",
});
assert.equal(unknown.source, "standard", "familia desconocida debe caer en superficie estándar");
assert.equal(unknown.presetId, null, "fail-closed: nunca un preset premium genérico");
assert.ok(unknown.devWarning, "debe emitir warning de desarrollo");

// 10 · override compatible
const overrideOk = resolveEntityTemplate({
  entityId: "b-2",
  entityType: "business",
  categorySlug: "hoteles",
  override: { presetId: "premium-entity-hotel", entityId: "b-2", approved: true },
});
assert.equal(overrideOk.source, "override");
assert.equal(overrideOk.presetId, "premium-entity-hotel");

// 11 · override incompatible (otra familia y otra entidad) → preset de familia
const overrideBadFamily = resolveEntityTemplate({
  entityId: "b-3",
  entityType: "business",
  categorySlug: "hoteles",
  override: { presetId: "premium-entity-restaurant", entityId: "b-3", approved: true },
});
assert.equal(overrideBadFamily.source, "family");
assert.equal(overrideBadFamily.presetId, "premium-entity-hotel");
const overrideOtherEntity = resolveEntityTemplate({
  entityId: "b-4",
  entityType: "business",
  categorySlug: "hoteles",
  override: { presetId: "premium-entity-hotel", entityId: "b-999", approved: true },
});
assert.equal(overrideOtherEntity.source, "family", "un override ajeno nunca aplica");
const overrideNotApproved = resolveEntityTemplate({
  entityId: "b-5",
  entityType: "business",
  categorySlug: "hoteles",
  override: { presetId: "premium-entity-hotel", entityId: "b-5", approved: false },
});
assert.equal(overrideNotApproved.source, "family", "un override sin aprobación nunca aplica");

// 12 · G8-R1-F1L·P0 — familia ≠ medios: sin acreditación cinematográfica la
// entidad conserva su familia premium; sólo el contexto explícito degrada.
assert.equal(
  resolveEntityTemplate({
    entityId: "b-6",
    entityType: "business",
    categorySlug: "hoteles",
    premiumEligible: false,
  }).source,
  "family",
);
assert.equal(
  resolveEntityTemplate({
    entityId: "b-6",
    entityType: "business",
    categorySlug: "hoteles",
    premiumEligible: false,
    forceStandardSurface: true,
  }).source,
  "standard",
);

// 13 · flag OFF: el resolutor identifica la familia; la presentación pública
// no cambia porque el flag vive fuera de este módulo puro.
const flagOff = resolveEntityTemplate({
  entityId: "b-7",
  entityType: "business",
  categorySlug: "hoteles",
});
assert.equal(flagOff.family, "hotel", "la familia se identifica con el flag apagado");
assert.ok(
  !Object.keys(flagOff).includes("presentation"),
  "el resolutor no decide presentación premium",
);

// 14 · canonical territorial real (nunca /hoteles/{slug} para una ficha)
for (const id of [
  "premium-entity-hotel",
  "premium-entity-restaurant",
  "premium-entity-vacation-rental",
]) {
  assert.equal(
    getEntityPremiumTemplatePreset(id)?.canonicalRoutePattern,
    "/oriente-maya/{destino}/{categoria}/{empresa}",
  );
}
assert.equal(
  getEntityPremiumTemplatePreset("premium-entity-event")?.canonicalRoutePattern,
  "/eventos/{slug}",
);
for (const id of ["premium-entity-experience", "premium-entity-tour"]) {
  const preset = getEntityPremiumTemplatePreset(id)!;
  assert.equal(preset.canonicalRoutePattern, "/producto/{slug}");
  assert.ok(
    preset.alternateRoutePatterns.includes(
      "/oriente-maya/{destino}/{categoria}/{empresa}/{producto}",
    ),
    `${id} debe declarar su ruta territorial real`,
  );
}
// El page-kind-registry documenta los patrones reales del router.
for (const kind of ["hotel", "restaurant", "business"] as const) {
  assert.equal(
    PAGE_KIND_REGISTRY.find((k) => k.kind === kind)?.publicRoutePattern,
    "/oriente-maya/{destino}/{categoria}/{empresa}",
    `page-kind ${kind} debe documentar la ruta territorial real`,
  );
}
assert.equal(
  PAGE_KIND_REGISTRY.find((k) => k.kind === "experience")?.publicRoutePattern,
  "/producto/{slug}",
);

// 15 · sitemap: toda familia auto-asignable emite una ruta indexable real
for (const preset of ENTITY_PREMIUM_TEMPLATE_PRESETS) {
  if (!preset.autoAssign) continue;
  assert.ok(
    preset.canonicalRoutePattern.includes("{"),
    `${preset.id} debe resolverse por ruta paramétrica existente (alta automática sin archivos)`,
  );
}

// 16 · JSON-LD por familia
assert.equal(entityFamilyJsonLdType("hotel"), "Hotel");
assert.equal(entityFamilyJsonLdType("restaurant"), "Restaurant");
assert.equal(entityFamilyJsonLdType("event"), "Event");
assert.equal(entityFamilyJsonLdType("experience"), "Product");
assert.equal(entityFamilyJsonLdType("tour"), "TouristTrip");
assert.equal(entityFamilyJsonLdType("vacation_rental"), "VacationRental");

// 17 · media ausente → el contrato entra en estado no_media sin romperse
const noMediaHotel = adaptHotelSurfaceContract({
  id: "h-1",
  slug: "hotel-demo",
  displayName: "Hotel demo",
  destinationSlug: "valladolid",
  categorySlug: "hoteles",
  coverUrl: null,
  latitude: null,
  longitude: null,
  verified: false,
  relatedCount: 0,
});
assert.equal(noMediaHotel?.state, "no_media");
assert.ok(noMediaHotel?.omissions.includes("media"));

// Adaptadores nuevos: fail-closed por tipo/categoría.
assert.ok(
  adaptTourSurfaceContract({
    id: "p-1",
    slug: "tour-demo",
    name: "Tour demo",
    productType: "tour",
    businessName: "Proveedor demo",
    canonicalUrl: "/producto/tour-demo",
    hasMedia: true,
    hasCollection: false,
    verifiedBusiness: true,
  }),
);
assert.equal(
  adaptTourSurfaceContract({
    id: "p-2",
    slug: "exp-demo",
    name: "Experiencia demo",
    productType: "experiencia",
    businessName: "Proveedor demo",
    canonicalUrl: "/producto/exp-demo",
    hasMedia: true,
    hasCollection: false,
    verifiedBusiness: true,
  }),
  null,
  "el adaptador de tour no acepta experiencias",
);
assert.ok(
  adaptVacationRentalSurfaceContract({
    id: "b-8",
    slug: "casa-demo",
    displayName: "Casa demo",
    destinationSlug: "valladolid",
    categorySlug: "casas-de-vacaciones",
    coverUrl: "/api/public/studio-media/governed/v1p1c/hotel-cover.jpg",
    latitude: 20.68,
    longitude: -88.2,
    verified: true,
    relatedCount: 2,
  }),
);
assert.equal(
  adaptVacationRentalSurfaceContract({
    id: "b-9",
    slug: "hotel-demo",
    displayName: "Hotel demo",
    destinationSlug: "valladolid",
    categorySlug: "hoteles",
    coverUrl: null,
    latitude: null,
    longitude: null,
    verified: false,
    relatedCount: 0,
  }),
  null,
  "una casa nunca adopta la plantilla de hotel ni al revés",
);

// Casa de vacaciones: preset aceptado por el Founder (commit b29a7400,
// "feat: connect vacation rental premium surfaces") → auto-asignable.
const rental = resolveEntityTemplate({
  entityId: "b-10",
  entityType: "business",
  categorySlug: "casas-de-vacaciones",
});
assert.equal(rental.source, "family", "el preset de casa aceptado se asigna por familia");
assert.equal(rental.presetId, "premium-entity-vacation-rental");
assert.equal(rental.family, "vacation_rental");

// 18 · aislamiento entre entidades: un override no contamina a otras.
const isolatedA = resolveEntityTemplate({
  entityId: "b-11",
  entityType: "business",
  categorySlug: "restaurantes",
  override: { presetId: "premium-entity-restaurant", entityId: "b-11", approved: true },
});
const isolatedB = resolveEntityTemplate({
  entityId: "b-12",
  entityType: "business",
  categorySlug: "restaurantes",
});
assert.equal(isolatedA.source, "override");
assert.equal(isolatedB.source, "family");

// Studio: cada tipo de página ve sólo su familia compatible.
assert.deepEqual(
  listEntityPremiumTemplatePresetsForKind("hotel").map((p) => p.id),
  ["premium-entity-hotel"],
);
assert.deepEqual(
  listEntityPremiumTemplatePresetsForKind("event").map((p) => p.id),
  ["premium-entity-event"],
);
assert.deepEqual(listEntityPremiumTemplatePresetsForKind("desconocido"), []);

console.log("G8-P2 · contrato de resolución automática de plantillas de entidad: PASS");
