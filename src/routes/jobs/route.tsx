import { Outlet, createFileRoute } from '@tanstack/react-router'
import {
  PublicSiteAuthShell,
  PublicSiteFooter,
  PublicSiteHeader,
} from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/jobs')({
  component: JobsShell,
})

function JobsShell() {
  return (
    <PublicSiteAuthShell>
      <div className='flex min-h-svh flex-col bg-background'>
        <PublicSiteHeader />
        <div className='flex flex-1 flex-col pt-14'>
          <Outlet />
        </div>
        <PublicSiteFooter />
      </div>
    </PublicSiteAuthShell>
  )
}
