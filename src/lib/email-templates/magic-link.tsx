import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace de acceso a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brandMark}>Valladolid.mx</Heading>
        <Heading style={h1}>Tu enlace de acceso</Heading>
        <Text style={text}>
          Da clic en el botón para entrar a {siteName}. Este enlace caduca en
          unos minutos por tu seguridad.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Entrar a mi cuenta
        </Button>
        <Text style={footer}>
          Si no solicitaste este enlace, puedes ignorar este mensaje.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif', color: '#2a1e17' }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto', backgroundColor: '#fdf9f2', borderRadius: '18px', border: '1px solid #ecdcc0' }
const brandMark = { fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '2px', color: '#a4530b', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2a1e17', margin: '0 0 20px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4a3a2e', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#c86a12', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '32px 0 0' }
