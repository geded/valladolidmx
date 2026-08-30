/**
 * ADDENDUM UX · RECLAMACIÓN DISCRETA (2026-08-29)
 *
 * Enlace secundario, y única superficie autorizada, para invitar al operador
 * real a administrar una ficha aprobada pero aún no reclamada.
 *
 * Reglas vinculantes:
 *  · Sólo se renderiza al final de la ficha de detalle (`detail_footer`).
 *  · Nunca en tarjetas, listados ni hero.
 *  · Nunca badge, alerta, cinta ni texto prominente de "ficha no reclamada".
 *  · Nunca compite visualmente con CTA turísticos o comerciales.
 *  · El estado interno de reclamación no degrada la credibilidad de la ficha.
 */

import { Link } from "@tanstack/react-router";

import {
  CLAIM_AFFORDANCE_SURFACE,
  resolveClaimAffordance,
  type ClaimAffordanceSurface,
  type DerivedClaimState,
} from "@/lib/provenance/provenance-contracts";
import { cn } from "@/lib/utils";

export type ClaimAffordanceLinkProps = {
  claimState: DerivedClaimState;
  /** Debe ser `detail_footer`; cualquier otra superficie no renderiza nada. */
  surface?: ClaimAffordanceSurface;
  /** Slug o identificador de la empresa, para prellenar la búsqueda del flujo. */
  businessSlug?: string;
  className?: string;
};

export function ClaimAffordanceLink({
  claimState,
  surface = CLAIM_AFFORDANCE_SURFACE,
  businessSlug,
  className,
}: ClaimAffordanceLinkProps) {
  const affordance = resolveClaimAffordance({ claimState, surface });
  if (!affordance.visible) return null;

  return (
    <p
      className={cn("mt-8 border-t border-border/60 pt-4 text-xs text-muted-foreground", className)}
    >
      {affordance.question}{" "}
      <Link
        to="/cuenta/anfitrion"
        search={businessSlug ? { claim: businessSlug } : undefined}
        className="underline underline-offset-4 transition-colors hover:text-foreground ring-focus"
      >
        {affordance.action}
      </Link>
    </p>
  );
}

export default ClaimAffordanceLink;
