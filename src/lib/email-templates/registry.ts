import type { ComponentType } from 'react'
import { template as couponIssuedTemplate } from './coupon-issued'
import { template as couponRedeemedTemplate } from './coupon-redeemed'
import { template as couponReviewReminderTemplate } from './coupon-review-reminder'
import { template as visibilityRequestReceivedTemplate } from './visibility-request-received'
import { template as visibilityActivatedTemplate } from './visibility-activated'
import { template as visibilityRejectedTemplate } from './visibility-rejected'
import { template as visibilityExpiringTemplate } from './visibility-expiring'
import { template as visibilityExpiredTemplate } from './visibility-expired'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'coupon-issued': couponIssuedTemplate,
  'coupon-redeemed': couponRedeemedTemplate,
  'coupon-review-reminder': couponReviewReminderTemplate,
  'visibility-request-received': visibilityRequestReceivedTemplate,
  'visibility-activated': visibilityActivatedTemplate,
  'visibility-rejected': visibilityRejectedTemplate,
  'visibility-expiring': visibilityExpiringTemplate,
  'visibility-expired': visibilityExpiredTemplate,
}
