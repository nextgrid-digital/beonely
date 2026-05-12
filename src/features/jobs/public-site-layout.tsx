import { Link, useMatch } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { Button } from '@/components/ui/button'
import type { PublishedJobsFilters } from '@/lib/jobs/fetch-published-jobs'

/** Single max width for public header, main, and aligned chrome (home + jobs). */
export const PUBLIC_SITE_MAX = 'max-w-5xl'

export function PublicSiteHeader (props: {
  /** When not on `/jobs/` (e.g. home), pass filters so "Jobs" preserves the same search. */
  jobsSearchFallback?: PublishedJobsFilters
}) {
  const jobsIndex = useMatch({ from: '/jobs/', shouldThrow: false })
  const jobsSearch =
    (jobsIndex?.search as PublishedJobsFilters | undefined) ??
    props.jobsSearchFallback ??
    {}

  return (
    <>
      <a
        href='#main-content'
        className='sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-block focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring'
      >
        Skip to content
      </a>
      <header className='border-b'>
        <div
          className={`mx-auto flex h-14 ${PUBLIC_SITE_MAX} items-center justify-between gap-4 px-4`}
        >
          <Link
            to='/'
            className='flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          >
            <Logo className='h-7 max-w-[10rem]' />
          </Link>
          <nav className='flex items-center gap-4 text-sm'>
            <Link
              to='/jobs'
              search={jobsSearch}
              className='text-muted-foreground hover:text-foreground'
            >
              Jobs
            </Link>
            <Link
              to='/sign-in'
              className='text-muted-foreground hover:text-foreground'
            >
              Sign in
            </Link>
            <Button asChild size='sm'>
              <Link to='/sign-up'>Post a job</Link>
            </Button>
          </nav>
        </div>
      </header>
    </>
  )
}

export function PublicSiteFooter () {
  return (
    <footer className='border-t py-8 text-center text-sm text-muted-foreground'>
      Beonely — niche hiring for ServiceNow.
    </footer>
  )
}
