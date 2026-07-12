import * as React from 'react'
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
  daysLeft?: number
  portalUrl?: string
}

const Email = ({
  recipientName,
  businessName = 'tu negocio',
  planName = 'tu plan de visibilidad',
  expiresAt,
  daysLeft = 7,
  portalUrl = 'https://valladolid.mx/portal/visibilidad',
}: Props) => {
  const expiryLabel = formatDate(expiresAt)
  const urgency = daysLeft <= 1 ? 'mañana' : `en ${daysLeft} días`
  return (
    <VisibilityShell
      preview={`${planName} de ${businessName} vence ${urgency}`}
      eyebrow={daysLeft <= 1 ? 'Vence mañana' : `Vence en ${daysLeft} días`}
      heading={`Tu plan vence ${urgency}`}
      ctaLabel="Renovar visibilidad"
      ctaUrl={portalUrl}
      accentColor={daysLeft <= 1 ? '#a33b25' : '#c86a12'}
    >
      <Text style={bodyText}>
        {recipientName ? `Hola ${recipientName}, ` : 'Hola, '}
        <strong>{planName}</strong> de <strong>{businessName}</strong> vence {urgency}.
        Al vencer, tu negocio vuelve al ranking gratuito y pierde el boost en
        Alux y en los listados destacados.
      </Text>
      {expiryLabel ? (
        <div style={highlightBox}>
          <Text style={highlightLabel}>Fecha de vencimiento</Text>
          <Text style={highlightLine}>{expiryLabel}</Text>
        </div>
      ) : null}
      <Text style={bodyText}>
        Renueva desde el portal en un par de clics para no perder tu posición.
      </Text>
    </VisibilityShell>
  )
}

export const template = {
  component: Email,
  subject: 'Tu plan de visibilidad está por vencer',
  displayName: 'Visibilidad · Por vencer',
  previewData: {
    recipientName: 'Juan',
    businessName: 'Hotel Casa Colonial',
    planName: 'Destacado',
    daysLeft: 7,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
} satisfies TemplateEntry