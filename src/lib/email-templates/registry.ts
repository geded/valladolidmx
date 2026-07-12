import type { ComponentType } from 'react'
import { template as couponIssuedTemplate } from './coupon-issued'
import { template as couponRedeemedTemplate } from './coupon-redeemed'
import { template as couponReviewReminderTemplate } from './coupon-review-reminder'
import { template as visibilityRequestReceivedTemplate } from './visibility-request-received'
import { template as visibilityActivatedTemplate } from './visibility-activated'
import { template as visibilityRejectedTemplate } from './visibility-rejected'
import { template as visibilityExpiringTemplate } from './visibility-expiring'
import { template as visibilityExpiredTemplate } from './visibility-expired'
import { template as tripT14Template } from './trip-t14'
import { template as tripT3Template } from './trip-t3'
import { template as tripWelcomeTemplate } from './trip-welcome'
import { template as tripPostTemplate } from './trip-post'

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
  'trip-t14': tripT14Template,
  'trip-t3': tripT3Template,
  'trip-welcome': tripWelcomeTemplate,
  'trip-post': tripPostTemplate,
}
