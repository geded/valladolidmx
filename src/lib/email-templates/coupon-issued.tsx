import * as React from 'react'
import { SITE } from '@/config/site'
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
  validUntil?: string
  couponUrl?: string
  terms?: string | null
}

const CouponIssuedEmail = ({
  travelerName,
  title = 'Tu cupón Valladolid.mx',
  code = 'VMX-XXXX-XXXX',
  discountPercent,
  businessName,
  validUntil,
  couponUrl = `${SITE.url}/cuenta/mis-cupones`,
  terms,
}: Props) => {
  const validUntilLabel = validUntil
    ? new Date(validUntil).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Tu cupón {code} está listo</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brandMark}>Valladolid.mx</Heading>
          <Heading style={h1}>¡Tu cupón está listo!</Heading>
          <Text style={text}>
            {travelerName ? `Hola ${travelerName}, ` : 'Hola, '}gracias por ser
            un Viajero Verificado del Oriente Maya. Aquí está tu cupón digital:
          </Text>
          <Section style={couponBox}>
            <Text style={couponTitle}>{title}</Text>
            {businessName ? (
              <Text style={couponBiz}>en {businessName}</Text>
            ) : null}
            {discountPercent ? (
              <Text style={couponDiscount}>-{discountPercent}%</Text>
            ) : null}
            <Text style={couponCode}>{code}</Text>
            {validUntilLabel ? (
              <Text style={couponValid}>Válido hasta {validUntilLabel}</Text>
            ) : null}
          </Section>
          <Button style={button} href={couponUrl}>
            Ver mi cupón y QR
          </Button>
          <Text style={text}>
            Presenta este código o el QR desde tu cuenta al llegar al negocio.
            Es personal e intransferible.
          </Text>
          {terms ? (
            <Text style={footer}>
              <strong>Términos:</strong> {terms}
            </Text>
          ) : null}
          <Text style={footer}>
            ¿No solicitaste este cupón? Puedes ignorar este correo.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CouponIssuedEmail,
  subject: (data: Record<string, unknown>) =>
    `Tu cupón ${(data?.code as string) ?? 'Valladolid.mx'} está listo`,
  displayName: 'Cupón emitido',
  previewData: {
    travelerName: 'Ana',
    title: '2x1 en Cochinita Pibil',
    code: 'VMX-AB12-CD34',
    discountPercent: 20,
    businessName: 'Restaurante Maya',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    couponUrl: `${SITE.url}/cuenta/mis-cupones`,
    terms: 'Presenta el código en caja. No acumulable con otras promos.',
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
  margin: '0 0 20px',
  lineHeight: '1.25',
}
const text = {
  fontSize: '15px',
  color: '#4a3a2e',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const couponBox = {
  backgroundColor: '#ffffff',
  border: '2px dashed #c86a12',
  borderRadius: '14px',
  padding: '22px 18px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const couponTitle = {
  fontSize: '17px',
  fontWeight: 'bold' as const,
  color: '#2a1e17',
  margin: '0 0 4px',
}
const couponBiz = {
  fontSize: '13px',
  color: '#8a7a6a',
  margin: '0 0 12px',
}
const couponDiscount = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#c86a12',
  margin: '0 0 8px',
}
const couponCode = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  letterSpacing: '3px',
  color: '#2a1e17',
  fontFamily: '"Courier New", monospace',
  margin: '8px 0 8px',
}
const couponValid = {
  fontSize: '12px',
  color: '#8a7a6a',
  margin: '4px 0 0',
}
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
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '16px 0 0' }