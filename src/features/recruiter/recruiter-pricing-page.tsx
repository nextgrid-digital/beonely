import { Link } from '@tanstack/react-router'
import { formatInrFromPaise } from '@/lib/payments/format-inr-paise'
import {
  FEATURED_ADDON_BASE_INR_PAISE,
  paymentPlanFromSelection,
  PLAN_AMOUNT_INR_PAISE,
  RENEWAL_PRICE_FACTOR,
} from '@/lib/payments/plans'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const DURATIONS = [
  { key: 'month' as const, label: '1 month', recommended: true },
  { key: 'week' as const, label: '1 week', recommended: false },
]

export function RecruiterPricingPage() {
  return (
    <div className='mx-auto max-w-3xl space-y-8'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Listing pricing
        </h1>
        <p className='text-sm text-muted-foreground'>
          Choose how long your listing stays live after approval. Add Featured
          for homepage placement and priority listing on the board. Prices
          include 18% GST; checkout is in INR via Razorpay.
        </p>
      </div>

      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead className='text-end'>New listing</TableHead>
              <TableHead className='text-end'>Extend / reactivate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DURATIONS.map((d) => {
              const standard = paymentPlanFromSelection(d.key, false, false)
              const standardRenew = paymentPlanFromSelection(
                d.key,
                false,
                true
              )
              return (
                <TableRow key={d.key}>
                  <TableCell>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='font-medium'>Standard · {d.label}</span>
                      {d.recommended ? (
                        <Badge variant='secondary'>Default</Badge>
                      ) : null}
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Featured +{formatInrFromPaise(
                        FEATURED_ADDON_BASE_INR_PAISE[d.key]
                      )}{' '}
                      + GST on same duration
                    </p>
                  </TableCell>
                  <TableCell className='text-end tabular-nums'>
                    {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[standard])}
                  </TableCell>
                  <TableCell className='text-end tabular-nums text-muted-foreground'>
                    {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[standardRenew])}
                  </TableCell>
                </TableRow>
              )
            })}
            {DURATIONS.map((d) => {
              const featured = paymentPlanFromSelection(d.key, true, false)
              const featuredRenew = paymentPlanFromSelection(d.key, true, true)
              return (
                <TableRow key={`featured-${d.key}`}>
                  <TableCell>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='font-medium'>Featured · {d.label}</span>
                      <Badge variant='secondary'>Boost</Badge>
                    </div>
                  </TableCell>
                  <TableCell className='text-end tabular-nums'>
                    {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[featured])}
                  </TableCell>
                  <TableCell className='text-end tabular-nums text-muted-foreground'>
                    {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[featuredRenew])}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className='rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground'>
        <p>
          Listings go live for 7 or 30 days after moderation approval. If you
          need more time, extend or reactivate the same posting at about{' '}
          {Math.round(RENEWAL_PRICE_FACTOR * 100)}% of the new-listing price
          (available within 7 days of expiry, or up to 30 days after).
        </p>
        <p className='mt-3'>
          Live Standard listings can upgrade to Featured anytime from the
          recruiter portal.
        </p>
        <p className='mt-3'>
          <Link
            to='/recruiter'
            className='font-medium text-primary underline-offset-4 hover:underline'
          >
            Go to recruiter portal
          </Link>
        </p>
      </div>
    </div>
  )
}
