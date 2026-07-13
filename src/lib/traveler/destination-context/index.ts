/**
 * CV6.4 · Destination Context — Barrel público.
 *
 * Consumidores autorizados importan EXCLUSIVAMENTE desde aquí. Ninguna
 * superficie debe importar un contributor concreto (regla vinculante
 * en `mem://policies/founder-destination-context-engine.md`).
 */
export * from "./types";
export {
  registerDestinationContributor,
  listDestinationContributors,
  getContributorsByKind,
  clearDestinationContributors,
} from "./registry";
export { resolveDestinationContext } from "./resolve";

// Contributors iniciales (CV6.4). El registro efectivo se realiza en
// el bootstrap del server (sub-ola siguiente); aquí sólo se exportan
// como piezas registrables.
export { weatherContributor } from "./contributors/weather";
export { hoursContributor } from "./contributors/hours";
export { trafficContributor } from "./contributors/traffic";
