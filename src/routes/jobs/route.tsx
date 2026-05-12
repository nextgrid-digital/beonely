import { Outlet, createFileRoute } from '@tanstack/react-router'
import { PublicSiteFooter, PublicSiteHeader } from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/jobs')({
  component: JobsShell,
})

function JobsShell () {
  return (
    <div className='flex min-h-svh flex-col bg-background'>
      <PublicSiteHeader />
      <Outlet />
      <PublicSiteFooter />
    </div>
  )
}
