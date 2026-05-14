import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { PublicSiteAccountNav } from '@/features/jobs/public-site-account-nav'

/** Shared with profile resume builder and jobs detail sticky subheaders. */
export const PUBLIC_SITE_BREADCRUMB_LIST =
  'flex flex-wrap items-center gap-2 text-sm text-stone-500'

export const PUBLIC_SITE_BREADCRUMB_LINK =
  'rounded-sm hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400'

/** Sticky bar below the public site header (Home … + optional actions). */
export function PublicSiteStickySubheader ({
  breadcrumb,
  actions,
}: {
  breadcrumb: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      className='sticky top-14 z-40 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none'
    >
      <nav aria-label='Breadcrumb' className='min-w-0'>
        {breadcrumb}
      </nav>
      {actions != null ? (
        <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>{actions}</div>
      ) : null}
    </div>
  )
}

/** Single max width for public header, main, and aligned chrome (home + jobs). */
export const PUBLIC_SITE_MAX = 'max-w-5xl'

/** Same outer column as landing `#main-content`: centered, full width up to max, horizontal padding. */
export const PUBLIC_SITE_MAIN_COLUMN = `mx-auto w-full ${PUBLIC_SITE_MAX} px-4`

export function PublicSiteHeader () {
  return (
    <>
      <a
        href='#main-content'
        className='sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-block focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring'
      >
        Skip to content
      </a>
      <header className='fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-colors duration-200 motion-reduce:transition-none'>
        <div
          className={`mx-auto flex h-14 ${PUBLIC_SITE_MAX} items-center justify-between gap-4 px-4 text-sm`}
        >
          <Link
            to='/'
            className='flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none'
          >
            <Logo className='h-7 max-w-[10rem]' />
          </Link>
          <nav className='flex items-center gap-4 text-sm'>
            <PublicSiteAccountNav />
          </nav>
        </div>
      </header>
    </>
  )
}

export function PublicSiteFooter () {
  return (
    <footer className='border-t border-border py-8 text-center text-sm text-muted-foreground'>
      Beonely — niche hiring for ServiceNow.
    </footer>
  )
}
