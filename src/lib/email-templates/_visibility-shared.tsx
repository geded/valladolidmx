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

export interface VisibilityShellProps {
  preview: string
  eyebrow: string
  heading: string
  children: React.ReactNode
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
  accentColor?: string
}

export function VisibilityShell({
  preview,
  eyebrow,
  heading,
  children,
  ctaLabel,
  ctaUrl,
  footerNote,
  accentColor = '#c86a12',
}: VisibilityShellProps) {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brandMark}>Valladolid.mx</Heading>
          <Text style={{ ...eyebrowStyle, color: accentColor }}>{eyebrow}</Text>
          <Heading style={h1}>{heading}</Heading>
          <Section>{children}</Section>
          {ctaLabel && ctaUrl ? (
            <Button style={{ ...button, backgroundColor: accentColor }} href={ctaUrl}>
              {ctaLabel}
            </Button>
          ) : null}
          {footerNote ? <Text style={footer}>{footerNote}</Text> : null}
          <Text style={footer}>
            Este correo lo recibes porque administras un negocio en Valladolid.mx.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function formatDate(iso?: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

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
  margin: '0 0 16px',
}
const eyebrowStyle = {
  fontSize: '12px',
  fontWeight: 'bold' as const,
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#2a1e17',
  margin: '0 0 18px',
  lineHeight: '1.3',
}
const button = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '4px',
}
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '18px 0 0' }

export const bodyText = {
  fontSize: '15px',
  color: '#4a3a2e',
  lineHeight: '1.65',
  margin: '0 0 14px',
}

export const highlightBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #ecdcc0',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '4px 0 22px',
}

export const highlightLine = {
  fontSize: '14px',
  color: '#4a3a2e',
  margin: '4px 0',
}

export const highlightLabel = {
  fontSize: '11px',
  fontWeight: 'bold' as const,
  color: '#8a7a6a',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 2px',
}