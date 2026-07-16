/**
 * U-VISUAL · V4 — `vmx.experience.map` · Defaults (render-only).
 *
 * C2.F1 Piloto. Defaults canónicos y `applyExperienceMapDefaults()`
 * para la ruta pública. NO importa Zod. La equivalencia runtime con
 * `experienceMapDTOSchema.parse(...)` se valida con fixtures en
 * `scripts/experience-map-defaults.test.ts`.
 *
 * Regla: cualquier cambio aquí debe reflejarse en el schema Zod
 * (contract.ts) y viceversa. Fuente única para ambas rutas.
 */
import type {
  ExperienceMapCapabilities,
  ExperienceMapCenter,
  ExperienceMapDTO,
  ExperienceMapPoint,
  ExperienceMapVariant,
  ExperienceMapEntityKind,
} from "./types";

export const EXPERIENCE_MAP_DEFAULT_CAPABILITIES: ExperienceMapCapabilities = {
  showDistance: true,
  showDirections: true,
  clustering: false,
  syncList: false,
  staticFallback: true,
  allowInteractiveToggle: true,
};

export const EXPERIENCE_MAP_DEFAULT_VARIANT: ExperienceMapVariant = "single";
export const EXPERIENCE_MAP_DEFAULT_CENTER_ZOOM = 14;

const VALID_VARIANTS: ReadonlySet<ExperienceMapVariant> = new Set([
  "single",
  "multi",
  "list-sync",
  "cluster",
]);

const VALID_KINDS: ReadonlySet<ExperienceMapEntityKind> = new Set([
  "business",
  "product",
  "destination",
  "event",
  "promotion",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceVariant(v: unknown): ExperienceMapVariant {
  return typeof v === "string" && VALID_VARIANTS.has(v as ExperienceMapVariant)
    ? (v as ExperienceMapVariant)
    : EXPERIENCE_MAP_DEFAULT_VARIANT;
}

function coerceKind(v: unknown): ExperienceMapEntityKind | null {
  return typeof v === "string" && VALID_KINDS.has(v as ExperienceMapEntityKind)
    ? (v as ExperienceMapEntityKind)
    : null;
}

function coerceLat(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < -90 || v > 90) return null;
  return v;
}

function coerceLng(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < -180 || v > 180) return null;
  return v;
}

function coerceNullableString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return typeof v === "string" ? v : undefined;
}

function coerceOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function coercePoint(input: unknown): ExperienceMapPoint | null {
  if (!isRecord(input)) return null;
  const id = coerceOptionalString(input.id);
  const kind = coerceKind(input.kind);
  const lat = coerceLat(input.lat);
  const lng = coerceLng(input.lng);
  const title = coerceOptionalString(input.title);
  if (!id || !kind || lat === null || lng === null || !title) return null;
  const point: ExperienceMapPoint = { id, kind, lat, lng, title };
  const subtitle = coerceNullableString(input.subtitle);
  if (subtitle !== undefined) point.subtitle = subtitle;
  const href = coerceNullableString(input.href);
  if (href !== undefined) point.href = href;
  const thumbUrl = coerceNullableString(input.thumbUrl);
  if (thumbUrl !== undefined) point.thumbUrl = thumbUrl;
  const badge = coerceNullableString(input.badge);
  if (badge !== undefined) point.badge = badge;
  const priceLabel = coerceNullableString(input.priceLabel);
  if (priceLabel !== undefined) point.priceLabel = priceLabel;
  return point;
}

function coerceCenter(input: unknown): ExperienceMapCenter | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (!isRecord(input)) return undefined;
  const lat = typeof input.lat === "number" ? input.lat : null;
  const lng = typeof input.lng === "number" ? input.lng : null;
  if (lat === null || lng === null) return undefined;
  const zoom =
    typeof input.zoom === "number" ? input.zoom : EXPERIENCE_MAP_DEFAULT_CENTER_ZOOM;
  return { lat, lng, zoom };
}

function coerceCapabilities(input: unknown): ExperienceMapCapabilities {
  if (!isRecord(input)) return { ...EXPERIENCE_MAP_DEFAULT_CAPABILITIES };
  const b = (v: unknown, fallback: boolean): boolean =>
    typeof v === "boolean" ? v : fallback;
  return {
    showDistance: b(input.showDistance, EXPERIENCE_MAP_DEFAULT_CAPABILITIES.showDistance),
    showDirections: b(input.showDirections, EXPERIENCE_MAP_DEFAULT_CAPABILITIES.showDirections),
    clustering: b(input.clustering, EXPERIENCE_MAP_DEFAULT_CAPABILITIES.clustering),
    syncList: b(input.syncList, EXPERIENCE_MAP_DEFAULT_CAPABILITIES.syncList),
    staticFallback: b(input.staticFallback, EXPERIENCE_MAP_DEFAULT_CAPABILITIES.staticFallback),
    allowInteractiveToggle: b(
      input.allowInteractiveToggle,
      EXPERIENCE_MAP_DEFAULT_CAPABILITIES.allowInteractiveToggle,
    ),
  };
}

/**
 * Aplica defaults render-only equivalente a
 * `experienceMapDTOSchema.parse(input)` para entradas VÁLIDAS.
 *
 * Contrato:
 *  - No lanza. Para entradas inválidas devuelve el DTO más cercano
 *    reproducible sin drift respecto al comportamiento previo del
 *    renderer (que ya toleraba dto crudo).
 *  - Puntos que no cumplen mínimos (id/kind/coord válidas/title) se
 *    descartan silenciosamente — mismo efecto que `safeParse` +
 *    filtrado aguas arriba.
 *  - Campos opcionales ausentes permanecen `undefined`; nulos
 *    explícitos permanecen `null` (paridad con Zod).
 */
export function applyExperienceMapDefaults(input: unknown): ExperienceMapDTO {
  const src = isRecord(input) ? input : {};
  const points = Array.isArray(src.points)
    ? (src.points
        .map(coercePoint)
        .filter((p): p is ExperienceMapPoint => p !== null))
    : [];

  // Orden de claves canónico (paridad byte-exact con
  // `experienceMapDTOSchema.parse` para JSON estable):
  // variant → heading → center → points → capabilities → emptyMessage.
  const dto = {} as ExperienceMapDTO;
  dto.variant = coerceVariant(src.variant);
  const heading = coerceNullableString(src.heading);
  if (heading !== undefined) dto.heading = heading;
  const center = coerceCenter(src.center);
  if (center !== undefined) dto.center = center;
  dto.points = points;
  dto.capabilities = coerceCapabilities(src.capabilities);
  const emptyMessage = coerceNullableString(src.emptyMessage);
  if (emptyMessage !== undefined) dto.emptyMessage = emptyMessage;
  return dto;
}