import { createFileRoute } from '@tanstack/react-router'
import { requireRecruiterAccountBeforeLoad } from '@/lib/auth/route-guards'
import { RecruiterPortal } from '@/features/recruiter/recruiter-portal'

export const Route = createFileRoute('/_authenticated/recruiter/')({
  beforeLoad: () =>
    requireRecruiterAccountBeforeLoad({ loginRedirectPath: '/recruiter' }),
  component: RecruiterPage,
})

function RecruiterPage() {
  return (
    <div className='space-y-6 px-4 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Recruiter</h1>
        <p className='text-sm text-muted-foreground'>
          Create drafts, pay with Razorpay, then wait for moderation.
        </p>
      </div>
      <RecruiterPortal />
    </div>
  )
}
