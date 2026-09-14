/**
 * Aviso interno: la propuesta lleva 72 h aceptada sin pago registrado.
 * Va al Concierge asignado y a administración para seguimiento personal.
 */
import * as React from "react";
import { SITE } from "@/config/site";
import { Text } from "@react-email/components";
import { VisibilityShell } from "./_visibility-shared";
import type { TemplateEntry } from "./registry";

interface Props {
  caseReference?: string;
  caseSummary?: string;
  travelerName?: string;
  travelerEmail?: string;
  travelerPhone?: string;
  whatsappConsent?: boolean;
  totalLabel?: string;
  datesLabel?: string;
  acceptedAtLabel?: string;
  caseUrl?: string;
}

const Email = ({
  caseReference = "Expediente",
  caseSummary,
  travelerName,
  travelerEmail,
  travelerPhone,
  whatsappConsent,
  totalLabel,
  datesLabel,
  acceptedAtLabel,
  caseUrl = `${SITE.url}/concierge`,
}: Props) => (
  <VisibilityShell
    preview="Propuesta aceptada sin pago después de 72 horas"
    eyebrow="Seguimiento requerido"
    heading="Una propuesta aceptada lleva 72 horas sin pago"
    ctaLabel="Abrir expediente"
    ctaUrl={caseUrl}
    footerNote={caseReference}
  >
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      El viajero aceptó la propuesta pero no ha registrado el pago. Conviene contactarlo
      personalmente antes de perder disponibilidad.
    </Text>
    {caseSummary ? (
      <Text style={{ fontSize: 14, color: "#6b5a4c", lineHeight: 1.6, margin: "0 0 14px" }}>
        {caseSummary}
      </Text>
    ) : null}
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 6px" }}>
      <strong>Viajero:</strong> {travelerName || "Sin nombre registrado"}
    </Text>
    {travelerEmail ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 6px" }}>
        <strong>Correo:</strong> {travelerEmail}
      </Text>
    ) : null}
    {travelerPhone ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 6px" }}>
        <strong>Teléfono:</strong> {travelerPhone}
        {whatsappConsent ? " · autorizó contacto por WhatsApp" : " · sin autorización de WhatsApp"}
      </Text>
    ) : null}
    {datesLabel ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 6px" }}>
        <strong>Fechas:</strong> {datesLabel}
      </Text>
    ) : null}
    {totalLabel ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 6px" }}>
        <strong>Total propuesto:</strong> {totalLabel}
      </Text>
    ) : null}
    {acceptedAtLabel ? (
      <Text style={{ fontSize: 14, color: "#6b5a4c", lineHeight: 1.6, margin: "0 0 14px" }}>
        Aceptada el {acceptedAtLabel}.
      </Text>
    ) : null}
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: "Propuesta aceptada sin pago · seguimiento requerido",
  displayName: "Concierge · Propuesta aceptada sin pago",
  previewData: {
    caseReference: "Expediente CCD06712",
    caseSummary: "quiero gastar mucho dinero en comida",
    travelerName: "María López",
    travelerEmail: "maria@example.com",
    travelerPhone: "+52 985 000 0000",
    whatsappConsent: true,
    totalLabel: "$4,100.00 MXN",
    datesLabel: "27 sep – 3 oct 2026",
    acceptedAtLabel: "14 de septiembre de 2026",
  },
} satisfies TemplateEntry;
