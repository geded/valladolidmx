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

interface TaxiRideEmailProps {
  recipientName?: string;
  folio?: string;
  statusLabel?: string;
  origin?: string;
  destination?: string;
  requestedForLabel?: string;
  fareLabel?: string;
  driverName?: string;
  vehicle?: string;
  forDriver?: boolean;
  rideUrl?: string;
}

const TaxiRideStatusEmail = (props: TaxiRideEmailProps) => (
  <VisibilityShell
    preview={`Taxi Alux · ${props.statusLabel ?? "actualización"} · ${props.folio ?? ""}`}
    eyebrow="Taxi Alux"
    heading={`${props.statusLabel ?? "Actualización de tu viaje"} · ${props.folio ?? ""}`}
    ctaLabel={props.forDriver ? "Abrir mi panel de taxista" : "Ver mi taxi"}
    ctaUrl={props.rideUrl}
    footerNote="Pago en efectivo directamente al conductor. Instala la aplicación para seguimiento y alertas en tu celular."
  >
    <Text style={bodyText}>
      Hola {props.recipientName ?? "viajero"}. {props.forDriver
        ? "Hay una actualización en un viaje asignado a ti."
        : "Tu solicitud de Taxi Alux tiene una actualización."}
    </Text>
    <div style={highlightBox}>
      <Text style={highlightLabel}>Detalle del viaje</Text>
      <Text style={highlightLine}>Folio: {props.folio}</Text>
      <Text style={highlightLine}>Origen: {props.origin}</Text>
      <Text style={highlightLine}>Destino: {props.destination}</Text>
      <Text style={highlightLine}>Salida: {props.requestedForLabel}</Text>
      <Text style={highlightLine}>Efectivo al conductor: {props.fareLabel}</Text>
      {props.driverName ? <Text style={highlightLine}>Conductor: {props.driverName}</Text> : null}
      {props.vehicle ? <Text style={highlightLine}>Vehículo: {props.vehicle}</Text> : null}
    </div>
  </VisibilityShell>
);

export const template = {
  component: TaxiRideStatusEmail,
  subject: (data: Record<string, any>) =>
    `Taxi Alux · ${data?.["statusLabel"] ?? "Actualización"} · ${data?.["folio"] ?? ""}`,
  displayName: "Taxi Alux · Estado del viaje",
  previewData: {
    recipientName: "Armando",
    folio: "TAXI-A1B2C3D4",
    statusLabel: "Taxi asignado",
    origin: "Centro de Valladolid",
    destination: "Zazil Tunich",
    requestedForLabel: "25 nov 2026, 18:30",
    fareLabel: "$180 MXN",
    driverName: "Carlos Pérez",
    vehicle: "Nissan Versa blanco · YUC-123-A",
    rideUrl: "https://www.quehacerenvalladolid.com/cuenta/taxi",
  },
} satisfies TemplateEntry;
