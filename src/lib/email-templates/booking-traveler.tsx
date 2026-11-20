/**
 * Paso 10 · Correos al viajero de una reservación en línea (folio ERL).
 * Cuatro momentos: registrada, pagada, cancelada y reembolsada.
 * Reutiliza el armazón y los estilos de correo ya aprobados; no introduce
 * un lenguaje visual nuevo.
 */
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
  title?: string;
  quantityLabel?: string;
  amountLabel?: string;
}

export interface BookingEmailProps {
  folio?: string;
  travelerName?: string;
  destinationName?: string;
  departureLabel?: string;
  seatsLabel?: string;
  totalLabel?: string;
  paidAtLabel?: string;
  refundLabel?: string;
  reasonLabel?: string;
  items?: ItemLine[];
  tripUrl?: string;
}

function Details({
  folio,
  destinationName,
  departureLabel,
  seatsLabel,
  totalLabel,
  items = [],
}: BookingEmailProps) {
  return (
    <>
      <div style={highlightBox}>
        <Text style={highlightLabel}>Tu reservación</Text>
        <Text style={highlightLine}>Folio: {folio}</Text>
        {destinationName ? <Text style={highlightLine}>Destino: {destinationName}</Text> : null}
        {departureLabel ? <Text style={highlightLine}>Fecha y hora: {departureLabel}</Text> : null}
        {seatsLabel ? <Text style={highlightLine}>Lugares: {seatsLabel}</Text> : null}
        {totalLabel ? <Text style={highlightLine}>Total: {totalLabel}</Text> : null}
      </div>
      {items.length > 0 ? (
        <div style={highlightBox}>
          <Text style={highlightLabel}>Qué incluye</Text>
          {items.map((item, i) => (
            <Text key={i} style={highlightLine}>
              · {item.title}
              {item.quantityLabel ? ` — ${item.quantityLabel}` : ""}
              {item.amountLabel ? ` · ${item.amountLabel}` : ""}
            </Text>
          ))}
        </div>
      ) : null}
    </>
  );
}

const Created = (props: BookingEmailProps) => (
  <VisibilityShell
    preview={`Reservación registrada ${props.folio ?? ""}`}
    eyebrow="Reservación registrada"
    heading={`Guardamos tu lugar · ${props.folio ?? ""}`}
    ctaLabel={props.tripUrl ? "Ver mi viaje" : undefined}
    ctaUrl={props.tripUrl}
  >
    <Text style={bodyText}>
      {props.travelerName ? `${props.travelerName}, ` : ""}tu reservación quedó registrada y tus
      lugares están apartados. El pago se realiza en efectivo al confirmar con nuestro equipo; en
      cuanto lo registremos te enviamos la confirmación.
    </Text>
    <Details {...props} />
  </VisibilityShell>
);

const Paid = (props: BookingEmailProps) => (
  <VisibilityShell
    preview={`Reservación confirmada ${props.folio ?? ""}`}
    eyebrow="Reservación confirmada"
    heading={`¡Todo listo! · ${props.folio ?? ""}`}
    ctaLabel={props.tripUrl ? "Ver mi viaje" : undefined}
    ctaUrl={props.tripUrl}
    footerNote={props.paidAtLabel ? `Pago registrado: ${props.paidAtLabel}` : undefined}
  >
    <Text style={bodyText}>
      {props.travelerName ? `${props.travelerName}, ` : ""}recibimos tu pago y tu lugar quedó
      confirmado. Presenta este folio el día de tu experiencia.
    </Text>
    <Details {...props} />
  </VisibilityShell>
);

const Cancelled = (props: BookingEmailProps) => (
  <VisibilityShell
    preview={`Reservación cancelada ${props.folio ?? ""}`}
    eyebrow="Reservación cancelada"
    heading={`Cancelamos tu reservación · ${props.folio ?? ""}`}
    ctaLabel={props.tripUrl ? "Explorar otra fecha" : undefined}
    ctaUrl={props.tripUrl}
    footerNote={props.reasonLabel ? `Motivo: ${props.reasonLabel}` : undefined}
  >
    <Text style={bodyText}>
      {props.travelerName ? `${props.travelerName}, ` : ""}tu reservación fue cancelada y los
      lugares regresaron a disponibilidad. Si fue un error, escríbenos y la retomamos.
    </Text>
    <Details {...props} />
  </VisibilityShell>
);

const Refunded = (props: BookingEmailProps) => (
  <VisibilityShell
    preview={`Reembolso registrado ${props.folio ?? ""}`}
    eyebrow="Reembolso registrado"
    heading={`Registramos tu reembolso · ${props.folio ?? ""}`}
    ctaLabel={props.tripUrl ? "Ver mi viaje" : undefined}
    ctaUrl={props.tripUrl}
    footerNote={props.reasonLabel ? `Motivo: ${props.reasonLabel}` : undefined}
  >
    <Text style={bodyText}>
      {props.travelerName ? `${props.travelerName}, ` : ""}registramos el reembolso de tu
      reservación
      {props.refundLabel ? ` por ${props.refundLabel}` : ""}. Nuestro equipo te confirma la entrega
      del importe por el mismo medio en que pagaste.
    </Text>
    <Details {...props} />
  </VisibilityShell>
);

const previewData: BookingEmailProps = {
  folio: "ERL-260915-001",
  travelerName: "Kafir",
  destinationName: "Valladolid",
  departureLabel: "15 sep 2026, 09:00",
  seatsLabel: "2 personas",
  totalLabel: "$2,600.00 MXN",
  paidAtLabel: "14 sep 2026, 18:20",
  refundLabel: "$2,600.00 MXN",
  reasonLabel: "Cambio de fechas del viajero",
  items: [{ title: "Tour a Ek Balam", quantityLabel: "2 × persona", amountLabel: "$2,600.00 MXN" }],
};

export const bookingCreatedTemplate = {
  component: Created,
  subject: (data: Record<string, any>) =>
    `Reservación registrada · ${data?.["folio"] ?? "Valladolid.mx"}`,
  displayName: "Viajero · Reservación registrada",
  previewData,
} satisfies TemplateEntry;

export const bookingPaidTemplate = {
  component: Paid,
  subject: (data: Record<string, any>) =>
    `Reservación confirmada · ${data?.["folio"] ?? "Valladolid.mx"}`,
  displayName: "Viajero · Reservación confirmada",
  previewData,
} satisfies TemplateEntry;

export const bookingCancelledTemplate = {
  component: Cancelled,
  subject: (data: Record<string, any>) =>
    `Reservación cancelada · ${data?.["folio"] ?? "Valladolid.mx"}`,
  displayName: "Viajero · Reservación cancelada",
  previewData,
} satisfies TemplateEntry;

export const bookingRefundedTemplate = {
  component: Refunded,
  subject: (data: Record<string, any>) =>
    `Reembolso registrado · ${data?.["folio"] ?? "Valladolid.mx"}`,
  displayName: "Viajero · Reembolso registrado",
  previewData,
} satisfies TemplateEntry;
