import { formatInrFromPaise } from '@/lib/payments/format-inr-paise'
import {
  PLAN_AMOUNT_INR_PAISE,
  PLAN_LABEL,
  type PaymentPlan,
} from '@/lib/payments/plans'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

/** Featured boost: duration-only picker (full featured price). */
export function FeaturedBoostPlanList(props: {
  name: string
  value: PaymentPlan
  onChange: (plan: PaymentPlan) => void
}) {
  const plans: PaymentPlan[] = ['featured_week', 'featured_month']
  return (
    <div className='grid gap-2' role='radiogroup' aria-label='Featured duration'>
      {plans.map((p) => {
        const selected = props.value === p
        return (
          <label
            key={p}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'hover:bg-muted/40'
            )}
          >
            <span className='flex min-w-0 items-center gap-2'>
              <input
                type='radio'
                name={props.name}
                className='size-4 shrink-0 accent-primary'
                checked={selected}
                onChange={() => props.onChange(p)}
              />
              <span className='font-medium'>
                {p === 'featured_month' ? '1 month' : '1 week'}
              </span>
              {p === 'featured_month' ? (
                <Badge variant='secondary' className='text-[10px]'>
                  Recommended
                </Badge>
              ) : null}
            </span>
            <span className='shrink-0 tabular-nums font-semibold'>
              {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[p])}
            </span>
          </label>
        )
      })}
      <p className='text-xs text-muted-foreground'>
        Extends Featured visibility from your current expiry. Prices include
        18% GST.
      </p>
    </div>
  )
}

/** @deprecated Use ListingPlanCheckout for initial / renew checkout. */
export function PlanOptionList(props: {
  plans: PaymentPlan[]
  name: string
  value: PaymentPlan
  onChange: (plan: PaymentPlan) => void
}) {
  return (
    <div className='grid gap-2' role='radiogroup' aria-label='Listing plan'>
      {props.plans.map((p) => {
        const selected = props.value === p
        return (
          <label
            key={p}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'hover:bg-muted/40'
            )}
          >
            <span className='flex min-w-0 items-center gap-2'>
              <input
                type='radio'
                name={props.name}
                className='size-4 shrink-0 accent-primary'
                checked={selected}
                onChange={() => props.onChange(p)}
              />
              <span className='font-medium'>{PLAN_LABEL[p]}</span>
            </span>
            <span className='shrink-0 tabular-nums font-semibold'>
              {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[p])}
            </span>
          </label>
        )
      })}
    </div>
  )
}
