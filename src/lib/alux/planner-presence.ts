/**
 * Alux Planner Presence — G8-R1-C+L · GAP-03 / Integración transversal.
 *
 * Regla de gobernanza: **máximo un planificador contextual por página**
 * (además del único dock global `AluxFloatingTrigger`, cuya presencia la
 * decide `useAluxFloatingPresence`).
 *
 * El primer `vmx.alux.planner` montado gana; cualquier instancia adicional
 * en la misma página se desactiva (no renderiza) en vez de duplicar la
 * presencia de Alux. SSR-safe: en servidor sólo el primero renderiza.
 *
 * No introduce estado de negocio: es un contador de montaje, igual que
 * `sticky-cta-presence`.
 */
import { useEffect, useId, useRef, useState } from "react";

let ownerId: string | null = null;

/** Sólo para pruebas: reinicia el propietario del planificador. */
export function __resetPlannerPresence() {
  ownerId = null;
}

/** `true` si esta instancia es la autorizada a renderizar el planificador. */
export function usePlannerPresence(): boolean {
  const id = useId();
  const claimedRef = useRef(false);
  const [owner, setOwner] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return ownerId === null || ownerId === id;
  });

  useEffect(() => {
    if (ownerId === null) {
      ownerId = id;
      claimedRef.current = true;
      setOwner(true);
    } else {
      setOwner(ownerId === id);
    }
    return () => {
      if (claimedRef.current && ownerId === id) {
        ownerId = null;
        claimedRef.current = false;
      }
    };
  }, [id]);

  return owner;
}
