/**
 * commercial-slots.ts — Reparto gobernado de espacios comerciales.
 *
 * Fuente única del cálculo de posiciones comerciales para superficies
 * públicas (Home, `/que-hacer` y listados). Módulo puro y determinista:
 * no lee base de datos, no conoce componentes y no inventa contenido.
 *
 * Reglas implementadas (plan aprobado 2026-09-18):
 *  - Máximo 1 contenido contratado por cada 4 tarjetas visibles.
 *  - Dentro de cada bloque de 4, el espacio comercial es el primero.
 *  - Si no hay candidato contratado elegible, el orgánico ocupa el lugar:
 *    nunca quedan huecos ni se rellena con fixtures.
 *  - Techo por empresa: 1 aparición por carril y 2 por página.
 *  - Sólo participan candidatos elegibles (publicados, completos,
 *    vigentes, aprobados editorialmente): fail-closed.
 *  - Rotación determinista por día y superficie, estable durante el día.
 *  - Deuda de exposición: primero quien ha recibido menos impresiones
 *    respecto al derecho que otorga su paquete.
 *  - Los fijados vigentes (Founder Spotlight / destacados programados)
 *    tienen prioridad sobre la rotación por paquetes.
 */

/** Tamaño del bloque: 1 espacio comercial por cada 4 tarjetas visibles. */
export const COMMERCIAL_BLOCK_SIZE = 4;

/** Máximo de apariciones de una misma empresa dentro de un carril. */
export const MAX_APPEARANCES_PER_RAIL = 1;

/** Máximo de apariciones de una misma empresa en toda la página. */
export const MAX_APPEARANCES_PER_PAGE = 2;

export type SlotOrigin = "organic" | "sponsored" | "pinned";

export interface SlotCandidate {
  /** Identificador del contenido mostrado (ficha, producto, evento…). */
  id: string;
  /** Empresa propietaria; null para contenido editorial sin empresa. */
  businessId: string | null;
  /**
   * Elegibilidad editorial y de publicación ya verificada por la lectura.
   * Fail-closed: si no es exactamente `true`, el candidato no participa.
   */
  eligible: boolean;
}

export interface SponsoredCandidate extends SlotCandidate {
  /** Derecho de exposición del paquete contratado (mayor = más turnos). */
  weight: number;
  /** Impresiones ya servidas en el periodo vigente. */
  servedImpressions: number;
  /** Fijado con fecha vigente: entra antes que la rotación por paquetes. */
  pinned?: boolean;
}

export interface AllocatedSlot {
  candidate: SlotCandidate;
  origin: SlotOrigin;
  /** `true` sólo cuando debe mostrarse la indicación discreta `Recomendado`. */
  labeled: boolean;
}

export interface AllocateOptions {
  /** Tarjetas visibles del carril. */
  total: number;
  organic: SlotCandidate[];
  sponsored?: SponsoredCandidate[];
  /** Semilla estable por día y superficie, p. ej. `2026-09-18:home`. */
  seed: string;
  /** Apariciones ya usadas por empresa en la página. */
  pageAppearances?: Map<string, number>;
}

/** Hash entero estable (FNV-1a) para rotación determinista. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function isEligible(candidate: SlotCandidate): boolean {
  return candidate.eligible === true && typeof candidate.id === "string" && candidate.id.length > 0;
}

/**
 * Ordena los candidatos contratados por deuda de exposición y desempata con
 * una rotación determinista, de modo que el resultado no cambia al recargar
 * pero sí varía cada día y por superficie.
 */
export function rankSponsored(
  candidates: SponsoredCandidate[],
  seed: string,
): SponsoredCandidate[] {
  return candidates
    .filter(isEligible)
    .map((candidate) => {
      const weight = candidate.weight > 0 ? candidate.weight : 1;
      const served = candidate.servedImpressions > 0 ? candidate.servedImpressions : 0;
      return {
        candidate,
        pinned: candidate.pinned === true ? 0 : 1,
        // Menor ratio = más deuda de exposición = entra antes.
        debtRatio: served / weight,
        tiebreak: stableHash(`${seed}:${candidate.id}`),
      };
    })
    .sort((a, b) => a.pinned - b.pinned || a.debtRatio - b.debtRatio || a.tiebreak - b.tiebreak)
    .map((entry) => entry.candidate);
}

/**
 * Reparte las posiciones de un carril respetando cupo, prioridad comercial,
 * techos por empresa y relleno orgánico sin huecos.
 */
export function allocateSlots(options: AllocateOptions): AllocatedSlot[] {
  const total = Math.max(0, Math.floor(options.total));
  if (total === 0) return [];

  const organicQueue = options.organic.filter(isEligible);
  const sponsoredQueue = rankSponsored(options.sponsored ?? [], options.seed);

  const pageAppearances = options.pageAppearances ?? new Map<string, number>();
  const railAppearances = new Map<string, number>();
  const usedIds = new Set<string>();

  const canPlace = (candidate: SlotCandidate): boolean => {
    if (usedIds.has(candidate.id)) return false;
    const businessId = candidate.businessId;
    if (!businessId) return true;
    const rail = railAppearances.get(businessId) ?? 0;
    if (rail >= MAX_APPEARANCES_PER_RAIL) return false;
    const page = pageAppearances.get(businessId) ?? 0;
    return page < MAX_APPEARANCES_PER_PAGE;
  };

  const register = (candidate: SlotCandidate) => {
    usedIds.add(candidate.id);
    const businessId = candidate.businessId;
    if (!businessId) return;
    railAppearances.set(businessId, (railAppearances.get(businessId) ?? 0) + 1);
    pageAppearances.set(businessId, (pageAppearances.get(businessId) ?? 0) + 1);
  };

  const takeNext = <T extends SlotCandidate>(queue: T[]): T | null => {
    while (queue.length > 0) {
      const candidate = queue.shift() as T;
      if (canPlace(candidate)) return candidate;
    }
    return null;
  };

  const slots: AllocatedSlot[] = [];
  for (let index = 0; index < total; index += 1) {
    const isCommercialPosition = index % COMMERCIAL_BLOCK_SIZE === 0;
    if (isCommercialPosition) {
      const sponsored = takeNext(sponsoredQueue);
      if (sponsored) {
        register(sponsored);
        slots.push({
          candidate: sponsored,
          origin: sponsored.pinned === true ? "pinned" : "sponsored",
          labeled: true,
        });
        continue;
      }
    }
    const organic = takeNext(organicQueue);
    if (!organic) break; // Menos tarjetas antes que rellenar con fixtures.
    register(organic);
    slots.push({ candidate: organic, origin: "organic", labeled: false });
  }

  return slots;
}

/** Semilla estable del día en el destino para una superficie dada. */
export function dailySeed(surface: string, isoDay: string): string {
  return `${isoDay}:${surface}`;
}
