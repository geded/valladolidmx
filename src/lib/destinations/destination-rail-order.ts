/**
 * Muestra de empresas por sección en la página de cada destino.
 *
 * La página sólo enseña unas cuantas tarjetas por sección (hasta 10); la
 * lista completa vive en «Ver hoteles», «Ver restaurantes», etc. Aquí se
 * elige cuáles entran con las mismas reglas de los listados completos
 * (`arrangeListing`): destacados fijados primero, paquetes de visibilidad en
 * el primer lugar de cada bloque de 4 con rotación diaria y, entre gratuitas,
 * con foto primero y turno justo diario (nunca alfabético).
 */
import { arrangeListing, meridaIsoDay } from "@/lib/visibility/commercial-slots";
import { fairTurnKey } from "@/lib/visibility/profile-completeness";

/** Tarjetas que el destino envía por sección (la sección más larga muestra 10). */
export const DESTINATION_SECTION_SAMPLE = 12;

export interface RailCandidate {
  id: string;
  hasCover: boolean;
  visibilityBoost: number;
  pinned: boolean;
}

export function pickDestinationSection<T>(
  items: readonly T[],
  describe: (item: T) => RailCandidate,
  seed: string,
  limit: number = DESTINATION_SECTION_SAMPLE,
): T[] {
  const described = items.map((item) => ({ item, c: describe(item) }));
  const organic = [...described].sort(
    (a, b) =>
      Number(b.c.hasCover) - Number(a.c.hasCover) ||
      fairTurnKey(seed, a.c.id) - fairTurnKey(seed, b.c.id),
  );
  return arrangeListing(
    organic.map(({ item, c }) => ({
      item,
      businessId: c.id,
      weight: c.visibilityBoost,
      pinned: c.pinned,
    })),
    seed,
  )
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function destinationSectionSeed(destinationSlug: string, now: Date = new Date()): string {
  return `destino:${destinationSlug}:${meridaIsoDay(now)}`;
}
