/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Potwierdź swój e-mail – {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://uoklwwalgkbafjqjahmi.supabase.co/storage/v1/object/public/avatars/email-logo.jpg" width="120" height="auto" alt="eDART Polska" style={logo} />
        <Heading style={h1}>Potwierdź swój e-mail</Heading>
        <Text style={text}>
          Dziękujemy za rejestrację w{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Potwierdź swój adres e-mail (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) klikając poniższy przycisk:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Potwierdź e-mail
        </Button>
        <Text style={footer}>
          Jeśli nie zakładałeś konta, zignoruj tę wiadomość.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#0f1318', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 0 24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  fontFamily: "'Oswald', Arial, sans-serif",
  color: '#ece8e1',
  margin: '0 0 20px',
  textTransform: 'uppercase' as const,
}
const text = {
  fontSize: '14px',
  color: '#7a8194',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: '#ece8e1', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(0, 72%, 51%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#555555', margin: '30px 0 0' }
