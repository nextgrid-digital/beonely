import { describe, expect, it } from 'vitest'
import {
  GST_RATE_INR,
  PLAN_AMOUNT_INR_PAISE,
  PLAN_BASE_AMOUNT_INR_PAISE,
  type PaymentPlan,
} from '@/lib/payments/plans'

const PLANS: PaymentPlan[] = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
]

describe('plan amounts with GST', () => {
  it('charges base times one plus GST rate rounded to paise', () => {
    for (const p of PLANS) {
      const base = PLAN_BASE_AMOUNT_INR_PAISE[p]
      expect(PLAN_AMOUNT_INR_PAISE[p]).toBe(
        Math.round(base * (1 + GST_RATE_INR))
      )
    }
  })

  it('matches known standard_week total', () => {
    expect(PLAN_BASE_AMOUNT_INR_PAISE.standard_week).toBe(500_000)
    expect(PLAN_AMOUNT_INR_PAISE.standard_week).toBe(590_000)
  })
})
