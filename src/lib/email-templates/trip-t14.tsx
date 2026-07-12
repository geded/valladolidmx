import * as React from 'react'
import { Text } from '@react-email/components'
import { VisibilityShell } from './_visibility-shared'
import type { TemplateEntry } from './registry'

interface Props {
  travelerName?: string
  folio?: string
  destinationName?: string
  startDateLabel?: string
  partySize?: number | null
  daysToTrip?: number
  planUrl?: string
}

const Email = ({
  travelerName,
  folio = 'VMX-XXXXXX',
  destinationName = 'el Oriente Maya',
  startDateLabel,
  partySize,
  daysToTrip = 14,
  planUrl = 'https://valladolid.mx/cuenta/mi-viaje',
}: Props) => (
  <VisibilityShell
    preview={`Faltan ${daysToTrip} días para tu llegada al Oriente Maya`}
    eyebrow="Preparando tu llegada"
    heading={`${travelerName ? travelerName + ', ' : ''}faltan ${daysToTrip} días para tu viaje`}
    ctaLabel="Ver mi viaje"
    ctaUrl={planUrl}
    footerNote={`Folio de confirmación: ${folio}`}
  >
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Tu viaje a <strong>{destinationName}</strong>
      {startDateLabel ? ` comienza el ${startDateLabel}` : ''}
      {partySize ? ` para ${partySize} ${partySize === 1 ? 'viajero' : 'viajeros'}` : ''}.
    </Text>
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      En los próximos días tu concierge y Alux te compartirán recomendaciones para
      cada etapa: reservaciones en restaurantes locales, experiencias culturales y
      consejos para vivir el Oriente Maya con calma.
    </Text>
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Si necesitas ajustar algo, responde este correo o escríbenos desde tu viaje.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Faltan ${d.daysToTrip ?? 14} días para tu viaje al Oriente Maya`,
  displayName: 'Viaje · T-14 días',
  previewData: {
    travelerName: 'María',
    folio: 'VMX-A1B2C3',
    destinationName: 'Valladolid',
    startDateLabel: '15 de agosto',
    partySize: 2,
    daysToTrip: 14,
  },
} satisfies TemplateEntry