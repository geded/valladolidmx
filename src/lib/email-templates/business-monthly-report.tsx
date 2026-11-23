import * as React from "react";
import { SITE } from "@/config/site";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { VisibilityShell, bodyText, highlightBox, highlightLabel, highlightLine } from "./_visibility-shared";

interface Props {
  recipientName?: string;
  businessName?: string;
  periodLabel?: string;
  lines?: string[];
  completenessPercent?: number | null;
  portalUrl?: string;
}

const Email = ({
  recipientName,
  businessName = "tu negocio",
  periodLabel = "el mes pasado",
  lines = [],
  completenessPercent = null,
  portalUrl = `${SITE.url}/portal`,
}: Props) => (
  <VisibilityShell
    preview={`${businessName} en Valladolid.mx durante ${periodLabel}`}
    eyebrow="Tu reporte del mes"
    heading={`Así le fue a ${businessName} en ${periodLabel}`}
    ctaLabel="Ver mi Portal"
    ctaUrl={portalUrl}
  >
    <Text style={bodyText}>
      {recipientName ? `Hola ${recipientName}, ` : "Hola, "}
      este es el resumen gratuito de tu ficha en Valladolid.mx.
    </Text>
    <div style={highlightBox}>
      <Text style={highlightLabel}>{periodLabel}</Text>
      {lines.map((line) => (
        <Text key={line} style={highlightLine}>
          {line}
        </Text>
      ))}
    </div>
    {typeof completenessPercent === "number" && completenessPercent < 100 ? (
      <Text style={bodyText}>
        Tu ficha para Alux va al <strong>{completenessPercent} %</strong>. Complétala y Alux te
        recomendará más seguido.
      </Text>
    ) : (
      <Text style={bodyText}>Tu ficha está completa: Alux tiene todo para recomendarte.</Text>
    )}
  </VisibilityShell>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Tu reporte de ${typeof data["periodLabel"] === "string" ? data["periodLabel"] : "este mes"} en Valladolid.mx`,
  displayName: "Empresas · Reporte mensual",
  previewData: {
    recipientName: "Ana",
    businessName: "Hotel Casa Colonial",
    periodLabel: "octubre de 2026",
    lines: [
      "Te vieron 340 personas",
      "Alux te recomendó 12 veces",
      "8 personas te escribieron o llamaron",
      "21 personas abrieron cómo llegar",
      "2 cotizaciones pedidas por el concierge",
    ],
    completenessPercent: 62,
  },
} satisfies TemplateEntry;
