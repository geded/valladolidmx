/**
 * Lote 3B · Objetivo A — Materialización CMS-first de la Home Premium G4.
 *
 * La composición `home` publicada sólo declaraba decisiones de medios
 * (`media_url: ""`); todo el texto, enlaces, límites y visibilidad se
 * resolvían desde el fixture de código `HOME_PREMIUM_G4_CONTENT`. Esta
 * utilidad produce una configuración **equivalente pero administrable**:
 *
 *  · Copia al snapshot todos los campos editables (textos, enlaces, orden,
 *    visibilidad, límites y referencias de medios).
 *  · Preserva EXACTAMENTE las decisiones editoriales de medios vigentes:
 *    un `media_url` presente y vacío significa "sin fotografía acreditada"
 *    y NO se sustituye por el medio conceptual del fixture.
 *  · Preserva la longitud de cada colección tal y como se renderiza hoy.
 *
 * Invariante verificable: `resolveHomePremiumG4(current)` y
 * `resolveHomePremiumG4(materializeHomePremiumConfig(current))` deben ser
 * profundamente iguales. El test `home-materialization.test.ts` lo exige.
 */
import { homePremiumG4DefaultConfig } from "@/components/home-premium/home-premium-config";

type Cfg = Record<string, unknown>;
type Row = Record<string, unknown>;

const MEDIA_KEYS = ["media_url", "media_alt"] as const;

/** Colecciones editables del bloque y su campo de límite asociado. */
const LIST_KEYS: Array<{ key: string; limitKey?: string }> = [
  { key: "hero_slides" },
  { key: "categorias_items", limitKey: "categorias_max_items" },
  { key: "alux_prompts" },
  { key: "destinos_items", limitKey: "destinos_max_items" },
  { key: "rutas_items", limitKey: "rutas_max_items" },
  { key: "experiencias_items", limitKey: "experiencias_max_items" },
  { key: "servicios_stays", limitKey: "servicios_max_items" },
  { key: "servicios_food", limitKey: "servicios_max_items" },
  { key: "eventos_items", limitKey: "eventos_max_items" },
  { key: "que_hacer_items", limitKey: "que_hacer_max_items" },
];

const rowsOf = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((r): r is Row => Boolean(r) && typeof r === "object") : [];

/**
 * La política editorial (`editorial-builder-policy`) sólo admite rutas
 * internas canónicas en cualquier clave `*href*`. Un ancla como `#mapa`
 * es descartada por el resolutor (no genera enlace), así que materializarla
 * bloquearía el guardado en el Studio sin aportar nada: se omite.
 */
const isCanonicalHref = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && !value.includes("?") && !value.includes("#");

function stripNonCanonicalHrefs(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (/href/i.test(k) && !isCanonicalHref(v)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Une la fila por defecto (texto/enlace acreditado) con la fila vigente del
 * snapshot: cualquier clave presente hoy gana, incluidas las decisiones de
 * medios explícitamente vacías.
 */
function mergeRow(defaultRow: Row | undefined, currentRow: Row): Row {
  const base: Row = { ...stripNonCanonicalHrefs(defaultRow ?? {}) };
  for (const [k, v] of Object.entries(currentRow)) base[k] = v;
  // Una fila vigente que declara `media_url` conserva también su `media_alt`
  // vigente aunque sea ausente: la ausencia no debe reintroducir el default.
  if ("media_url" in currentRow && !("media_alt" in currentRow)) {
    base.media_alt = typeof defaultRow?.media_alt === "string" ? defaultRow.media_alt : "";
  }
  return base;
}


export function materializeHomePremiumConfig(current: Cfg): Cfg {
  const defaults = homePremiumG4DefaultConfig() as Cfg;
  const out: Cfg = { ...defaults };

  // 1 · Escalares y decisiones vigentes ganan sobre el default.
  for (const [k, v] of Object.entries(current)) {
    if (LIST_KEYS.some((l) => l.key === k)) continue;
    out[k] = v;
  }

  // 2 · Colecciones: se materializa el texto por defecto sobre cada fila
  //     vigente, respetando índice, longitud y decisiones de medios.
  for (const { key, limitKey } of LIST_KEYS) {
    const currentRows = rowsOf(current[key]);
    if (currentRows.length === 0) continue; // se conserva el default completo
    const defaultRows = rowsOf(defaults[key]);
    out[key] = currentRows.map((row, index) =>
      mergeRow(defaultRows.length > 0 ? defaultRows[index % defaultRows.length] : undefined, row),
    );
    if (limitKey && !(limitKey in current)) {
      // El límite materializado nunca puede recortar lo que hoy se renderiza.
      const declared = typeof defaults[limitKey] === "number" ? (defaults[limitKey] as number) : 0;
      out[limitKey] = Math.max(declared, currentRows.length);
    }
  }

  // 3 · `servicios_max_items` cubre ambas columnas.
  const stays = rowsOf(out.servicios_stays).length;
  const food = rowsOf(out.servicios_food).length;
  if (!("servicios_max_items" in current)) {
    out.servicios_max_items = Math.max(
      typeof defaults.servicios_max_items === "number" ? defaults.servicios_max_items : 0,
      stays,
      food,
    );
  }

  return out;
}

export const HOME_MATERIALIZATION_MEDIA_KEYS = MEDIA_KEYS;
