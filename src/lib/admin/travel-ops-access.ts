/**
 * travel-ops-access.ts — Quién puede abrir «Viajes en curso».
 *
 * Refleja en la interfaz la regla del servidor `_cv11_can_view_travel_ops`
 * (admin, super_admin, concierge, concierge_lead). La seguridad real sigue en
 * el servidor; esto sólo evita mostrar la tarjeta y la pantalla a quien
 * recibiría «forbidden» (por ejemplo, un editor).
 */
const TRAVEL_OPS_ROLES = ["admin", "super_admin", "concierge", "concierge_lead"] as const;

export function canViewTravelOps(roles: readonly string[]): boolean {
  return roles.some((r) => (TRAVEL_OPS_ROLES as readonly string[]).includes(r));
}
