import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te invitaron a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brandMark}>Valladolid.mx</Heading>
        <Heading style={h1}>Te invitaron a unirte</Heading>
        <Text style={text}>
          Recibiste una invitación para unirte a{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>. Da clic en el botón para aceptar y crear tu cuenta.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Aceptar invitación
        </Button>
        <Text style={footer}>
          Si no esperabas esta invitación, puedes ignorar este mensaje.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif', color: '#2a1e17' }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto', backgroundColor: '#fdf9f2', borderRadius: '18px', border: '1px solid #ecdcc0' }
const brandMark = { fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '2px', color: '#a4530b', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2a1e17', margin: '0 0 20px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4a3a2e', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#a4530b', textDecoration: 'underline' }
const button = { backgroundColor: '#c86a12', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '32px 0 0' }
