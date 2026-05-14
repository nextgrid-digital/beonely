import { createFileRoute } from '@tanstack/react-router'
import { requireRecruiterAccountBeforeLoad } from '@/lib/auth/route-guards'
import { RecruiterPricingPage } from '@/features/recruiter/recruiter-pricing-page'

export const Route = createFileRoute('/_authenticated/recruiter/pricing/')({
  beforeLoad: () =>
    requireRecruiterAccountBeforeLoad({
      loginRedirectPath: '/recruiter/pricing',
    }),
  component: RecruiterPricingShell,
})

function RecruiterPricingShell() {
  return (
    <div className='space-y-6 px-4 py-6'>
      <RecruiterPricingPage />
    </div>
  )
}
