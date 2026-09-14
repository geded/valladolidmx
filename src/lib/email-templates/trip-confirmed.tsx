import * as React from "react";
import { SITE } from "@/config/site";
import { Text } from "@react-email/components";
import { VisibilityShell } from "./_visibility-shared";
import type { TemplateEntry } from "./registry";

interface Props {
  travelerName?: string;
  folio?: string;
  totalLabel?: string;
  destinationName?: string;
  itinerary?: string[];
  planUrl?: string;
}

const Email = ({
  travelerName,
  folio = "VMX-XXXXXX",
  totalLabel,
  destinationName = "el Oriente Maya",
  itinerary = [],
  planUrl = `${SITE.url}/cuenta/mi-viaje`,
}: Props) => (
  <VisibilityShell
    preview="Tu viaje quedó confirmado"
    eyebrow="Viaje confirmado"
    heading={
      travelerName ? `${travelerName}, tu viaje quedó confirmado` : "Tu viaje quedó confirmado"
    }
    ctaLabel="Ver mi itinerario"
    ctaUrl={planUrl}
    footerNote={`Folio de confirmación: ${folio}`}
  >
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      Ya reservamos tu experiencia en <strong>{destinationName}</strong>. Desde ahora puedes abrir
      tu itinerario cuando quieras: ahí encontrarás tus reservas, tus documentos, a tu concierge y a
      Alux acompañándote paso a paso.
    </Text>
    {itinerary.length > 0 ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.8, margin: "0 0 14px" }}>
        <strong>Tu itinerario</strong>
        <br />
        {itinerary.map((line, i) => (
          <React.Fragment key={i}>
            · {line}
            <br />
          </React.Fragment>
        ))}
      </Text>
    ) : null}
    {totalLabel ? (
      <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
        Total del viaje: <strong>{totalLabel}</strong>.
      </Text>
    ) : null}
    <Text style={{ fontSize: 15, color: "#4a3a2e", lineHeight: 1.6, margin: "0 0 14px" }}>
      Antes de tu llegada te escribiremos con los últimos detalles. Si necesitas ajustar algo,
      responde a tu concierge desde tu viaje.
    </Text>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: "Tu viaje quedó confirmado",
  displayName: "Viaje · Confirmación",
  previewData: {
    travelerName: "María",
    folio: "VMX-A1B2C3",
    totalLabel: "$4,100.00 MXN",
    destinationName: "Valladolid",
    itinerary: ["Tour a Ek Balam", "Cena en el centro histórico"],
  },
} satisfies TemplateEntry;
