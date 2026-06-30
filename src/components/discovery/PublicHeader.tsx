/**
 * PublicHeader — Cabecera canónica oficial de la Discovery Layer (15.10.5d.1).
 *
 * Es el ÚNICO header autorizado para superficies públicas. Toda ruta
 * pública lo consume vía `<PublicShell>` o, transitivamente, mediante
 * el render condicional del `__root.tsx`.
 *
 * Política Public Experience Consistency: ninguna superficie pública
 * puede implementar header propio. Las diferencias entre Home,
 * Marketplace, Empresas, Experiencias, etc. provienen del contenido
 * y de bloques del Experience Builder, nunca del shell.
 *
 * En 15.10.5d.1 se reexporta la implementación existente
 * `SiteHeader` como canónica, sin cambios funcionales (paridad 1:1).
 * Migraciones visuales posteriores ocurrirán dentro de este mismo
 * componente, manteniendo la API estable.
 */
export { SiteHeader as PublicHeader } from "@/components/layout/SiteHeader";
export type { default as PublicHeaderProps } from "@/components/layout/SiteHeader";