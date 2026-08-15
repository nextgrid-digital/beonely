import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireRecruiterAccountBeforeLoad } from '@/lib/auth/route-guards'
import { PUBLIC_SITE_MAIN_COLUMN } from '@/features/jobs/public-site-layout'
import { RecruiterChrome } from '@/features/recruiter/recruiter-chrome'
import { RecruiterChromeActionsProvider } from '@/features/recruiter/recruiter-chrome-actions-context'

export const Route = createFileRoute('/_authenticated/recruiter')({
  beforeLoad: ({ location }) =>
    requireRecruiterAccountBeforeLoad({
      loginRedirectPath: location.pathname,
    }),
  component: RecruiterSectionLayout,
})

function RecruiterSectionLayout() {
  return (
    <RecruiterChromeActionsProvider>
      <div className={`${PUBLIC_SITE_MAIN_COLUMN} pb-12`}>
        <RecruiterChrome />
        <Outlet />
      </div>
    </RecruiterChromeActionsProvider>
  )
}
