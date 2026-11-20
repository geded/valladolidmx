/* eslint-disable @typescript-eslint/no-explicit-any -- untyped template data payload, same shape as the other admin templates. */
/* eslint-disable react-refresh/only-export-components -- module co-exports the template entry with its component; affects only dev fast refresh. */
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

interface Props {
  travelerName?: string;
  travelerEmail?: string;
  travelerPhone?: string;
  whatsappConsent?: boolean;
  signupMethodLabel?: string;
  registeredAtLabel?: string;
  savedItemsLabel?: string;
  adminUrl?: string;
}

const Email = ({
  travelerName,
  travelerEmail,
  travelerPhone,
  whatsappConsent,
  signupMethodLabel,
  registeredAtLabel,
  savedItemsLabel,
  adminUrl,
}: Props) => (
  <VisibilityShell
    preview={`Nuevo viajero registrado${travelerName ? `: ${travelerName}` : ""}`}
    eyebrow="Nuevo viajero"
    heading="Un viajero acaba de registrarse"
    ctaLabel={adminUrl ? "Ver turistas" : undefined}
    ctaUrl={adminUrl}
  >
    <Text style={bodyText}>
      Una persona creó su cuenta en Valladolid.mx. Es buen momento para que un concierge le dé la
      bienvenida y le ayude a armar su viaje.
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
      {signupMethodLabel ? (
        <Text style={highlightLine}>Se registró con: {signupMethodLabel}</Text>
      ) : null}
      {registeredAtLabel ? <Text style={highlightLine}>Fecha: {registeredAtLabel}</Text> : null}
      {savedItemsLabel ? <Text style={highlightLine}>Mi Viaje: {savedItemsLabel}</Text> : null}
    </div>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nuevo viajero registrado${data?.["travelerName"] ? ` · ${data["travelerName"]}` : ""}`,
  displayName: "Administración · Nuevo viajero registrado",
  previewData: {
    travelerName: "Karif Geded",
    travelerEmail: "viajera@example.com",
    travelerPhone: "+52 985 121 3412",
    whatsappConsent: true,
    signupMethodLabel: "Google",
    registeredAtLabel: "20 de noviembre de 2026, 16:20",
    savedItemsLabel: "3 lugares guardados",
    adminUrl: "https://www.quehacerenvalladolid.com/admin/turistas",
  },
} satisfies TemplateEntry;
