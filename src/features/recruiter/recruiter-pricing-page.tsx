import { Link } from '@tanstack/react-router'
import { formatInrFromPaise } from '@/lib/payments/format-inr-paise'
import {
  PLAN_AMOUNT_INR_PAISE,
  PLAN_LABEL,
  type PaymentPlan,
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

const PLANS: PaymentPlan[] = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
]

export function RecruiterPricingPage() {
  return (
    <div className='mx-auto max-w-3xl space-y-8'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Listing pricing
        </h1>
        <p className='text-sm text-muted-foreground'>
          Standard listings go live after payment and moderation. Featured adds
          prominent placement and a badge on the job board. All amounts are
          billed in INR via Razorpay at checkout.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead className='text-end'>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PLANS.map((p) => (
            <TableRow key={p}>
              <TableCell>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>{PLAN_LABEL[p]}</span>
                  {p.startsWith('featured') && (
                    <Badge variant='secondary'>Boost</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className='text-end tabular-nums'>
                {formatInrFromPaise(PLAN_AMOUNT_INR_PAISE[p])}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className='rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground'>
        <p>
          After you publish a job, you can upgrade a live Standard listing to
          Featured from the recruiter portal (same checkout flow).
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
