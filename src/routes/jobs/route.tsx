import { Outlet, createFileRoute } from '@tanstack/react-router'
import {
  PublicSiteFooter,
  PublicSiteHeader,
} from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/jobs')({
  component: JobsShell,
})

function JobsShell() {
  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <PublicSiteHeader />
      <div className='flex min-w-0 flex-1 flex-col pt-14'>
        <Outlet />
      </div>
      <PublicSiteFooter />
    </div>
  )
}
