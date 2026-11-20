import * as React from "react";
import { SITE } from "@/config/site";
import { Text } from "@react-email/components";
import { VisibilityShell } from "./_visibility-shared";
import type { TemplateEntry } from "./registry";

interface Props {
  travelerName?: string;
  caseReference?: string;
  totalLabel?: string;
  validUntilLabel?: string;
  proposalUrl?: string;
}

const Email = ({
  travelerName,
  caseReference = "Expediente",
  totalLabel,
  validUntilLabel,
  proposalUrl = `${SITE.url}/cuenta/mi-viaje`,
}: Props) => (
  <VisibilityShell
    preview="Tu Concierge ya preparó la propuesta de tu viaje"
    eyebrow="Propuesta lista"
    heading={`${travelerName ? travelerName + ", " : ""}tu propuesta de viaje ya está lista`}
    ctaLabel="Ver mi propuesta"
    ctaUrl={proposalUrl}
    footerNote={caseReference}
  >
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      Tu Concierge humano revisó lo que elegiste para tu viaje por el Oriente Maya y preparó una
      propuesta con los servicios y precios correspondientes.
    </Text>
    {totalLabel ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 8px" }}>
        Total de la propuesta: <strong>{totalLabel}</strong>
      </Text>
    ) : null}
    {validUntilLabel ? (
      <Text style={{ fontSize: 14, color: "#6b5a4c", lineHeight: 1.6, margin: "0 0 14px" }}>
        Vigente hasta {validUntilLabel}.
      </Text>
    ) : null}
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      Ábrela desde Mi Viaje para revisar cada servicio con calma. Si quieres ajustar algo, responde
      desde ahí y tu Concierge preparará una nueva versión.
    </Text>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: "Tu propuesta de viaje ya está lista",
  displayName: "Concierge · Propuesta enviada",
  previewData: {
    travelerName: "María",
    caseReference: "Expediente CCD06712",
    totalLabel: "$4,100.00 MXN",
    validUntilLabel: "20 de septiembre de 2026",
  },
} satisfies TemplateEntry;
