import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'valladolidmx'
const SENDER_DOMAIN = 'notify.alux.travel'
const FROM_DOMAIN = 'notify.alux.travel'
const PUBLIC_ORIGIN = 'https://valladolid.mx'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type SupabaseAdmin = any

export interface VisibilityEmailInput {
  templateName:
    | 'visibility-request-received'
    | 'visibility-activated'
    | 'visibility-rejected'
    | 'visibility-expiring'
    | 'visibility-expired'
  recipientEmail: string
  recipientName?: string | null
  businessName?: string | null
  templateData?: Record<string, unknown>
  idempotencyKey: string
  label?: string
}

/**
 * Enqueues a visibility lifecycle email via the transactional queue.
 * Silent-fail: logs and returns { ok: false } but never throws — visibility
 * flows must not break because of an email hiccup.
 */
export async function sendVisibilityEmail(
  supabaseAdmin: SupabaseAdmin,
  input: VisibilityEmailInput,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  try {
    const email = (input.recipientEmail ?? '').toLowerCase().trim()
    if (!email) return { ok: false, skipped: 'missing_email' }

    const template = TEMPLATES[input.templateName]
    if (!template) return { ok: false, error: 'template_not_found' }

    // Suppression check
    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    if (suppressed) return { ok: false, skipped: 'suppressed' }

    // Unsubscribe token
    let unsubToken: string | null = null
    const { data: existingToken } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', email)
      .maybeSingle()
    if (existingToken && !existingToken.used_at) {
      unsubToken = existingToken.token
    } else if (!existingToken) {
      const newToken = generateToken()
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert(
          { email, token: newToken },
          { onConflict: 'email', ignoreDuplicates: true },
        )
      const { data: readBack } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', email)
        .maybeSingle()
      unsubToken = readBack?.token ?? newToken
    }

    const templateData = {
      recipientName: input.recipientName ?? undefined,
      businessName: input.businessName ?? undefined,
      portalUrl: `${PUBLIC_ORIGIN}/portal/visibilidad`,
      ...(input.templateData ?? {}),
    }
    const element = React.createElement(template.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof template.subject === 'function'
        ? template.subject(templateData)
        : template.subject

    const messageId = crypto.randomUUID()

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: email,
      status: 'pending',
    })

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
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
        label: input.label ?? input.templateName,
        idempotency_key: input.idempotencyKey,
        unsubscribe_token: unsubToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: input.templateName,
        recipient_email: email,
        status: 'failed',
        error_message: enqueueError.message,
      })
      return { ok: false, error: enqueueError.message }
    }

    return { ok: true }
  } catch (err) {
    console.error('sendVisibilityEmail failed', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Resolves recipient + business info from the RPC.
 */
export async function getVisibilityRecipient(
  supabaseAdmin: SupabaseAdmin,
  businessId: string,
): Promise<{
  recipientEmail: string
  recipientName: string | null
  businessName: string | null
  businessSlug: string | null
} | null> {
  const { data, error } = await supabaseAdmin.rpc(
    'get_visibility_notification_recipient',
    { _business_id: businessId },
  )
  if (error || !data || !Array.isArray(data) || data.length === 0) return null
  const row = data[0]
  if (!row?.recipient_email) return null
  return {
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name ?? null,
    businessName: row.business_name ?? null,
    businessSlug: row.business_slug ?? null,
  }
}