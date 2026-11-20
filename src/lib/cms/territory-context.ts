/**
 * territory-context.ts — Destino y zona de trabajo del CMS.
 *
 * Regla: el editor elige una vez el territorio con el que trabaja y el CMS lo
 * recuerda entre pantallas y entre recargas. Sólo estado de interfaz: no hay
 * backend nuevo, no se altera ninguna autoridad editorial ni de permisos.
 */
import { useCallback, useEffect, useState } from "react";

export const CMS_TERRITORY_STORAGE_KEY = "vmx.cms.territory";
const CMS_TERRITORY_EVENT = "vmx:cms-territory";

export interface CmsTerritory {
  destinationId: string;
  zoneId: string;
}

export const EMPTY_TERRITORY: CmsTerritory = { destinationId: "", zoneId: "" };

export function readStoredTerritory(): CmsTerritory {
  if (typeof window === "undefined") return EMPTY_TERRITORY;
  try {
    const raw = window.localStorage.getItem(CMS_TERRITORY_STORAGE_KEY);
    if (!raw) return EMPTY_TERRITORY;
    const parsed = JSON.parse(raw) as Partial<CmsTerritory>;
    return {
      destinationId: typeof parsed.destinationId === "string" ? parsed.destinationId : "",
      zoneId: typeof parsed.zoneId === "string" ? parsed.zoneId : "",
    };
  } catch {
    return EMPTY_TERRITORY;
  }
}

function writeStoredTerritory(next: CmsTerritory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CMS_TERRITORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento no disponible: el filtro sigue funcionando en memoria */
  }
  window.dispatchEvent(new CustomEvent<CmsTerritory>(CMS_TERRITORY_EVENT, { detail: next }));
}

/**
 * useCmsTerritory — Lee y actualiza el territorio activo. Hidratación segura:
 * en el primer render devuelve vacío y adopta el valor guardado en efecto.
 */
export function useCmsTerritory() {
  const [territory, setTerritory] = useState<CmsTerritory>(EMPTY_TERRITORY);

  useEffect(() => {
    setTerritory(readStoredTerritory());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CmsTerritory>).detail;
      setTerritory(detail ?? readStoredTerritory());
    };
    window.addEventListener(CMS_TERRITORY_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CMS_TERRITORY_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setDestination = useCallback((destinationId: string) => {
    const next = { destinationId, zoneId: "" };
    setTerritory(next);
    writeStoredTerritory(next);
  }, []);

  const setZone = useCallback((zoneId: string) => {
    setTerritory((current) => {
      const next = { ...current, zoneId };
      writeStoredTerritory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setTerritory(EMPTY_TERRITORY);
    writeStoredTerritory(EMPTY_TERRITORY);
  }, []);

  return { territory, setDestination, setZone, clear };
}
