/**
 * Recordatorio de pago de una propuesta ya aceptada por el viajero.
 * Tres tonos según la insistencia: primer aviso (1 h), recordatorio (24 h)
 * y último aviso (72 h). Nunca promocional: sólo cierre de la reservación.
 */
import * as React from "react";
import { SITE } from "@/config/site";
import { Text } from "@react-email/components";
import { VisibilityShell } from "./_visibility-shared";
import type { TemplateEntry } from "./registry";

type Stage = "r1" | "r2" | "r3";

interface Props {
  stage?: Stage;
  travelerName?: string;
  caseReference?: string;
  totalLabel?: string;
  datesLabel?: string;
  validUntilLabel?: string;
  checkoutUrl?: string;
}

const HEADINGS: Record<Stage, string> = {
  r1: "sólo falta confirmar el pago de tu viaje",
  r2: "tu viaje sigue esperando el pago",
  r3: "último aviso para asegurar tus fechas",
};

const EYEBROW: Record<Stage, string> = {
  r1: "Falta un paso",
  r2: "Recordatorio",
  r3: "Último aviso",
};

const LEAD: Record<Stage, string> = {
  r1: "Ya aceptaste la propuesta que preparó tu Concierge. Para apartar tus fechas y confirmar cada servicio con los proveedores, sólo falta registrar el pago.",
  r2: "Tu propuesta sigue aceptada pero aún sin pago, así que todavía no podemos apartar tus fechas con los proveedores.",
  r3: "Este es el último recordatorio: mientras el pago no quede registrado, no podemos garantizar la disponibilidad de tus fechas ni los precios cotizados.",
};

const Email = ({
  stage = "r1",
  travelerName,
  caseReference = "Expediente",
  totalLabel,
  datesLabel,
  validUntilLabel,
  checkoutUrl = `${SITE.url}/cuenta/mi-viaje`,
}: Props) => (
  <VisibilityShell
    preview="Falta confirmar el pago para cerrar las fechas de tu viaje"
    eyebrow={EYEBROW[stage]}
    heading={`${travelerName ? travelerName + ", " : ""}${HEADINGS[stage]}`}
    ctaLabel="Confirmar mi pago"
    ctaUrl={checkoutUrl}
    footerNote={caseReference}
  >
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      {LEAD[stage]}
    </Text>
    {datesLabel ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 8px" }}>
        Fechas de tu viaje: <strong>{datesLabel}</strong>
      </Text>
    ) : null}
    {totalLabel ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 8px" }}>
        Total de tu propuesta: <strong>{totalLabel}</strong>
      </Text>
    ) : null}
    {validUntilLabel ? (
      <Text style={{ fontSize: 14, color: "#6b5a4c", lineHeight: 1.6, margin: "0 0 14px" }}>
        Vigente hasta {validUntilLabel}.
      </Text>
    ) : null}
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      Si ya realizaste el pago o prefieres pagar en efectivo con tu Concierge, ignora este mensaje:
      él lo registra por ti y tu itinerario se abre de inmediato.
    </Text>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.["stage"] === "r3"
      ? "Último aviso: confirma el pago para asegurar tus fechas"
      : data?.["stage"] === "r2"
        ? "Tu viaje sigue esperando el pago"
        : "Sólo falta confirmar el pago de tu viaje",
  displayName: "Concierge · Recordatorio de pago",
  previewData: {
    stage: "r1",
    travelerName: "María",
    caseReference: "Expediente CCD06712",
    totalLabel: "$4,100.00 MXN",
    datesLabel: "27 sep – 3 oct 2026",
    validUntilLabel: "20 de septiembre de 2026",
  },
} satisfies TemplateEntry;
