import * as React from "react";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { VisibilityShell, bodyText } from "./_visibility-shared";

/**
 * Aviso del Centro de Notificaciones (UNC) por correo.
 *
 * Plantilla genérica y sin PII estructural: recibe el título ya traducido a
 * lenguaje claro por `uncEventTitle`, un detalle opcional y el enlace de la
 * plataforma donde se resuelve el pendiente.
 */
interface Props {
  title?: string;
  detail?: string;
  actionLabel?: string;
  actionUrl?: string;
}

const Email = ({
  title = "Aviso de la plataforma",
  detail = "Tienes un pendiente por revisar en Valladolid.mx.",
  actionLabel = "Abrir en la plataforma",
  actionUrl,
}: Props) => (
  <VisibilityShell
    preview={title}
    eyebrow="Aviso"
    heading={title}
    ctaLabel={actionUrl ? actionLabel : undefined}
    ctaUrl={actionUrl}
  >
    <Text style={bodyText}>{detail}</Text>
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    typeof data?.["title"] === "string" && data["title"]
      ? (data["title"] as string)
      : "Aviso de la plataforma",
  displayName: "Avisos · Centro de Notificaciones",
  previewData: {
    title: "Imagen enviada a aprobación",
    detail: "Una imagen espera tu revisión en el CMS.",
    actionUrl: "https://valladolid.mx/cms/media",
  },
} satisfies TemplateEntry;
