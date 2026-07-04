/**
 * Punto de entrada público del servicio Protected Actions (OLA H-01).
 * En I1 sólo se exportan primitivas de infraestructura. El hook público
 * (`useProtectedAction`) y el Sheet llegan en I2.
 */
export * from "./types";
export { PendingActionRegistry } from "./registry";
export {
  emitProtectedActionEvent,
  subscribeProtectedActionEvents,
} from "./observability";
export { ProtectedActionResumeRunner } from "./resume-runner";
