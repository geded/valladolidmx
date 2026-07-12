import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { VisibilityShell, bodyText } from './_visibility-shared'

interface Props {
  recipientName?: string
  businessName?: string
  planName?: string
  portalUrl?: string
}

const Email = ({
  recipientName,
  businessName = 'tu negocio',
  planName = 'tu plan de visibilidad',
  portalUrl = 'https://valladolid.mx/portal/visibilidad',
}: Props) => (
  <VisibilityShell
    preview={`${planName} de ${businessName} venció`}
    eyebrow="Plan vencido"
    heading="Tu plan de visibilidad venció"
    ctaLabel="Reactivar visibilidad"
    ctaUrl={portalUrl}
    accentColor="#a33b25"
  >
    <Text style={bodyText}>
      {recipientName ? `Hola ${recipientName}, ` : 'Hola, '}
      <strong>{planName}</strong> de <strong>{businessName}</strong> venció.
      Tu negocio sigue publicado, pero ya no aparece con boost en el ranking
      ni en las recomendaciones destacadas de Alux.
    </Text>
    <Text style={bodyText}>
      Reactiva tu plan cuando quieras y recupera tu posición en minutos.
    </Text>
  </VisibilityShell>
)

export const template = {
  component: Email,
  subject: 'Tu plan de visibilidad venció',
  displayName: 'Visibilidad · Vencido',
  previewData: {
    recipientName: 'Juan',
    businessName: 'Hotel Casa Colonial',
    planName: 'Destacado',
  },
} satisfies TemplateEntry