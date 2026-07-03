/**
 * Smart Block renderers (15.10.8.3). Presentational-only: reciben `items`
 * ya resueltos por `resolveSmartBlock` (15.10.8.2). No se registran aún
 * en la Block Library; se conectarán en 15.10.8.4.
 */
export { SmartCard, SmartGrid, SmartEmpty } from "./SmartCard";
export { SmartDestinationsGrid } from "./SmartDestinationsGrid";
export { SmartBusinessesGrid } from "./SmartBusinessesGrid";
export { SmartProductsGrid } from "./SmartProductsGrid";
export { SmartEventsList } from "./SmartEventsList";
export { SmartBlockRuntime } from "./SmartBlockRuntime";