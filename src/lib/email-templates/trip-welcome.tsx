import * as React from 'react'
import { SITE } from '@/config/site'
import { Text } from '@react-email/components'
import { VisibilityShell } from './_visibility-shared'
import type { TemplateEntry } from './registry'

interface Props {
  travelerName?: string
  folio?: string
  destinationName?: string
  planUrl?: string
}

const Email = ({
  travelerName,
  folio = 'VMX-XXXXXX',
  destinationName = 'el Oriente Maya',
  planUrl = `${SITE.url}/cuenta/mi-viaje`,
}: Props) => (
  <VisibilityShell
    preview="Bienvenido al Oriente Maya de Yucatán"
    eyebrow="Bienvenido"
    heading={travelerName ? `¡Bienvenido, ${travelerName}!` : '¡Bienvenido!'}
    ctaLabel="Abrir mi viaje"
    ctaUrl={planUrl}
    footerNote={`Folio de confirmación: ${folio}`}
  >
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Hoy comienza tu viaje por <strong>{destinationName}</strong>. Respira
      profundo: el Oriente Maya te recibe con calidez colonial, historia viva y
      la hospitalidad de sus anfitriones.
    </Text>
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Tu concierge y Alux están contigo durante toda la jornada. Escríbeles cuando
      necesites una recomendación, cambiar un plan o descubrir algo nuevo.
    </Text>
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Que este viaje se quede contigo para siempre.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: 'Bienvenido al Oriente Maya de Yucatán',
  displayName: 'Viaje · Bienvenida',
  previewData: {
    travelerName: 'María',
    folio: 'VMX-A1B2C3',
    destinationName: 'Valladolid',
  },
} satisfies TemplateEntry