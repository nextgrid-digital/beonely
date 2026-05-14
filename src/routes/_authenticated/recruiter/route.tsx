import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RecruiterChrome } from '@/features/recruiter/recruiter-chrome'
import { PUBLIC_SITE_MAIN_COLUMN } from '@/features/jobs/public-site-layout'
import { requireRecruiterAccountBeforeLoad } from '@/lib/auth/route-guards'

export const Route = createFileRoute('/_authenticated/recruiter')({
  beforeLoad: ({ location }) =>
    requireRecruiterAccountBeforeLoad({
      loginRedirectPath: location.pathname,
    }),
  component: RecruiterSectionLayout,
})

function RecruiterSectionLayout() {
  return (
    <div className={`${PUBLIC_SITE_MAIN_COLUMN} pb-12`}>
      <RecruiterChrome />
      <Outlet />
    </div>
  )
}
