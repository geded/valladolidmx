import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brandMark}>Valladolid.mx</Heading>
        <Heading style={h1}>Confirma tu identidad</Heading>
        <Text style={text}>Usa el siguiente código para continuar:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código caduca en unos minutos. Si no lo solicitaste, ignora
          este mensaje.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif', color: '#2a1e17' }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto', backgroundColor: '#fdf9f2', borderRadius: '18px', border: '1px solid #ecdcc0' }
const brandMark = { fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '2px', color: '#a4530b', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2a1e17', margin: '0 0 20px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4a3a2e', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: '"SF Mono","Courier New",monospace', fontSize: '28px', fontWeight: 'bold' as const, letterSpacing: '6px', color: '#c86a12', backgroundColor: '#fff5e6', borderRadius: '10px', padding: '14px 20px', textAlign: 'center' as const, margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#8a7a6a', margin: '32px 0 0' }
