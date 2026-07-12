import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'node:crypto'
import { sendVisibilityEmail } from '@/lib/visibility/visibility-notifications.server'

/**
 * Ola 7.9 · Cron diario de notificaciones de ciclo de vida de visibilidad.
 *  - Recordatorio 7d antes de vencer
 *  - Recordatorio 24h antes de vencer
 *  - Aviso de plan vencido (una vez, hasta 48h después)
 * Autenticación: `x-cron-secret` con `EB_CRON_SECRET` o `apikey` con
 * `SUPABASE_PUBLISHABLE_KEY`.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

interface GrantRow {
  grant_id: string
  business_id: string
  plan_name: string
  expires_at: string
  recipient_email: string
  recipient_name: string | null
  business_name: string | null
  business_slug: string | null
}

export const Route = createFileRoute('/api/public/hooks/visibility-notifications')({
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

        const results = { expiring_7d: 0, expiring_1d: 0, expired: 0, failed: 0, skipped: 0 }

        async function processBatch(
          rows: GrantRow[],
          kind: 'expiring_7d' | 'expiring_1d' | 'expired',
        ) {
          for (const row of rows) {
            try {
              const daysLeft = kind === 'expiring_7d' ? 7 : kind === 'expiring_1d' ? 1 : 0
              const templateName =
                kind === 'expired' ? 'visibility-expired' : 'visibility-expiring'
              const res = await sendVisibilityEmail(supabase, {
                templateName: templateName as
                  | 'visibility-expired'
                  | 'visibility-expiring',
                recipientEmail: row.recipient_email,
                recipientName: row.recipient_name,
                businessName: row.business_name,
                idempotencyKey: `visibility-${kind}-${row.grant_id}`,
                templateData: {
                  planName: row.plan_name,
                  expiresAt: row.expires_at,
                  daysLeft,
                },
              })
              if (!res.ok) {
                if (res.skipped) results.skipped += 1
                else results.failed += 1
                continue
              }
              const patch: Record<string, string> =
                kind === 'expiring_7d'
                  ? { notified_expiring_7d_at: new Date().toISOString() }
                  : kind === 'expiring_1d'
                    ? { notified_expiring_1d_at: new Date().toISOString() }
                    : { notified_expired_at: new Date().toISOString() }
              await supabase
                .from('business_visibility_grants')
                .update(patch)
                .eq('id', row.grant_id)
              results[kind] += 1
            } catch (err) {
              console.error('visibility cron send failed', {
                grant_id: row.grant_id,
                err: err instanceof Error ? err.message : String(err),
              })
              results.failed += 1
            }
          }
        }

        const { data: expiring7, error: e7 } = await supabase.rpc(
          'list_visibility_grants_expiring',
          { _reminder: 7 },
        )
        if (e7) console.error('list expiring 7d failed', e7)
        await processBatch((expiring7 ?? []) as GrantRow[], 'expiring_7d')

        const { data: expiring1, error: e1 } = await supabase.rpc(
          'list_visibility_grants_expiring',
          { _reminder: 1 },
        )
        if (e1) console.error('list expiring 1d failed', e1)
        await processBatch((expiring1 ?? []) as GrantRow[], 'expiring_1d')

        const { data: expired, error: ee } = await supabase.rpc(
          'list_visibility_grants_recently_expired',
        )
        if (ee) console.error('list expired failed', ee)
        await processBatch((expired ?? []) as GrantRow[], 'expired')

        return Response.json({ ok: true, ...results })
      },
    },
  },
})