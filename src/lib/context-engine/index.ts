/**
 * Context Engine — Barrel público (H-02 · I1).
 *
 * NO se re-exporta nada de rutas/UI reales. Este módulo es puramente
 * infraestructura. Consumidores autorizados en I1: playground interno.
 */
export * from "./types";
export {
  ContextEngineProvider,
  useResolvedContext,
  defineRouteContext,
} from "./provider";
export { resolveContext } from "./resolver";
export {
  DEFAULT_INHERITANCE_RULES,
  findInheritanceRule,
} from "./inheritance-rules";
export {
  readPreviousContext,
  writePreviousContext,
  clearPreviousContext,
} from "./previous-store";
export {
  subscribeContextEngineEvents,
  emitContextEngineEvent,
} from "./events";
export {
  publishResolvedContext,
  subscribeResolvedContext,
  getLatestResolvedContext,
} from "./live-context";