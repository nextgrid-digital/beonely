export type InitialPaymentPlan =
  | 'standard_week'
  | 'standard_month'
  | 'featured_week'
  | 'featured_month'

export type RenewalPaymentPlan =
  | 'standard_week_renew'
  | 'standard_month_renew'
  | 'featured_week_renew'
  | 'featured_month_renew'

export type PaymentPlan = InitialPaymentPlan | RenewalPaymentPlan

export const RENEWAL_PRICE_FACTOR = 0.6

/** GST on listing fees (India). Keep in sync with `src/lib/payments/plans.ts`. */
export const GST_RATE_INR = 0.18

const LISTING_STANDARD_BASE_INR_PAISE = {
  week: 3_900 * 100,
  month: 14_900 * 100,
} as const

const FEATURED_ADDON_BASE_INR_PAISE = {
  week: 900 * 100,
  month: 3_900 * 100,
} as const

const INITIAL_BASE: Record<InitialPaymentPlan, number> = {
  standard_week: LISTING_STANDARD_BASE_INR_PAISE.week,
  standard_month: LISTING_STANDARD_BASE_INR_PAISE.month,
  featured_week:
    LISTING_STANDARD_BASE_INR_PAISE.week + FEATURED_ADDON_BASE_INR_PAISE.week,
  featured_month:
    LISTING_STANDARD_BASE_INR_PAISE.month + FEATURED_ADDON_BASE_INR_PAISE.month,
}

function renewBase (initial: InitialPaymentPlan): number {
  return Math.round(INITIAL_BASE[initial] * RENEWAL_PRICE_FACTOR)
}

const PLAN_BASE_AMOUNT_INR_PAISE: Record<PaymentPlan, number> = {
  standard_week: INITIAL_BASE.standard_week,
  standard_month: INITIAL_BASE.standard_month,
  featured_week: INITIAL_BASE.featured_week,
  featured_month: INITIAL_BASE.featured_month,
  standard_week_renew: renewBase('standard_week'),
  standard_month_renew: renewBase('standard_month'),
  featured_week_renew: renewBase('featured_week'),
  featured_month_renew: renewBase('featured_month'),
}

function withGst (base: number): number {
  return Math.round(base * (1 + GST_RATE_INR))
}

/** Total INR paise at checkout (base + 18% GST, rounded). */
export const PLAN_AMOUNT_INR_PAISE: Record<PaymentPlan, number> = {
  standard_week: withGst(PLAN_BASE_AMOUNT_INR_PAISE.standard_week),
  standard_month: withGst(PLAN_BASE_AMOUNT_INR_PAISE.standard_month),
  featured_week: withGst(PLAN_BASE_AMOUNT_INR_PAISE.featured_week),
  featured_month: withGst(PLAN_BASE_AMOUNT_INR_PAISE.featured_month),
  standard_week_renew: withGst(PLAN_BASE_AMOUNT_INR_PAISE.standard_week_renew),
  standard_month_renew: withGst(PLAN_BASE_AMOUNT_INR_PAISE.standard_month_renew),
  featured_week_renew: withGst(PLAN_BASE_AMOUNT_INR_PAISE.featured_week_renew),
  featured_month_renew: withGst(PLAN_BASE_AMOUNT_INR_PAISE.featured_month_renew),
}

export const ALL_PAYMENT_PLANS: PaymentPlan[] = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
  'standard_week_renew',
  'standard_month_renew',
  'featured_week_renew',
  'featured_month_renew',
]

export function planIsRenewal (plan: PaymentPlan): boolean {
  return plan.endsWith('_renew')
}

export function planIsFeatured (plan: PaymentPlan): boolean {
  return plan.startsWith('featured')
}

export function planDurationDays (plan: PaymentPlan): number {
  if (plan.includes('week')) return 7
  return 30
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
