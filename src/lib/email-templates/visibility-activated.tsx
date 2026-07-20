import * as React from 'react'
import { SITE } from '@/config/site'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  VisibilityShell,
  bodyText,
  formatDate,
  highlightBox,
  highlightLabel,
  highlightLine,
} from './_visibility-shared'

interface Props {
  recipientName?: string
  businessName?: string
  planName?: string
  expiresAt?: string
  portalUrl?: string
}

const Email = ({
  recipientName,
  businessName = 'tu negocio',
  planName = 'tu plan de visibilidad',
  expiresAt,
  portalUrl = `${SITE.url}/portal/visibilidad`,
}: Props) => {
  const expiryLabel = formatDate(expiresAt)
  return (
    <VisibilityShell
      preview={`${planName} activo para ${businessName}`}
      eyebrow="Plan activo"
      heading={`${planName} está activo`}
      ctaLabel="Ver mi plan"
      ctaUrl={portalUrl}
    >
      <Text style={bodyText}>
        {recipientName ? `Hola ${recipientName}, ` : 'Hola, '}
        activamos <strong>{planName}</strong> para <strong>{businessName}</strong>.
        Desde ahora tu negocio aparece con mayor prioridad en Valladolid.mx y en
        las recomendaciones de Alux.
      </Text>
      {expiryLabel ? (
        <div style={highlightBox}>
          <Text style={highlightLabel}>Vence el</Text>
          <Text style={highlightLine}>{expiryLabel}</Text>
        </div>
      ) : null}
      <Text style={bodyText}>
        Aprovecha para subir fotos nuevas, publicar promociones y mantener tu
        ficha actualizada. Los primeros días son los de mayor tráfico.
      </Text>
    </VisibilityShell>
  )
}

export const template = {
  component: Email,
  subject: 'Tu plan de visibilidad está activo',
  displayName: 'Visibilidad · Plan activado',
  previewData: {
    recipientName: 'Juan',
    businessName: 'Hotel Casa Colonial',
    planName: 'Destacado',
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
} satisfies TemplateEntry