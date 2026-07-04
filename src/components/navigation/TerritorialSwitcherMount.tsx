/**
 * TerritorialSwitcherMount — Montaje visual del `DestinationSwitcher`
 * (Navigation Blueprint v1.0 · Sub-ola N2.5).
 *
 * Este wrapper deriva el contexto de origen desde el Context Engine
 * (herencia + kindDefaults ya resueltos por rutas territoriales y
 * fichas legacy), consulta el listado de destinos publicados y
 * renderiza el switcher canónico. Nunca compone rutas manualmente.
 *
 * Reglas:
 *  · No renderiza nada cuando no hay destino en el contexto (ej. Home).
 *  · No renderiza nada mientras la lista de destinos aún está cargando
 *    o si sólo existe un destino publicado.
 *  · Reutiliza el mismo `resolveDestinationSwitch` server-side para
 *    toda la plataforma — cero divergencias de política entre rutas.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useResolvedContext } from "@/lib/context-engine";
import { DestinationSwitcher } from "@/components/navigation/DestinationSwitcher";
import {
  switchableDestinationsQueryOptions,
  type SwitchFromRef,
} from "@/lib/navigation/destination-switch.functions";

export interface TerritorialSwitcherMountProps {
  readonly className?: string;
  /** Override explícito para rutas legacy sin contexto derivable. */
  readonly from?: SwitchFromRef;
}

/**
 * Deriva `SwitchFromRef` desde el Context Engine cuando existe.
 * Devuelve `null` si no hay destino de contexto (evita renderizar
 * un switcher sin ancla territorial).
 */
function useContextFrom(): SwitchFromRef | null {
  const ctx = useResolvedContext();
  if (!ctx) return null;
  // En la ficha del destino, el destino ES `current` y no aparece en
  // `ctx.destination` (que sólo se llena desde `ancestors`). Cubrimos
  // ese caso explícitamente para que el switcher también monte en la
  // superficie del destino.
  const destination =
    ctx.destination?.slug
    ?? (ctx.current.kind === "destination" ? ctx.current.slug ?? null : null);
  if (!destination) return null;
  const category =
    ctx.category?.slug
    ?? (ctx.current.kind === "category" ? ctx.current.slug ?? null : null);
  const business = ctx.ancestors.find((n) => n.kind === "business")?.slug
    ?? (ctx.current.kind === "business" ? ctx.current.slug ?? null : null);
  const product = ctx.current.kind === "product" ? ctx.current.slug ?? null : null;
  return { destination, category, business, product };
}

export function TerritorialSwitcherMount({
  className,
  from,
}: TerritorialSwitcherMountProps) {
  const contextFrom = useContextFrom();
  const effectiveFrom = from ?? contextFrom;
  const query = useQuery(switchableDestinationsQueryOptions());
  const destinations = useMemo(() => query.data ?? [], [query.data]);

  // No hay ancla territorial → no mostramos el switcher (evita ruido
  // en Home, Blog, Contacto, etc.).
  if (!effectiveFrom || !effectiveFrom.destination) return null;
  // Sin datos o con un único destino, el switcher no aporta valor.
  if (destinations.length < 2) return null;

  return (
    <DestinationSwitcher
      destinations={destinations}
      from={effectiveFrom}
      className={className}
      triggerAriaLabel="Cambiar de destino"
    />
  );
}