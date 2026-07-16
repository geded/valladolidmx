import * as React from 'react'
import { SITE } from '@/config/site'
import { Text } from '@react-email/components'
import { VisibilityShell } from './_visibility-shared'
import type { TemplateEntry } from './registry'

interface Props {
  travelerName?: string
  folio?: string
  destinationName?: string
  startDateLabel?: string
  planUrl?: string
}

const Email = ({
  travelerName,
  folio = 'VMX-XXXXXX',
  destinationName = 'el Oriente Maya',
  startDateLabel,
  planUrl = `${SITE.url}/cuenta/mi-viaje`,
}: Props) => (
  <VisibilityShell
    preview="Todo listo para tu llegada al Oriente Maya"
    eyebrow="Todo listo"
    heading={`${travelerName ? travelerName + ', ' : ''}en 3 días te esperamos`}
    ctaLabel="Revisar mi itinerario"
    ctaUrl={planUrl}
    footerNote={`Folio de confirmación: ${folio}`}
  >
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Tu viaje a <strong>{destinationName}</strong>
      {startDateLabel ? ` comienza el ${startDateLabel}` : ''}. Todo está confirmado
      y tu concierge ya coordinó los detalles con los anfitriones locales.
    </Text>
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 10px' }}>
      <strong>Antes de salir:</strong>
    </Text>
    <Text style={{ fontSize: 14, color: '#4a3a2e', lineHeight: 1.7, margin: '0 0 14px' }}>
      • Guarda el folio {folio} — es tu llave al Oriente Maya.<br />
      • Descarga tu itinerario para consultarlo sin conexión.<br />
      • Empaca ligero, ropa fresca y calzado cómodo para caminar el centro histórico.<br />
      • Alux te acompañará en tiempo real durante todo el viaje.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: 'En 3 días te esperamos en el Oriente Maya',
  displayName: 'Viaje · T-3 días',
  previewData: {
    travelerName: 'María',
    folio: 'VMX-A1B2C3',
    destinationName: 'Valladolid',
    startDateLabel: '15 de agosto',
  },
} satisfies TemplateEntry