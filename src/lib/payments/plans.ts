export type PaymentPlan =
  | 'standard_week'
  | 'standard_month'
  | 'featured_week'
  | 'featured_month'

/** GST on listing fees (India). */
export const GST_RATE_INR = 0.18

/**
 * Pre-GST base in INR paise. Adjust these to change tax-exclusive list prices.
 * Amount charged at Razorpay is {@link PLAN_AMOUNT_INR_PAISE} (base + GST).
 */
export const PLAN_BASE_AMOUNT_INR_PAISE: Record<PaymentPlan, number> = {
  standard_week: 50_00 * 100,
  standard_month: 250_00 * 100,
  featured_week: 100_00 * 100,
  featured_month: 500_00 * 100,
}

/** Total INR paise at checkout (base + 18% GST, rounded). */
export const PLAN_AMOUNT_INR_PAISE: Record<PaymentPlan, number> = {
  standard_week: Math.round(
    PLAN_BASE_AMOUNT_INR_PAISE.standard_week * (1 + GST_RATE_INR)
  ),
  standard_month: Math.round(
    PLAN_BASE_AMOUNT_INR_PAISE.standard_month * (1 + GST_RATE_INR)
  ),
  featured_week: Math.round(
    PLAN_BASE_AMOUNT_INR_PAISE.featured_week * (1 + GST_RATE_INR)
  ),
  featured_month: Math.round(
    PLAN_BASE_AMOUNT_INR_PAISE.featured_month * (1 + GST_RATE_INR)
  ),
}

export const PLAN_LABEL: Record<PaymentPlan, string> = {
  standard_week: 'Standard · 1 week',
  standard_month: 'Standard · 1 month',
  featured_week: 'Featured · 1 week',
  featured_month: 'Featured · 1 month',
}

export function planDurationDays(plan: PaymentPlan): number {
  switch (plan) {
    case 'standard_week':
    case 'featured_week':
      return 7
    case 'standard_month':
    case 'featured_month':
      return 30
    default: {
      const _exhaustive: never = plan
      return _exhaustive
    }
  }
}

export function planIsFeatured(plan: PaymentPlan): boolean {
  return plan === 'featured_week' || plan === 'featured_month'
}

/** Persisted on `jobs` after checkout — matches live listing enums. */
export function planToJobListingFields(plan: PaymentPlan): {
  listing_tier: 'standard' | 'featured'
  listing_duration: 'weekly' | 'monthly'
  featured: boolean
} {
  return {
    listing_tier: planIsFeatured(plan) ? 'featured' : 'standard',
    listing_duration: plan.includes('month') ? 'monthly' : 'weekly',
    featured: planIsFeatured(plan),
  }
}

export function listingDurationToDays(d: 'weekly' | 'monthly'): number {
  return d === 'weekly' ? 7 : 30
}
