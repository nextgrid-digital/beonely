export type PaymentPlan =
  | 'standard_week'
  | 'standard_month'
  | 'featured_week'
  | 'featured_month'

/** Amounts in INR paise (Razorpay). Adjust to your pricing. */
export const PLAN_AMOUNT_INR_PAISE: Record<PaymentPlan, number> = {
  standard_week: 50_00 * 100,
  standard_month: 250_00 * 100,
  featured_week: 100_00 * 100,
  featured_month: 500_00 * 100,
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
