import * as React from 'react'
import { SITE } from '@/config/site'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { VisibilityShell, bodyText, highlightBox, highlightLabel, highlightLine } from './_visibility-shared'

interface Props {
  recipientName?: string
  businessName?: string
  planName?: string
  reason?: string
  portalUrl?: string
}

const Email = ({
  recipientName,
  businessName = 'tu negocio',
  planName = 'el plan solicitado',
  reason,
  portalUrl = `${SITE.url}/portal/visibilidad`,
}: Props) => (
  <VisibilityShell
    preview={`No pudimos activar ${planName} para ${businessName}`}
    eyebrow="Solicitud no aprobada"
    heading="No pudimos activar tu plan"
    ctaLabel="Volver a solicitar"
    ctaUrl={portalUrl}
    accentColor="#a33b25"
  >
    <Text style={bodyText}>
      {recipientName ? `Hola ${recipientName}, ` : 'Hola, '}
      revisamos tu solicitud de <strong>{planName}</strong> para
      <strong> {businessName}</strong> y por ahora no pudimos activarla.
    </Text>
    {reason ? (
      <div style={highlightBox}>
        <Text style={highlightLabel}>Motivo</Text>
        <Text style={highlightLine}>{reason}</Text>
      </div>
    ) : null}
    <Text style={bodyText}>
      Puedes ajustar los datos o elegir otro plan desde el portal y volver a
      enviar la solicitud cuando estés listo.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: 'No pudimos activar tu plan de visibilidad',
  displayName: 'Visibilidad · Solicitud rechazada',
  previewData: {
    recipientName: 'Juan',
    businessName: 'Hotel Casa Colonial',
    planName: 'Destacado',
    reason: 'Necesitamos verificar la ficha de negocio antes de activar el plan.',
  },
} satisfies TemplateEntry