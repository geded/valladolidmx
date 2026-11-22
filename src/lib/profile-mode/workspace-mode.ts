/**
 * Modo de perfil según el espacio de trabajo en el que está la persona.
 *
 * Regla: el panel donde estás es el perfil con el que operas. Entrar al CMS
 * o al Panel Fundador es operar como Staff; al Portal, como Empresa; al
 * Centro Concierge, como Concierge (o Staff si no tiene perfil concierge);
 * a Mi Cuenta o Mi Viaje, como Viajero. Fuera de esos paneles (sitio
 * público) manda el modo guardado.
 */
import type { ProfileMode } from "./mode.functions";

const WORKSPACE_MODES: ReadonlyArray<{
  readonly prefix: string;
  readonly candidates: readonly ProfileMode[];
}> = [
  { prefix: "/cms", candidates: ["staff"] },
  { prefix: "/admin", candidates: ["staff"] },
  { prefix: "/portal", candidates: ["business"] },
  { prefix: "/concierge", candidates: ["concierge", "staff"] },
  { prefix: "/cuenta", candidates: ["traveler"] },
  { prefix: "/mi-viaje", candidates: ["traveler"] },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Modo que corresponde a la ruta, o null si la ruta no es un panel. */
export function modeForPath(
  pathname: string,
  available: readonly ProfileMode[],
): ProfileMode | null {
  const entry = WORKSPACE_MODES.find((w) => matchesPrefix(pathname, w.prefix));
  if (!entry) return null;
  return entry.candidates.find((m) => available.includes(m)) ?? null;
}

/**
 * Perfiles operativos que no deben ver piezas personales del viajero
 * (Mi Viaje, «Tu viaje», Mi Cuenta, «Agregar a Mi Viaje»). Staff = editores
 * y administración; Empresa = anfitrión que sólo administra su negocio;
 * Concierge = atiende viajes de otros, no el suyo.
 */
export function hidesTravelerSurfaces(mode: ProfileMode): boolean {
  return mode === "staff" || mode === "business" || mode === "concierge";
}

/** Modo efectivo: el del panel actual; si no hay panel, el guardado. */
export function effectiveMode(
  pathname: string,
  stored: ProfileMode,
  available: readonly ProfileMode[],
): ProfileMode {
  return modeForPath(pathname, available) ?? stored;
}
