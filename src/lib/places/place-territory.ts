/**
 * G8-Q2B · Addendum · Relación territorial Destino → Zona → Lugar.
 *
 * Fuente única de la regla: un Lugar pertenece obligatoriamente a un Destino y
 * opcionalmente a una Zona de ESE destino. La zona nunca puede pertenecer a un
 * destino distinto. Este módulo es puro (sin IO) para que la misma regla se
 * aplique en el formulario, en las server functions y en las pruebas.
 *
 * Reglas vinculantes:
 *  - No se crean zonas automáticamente.
 *  - No se modifican datos territoriales reales.
 *  - Fail-closed: ante datos insuficientes, la relación se considera inválida.
 */

export interface TerritorialZone {
  id: string;
  name: string;
  destination_id: string;
  status?: string | null;
}

/** Estados de zona considerados seleccionables en el CMS. */
export const SELECTABLE_ZONE_STATUSES = ["draft", "in_review", "approved", "published"] as const;

export function isSelectableZone(zone: TerritorialZone): boolean {
  const status = zone.status ?? "published";
  return (SELECTABLE_ZONE_STATUSES as readonly string[]).includes(status);
}

/** Zonas activas del destino indicado, ordenadas por nombre. */
export function zonesForDestination(
  zones: readonly TerritorialZone[],
  destinationId: string | null | undefined,
): TerritorialZone[] {
  if (!destinationId) return [];
  return zones
    .filter((zone) => zone.destination_id === destinationId && isSelectableZone(zone))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * ¿La zona elegida es compatible con el destino?
 * `null`/`undefined` (sin zona) siempre es válido: la zona es opcional.
 */
export function isZoneCompatible(
  zones: readonly TerritorialZone[],
  destinationId: string | null | undefined,
  zoneId: string | null | undefined,
): boolean {
  if (!zoneId) return true;
  if (!destinationId) return false;
  return zonesForDestination(zones, destinationId).some((zone) => zone.id === zoneId);
}

/**
 * Normaliza la zona tras un cambio de destino: conserva la zona sólo si sigue
 * perteneciendo al destino activo; en cualquier otro caso la limpia.
 */
export function reconcileZoneForDestination(
  zones: readonly TerritorialZone[],
  destinationId: string | null | undefined,
  zoneId: string | null | undefined,
): string {
  return isZoneCompatible(zones, destinationId, zoneId) ? (zoneId ?? "") : "";
}

/** Código de error único que devuelve el servidor al rechazar la relación. */
export const ZONE_DESTINATION_MISMATCH = "zone_destination_mismatch" as const;

/** Mensaje humano para el editor cuando el servidor rechaza la relación. */
export const ZONE_DESTINATION_MISMATCH_MESSAGE =
  "La zona seleccionada no pertenece al destino de este lugar.";
