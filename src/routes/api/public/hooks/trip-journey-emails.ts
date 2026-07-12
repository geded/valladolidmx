import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'node:crypto'
import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from '@/lib/email-templates/registry'

/**
 * Etapa 8 · Correos del viaje.
 * Cron horario que envía T-14, T-3, bienvenida y T+2 a viajeros con orden
 * confirmada (paid/fulfilled) y viaje asociado. Idempotente vía columnas
 * email_*_sent_at en concierge_orders.
 */

const SITE_NAME = 'valladolidmx'
const SENDER_DOMAIN = 'notify.alux.travel'
const FROM_DOMAIN = 'notify.alux.travel'
const PUBLIC_ORIGIN = 'https://valladolid.mx'

const KINDS = [
  { kind: 't14', template: 'trip-t14', column: 'email_t14_sent_at' },
  { kind: 't3', template: 'trip-t3', column: 'email_t3_sent_at' },
  { kind: 'welcome', template: 'trip-welcome', column: 'email_welcome_sent_at' },
  { kind: 'post', template: 'trip-post', column: 'email_post_sent_at' },
] as const

type Row = {
  order_id: string
  folio: string
  user_id: string | null
  traveler_email: string
  traveler_name: string | null
  traveler_locale: string | null
  destination_name: string | null
  start_date: string | null
  end_date: string | null
  party_size: number | null
  days_to_trip: number | null
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function formatStartDate(iso: string | null, locale: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString(locale || 'es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return undefined
  }
}

export const Route = createFileRoute('/api/public/hooks/trip-journey-emails')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided =
          request.headers.get('x-cron-secret') ??
          request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
          ''
        const expected = process.env.EB_CRON_SECRET ?? ''
        const apiKeyProvided = request.headers.get('apikey') ?? ''
        const publishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? ''
        const secretMatch = expected && provided && safeEqual(provided, expected)
        const apiKeyMatch =
          publishable && apiKeyProvided && safeEqual(apiKeyProvided, publishable)
        if (!secretMatch && !apiKeyMatch) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )

        const results: Record<string, { sent: number; failed: number; suppressed: number }> = {
          t14: { sent: 0, failed: 0, suppressed: 0 },
          t3: { sent: 0, failed: 0, suppressed: 0 },
          welcome: { sent: 0, failed: 0, suppressed: 0 },
          post: { sent: 0, failed: 0, suppressed: 0 },
        }

        for (const step of KINDS) {
          const template = TEMPLATES[step.template]
          if (!template) continue

          const { data, error } = await supabase.rpc('get_orders_needing_trip_email', {
            _kind: step.kind,
          })
          if (error) {
            console.error('trip email RPC failed', { kind: step.kind, error })
            continue
          }
          const rows = (data ?? []) as Row[]

          for (const row of rows) {
            try {
              const email = (row.traveler_email ?? '').toLowerCase().trim()
              if (!email) continue

              const { data: suppressed } = await supabase
                .from('suppressed_emails')
                .select('email')
                .eq('email', email)
                .maybeSingle()
              if (suppressed) {
                results[step.kind].suppressed += 1
                await supabase
                  .from('concierge_orders')
                  .update({ [step.column]: new Date().toISOString() })
                  .eq('id', row.order_id)
                continue
              }

              let unsubToken: string | null = null
              const { data: existingToken } = await supabase
                .from('email_unsubscribe_tokens')
                .select('token, used_at')
                .eq('email', email)
                .maybeSingle()
              if (existingToken && !existingToken.used_at) {
                unsubToken = existingToken.token
              } else if (!existingToken) {
                const newToken = generateToken()
                await supabase
                  .from('email_unsubscribe_tokens')
                  .upsert(
                    { email, token: newToken },
                    { onConflict: 'email', ignoreDuplicates: true },
                  )
                const { data: readBack } = await supabase
                  .from('email_unsubscribe_tokens')
                  .select('token')
                  .eq('email', email)
                  .maybeSingle()
                unsubToken = readBack?.token ?? newToken
              }

              const firstName = (row.traveler_name ?? '').trim().split(/\s+/)[0] || undefined
              const planUrl = `${PUBLIC_ORIGIN}/cuenta/mi-viaje`
              const templateData: Record<string, any> = {
                travelerName: firstName,
                folio: row.folio,
                destinationName: row.destination_name || 'el Oriente Maya',
                startDateLabel: formatStartDate(row.start_date, row.traveler_locale),
                partySize: row.party_size,
                daysToTrip: row.days_to_trip ?? undefined,
                planUrl,
                reviewUrl: planUrl,
              }

              const element = React.createElement(template.component, templateData)
              const html = await render(element)
              const text = await render(element, { plainText: true })
              const subject =
                typeof template.subject === 'function'
                  ? template.subject(templateData)
                  : template.subject

              const messageId = crypto.randomUUID()
              const idempotencyKey = `trip-${step.kind}-${row.order_id}`

              await supabase.from('email_send_log').insert({
                message_id: messageId,
                template_name: step.template,
                recipient_email: email,
                status: 'pending',
              })

              const { error: enqueueError } = await supabase.rpc('enqueue_email', {
                queue_name: 'transactional_emails',
                payload: {
                  message_id: messageId,
                  to: email,
                  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                  sender_domain: SENDER_DOMAIN,
                  subject,
                  html,
                  text,
                  purpose: 'transactional',
                  label: step.template,
                  idempotency_key: idempotencyKey,
                  unsubscribe_token: unsubToken,
                  queued_at: new Date().toISOString(),
                },
              })

              if (enqueueError) {
                results[step.kind].failed += 1
                await supabase.from('email_send_log').insert({
                  message_id: messageId,
                  template_name: step.template,
                  recipient_email: email,
                  status: 'failed',
                  error_message: enqueueError.message,
                })
                continue
              }

              await supabase
                .from('concierge_orders')
                .update({ [step.column]: new Date().toISOString() })
                .eq('id', row.order_id)

              results[step.kind].sent += 1
            } catch (err) {
              console.error('trip email send failed', {
                order_id: row.order_id,
                kind: step.kind,
                err: err instanceof Error ? err.message : String(err),
              })
              results[step.kind].failed += 1
            }
          }
        }

        return Response.json({ ok: true, results })
      },
    },
  },
})