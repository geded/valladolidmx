/**
 * Discovery Layer — barrel oficial (15.10.5d.1).
 *
 * Toda superficie pública DEBE importar shell/header/footer desde
 * aquí. Imports directos a `@/components/layout/SiteHeader` o
 * `@/components/layout/SiteFooter` quedan deprecados (Legacy Removal
 * Policy · serán eliminados al cierre de la serie 15.10.5d).
 */
export { PublicShell, type PublicShellProps, type PublicShellVariant } from "./PublicShell";
export { PublicHeader } from "./PublicHeader";
export { PublicFooter } from "./PublicFooter";
export { OfflineBanner } from "./OfflineBanner";
export { SyncStatusBanner } from "./SyncStatusBanner";