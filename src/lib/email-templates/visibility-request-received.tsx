import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { VisibilityShell, bodyText, highlightBox, highlightLabel, highlightLine } from './_visibility-shared'

interface Props {
  recipientName?: string
  businessName?: string
  planName?: string
  cycleLabel?: string
  portalUrl?: string
}

const Email = ({
  recipientName,
  businessName = 'tu negocio',
  planName = 'un plan de visibilidad',
  cycleLabel,
  portalUrl = 'https://valladolid.mx/portal/visibilidad',
}: Props) => (
  <VisibilityShell
    preview={`Recibimos tu solicitud de ${planName} para ${businessName}`}
    eyebrow="Solicitud recibida"
    heading="Estamos revisando tu solicitud"
    ctaLabel="Ver estado de la solicitud"
    ctaUrl={portalUrl}
  >
    <Text style={bodyText}>
      {recipientName ? `Hola ${recipientName}, ` : 'Hola, '}
      recibimos tu solicitud de visibilidad para <strong>{businessName}</strong>.
      Nuestro equipo la revisará y la activará en las próximas 24–48 horas hábiles.
    </Text>
    <div style={highlightBox}>
      <Text style={highlightLabel}>Plan solicitado</Text>
      <Text style={highlightLine}>{planName}{cycleLabel ? ` · ${cycleLabel}` : ''}</Text>
    </div>
    <Text style={bodyText}>
      Te enviaremos otro correo en cuanto tu plan esté activo. Mientras tanto,
      puedes seguir editando tu ficha, fotos y promociones desde el portal.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: 'Recibimos tu solicitud de visibilidad',
  displayName: 'Visibilidad · Solicitud recibida',
  previewData: {
    recipientName: 'Juan',
    businessName: 'Hotel Casa Colonial',
    planName: 'Destacado',
    cycleLabel: 'Mensual',
  },
} satisfies TemplateEntry