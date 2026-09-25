import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

// Notification-only record keeping in the kept email tables (never gates sends).
async function recordSuppression(recipient: string, reason: Reason, eventId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const db = supabaseAdmin as any
  const email = recipient.toLowerCase()

  const { error: upsertError } = await db
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (upsertError) {
    console.error('suppressed_emails upsert failed', {
      code: upsertError.code,
      message: upsertError.message,
      event_id: eventId,
    })
    throw new Error('suppressed_emails upsert failed')
  }

  const { error: logError } = await db.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })
  if (logError) {
    console.error('email_send_log insert failed', {
      code: logError.code,
      message: logError.message,
      event_id: eventId,
    })
    throw new Error('email_send_log insert failed')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await recordSuppression(event.data.recipient, 'bounce', event.event_id)
            },
            'email.complaint': async (event) => {
              await recordSuppression(event.data.recipient, 'complaint', event.event_id)
            },
            'email.unsubscribed': async (event) => {
              await recordSuppression(event.data.recipient, 'unsubscribe', event.event_id)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
