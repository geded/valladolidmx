import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  travelerName?: string
  title?: string
  code?: string
  discountPercent?: number | null
  businessName?: string | null
  redeemedAt?: string
  reviewUrl?: string
}

const CouponRedeemedEmail = ({
  travelerName,
  title = 'Tu cupón Valladolid.mx',
  code = 'VMX-XXXX-XXXX',
  discountPercent,
  businessName,
  redeemedAt,
  reviewUrl = 'https://valladolid.mx',
}: Props) => {
  const dateLabel = redeemedAt
    ? new Date(redeemedAt).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Cupón canjeado{businessName ? ` en ${businessName}` : ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brandMark}>Valladolid.mx</Heading>
          <Heading style={h1}>¡Disfrutaste tu beneficio!</Heading>
          <Text style={text}>
            {travelerName ? `Hola ${travelerName}, ` : 'Hola, '}
            confirmamos que tu cupón se aplicó correctamente
            {businessName ? ` en ${businessName}` : ''}.
          </Text>
          <Section style={box}>
            <Text style={boxTitle}>{title}</Text>
            {businessName ? <Text style={boxSub}>en {businessName}</Text> : null}
            {discountPercent ? (
              <Text style={boxDiscount}>
                -{Math.round(Number(discountPercent))}%
              </Text>
            ) : null}
            <Text style={boxCode}>{code}</Text>
            {dateLabel ? <Text style={boxDate}>Canjeado: {dateLabel}</Text> : null}
          </Section>
          <Heading style={h2}>¿Cómo estuvo tu experiencia?</Heading>
          <Text style={text}>
            Tu opinión ayuda a otros viajeros y al negocio a mejorar. Toma sólo
            un minuto.
          </Text>
          <Button style={button} href={reviewUrl}>
            Dejar una reseña
          </Button>
          <Text style={footer}>
            Sigue descubriendo el Oriente Maya de Yucatán en Valladolid.mx.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CouponRedeemedEmail,
  subject: (data: Record<string, unknown>) =>
    `Cupón canjeado${data?.businessName ? ` en ${data.businessName}` : ''} · Valladolid.mx`,
  displayName: 'Cupón canjeado',
  previewData: {
    travelerName: 'Ana',
    title: '2x1 en Cochinita Pibil',
    code: 'VMX-AB12-CD34',
    discountPercent: 20,
    businessName: 'Restaurante Maya',
    redeemedAt: new Date().toISOString(),
    reviewUrl: 'https://valladolid.mx/negocios/restaurante-maya?review=1',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif',
  color: '#2a1e17',
}
const container = {
  padding: '32px 28px',
  maxWidth: '520px',
  margin: '0 auto',
  backgroundColor: '#fdf9f2',
  borderRadius: '18px',
  border: '1px solid #ecdcc0',
}
const brandMark = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
  color: '#a4530b',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#2a1e17',
  margin: '0 0 16px',
  lineHeight: '1.25',
}
const h2 = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#2a1e17',
  margin: '24px 0 8px',
}
const text = {
  fontSize: '15px',
  color: '#4a3a2e',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const box = {
  backgroundColor: '#ffffff',
  border: '1px solid #ecdcc0',
  borderRadius: '14px',
  padding: '20px 18px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const boxTitle = {
  fontSize: '17px',
  fontWeight: 'bold' as const,
  color: '#2a1e17',
  margin: '0 0 4px',
}
const boxSub = { fontSize: '13px', color: '#8a7a6a', margin: '0 0 10px' }
const boxDiscount = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#c86a12',
  margin: '0 0 6px',
}
const boxCode = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  letterSpacing: '3px',
  color: '#2a1e17',
  fontFamily: '"Courier New", monospace',
  margin: '6px 0',
}
const boxDate = { fontSize: '12px', color: '#8a7a6a', margin: '4px 0 0' }
const button = {
  backgroundColor: '#c86a12',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '20px 0 0' }