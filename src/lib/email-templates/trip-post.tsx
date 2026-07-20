import * as React from 'react'
import { SITE } from '@/config/site'
import { Text } from '@react-email/components'
import { VisibilityShell } from './_visibility-shared'
import type { TemplateEntry } from './registry'

interface Props {
  travelerName?: string
  folio?: string
  destinationName?: string
  reviewUrl?: string
}

const Email = ({
  travelerName,
  folio = 'VMX-XXXXXX',
  destinationName = 'el Oriente Maya',
  reviewUrl = `${SITE.url}/cuenta/mi-viaje`,
}: Props) => (
  <VisibilityShell
    preview="Gracias por vivir el Oriente Maya con nosotros"
    eyebrow="Gracias por tu viaje"
    heading={`${travelerName ? travelerName + ', ' : ''}gracias por vivir el Oriente Maya`}
    ctaLabel="Compartir mi experiencia"
    ctaUrl={reviewUrl}
    footerNote={`Folio de tu viaje: ${folio}`}
  >
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Esperamos que tu paso por <strong>{destinationName}</strong> te haya dejado
      recuerdos que quieras contar. Cada viajero deja huella en nuestros
      anfitriones locales, y tu experiencia ayuda a que otros descubran este
      rincón de Yucatán.
    </Text>
    <Text style={{ fontSize: 15, color: '#4a3a2e', lineHeight: 1.6, margin: '0 0 14px' }}>
      Si te animas, comparte una reseña de los lugares que más te gustaron.
      Cuando regreses, Alux recordará tu viaje y te propondrá nuevas rutas.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: 'Gracias por vivir el Oriente Maya',
  displayName: 'Viaje · Post viaje (T+2)',
  previewData: {
    travelerName: 'María',
    folio: 'VMX-A1B2C3',
    destinationName: 'Valladolid',
  },
} satisfies TemplateEntry