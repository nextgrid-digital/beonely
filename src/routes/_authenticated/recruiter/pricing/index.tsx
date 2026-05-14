import { createFileRoute } from '@tanstack/react-router'
import { RecruiterPricingPage } from '@/features/recruiter/recruiter-pricing-page'

export const Route = createFileRoute('/_authenticated/recruiter/pricing/')({
  component: RecruiterPricingShell,
})

function RecruiterPricingShell() {
  return (
    <div className='space-y-6'>
      <RecruiterPricingPage />
    </div>
  )
}
