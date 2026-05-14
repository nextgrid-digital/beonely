export type PaymentPlan =
  | 'standard_week'
  | 'standard_month'
  | 'featured_week'
  | 'featured_month'

export function planIsFeatured (plan: PaymentPlan): boolean {
  return plan === 'featured_week' || plan === 'featured_month'
}

export function planDurationDays (plan: PaymentPlan): number {
  switch (plan) {
    case 'standard_week':
    case 'featured_week':
      return 7
    case 'standard_month':
    case 'featured_month':
      return 30
    default: {
      const _e: never = plan
      return _e
    }
  }
}

/** Mirrors `src/lib/payments/plans.ts` for serverless handlers. */
export function planToJobListingFields (plan: PaymentPlan): {
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
