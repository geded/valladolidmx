/* eslint-disable @typescript-eslint/no-explicit-any -- untyped template data payload, same shape as the other admin templates. */
/* eslint-disable react-refresh/only-export-components -- module co-exports the template entry with its component; affects only dev fast refresh. */
import * as React from "react";
import { Text } from "@react-email/components";
import { VisibilityShell, bodyText, highlightBox, highlightLabel, highlightLine } from "./_visibility-shared";
import type { TemplateEntry } from "./registry";

interface Props {
  kindLabel?: string;
  businessName?: string;
  requesterName?: string;
  requesterEmail?: string;
  similarLabel?: string;
  adminUrl?: string;
}

const Email = ({ kindLabel, businessName, requesterName, requesterEmail, similarLabel, adminUrl }: Props) => (
  <VisibilityShell
    preview={`${kindLabel ?? "Solicitud de empresa"}${businessName ? `: ${businessName}` : ""}`}
    eyebrow={kindLabel ?? "Solicitud de empresa"}
    heading="Una solicitud de anfitrión espera tu aprobación"
    ctaLabel={adminUrl ? "Revisar solicitud" : undefined}
    ctaUrl={adminUrl}
  >
    <Text style={bodyText}>
      Revisa que la empresa no exista ya con otro nombre antes de aprobar.
    </Text>
    <div style={highlightBox}>
      <Text style={highlightLabel}>Solicitud</Text>
      {businessName ? <Text style={highlightLine}>Empresa: {businessName}</Text> : null}
      {requesterName ? <Text style={highlightLine}>Solicitante: {requesterName}</Text> : null}
      {requesterEmail ? <Text style={highlightLine}>Email: {requesterEmail}</Text> : null}
      {similarLabel ? <Text style={highlightLine}>Posibles repetidas: {similarLabel}</Text> : null}
    </div>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `${data?.["kindLabel"] ?? "Solicitud de empresa"}${data?.["businessName"] ? ` · ${data["businessName"]}` : ""}`,
  displayName: "Administración · Solicitud de anfitrión",
  previewData: {
    kindLabel: "Alta de empresa nueva",
    businessName: "COPALLI",
    requesterName: "Ana Pérez",
    requesterEmail: "ana@example.com",
    similarLabel: "Copalli Café",
    adminUrl: "https://www.quehacerenvalladolid.com/admin/anfitriones",
  },
} satisfies TemplateEntry;
