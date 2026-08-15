import { useEffect, useMemo, useState } from 'react'
import { formatInrFromPaise } from '@/lib/payments/format-inr-paise'
import {
  featuredAddonBasePaise,
  paymentPlanFromSelection,
  PLAN_AMOUNT_INR_PAISE,
  type ListingDuration,
  type PaymentPlan,
} from '@/lib/payments/plans'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

export function selectedPlanPriceLabel(plan: PaymentPlan): string {
  return formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[plan])
}

export function ListingPlanCheckout(props: {
  renewal?: boolean
  defaultDuration?: ListingDuration
  defaultFeatured?: boolean
  showFeaturedOption?: boolean
  plan: PaymentPlan
  onChange: (plan: PaymentPlan) => void
}) {
  const { onChange } = props
  const renewal = props.renewal ?? false
  const showFeatured = props.showFeaturedOption ?? !renewal

  const [duration, setDuration] = useState<ListingDuration>(
    props.defaultDuration ?? 'month'
  )
  const [featured, setFeatured] = useState(props.defaultFeatured ?? false)

  const plan = useMemo(
    () => paymentPlanFromSelection(duration, featured, renewal),
    [duration, featured, renewal]
  )

  useEffect(() => {
    onChange(plan)
  }, [onChange, plan])

  const standardWeek = paymentPlanFromSelection('week', false, renewal)
  const standardMonth = paymentPlanFromSelection('month', false, renewal)
  const featuredForDuration = paymentPlanFromSelection(duration, true, renewal)
  const featuredAddonPaise = featuredAddonBasePaise(duration, renewal)

  const selectDuration = (next: ListingDuration) => {
    setDuration(next)
    onChange(paymentPlanFromSelection(next, featured, renewal))
  }

  return (
    <div className='grid gap-4'>
      <div
        className='grid gap-2'
        role='radiogroup'
        aria-label='Listing duration'
      >
        <p className='text-sm font-medium'>How long should it stay live?</p>
        <label
          className={cn(
            'flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors motion-reduce:transition-none',
            duration === 'month'
              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
              : 'hover:bg-muted/40'
          )}
        >
          <span className='flex min-w-0 items-center gap-2'>
            <input
              type='radio'
              name='listing-duration'
              className='size-4 shrink-0 accent-primary'
              checked={duration === 'month'}
              onChange={() => selectDuration('month')}
            />
            <span className='font-medium'>1 month · Standard</span>
            <Badge variant='secondary' className='text-[10px]'>
              Recommended
            </Badge>
          </span>
          <span className='shrink-0 font-semibold tabular-nums'>
            {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[standardMonth])}
          </span>
        </label>
        <label
          className={cn(
            'flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors motion-reduce:transition-none',
            duration === 'week'
              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
              : 'hover:bg-muted/40'
          )}
        >
          <span className='flex min-w-0 items-center gap-2'>
            <input
              type='radio'
              name='listing-duration'
              className='size-4 shrink-0 accent-primary'
              checked={duration === 'week'}
              onChange={() => selectDuration('week')}
            />
            <span className='font-medium'>1 week · Standard</span>
            <span className='text-xs text-muted-foreground'>Urgent roles</span>
          </span>
          <span className='shrink-0 font-semibold tabular-nums'>
            {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[standardWeek])}
          </span>
        </label>
      </div>

      {showFeatured ? (
        <div className='space-y-2'>
          <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            Optional upgrade
          </p>
          <label
            htmlFor='listing-featured'
            className={cn(
              'flex cursor-pointer items-start justify-between gap-3 rounded-lg border-2 border-dashed p-3 text-sm transition-colors motion-reduce:transition-none',
              featured
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-border/70 bg-muted/40 hover:border-primary/40 hover:bg-muted/60'
            )}
          >
            <span className='flex min-w-0 items-start gap-3'>
              <Checkbox
                id='listing-featured'
                className='mt-0.5'
                checked={featured}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setFeatured(next)
                  onChange(paymentPlanFromSelection(duration, next, renewal))
                }}
              />
              <span className='grid gap-1'>
                <span className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>Featured placement</span>
                  <Badge variant='default' className='text-[10px]'>
                    Boost
                  </Badge>
                </span>
                <span className='text-xs text-muted-foreground'>
                  Boost visibility with homepage placement and priority listing.
                </span>
              </span>
            </span>
            <span className='shrink-0 text-end'>
              <span className='block text-xs text-muted-foreground'>Adds</span>
              <span className='text-base font-semibold text-primary tabular-nums'>
                +{formatInrFromPaise(featuredAddonPaise)}
              </span>
              {featured ? (
                <span className='mt-0.5 block text-[11px] text-muted-foreground'>
                  {formatInrFromPaise(
                    PLAN_AMOUNT_INR_PAISE[featuredForDuration]
                  )}{' '}
                  total
                </span>
              ) : (
                <span className='mt-0.5 block text-[11px] text-muted-foreground'>
                  on top of Standard
                </span>
              )}
            </span>
          </label>
        </div>
      ) : null}

      <p className='text-xs text-muted-foreground'>
        {renewal
          ? 'Extension pricing is about 60% of a new listing. Time is added from your current expiry (or from today if expired). Prices include 18% GST.'
          : 'Listing stays live for 7 or 30 days after approval. You can extend the same posting at a lower rate later. Prices include 18% GST.'}
      </p>
    </div>
  )
}
