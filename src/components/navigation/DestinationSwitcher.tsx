/**
 * DestinationSwitcher — Cambio de destino con continuidad de contexto
 * (Navigation Blueprint v1.0 · Sub-ola N2.4).
 *
 * Contrato:
 *  · La URL objetivo SIEMPRE se calcula server-side vía
 *    `resolveDestinationSwitch()` — jamás se compone en cliente.
 *  · Preserva el nivel más profundo posible (producto > empresa >
 *    categoría > destino) y degrada de forma predecible al nivel
 *    inmediatamente superior si no existe equivalencia.
 *  · Cuando degrada, emite un toast explicativo (Alux-safe): el usuario
 *    entiende por qué llegó a un nivel más superficial que el actual.
 *
 * REGLA: este componente no conoce rutas específicas. Toda la
 * información de contexto entra por `from`; los consumidores autorizados
 * son superficies territoriales y fichas legacy con contexto conocido.
 */
import { useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  resolveDestinationSwitch,
  type SwitchFromRef,
  type SwitchableDestination,
} from "@/lib/navigation/destination-switch.functions";
import { resolveContextFromPath } from "@/lib/navigation";

export interface DestinationSwitcherProps {
  readonly destinations: ReadonlyArray<SwitchableDestination>;
  /**
   * Contexto explícito de origen (recomendado en rutas legacy que no
   * codifican destino/categoría en la URL). Si se omite, se deriva del
   * pathname vía `resolveContextFromPath` (rutas territoriales).
   */
  readonly from?: SwitchFromRef;
  readonly className?: string;
  readonly triggerAriaLabel?: string;
  readonly disabled?: boolean;
}

function fromContextRefs(pathname: string): SwitchFromRef {
  const ctx = resolveContextFromPath(pathname);
  return {
    destination: ctx.destination?.slug ?? null,
    category: ctx.category?.slug ?? null,
    business: ctx.business?.slug ?? null,
    product: ctx.entity?.slug ?? null,
  };
}

function noticeFor(
  requested: string,
  kept: string,
  reason: string,
): string | null {
  if (requested === kept) return null;
  switch (reason) {
    case "product_not_in_destination":
      return "Ese producto no existe en el destino elegido. Te llevamos al nivel más cercano disponible.";
    case "business_not_in_destination":
      return "Esa empresa no opera en el destino elegido. Te mostramos su categoría equivalente.";
    case "category_not_in_destination":
      return "Aún no publicamos esa categoría en el destino elegido. Te mostramos su página de destino.";
    default:
      return "Ajustamos tu contexto al nivel más cercano disponible en el nuevo destino.";
  }
}

export function DestinationSwitcher({
  destinations,
  from,
  className,
  triggerAriaLabel = "Cambiar destino",
  disabled,
}: DestinationSwitcherProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const effectiveFrom = useMemo<SwitchFromRef>(
    () => from ?? fromContextRefs(pathname),
    [from, pathname],
  );

  const currentDestination = effectiveFrom.destination ?? "";
  const options = useMemo(() => destinations.slice(), [destinations]);

  async function handleChange(nextSlug: string) {
    if (!nextSlug || nextSlug === currentDestination || busy) return;
    setBusy(true);
    try {
      const result = await resolveDestinationSwitch({
        data: { to: nextSlug, from: effectiveFrom },
      });
      const notice = noticeFor(result.requested, result.kept, result.reason);
      if (notice) {
        toast(notice, { duration: 4200 });
      }
      await navigate({ to: result.path });
    } catch (err) {
      toast.error("No pudimos cambiar de destino. Intenta de nuevo.");
      // eslint-disable-next-line no-console
      console.error("[DestinationSwitcher] switch failed", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Select
      value={currentDestination || undefined}
      onValueChange={handleChange}
      disabled={disabled || busy || options.length === 0}
    >
      <SelectTrigger className={className} aria-label={triggerAriaLabel}>
        <SelectValue placeholder="Elige un destino" />
      </SelectTrigger>
      <SelectContent>
        {options.map((d) => (
          <SelectItem key={d.slug} value={d.slug}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
