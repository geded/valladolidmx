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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma el cambio de correo en {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brandMark}>Valladolid.mx</Heading>
        <Heading style={h1}>Confirma el cambio de correo</Heading>
        <Text style={text}>
          Solicitaste cambiar tu correo en {siteName} de{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Da clic en el botón para confirmar el cambio:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar nuevo correo
        </Button>
        <Text style={footer}>
          Si no solicitaste este cambio, protege tu cuenta de inmediato.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif', color: '#2a1e17' }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto', backgroundColor: '#fdf9f2', borderRadius: '18px', border: '1px solid #ecdcc0' }
const brandMark = { fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '2px', color: '#a4530b', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2a1e17', margin: '0 0 20px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4a3a2e', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#a4530b', textDecoration: 'underline' }
const button = { backgroundColor: '#c86a12', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '32px 0 0' }
