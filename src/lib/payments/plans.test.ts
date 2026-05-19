import { describe, expect, it } from 'vitest'
import {
  FEATURED_ADDON_BASE_INR_PAISE,
  featuredAddonBasePaise,
  GST_RATE_INR,
  paymentPlanFromSelection,
  PLAN_AMOUNT_INR_PAISE,
  PLAN_BASE_AMOUNT_INR_PAISE,
  RENEWAL_PRICE_FACTOR,
  type PaymentPlan,
} from '@/lib/payments/plans'

const ALL_PLANS: PaymentPlan[] = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
  'standard_week_renew',
  'standard_month_renew',
  'featured_week_renew',
  'featured_month_renew',
]

describe('plan amounts with GST', () => {
  it('charges base times one plus GST rate rounded to paise', () => {
    for (const p of ALL_PLANS) {
      const base = PLAN_BASE_AMOUNT_INR_PAISE[p]
      expect(PLAN_AMOUNT_INR_PAISE[p]).toBe(
        Math.round(base * (1 + GST_RATE_INR))
      )
    }
  })

  it('uses new standard and featured add-on bases', () => {
    expect(PLAN_BASE_AMOUNT_INR_PAISE.standard_week).toBe(390_000)
    expect(PLAN_BASE_AMOUNT_INR_PAISE.standard_month).toBe(1_490_000)
    expect(FEATURED_ADDON_BASE_INR_PAISE.week).toBe(90_000)
    expect(FEATURED_ADDON_BASE_INR_PAISE.month).toBe(390_000)
  })

  it('featured base equals standard plus add-on', () => {
    expect(PLAN_BASE_AMOUNT_INR_PAISE.featured_week).toBe(
      PLAN_BASE_AMOUNT_INR_PAISE.standard_week +
        FEATURED_ADDON_BASE_INR_PAISE.week
    )
    expect(PLAN_BASE_AMOUNT_INR_PAISE.featured_month).toBe(
      PLAN_BASE_AMOUNT_INR_PAISE.standard_month +
        FEATURED_ADDON_BASE_INR_PAISE.month
    )
  })

  it('renewal base is 60% of matching initial plan', () => {
    expect(PLAN_BASE_AMOUNT_INR_PAISE.standard_week_renew).toBe(
      Math.round(PLAN_BASE_AMOUNT_INR_PAISE.standard_week * RENEWAL_PRICE_FACTOR)
    )
    expect(PLAN_BASE_AMOUNT_INR_PAISE.standard_month_renew).toBe(
      Math.round(
        PLAN_BASE_AMOUNT_INR_PAISE.standard_month * RENEWAL_PRICE_FACTOR
      )
    )
  })

  it('featured add-on scales for renewal display', () => {
    expect(featuredAddonBasePaise('week', true)).toBe(
      Math.round(FEATURED_ADDON_BASE_INR_PAISE.week * RENEWAL_PRICE_FACTOR)
    )
  })

  it('maps UI selection to payment plan', () => {
    expect(paymentPlanFromSelection('month', false, false)).toBe(
      'standard_month'
    )
    expect(paymentPlanFromSelection('week', true, true)).toBe(
      'featured_week_renew'
    )
  })
})
