/**
 * CV8.S.2 · Grafo territorial del Oriente Maya (Capa 2: Generación).
 *
 * Founder Scenario Coherence Principle · Regla Territorial:
 * distribución nunca uniforme; excursiones ponderadas por perfil; visitantes
 * transitan por aristas válidas partiendo del nodo base del escenario.
 */
import type { Prng } from "./prng";
import type { TravelerProfileId } from "./scenario";

export type DestinationSlug =
  | "valladolid"
  | "chichen-itza"
  | "ek-balam"
  | "izamal"
  | "rio-lagartos"
  | "las-coloradas"
  | "espita"
  | "uayma"
  | "cenotes-comunidades";

export const ORIENTE_MAYA_NODES: readonly DestinationSlug[] = [
  "valladolid",
  "chichen-itza",
  "ek-balam",
  "izamal",
  "rio-lagartos",
  "las-coloradas",
  "espita",
  "uayma",
  "cenotes-comunidades",
];

/** Aristas válidas partiendo de Valladolid (nodo base del escenario oficial). */
export const EDGES_FROM_VALLADOLID: Readonly<
  Record<Exclude<DestinationSlug, "valladolid">, { travel_min: number; travel_max: number }>
> = {
  "chichen-itza": { travel_min: 40, travel_max: 60 },
  "ek-balam":     { travel_min: 30, travel_max: 45 },
  "izamal":       { travel_min: 60, travel_max: 90 },
  "rio-lagartos": { travel_min: 90, travel_max: 130 },
  "las-coloradas":{ travel_min: 95, travel_max: 140 },
  "espita":       { travel_min: 25, travel_max: 40 },
  "uayma":        { travel_min: 15, travel_max: 25 },
  "cenotes-comunidades": { travel_min: 20, travel_max: 50 },
};

/** Pesos base por destino (concentración en Valladolid). */
export const BASE_DESTINATION_WEIGHTS: Readonly<Record<DestinationSlug, number>> = {
  valladolid: 10,
  "chichen-itza": 5,
  "ek-balam": 2.5,
  izamal: 1.6,
  "rio-lagartos": 1.4,
  "las-coloradas": 1.4,
  espita: 0.8,
  uayma: 0.9,
  "cenotes-comunidades": 3.2,
};

/**
 * Modificadores por perfil — sesgan qué excursiones prefiere cada perfil.
 * Multiplican los pesos base.
 */
const PROFILE_TERRITORIAL_BIAS: Partial<
  Record<TravelerProfileId, Partial<Record<DestinationSlug, number>>>
> = {
  cultural:              { "chichen-itza": 1.6, "ek-balam": 1.6, izamal: 1.5 },
  nature:                { "rio-lagartos": 2.2, "las-coloradas": 2.2, "ek-balam": 1.3, "cenotes-comunidades": 2.4 },
  gastronomic:           { valladolid: 1.4, espita: 1.6, izamal: 1.3 },
  luxury:                { valladolid: 1.3, "chichen-itza": 1.5 },
  backpacker:            { "ek-balam": 1.5, espita: 1.4, "cenotes-comunidades": 1.6, uayma: 1.2 },
  day_tripper:           { "chichen-itza": 2.0, valladolid: 1.2 },
  self_drive:            { "rio-lagartos": 1.6, "las-coloradas": 1.6, izamal: 1.4, espita: 1.3, uayma: 1.2, "cenotes-comunidades": 1.5 },
  hotel_guest:           { valladolid: 1.5 },
  couple_international:  { "chichen-itza": 1.4, izamal: 1.2 },
  family:                { "chichen-itza": 1.5, "las-coloradas": 1.2, "cenotes-comunidades": 1.4 },
  retirees:              { izamal: 1.4, valladolid: 1.3 },
};

/**
 * Selecciona un itinerario territorial coherente para un visitante.
 *
 * @param primary   nodo base del escenario (normalmente "valladolid").
 * @param tripDays  duración del viaje (a mayor duración, más excursiones).
 * @param profile   perfil (sesga la selección).
 * @param prng      PRNG determinístico del escenario.
 * @returns lista ordenada de destinos empezando por el nodo base.
 */
export function pickTerritorialPath(
  primary: DestinationSlug,
  tripDays: number,
  profile: TravelerProfileId,
  prng: Prng,
): DestinationSlug[] {
  const excursionCount = Math.min(
    Math.max(0, tripDays - 1),
    Math.max(1, Math.round(tripDays * 0.6)),
  );
  const path: DestinationSlug[] = [primary];
  const bias = PROFILE_TERRITORIAL_BIAS[profile] ?? {};

  const candidates: Array<[DestinationSlug, number]> = ORIENTE_MAYA_NODES
    .filter((n) => n !== primary)
    .map((n) => {
      const base = BASE_DESTINATION_WEIGHTS[n];
      const mult = bias[n] ?? 1;
      return [n, base * mult] as [DestinationSlug, number];
    });

  for (let i = 0; i < excursionCount && candidates.length > 0; i += 1) {
    const pickIndex = weightedIndex(candidates, prng);
    const [pickNode] = candidates[pickIndex]!;
    path.push(pickNode);
    // Reduce weight instead of removing → permite regresos ocasionales.
    candidates[pickIndex]![1] *= 0.35;
  }
  return path;
}

function weightedIndex(
  entries: ReadonlyArray<[unknown, number]>,
  prng: Prng,
): number {
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = prng.next() * total;
  for (let i = 0; i < entries.length; i += 1) {
    r -= entries[i]![1];
    if (r <= 0) return i;
  }
  return entries.length - 1;
}

/** URL de superficie territorial para un destino. */
export function destinationRoute(dest: DestinationSlug): string {
  return `/oriente-maya/${dest}`;
}