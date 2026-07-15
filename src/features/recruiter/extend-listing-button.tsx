import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  daysSinceListingExpiry,
  daysUntilListingExpiry,
  jobListingCanRenew,
} from '@/lib/jobs/job-listing-renewal'
import { usePaymentTurnstileChallenge } from '@/lib/payments/payment-turnstile'
import {
  paymentPlanFromSelection,
  type PaymentPlan,
} from '@/lib/payments/plans'
import { startRazorpayJobCheckout } from '@/lib/payments/razorpay-job-checkout'
import type { JobRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ListingPlanCheckout,
  selectedPlanPriceLabel,
} from '@/features/recruiter/listing-plan-checkout'

export function ExtendListingButton(props: {
  job: JobRow
  accessToken: string | undefined
  buttonClassName?: string
  compact?: boolean
}) {
  const canRenew = jobListingCanRenew(props.job)
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>(
    paymentPlanFromSelection('month', props.job.featured, true)
  )
  const [paying, setPaying] = useState(false)
  const turnstile = usePaymentTurnstileChallenge()

  if (!canRenew) return null

  const daysLeft = daysUntilListingExpiry(props.job)
  const daysPast = daysSinceListingExpiry(props.job)
  const expired = daysPast !== null && daysPast > 0

  const startPay = async () => {
    if (!props.accessToken) {
      toast.error('Sign in again')
      return
    }
    if (!turnstile.ready) {
      toast.error('Complete the verification before starting checkout')
      return
    }
    setPaying(true)
    try {
      await startRazorpayJobCheckout({
        jobId: props.job.id,
        plan,
        accessToken: props.accessToken,
        turnstileToken: turnstile.token ?? undefined,
        onPaid: () => {
          toast.success(expired ? 'Listing reactivated' : 'Listing extended')
          setOpen(false)
          window.location.reload()
        },
        onError: (m) => toast.error(m),
        prepareRazorpayUi: async () => {
          setOpen(false)
          await new Promise((r) => setTimeout(r, 150))
        },
      })
    } finally {
      setPaying(false)
      turnstile.reset()
    }
  }

  return (
    <>
      <Button
        size='sm'
        variant='secondary'
        className={cn(props.buttonClassName)}
        onClick={() => setOpen(true)}
      >
        {props.compact
          ? expired
            ? 'Reactivate'
            : 'Extend'
          : expired
            ? 'Reactivate listing'
            : 'Extend listing'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {expired ? 'Reactivate listing' : 'Extend listing'}
            </DialogTitle>
            <DialogDescription>
              {expired
                ? 'Your listing expired. Add more time at the renewal rate — same job URL and applications stay intact.'
                : daysLeft !== null
                  ? `This listing expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Add another week or month at about 60% of a new listing.`
                  : 'Add another week or month at the renewal rate.'}
            </DialogDescription>
          </DialogHeader>
          <ListingPlanCheckout
            renewal
            defaultDuration={
              props.job.listing_duration === 'weekly' ? 'week' : 'month'
            }
            defaultFeatured={props.job.featured}
            showFeaturedOption
            plan={plan}
            onChange={setPlan}
          />
          {turnstile.challenge}
          <DialogFooter className='flex-col gap-2 sm:flex-col sm:items-stretch'>
            <p className='text-center text-sm text-muted-foreground'>
              Total due:{' '}
              <span className='font-semibold text-foreground tabular-nums'>
                {selectedPlanPriceLabel(plan)}
              </span>
            </p>
            <Button
              disabled={paying || !turnstile.ready}
              onClick={() => void startPay()}
            >
              {paying ? (
                <>
                  <Loader2 className='size-4 animate-spin' aria-hidden />
                  Starting checkout…
                </>
              ) : (
                `Pay ${selectedPlanPriceLabel(plan)} with Razorpay`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
