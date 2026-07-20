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
  businessName?: string
  reminderNumber?: 1 | 2
  reviewUrl?: string
}

const CouponReviewReminderEmail = ({
  travelerName,
  businessName = 'el negocio',
  reminderNumber = 1,
  reviewUrl = `${SITE.url}`,
}: Props) => {
  const isSecond = reminderNumber === 2
  const heading = isSecond
    ? '¿Nos regalas un minuto?'
    : '¿Cómo estuvo tu experiencia?'
  const subtext = isSecond
    ? `Sabemos que la semana pasa volando. Tu reseña sobre ${businessName} sigue siendo muy valiosa: ayuda a otros viajeros a decidir y al negocio a mejorar.`
    : `Hace un par de días canjeaste tu cupón${businessName ? ` en ${businessName}` : ''}. Tu opinión ayuda a otros viajeros y al negocio a seguir creciendo.`
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>
        {isSecond
          ? `Último recordatorio · Reseña ${businessName}`
          : `¿Cómo te fue en ${businessName}?`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brandMark}>Valladolid.mx</Heading>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>
            {travelerName ? `Hola ${travelerName}, ` : 'Hola, '}
            {subtext}
          </Text>
          <Section style={box}>
            <Text style={boxTitle}>{businessName}</Text>
            <Text style={boxSub}>Comparte tu experiencia · toma menos de 1 minuto</Text>
          </Section>
          <Button style={button} href={reviewUrl}>
            Dejar mi reseña
          </Button>
          <Text style={footer}>
            Tu reseña aparecerá con el sello <strong>Canje verificado</strong>,
            un distintivo de confianza para futuros viajeros.
          </Text>
          {isSecond ? (
            <Text style={footerMuted}>
              Este es el último recordatorio que te enviaremos sobre este canje.
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CouponReviewReminderEmail,
  subject: (data: Record<string, unknown>) => {
    const business = (data?.businessName as string) || 'tu experiencia'
    const isSecond = Number(data?.reminderNumber) === 2
    return isSecond
      ? `Último recordatorio · Reseña de ${business} · Valladolid.mx`
      : `¿Cómo te fue en ${business}? · Valladolid.mx`
  },
  displayName: 'Recordatorio de reseña',
  previewData: {
    travelerName: 'Ana',
    businessName: 'Restaurante Maya',
    reminderNumber: 1,
    reviewUrl: `${SITE.url}/resenar/negocio/restaurante-maya`,
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
const boxSub = { fontSize: '13px', color: '#8a7a6a', margin: '0' }
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
const footerMuted = { fontSize: '11px', color: '#b8a892', margin: '10px 0 0', fontStyle: 'italic' as const }