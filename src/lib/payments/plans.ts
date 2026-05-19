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

/** Loyalty rate for extend / reactivate (60% of initial base). */
export const RENEWAL_PRICE_FACTOR = 0.6

/** GST on listing fees (India). */
export const GST_RATE_INR = 0.18

export type ListingDuration = 'week' | 'month'

const LISTING_STANDARD_BASE_INR_PAISE = {
  week: 3_900 * 100,
  month: 14_900 * 100,
} as const

/** Pre-GST Featured add-on (displayed as +₹900 week / +₹3,900 month). */
export const FEATURED_ADDON_BASE_INR_PAISE: Record<ListingDuration, number> = {
  week: 900 * 100,
  month: 3_900 * 100,
}

const INITIAL_BASE: Record<InitialPaymentPlan, number> = {
  standard_week: LISTING_STANDARD_BASE_INR_PAISE.week,
  standard_month: LISTING_STANDARD_BASE_INR_PAISE.month,
  featured_week:
    LISTING_STANDARD_BASE_INR_PAISE.week + FEATURED_ADDON_BASE_INR_PAISE.week,
  featured_month:
    LISTING_STANDARD_BASE_INR_PAISE.month + FEATURED_ADDON_BASE_INR_PAISE.month,
}

function renewBase(initial: InitialPaymentPlan): number {
  return Math.round(INITIAL_BASE[initial] * RENEWAL_PRICE_FACTOR)
}

/**
 * Pre-GST base in INR paise. Adjust these to change tax-exclusive list prices.
 * Amount charged at Razorpay is {@link PLAN_AMOUNT_INR_PAISE} (base + GST).
 */
export const PLAN_BASE_AMOUNT_INR_PAISE: Record<PaymentPlan, number> = {
  standard_week: INITIAL_BASE.standard_week,
  standard_month: INITIAL_BASE.standard_month,
  featured_week: INITIAL_BASE.featured_week,
  featured_month: INITIAL_BASE.featured_month,
  standard_week_renew: renewBase('standard_week'),
  standard_month_renew: renewBase('standard_month'),
  featured_week_renew: renewBase('featured_week'),
  featured_month_renew: renewBase('featured_month'),
}

function withGst(base: number): number {
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

export const PLAN_LABEL: Record<PaymentPlan, string> = {
  standard_week: 'Standard · 1 week',
  standard_month: 'Standard · 1 month',
  featured_week: 'Featured · 1 week',
  featured_month: 'Featured · 1 month',
  standard_week_renew: 'Extend · Standard · 1 week',
  standard_month_renew: 'Extend · Standard · 1 month',
  featured_week_renew: 'Extend · Featured · 1 week',
  featured_month_renew: 'Extend · Featured · 1 month',
}

export function planIsRenewal(plan: PaymentPlan): plan is RenewalPaymentPlan {
  return plan.endsWith('_renew')
}

/** Pre-GST Featured add-on for UI; 60% when extending/reactivating. */
export function featuredAddonBasePaise(
  duration: ListingDuration,
  renewal: boolean
): number {
  const base = FEATURED_ADDON_BASE_INR_PAISE[duration]
  return renewal ? Math.round(base * RENEWAL_PRICE_FACTOR) : base
}

export function planDurationDays(plan: PaymentPlan): number {
  if (plan.includes('week')) return 7
  return 30
}

export function planIsFeatured(plan: PaymentPlan): boolean {
  return plan.startsWith('featured')
}

export function paymentPlanFromSelection(
  duration: ListingDuration,
  featured: boolean,
  renewal: boolean
): PaymentPlan {
  const tier = featured ? 'featured' : 'standard'
  const span = duration === 'month' ? 'month' : 'week'
  const suffix = renewal ? '_renew' : ''
  return `${tier}_${span}${suffix}` as PaymentPlan
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

export const INITIAL_PAYMENT_PLANS: InitialPaymentPlan[] = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
]

export const RENEWAL_PAYMENT_PLANS: RenewalPaymentPlan[] = [
  'standard_week_renew',
  'standard_month_renew',
  'featured_week_renew',
  'featured_month_renew',
]

export const ALL_PAYMENT_PLANS: PaymentPlan[] = [
  ...INITIAL_PAYMENT_PLANS,
  ...RENEWAL_PAYMENT_PLANS,
]
