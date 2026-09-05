/**
 * Lote 3B · B — Consumo público de `brand.identity`.
 *
 * La identidad editorial que las superficies públicas muestran (nombre,
 * lema, promesa de descubrimiento, nombre del concierge y logotipo
 * oficial existente) se resuelve desde la configuración administrable
 * `platform_settings.brand.identity`.
 *
 * `ACTIVE_BRAND` (src/config/brand.ts) deja de ser autoridad primaria y
 * queda únicamente como **fallback seguro**: se usa cuando no hay
 * registro, cuando la lectura falla o cuando un campo viene vacío o con
 * tipo inválido. Los tokens de color y el binario del logotipo siguen
 * viniendo del código y de los activos ya existentes: aquí no se crean
 * ni se sustituyen activos.
 */
import { createContext, useContext, type ReactNode } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  BRAND_SETTINGS_DEFAULTS,
  getBrandSettings,
  normalizeBrandSettings,
  type BrandSettings,
} from "./brand-settings.functions";
import { ACTIVE_BRAND } from "@/config/brand";

export const BRAND_SETTINGS_QUERY_KEY = ["brand", "identity"] as const;

// Brand query primitives intentionally share this module with their provider.
// eslint-disable-next-line react-refresh/only-export-components
export const brandSettingsQueryOptions = queryOptions({
  queryKey: BRAND_SETTINGS_QUERY_KEY,
  queryFn: () => getBrandSettings(),
  staleTime: 5 * 60_000,
});

const BrandContext = createContext<BrandSettings | null>(null);

/**
 * Provider isomórfico. Toma el valor ya precargado en la caché (SSR) y
 * lo revalida en cliente. Nunca suspende ni bloquea el primer paint:
 * el fallback seguro está disponible de inmediato.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({ ...brandSettingsQueryOptions, initialData: BRAND_SETTINGS_DEFAULTS });
  return (
    <BrandContext.Provider value={normalizeBrandSettings(data)}>{children}</BrandContext.Provider>
  );
}

/** Identidad de marca vigente. Fuera del provider devuelve el fallback. */
// eslint-disable-next-line react-refresh/only-export-components
export function useBrand(): BrandSettings {
  return useContext(BrandContext) ?? BRAND_SETTINGS_DEFAULTS;
}

/** Logotipo oficial vigente (activo existente; nunca uno inventado). */
// eslint-disable-next-line react-refresh/only-export-components
export function useBrandLogo(): { src: string; alt: string; width: number; height: number } {
  const brand = useBrand();
  return {
    src: brand.logoSrc,
    alt: brand.name,
    width: ACTIVE_BRAND.logo.width,
    height: ACTIVE_BRAND.logo.height,
  };
}
