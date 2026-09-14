import * as React from "react";
import { Text } from "@react-email/components";
import {
  VisibilityShell,
  bodyText,
  highlightBox,
  highlightLabel,
  highlightLine,
} from "./_visibility-shared";
import type { TemplateEntry } from "./registry";

interface ItemLine {
  title: string;
  detail?: string;
  amountLabel?: string;
}

interface Props {
  folio?: string;
  caseReference?: string;
  travelerName?: string;
  travelerEmail?: string;
  travelerPhone?: string;
  whatsappConsent?: boolean;
  destinationName?: string;
  datesLabel?: string;
  partySizeLabel?: string;
  totalLabel?: string;
  paymentMethodLabel?: string;
  paidAtLabel?: string;
  items?: ItemLine[];
  caseUrl?: string;
}

const Email = ({
  folio = "VMX-XXXXXX",
  caseReference,
  travelerName,
  travelerEmail,
  travelerPhone,
  whatsappConsent,
  destinationName,
  datesLabel,
  partySizeLabel,
  totalLabel,
  paymentMethodLabel = "Efectivo",
  paidAtLabel,
  items = [],
  caseUrl,
}: Props) => (
  <VisibilityShell
    preview={`Reservación pagada ${folio}`}
    eyebrow="Reservación pagada"
    heading={`Reservación ${folio} confirmada y pagada`}
    ctaLabel={caseUrl ? "Abrir el expediente" : undefined}
    ctaUrl={caseUrl}
    footerNote={caseReference ? `Referencia: ${caseReference}` : undefined}
  >
    <Text style={bodyText}>
      Se registró el pago de una reservación del Concierge. Estos son los datos completos para dar
      seguimiento operativo.
    </Text>

    <div style={highlightBox}>
      <Text style={highlightLabel}>Viajero</Text>
      {travelerName ? <Text style={highlightLine}>{travelerName}</Text> : null}
      {travelerEmail ? <Text style={highlightLine}>Email: {travelerEmail}</Text> : null}
      {travelerPhone ? (
        <Text style={highlightLine}>
          Móvil: {travelerPhone}
          {whatsappConsent ? " · autoriza WhatsApp" : ""}
        </Text>
      ) : null}
      {!travelerName && !travelerEmail && !travelerPhone ? (
        <Text style={highlightLine}>Sin datos de contacto registrados.</Text>
      ) : null}
    </div>

    <div style={highlightBox}>
      <Text style={highlightLabel}>Reservación</Text>
      <Text style={highlightLine}>Folio: {folio}</Text>
      {caseReference ? <Text style={highlightLine}>{caseReference}</Text> : null}
      {destinationName ? <Text style={highlightLine}>Destino: {destinationName}</Text> : null}
      {datesLabel ? <Text style={highlightLine}>Fechas: {datesLabel}</Text> : null}
      {partySizeLabel ? <Text style={highlightLine}>Viajeros: {partySizeLabel}</Text> : null}
      {totalLabel ? <Text style={highlightLine}>Total pagado: {totalLabel}</Text> : null}
      <Text style={highlightLine}>Forma de pago: {paymentMethodLabel}</Text>
      {paidAtLabel ? <Text style={highlightLine}>Registrado: {paidAtLabel}</Text> : null}
    </div>

    <div style={highlightBox}>
      <Text style={highlightLabel}>Qué incluye</Text>
      {items.length > 0 ? (
        items.map((item, i) => (
          <Text key={i} style={highlightLine}>
            · {item.title}
            {item.detail ? ` — ${item.detail}` : ""}
            {item.amountLabel ? ` · ${item.amountLabel}` : ""}
          </Text>
        ))
      ) : (
        <Text style={highlightLine}>Sin conceptos registrados en la reservación.</Text>
      )}
    </div>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Reservación pagada · ${data?.["folio"] ?? "Concierge"}${
      data?.["travelerName"] ? ` · ${data["travelerName"]}` : ""
    }`,
  displayName: "Administración · Reservación pagada",
  previewData: {
    folio: "VMX-A1B2C3",
    caseReference: "Expediente CCD06712",
    travelerName: "Kafir Hadded",
    travelerEmail: "viajero@example.com",
    travelerPhone: "+52 985 121 3412",
    whatsappConsent: true,
    destinationName: "Valladolid",
    datesLabel: "12 oct 2026 — 15 oct 2026",
    partySizeLabel: "2 personas",
    totalLabel: "$4,100.00 MXN",
    paymentMethodLabel: "Efectivo",
    paidAtLabel: "14 sep 2026, 00:12",
    items: [
      { title: "Tour a Ek Balam", detail: "1 × servicio", amountLabel: "$2,600.00 MXN" },
      { title: "Cena en el centro histórico", detail: "2 × personas", amountLabel: "$1,500.00 MXN" },
    ],
  },
} satisfies TemplateEntry;
